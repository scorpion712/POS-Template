# Design: fix-config-reports

## Overview

Three stabilization fixes implemented as one change:
- **FR-024**: Move `/admin/settings` page into the `(protected)` route group so it inherits `SideNav` + protected layout. URL stays `/admin/settings`; route group `(protected)` is not part of the URL.
- **FR-025**: Gate ARCA settings page render and all ARCA Server Actions with `requireFeature("hasAfipBilling")`.
- **FR-026**: Neutralize the `src/actions/stock.ts` flat-file shadowing the `src/actions/stock/` barrel, add transactional `StockMovement` writes to every direct stock mutation, block negative stock, and add Vitest report-consistency tests.

## Architecture Decisions

### Decision: Delete flat `stock.ts` (Option A), not thin re-export (Option B)

**Choice**: Delete `src/actions/stock.ts` and port its 4 barrel-missing exports (`getProductsByCode`, `getSuppliersForFilter`, `processBulkProductBatch`, `finalizeBulkImport`) into the barrel files.

**Alternatives**: Keep `stock.ts` as a thin `export * from "./stock"` re-export.

**Rationale**: With `moduleResolution: "bundler"`, a file `stock.ts` shadows the `stock/index.ts` directory barrel. The barrel is currently DEAD CODE for `@/actions/stock` imports — every consumer is silently hitting the flat file. A thin re-export perpetuates the ambiguity and leaves two implementation homes. Deleting + porting is a one-time cost that makes the barrel authoritative, matching the project's documented `src/actions/` convention. Risk is bounded: with the flat file gone, `@/actions/stock` resolves to `stock/index.ts`, and parity is restored by adding the 4 missing exports.

### Decision: Page gate via `requireFeature`, surface feature-blocked UI via existing modal

**Choice**: In the (moved) settings Server Component, call `requireFeature("hasAfipBilling")`; on `!success` render `<FeatureBlockedModal open feature="afip-billing" />` (the server can't render the interactive dialog, so render a static server-side blocked screen that mirrors modal messaging, as other admin pages do). ARCA Server Actions call `requireFeature` and return `{ error }` per existing contract.

**Alternatives**: Redirect non-feature businesses away from `/admin/settings`.

**Rationale**: Spec FR-025 requires the page to call `requireFeature` and show the standard feature-blocked flow; redirect loses the explicit "blocked" signal and the link still appears in `SideNav`. The action contract (`{ error } | { success }`) is already consumed by `ArcaForm`; preserving it avoids touching the client.

### Decision: Keep `StockMovement` cascade-on-delete schema AS-IS; snapshot product metadata into movement before deletion

**Choice**: Do NOT change Prisma schema. On `deleteProduct` with `amount > 0`, create the final `ADJUSTMENT { quantity: -amount, productId, reason: "Eliminación de producto" }` **inside the same transaction as the delete**. The cascade will remove that movement too, BUT `getDailyReportAction` already handles `product: null` gracefully (`description: "Producto eliminado"`, `code: ""`). For post-deletion auditability within a report window, we additionally write a `reason` string carrying the product code/description snapshot.

**Alternatives**: Add `productName`/`productCode` snapshot columns to `StockMovement` (schema migration). Change FK to `onDelete: SetNull`.

**Rationale**: A schema migration is out of scope per proposal ("schema redesign unless current StockMovement is insufficient"). The report already degrades gracefully for deleted products. The `reason` field captures the snapshot textually so a deleted product's removal still shows up in historical windows where the movement predates the cascade. This is an explicit known limitation — documented in Open Questions.

## Data Flow

```
/admin/settings (RSC)
   │ auth() + requireFeature("hasAfipBilling")
   ├─ allowed → getBusinessArcaData → ArcaForm
   └─ blocked → FeatureBlockedModal (static) / error screen

ARCA Server Action (arca.ts)
   │ auth() + role check
   └─ requireFeature("hasAfipBilling") → { error } | proceed

Stock mutation (createProduct/updateProduct/updateStockAmount/bulkUpdateAmounts/deleteProduct)
   │ auth() + assertWritePermission() + businessId scope
   └─ db.$transaction([
         product update/create,
         stockMovement.create(type, quantity, productId, businessId, reason)
      ])
      └─ if newAmount < 0 → throw before any write → rollback
```

## StockMovement Transactional Patterns

```ts
// createProduct (barrel products.ts)
const result = await db.$transaction(async (tx) => {
  const product = await tx.product.create({ data: {...} });
  if (product.amount > 0) {
    await tx.stockMovement.create({
      data: { type: "PURCHASE", quantity: product.amount,
             productId: product.id, businessId, reason: "Alta de producto" },
    });
  }
  return product;
});

// updateStockAmount (discountValue subtracted) — fix existing semantics
const result = await db.$transaction(async (tx) => {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Producto no encontrado");
  const newAmount = product.amount - discountValue;
  if (newAmount < 0) throw new Error("Stock insuficiente");
  await tx.product.update({ where: { id: productId }, data: { amount: newAmount } });
  if (discountValue !== 0) {
    await tx.stockMovement.create({
      data: { type: "ADJUSTMENT", quantity: -discountValue,
              productId, businessId, reason: "Ajuste manual" },
    });
  }
});

// updateProduct (when data.amount differs from previous) — delta ADJUSTMENT
if (data.amount !== undefined) {
  const prev = existingProduct.amount;
  const next = parseFloat(data.amount.toString());
  const delta = next - prev;
  if (delta !== 0) tx.stockMovement.create({ data: { type: "ADJUSTMENT", quantity: delta, ... } });
}

// bulkUpdateAmounts (barrel bulk.ts) — one movement per affected product, atomic
await db.$transaction(async (tx) => {
  const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, amount: true } });
  for (const p of products) {
    const next = computeNext(p.amount, mode, amountChange);
    if (next < 0) throw new Error("Stock insuficiente");
    await tx.product.update({ where: { id: p.id }, data: { amount: next } });
    const delta = next - p.amount;
    if (delta !== 0) await tx.stockMovement.create({ data: { type: "ADJUSTMENT", quantity: delta, productId: p.id, businessId, reason: `Ajuste masivo (${mode})` } });
  }
});

// deleteProduct — snapshot into reason BEFORE cascade
if (product.amount > 0) {
  await tx.stockMovement.create({
    data: { type: "ADJUSTMENT", quantity: -product.amount, productId: id, businessId, reason: `Eliminación: ${product.code} - ${product.description}` },
  });
}
await tx.product.delete({ where: { id } });
```

Negative-stock guard throws inside the transaction; `db.$transaction` rolls back both writes.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/admin/settings/page.tsx` | Delete | Moved into protected group |
| `src/app/(protected)/admin/settings/page.tsx` | Create | Moved page + `requireFeature("hasAfipBilling")` gate before render; reuse `auth()` from `@/auth` (fix relative import) |
| `src/actions/arca.ts` | Modify | Add `requireFeature("hasAfipBilling")` to `getBusinessArcaData`, `updateBusinessArcaData`, `getArcaCredentialsForBilling` after existing role check |
| `src/actions/stock.ts` | Delete | Remove flat-file shadowing barrel |
| `src/actions/stock/index.ts` | Modify | (No change — already re-exports products/suppliers/bulk) |
| `src/actions/stock/products.ts` | Modify | Wrap `createProduct`, `updateProduct`, `updateStockAmount`, `deleteProduct` in `$transaction` + `stockMovement.create`; port `getProductsByCode`, `getSuppliersForFilter` from flat file; negative-stock guard |
| `src/actions/stock/bulk.ts` | Modify | Per-product ADJUSTMENT inside `$transaction` for `bulkUpdateAmounts`; port `processBulkProductBatch`, `finalizeBulkImport` from flat file; negative-stock guard |
| `src="__tests__/actions/stock-report.test.ts"` | Create | Vitest report-consistency coverage |

## Interfaces / Contracts

No new public interfaces. Existing Server Action contract preserved: `{ success } | { error }`. `StockMovement` rows reuse `MovementType` enum (`PURCHASE`, `ADJUSTMENT`, `SALE`, `RETURN` already present).

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Stock mutation → movement creation + negative-stock block | Vitest mocking `@/lib/db` with `tx` scope; assert `stockMovement.create` calls |
| Integration | Report aggregation consistency | Vitest calling real-ish actions + asserting `getDailyReportAction` aggregate (mocked db returning seeded movements) |
| E2E | Manual smoke (route move, feature gate) | Out of scope; cover via existing feature-blocked tests |

Test file `src/__tests__/actions/stock-report.test.ts` scenarios:
1. `createProduct(amount=5)` → 1 PURCHASE +5; report `ins` shows +5
2. `createProduct(amount=0)` → 0 movements
3. `updateProduct` amount 10→7 → ADJUSTMENT -3; report `outs` shows +3
4. `bulkUpdateAmounts([p1,p2])` → 2 ADJUSTMENT movements atomic; if one would go negative, no movement written
5. `deleteProduct(amount=4)` → ADJUSTMENT -4 with reason snapshot
6. `updateStockAmount` would result < 0 → throws, no writes
7. `processSaleAction` → SALE movements; report `outs` reflect
8. `processReturnAction` → RETURN movements; report `ins` reflect
9. Same product multiple ops → totals aggregate by `productId` consistently

Tests use deterministic businessId (`business-123`) and fixed `Date` via `vi.useFakeTimers`.

## Existing tests affected

`bulkUpdateAmounts.test.ts` and related action tests mock against the flat-file semantics (`revalidatePath`, `db.product.updateMany`). After dedup, the action uses `revalidateTag` + `db.$transaction`+`db.product.update`. These existing tests MUST be updated in the apply phase to match the new barrel behavior (mock shape changes only — assertions stay semantically equivalent).

## Migration / Rollout

- **No schema migration required.** Reuse existing `StockMovement` model + `MovementType` enum.
- Rollout is single-PR code change. Backward compatible: `@/actions/stock` import path unchanged for all consumers.
- Rollback: restore `stock.ts`, revert route move, remove `requireFeature` calls. Existing `StockMovement` rows remain as harmless audit history.

## Open Questions

- [ ] After `deleteProduct` cascade, the final ADJUSTMENT movement is also removed — only `reason` snapshot provides textual evidence. Is textual-only audit acceptable, or do we need a schema change to add `productCode`/`productDescription` snapshot columns in a follow-up change? (Current decision: textual-only; flagged for follow-up if reports are materially affected.)
- [ ] The existing `bulkUpdateAmounts.test.ts` asserts `db.product.updateMany` was called. The new transactional implementation uses `db.$transaction` + `db.product.update`. Confirm acceptable to update these existing tests in the apply phase (recommended yes — they currently assert flat-file internals, not behavior).