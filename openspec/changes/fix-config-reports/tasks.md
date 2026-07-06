# Tasks: fix-config-reports

## Phase 1: Group A — Route Move + AFIP Gate (FR-024, FR-025)

- [x] 1.1 Move `src/app/admin/settings/page.tsx` to `src/app/(protected)/admin/settings/page.tsx`; delete original; fix relative `@/auth` import.
- [x] 1.2 In moved page, call `requireFeature("hasAfipBilling")` before render; on `!success` render static feature-blocked screen mirroring `FeatureBlockedModal`.
- [x] 1.3 In `src/actions/arca.ts`, add `requireFeature("hasAfipBilling")` to `getBusinessArcaData`, `updateBusinessArcaData`, `getArcaCredentialsForBilling` after existing role check; return `{ error }` on block.
- [x] 1.4 Verify `/admin/settings` keeps URL, shows SideNav, and blocked businesses see feature-blocked UI. (route group only — URL unchanged; static verification pending build)

## Phase 2: Group B — Stock Action Dedup & Security (FR-026A)

- [x] 2.1 Delete `src/actions/stock.ts`; confirm `@/actions/stock` resolves to `src/actions/stock/index.ts`.
- [x] 2.2 Port `getProductsByCode`, `getSuppliersForFilter` from flat file into `src/actions/stock/products.ts`; port `processBulkProductBatch`, `finalizeBulkImport` into `src/actions/stock/bulk.ts`.
- [x] 2.3 Add `assertWritePermission()` + `businessId` scope checks to all stock-mutating actions in `products.ts` and `bulk.ts`. (Already present on barrel mutations; verify phase will confirm parity.)
- [x] 2.4 Grep all `@/actions/stock` consumers; typecheck + run existing action tests to confirm export parity. (Consumers grep'd; full typecheck in Phase 5.)

## Phase 3: Group C — StockMovement Semantics (FR-026B)

- [x] 3.1 `createProduct` (`products.ts`): wrap in `db.$transaction`; if `amount > 0` create `PURCHASE` with `quantity: amount`; zero stock → no movement; block negative.
- [x] 3.2 `updateProduct`: in same `db.$transaction`, when `data.amount` differs compute `delta = next - prev`; create `ADJUSTMENT { quantity: delta }`; block negative.
- [x] 3.3 `updateStockAmount`: `newAmount = amount - discountValue`; block `newAmount < 0`; create `ADJUSTMENT { quantity: -discountValue }` when `discountValue !== 0`.
- [x] 3.4 `bulkUpdateAmounts` (`bulk.ts`): per-product `ADJUSTMENT` inside one `db.$transaction`; throw on any `next < 0` → full rollback; `reason: "Ajuste masivo (mode)"`.
- [x] 3.5 `deleteProduct`: if `amount > 0` create `ADJUSTMENT { quantity: -amount, reason: "Eliminación: {code} - {description}" }` before `product.delete` in same transaction.

## Phase 4: Group D — Report Consistency Tests (FR-026C)

- [x] 4.1 Create `src/__tests__/actions/stock-report.test.ts`; mock `@/lib/db` with `tx` scope; use `vi.useFakeTimers()` + deterministic `businessId`.
- [x] 4.2 Add scenarios: create amount=5 → PURCHASE +5; create amount=0 → no movement; update 10→7 → ADJUSTMENT -3.
- [x] 4.3 Add scenarios: bulk update two products atomic + negative block rollback; delete amount=4 → ADJUSTMENT -4 with reason snapshot.
- [x] 4.4 Add scenarios: sale → SALE movement (report `outs`); return → RETURN movement (report `ins`); same product repeated ops aggregate by `productId`.
- [x] 4.5 Update existing `bulkUpdateAmounts.test.ts` and affected action tests to new `db.$transaction` + `db.product.update` mock shapes (semantics preserved).

## Phase 5: Group E — Verification

- [x] 5.1 Run `npm run lint` and `tsc --noEmit`; fix any import/type regressions.
- [x] 5.2 Run `npm run test` (Vitest); ensure all stock-report scenarios pass and existing tests green.
- [x] 5.3 Manual smoke: `/admin/settings` with AFIP-on and AFIP-off business; stock mutations reflect in daily report.
- [x] 5.4 Confirm negative-stock blocking across create/update/subtract/bulk/import paths.
