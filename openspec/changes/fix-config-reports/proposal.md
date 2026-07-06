# Proposal: fix-config-reports

## Metadata
- **Change**: `fix-config-reports`
- **PRD**: FR-024, FR-025, FR-026 from `openspec/prd-pos-stabilization-v2.md`
- **Mode**: hybrid (`openspec` + Engram)
- **Sources**: PRD + `openspec/changes/fix-config-reports/exploration.md`

## Intent
Fix three stabilization bugs: ARCA settings must render inside the protected app shell with SideNav, AFIP/ARCA config must be plan-gated by `hasAfipBilling`, and stock reports must reflect every stock-affecting mutation through reliable `StockMovement` records.

## Scope

### In Scope
- Move `/admin/settings` route into `src/app/(protected)/admin/settings/` so it inherits protected layout and SideNav.
- Add `requireFeature("hasAfipBilling")` to ARCA settings page and ARCA Server Actions.
- Resolve `src/actions/stock.ts` vs `src/actions/stock/` duplication before changing stock behavior.
- Create missing `StockMovement` records for direct stock mutations and add Vitest coverage.

### Out of Scope
- Merging `/admin/config` and `/admin/settings` into one UX.
- New report UI, new analytics, or schema redesign unless current `StockMovement` is insufficient.

## Capabilities

### New Capabilities
- `admin-settings-access`: protected ARCA settings route, SideNav visibility, and AFIP billing plan gate.
- `stock-report-audit`: stock-affecting mutations produce reportable `StockMovement` audit records.

### Modified Capabilities
- None; existing `feature-blocked-modal` behavior is reused, not changed.

## Approach by FR
- **FR-024**: Move `src/app/admin/settings/` under `(protected)` without changing the public URL. Keep SideNav link at `/admin/settings`; verify no conflict with `/admin/config`.
- **FR-025**: Gate page render and `getBusinessArcaData` / `updateBusinessArcaData` with `requireFeature("hasAfipBilling")`; preserve Server Action `{ error } | { success }` contract and standard feature-blocked UX.
- **FR-026**: First remove/neutralize flat `src/actions/stock.ts` shadowing so the directory barrel is authoritative. Then add transactional `StockMovement` writes to `createProduct`, `updateProduct`, `updateStockAmount`, `bulkUpdateAmounts`, `deleteProduct`, and bulk import paths.

## Files affected
| File/Area | Impact |
|---|---|
| `src/app/admin/settings/page.tsx` → `src/app/(protected)/admin/settings/page.tsx` | Move + gate |
| `src/actions/arca.ts` | Add feature gate to ARCA reads/writes |
| `src/actions/stock.ts`, `src/actions/stock/**` | Resolve duplicate exports; add movements |
| `src/actions/sales/history.ts`, `src/components/PeriodicReport.tsx` | Validate report assumptions |
| `src/__tests__/actions/**` | Add stock report consistency tests |

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Import resolution changes break `@/actions/stock` consumers | Keep barrel export parity and run targeted tests/typecheck in verify phase |
| Bulk stock updates create too many writes | Batch `StockMovement` creation inside the same transaction |
| Product creation movement semantics unclear | Treat initial positive stock as `PURCHASE`; document zero-stock as no movement |
| Route move affects bookmarks | URL remains `/admin/settings`, only route group changes |

## Rollback Plan
Revert route move, remove added `requireFeature` checks, restore previous `stock.ts` export surface, and disable new `StockMovement` writes. Existing movement rows can remain as harmless audit history unless a destructive rollback is explicitly required.

## Acceptance criteria
- [ ] `/admin/settings` shows SideNav and remains accessible at the same URL for authorized users.
- [ ] Businesses without `hasAfipBilling` cannot view or mutate ARCA config.
- [ ] All stock-mutating actions use authenticated/write-checked paths and create accurate `StockMovement` rows.
- [ ] Daily report stock activity reflects sales, returns, edits, direct updates, bulk updates, imports, and deletions.
- [ ] Vitest coverage documents FR-026 scenarios, including negative-stock blocking.

## Recommended phase split if FR-026 is too large
Split FR-026 into: **A)** stock action dedup/security, **B)** movement creation semantics, **C)** report consistency tests. Ship FR-024/FR-025 first because they are low-risk and independent.

## Dependencies
- Existing `requireFeature()` / `assertWritePermission()` from `src/lib/auth-gates.ts`.
- Existing Prisma `StockMovement` model and `MovementType` enum.
