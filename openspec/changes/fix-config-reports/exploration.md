## Exploration: fix-config-reports

### Current State

**FR-024: Config Page SideNav**
- There are TWO config pages:
  1. `/admin/settings` at `src/app/admin/settings/page.tsx` — OUTSIDE `(protected)` route group, NO SideNav. Contains ARCA/AFIP electronic billing configuration.
  2. `/admin/config` at `src/app/(protected)/admin/config/page.tsx` — INSIDE `(protected)` route group, HAS SideNav (from `(protected)/layout.tsx`). Contains general business settings (branding, notifications, timezone).
- The SideNav links to `/admin/settings` (line 37 of SideNav.tsx), not to `/admin/config`.
- `/admin/settings` has NO layout.tsx at the `admin/` level — it's a standalone page outside (protected).

**FR-025: Feature Gate for Config**
- `/admin/settings` (`src/app/admin/settings/page.tsx`) has NO `requireFeature` call.
- It only checks `UserRole.ADMIN` and calls `getBusinessArcaData()`.
- The page renders ARCA electronic billing configuration form — this is EXACTLY the kind of page that should be gated by `hasAfipBilling`.
- `requireFeature("hasAfipBilling")` is already used in `processSaleAction` (when CAE present) and `createAfipVoucherAction` — the infrastructure exists.
- The `admin/settings` page itself doesn't call any Server Action that would be protected (the `getBusinessArcaData` action doesn't call `requireFeature`).

**FR-026: Stock Report Consistency**
- Stock reporting: Report page at `/report` inside `(protected)` uses `PeriodicReport` component → calls `getDailyReportAction` from `sales/history.ts`.
- `getDailyReportAction` queries `Order`, `SaleReturn`, and `StockMovement` tables.
- StockActivity (ins/outs) comes exclusively from `StockMovement` records.
- **Gap**: Only sale/return/order-update operations create `StockMovement` records:
  - `processSaleAction` → creates SALE-type StockMovement
  - `processReturnAction` → creates RETURN-type StockMovement
  - `updateOrderAction` → creates ADJUSTMENT and SALE-type StockMovement
  - `createProduct`, `updateProduct`, `updateStockAmount`, `bulkUpdateAmounts`, `deleteProduct` — do NOT create StockMovement records.
- **Major code duplication issue**: `src/actions/stock.ts` (flat file) and `src/actions/stock/products.ts` + `stock/bulk.ts` (via `stock/index.ts`) contain DUPLICATE implementations. With `moduleResolution: "bundler"`, the flat `stock.ts` wins resolution — making `stock/products.ts` effectively DEAD CODE.
- The winning `stock.ts` flat file has LESS secure versions (missing `assertWritePermission` in some functions).
- There are no existing tests for stock report consistency (current tests in `__tests__/actions/` cover products, sales processing, budget, cashbox sessions, public orders — not stock reports).

### Affected Areas

- `src/app/admin/settings/page.tsx` — Config page OUTSIDE (protected), no SideNav, no feature gate
- `src/app/(protected)/admin/config/page.tsx` — Config page INSIDE (protected), HAS SideNav but NOT linked from SideNav
- `src/components/ui/SideNav.tsx` — Line 37 links to `/admin/settings` (broken routing)
- `src/lib/auth-gates.ts` — `requireFeature("hasAfipBilling")` exists but not used in config
- `src/actions/business-config.ts` — Server actions for config, no feature gate
- `src/actions/arca.ts` — `getBusinessArcaData` used by settings, no feature gate
- `src/actions/stock.ts` — FLAT FILE (wins resolution), missing StockMovement creation
- `src/actions/stock/products.ts` — DUPLICATE (dead code via index.ts), has proper auth
- `src/actions/stock/bulk.ts` — Bulk stock operations, missing StockMovement creation
- `src/actions/sales/process.ts` — Correctly creates StockMovement records (SALE, RETURN, ADJUSTMENT)
- `src/actions/sales/history.ts` — `getDailyReportAction` reads StockMovement for reports
- `src/components/PeriodicReport.tsx` — Report component showing stock activity
- `prisma/schema.prisma` — StockMovement model (lines 453-473), MovementType enum (SALE, RETURN, ADJUSTMENT, PURCHASE)

### Approaches

#### FR-024: Config Page SideNav

1. **Move `/admin/settings` inside `(protected)`** — Move `src/app/admin/settings/` to `src/app/(protected)/admin/settings/`. Auto-inherits SideNav.
   - Pros: Simple, consistent with other admin pages
   - Cons: Need to check for route conflicts with existing `/admin/config`
   - Effort: Low

2. **Create layout.tsx at `admin/` level** — Add a layout that wraps `/admin` routes with SideNav.
   - Pros: Doesn't require moving files
   - Cons: Duplicates SideNav rendering, inconsistent with project pattern
   - Effort: Low

3. **Redirect SideNav link to `/admin/config` instead** — Fix the SideNav href to point to the existing page inside (protected).
   - Pros: Uses existing page
   - Cons: `/admin/settings` (ARCA config) and `/admin/config` (general config) are different pages — user would miss ARCA config
   - Effort: Low

**Recommendation**: Approach 1 — Move `/admin/settings` into `(protected)` route group. It's the cleanest fix, follows the existing pattern, and all other admin pages are already there.

#### FR-025: Config Feature Gate

1. **Add `requireFeature("hasAfipBilling")` to settings page** — Call before rendering the settings page. Also add to `getBusinessArcaData` and `saveBusinessArcaData` Server Actions.
   - Pros: Complete protection (page + actions)
   - Cons: None
   - Effort: Low

2. **Create a middleware-level gate** — Use Next.js middleware to check feature flags on route patterns.
   - Pros: Centralized, covers all routes
   - Cons: Overengineered, middleware can't easily access plan data
   - Effort: High

**Recommendation**: Approach 1 — Add requireFeature to both the page (redirect) and the Server Actions (return error).

#### FR-026: Stock Report Consistency

1. **Add StockMovement creation to all stock-modifying actions** — Modify `createProduct`, `updateProduct`, `updateStockAmount`, `bulkUpdateAmounts`, `deleteProduct`, `processBulkProductBatch` to create StockMovement records.
   - Pros: Complete audit trail, reports are accurate
   - Cons: Adds DB writes to all stock operations; need to resolve dead code issue first
   - Effort: Medium

2. **Clean up duplicate stock.ts files first, then add StockMovement** — Delete the flat `stock.ts`, ensure `stock/index.ts` + products/bulk/suppliers barrel is the single source, then add StockMovement to all relevant functions.
   - Pros: Fixes the dead code + security issue simultaneously
   - Cons: Testing required to ensure nothing breaks
   - Effort: Medium-High

3. **Only add StockMovement to the most impactful actions** — Focus on `updateStockAmount` and `bulkUpdateAmounts` (direct stock changes by users).
   - Pros: Less risk, covers the biggest gaps
   - Cons: Product CRUD changes still invisible in reports
   - Effort: Low

**Recommendation**: Approach 2 (clean up duplication first, then add StockMovement comprehensively). The dead code issue must be resolved before making stock changes reliable.

### Recommendation

**Priority order**:
1. FR-024 — Move `/admin/settings` inside `(protected)`, fix SideNav href to point to correct location. Or rename & merge the two config pages.
2. FR-025 — Add `requireFeature("hasAfipBilling")` gate to the ARCA settings page and its Server Actions.
3. FR-026 — First delete the flat `stock.ts` duplication (keeping the superior `stock/products.ts` + `stock/bulk.ts` versions), then add StockMovement creation to all product/stock mutation actions.

### Risks

- **DUPLICATE stock.ts files**: The flat `stock.ts` file wins TypeScript resolution over `stock/index.ts`, so the more robust implementations in `stock/products.ts` are dead code. This must be resolved carefully — the flat file is referenced by many imports. Need to verify the barrel exports match.
- **Moving `/admin/settings`**: Need to check if any external links or bookmarks point to `/admin/settings`.
- **StockMovement performance**: Adding DB writes to every stock mutation (especially bulk operations) could impact performance. Consider batching or async processing.
- **Missing `MovementType.PURCHASE`**: The `stock.ts` flat file has `createProduct` but no purchase-type movement — need to decide if new product creation counts as a stock "in".
- **Circular imports risk**: The sales/process.ts already imports from auth-gates. Adding to business-config.ts should be straightforward.

### Ready for Proposal
Yes — the analysis is complete. The orchestrator should proceed to sdd-propose.
