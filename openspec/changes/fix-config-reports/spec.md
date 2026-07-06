# Specification: fix-config-reports

## Overview

This change stabilizes configuration access and stock reporting for FR-024, FR-025, and FR-026. `/admin/settings` MUST keep the same URL while inheriting the protected app shell. ARCA/AFIP configuration MUST be unavailable to businesses without `hasAfipBilling`. Stock reports MUST reflect every stock-affecting mutation through durable `StockMovement` rows.

Current behavior: `/admin/settings` lives outside `(protected)`, ARCA reads/writes are not feature-gated, and direct product/stock mutations bypass `StockMovement`. Expected behavior: protected layout + SideNav, page/action-level AFIP gate, and consistent stock movement audit data.

## Requirements by FR

### FR-024: Config page — SideNav

- `/admin/settings` MUST render inside the protected app shell and show SideNav.
- The public URL MUST remain `/admin/settings`; route grouping MAY change, route path MUST NOT.
- Existing ARCA settings behavior MUST remain available to authorized and feature-enabled admins.

### FR-025: Config page — AFIP billing plan gate

- The settings page MUST call `requireFeature("hasAfipBilling")` before exposing ARCA config.
- ARCA Server Actions that read/write/expose business ARCA config MUST enforce the same gate, including `getBusinessArcaData`, `updateBusinessArcaData`, and credential-read actions when applicable.
- Unauthorized or non-feature businesses MUST receive the existing action error contract and MUST NOT view or mutate ARCA data.

### FR-026A: Stock action dedup/security

- `@/actions/stock` MUST resolve to one authoritative export surface with parity for current consumers.
- The `src/actions/stock.ts` vs `src/actions/stock/` duplication MUST be removed or neutralized without breaking imports.
- Stock-mutating actions MUST use authenticated business-scoped paths and `assertWritePermission()` before writes.

### FR-026B: StockMovement semantics

- Direct stock-affecting mutations MUST create reportable `StockMovement` rows in the same transaction as the stock write.
- Initial positive stock on product creation/import MUST create `MovementType.PURCHASE` because the enum already includes `PURCHASE`.
- Zero-stock creation MUST NOT create a movement.
- Manual amount changes MUST create an `ADJUSTMENT` with `quantity = newAmount - previousAmount`.
- Bulk amount updates MUST create one movement per affected product, batched in the same transaction as the product updates.
- Product deletion with final positive stock MUST document final removal with a negative `ADJUSTMENT`; this history MUST remain reportable after deletion.
- Negative resulting stock MUST be blocked for create, update, subtract, bulk update, and import paths.
- Sales and returns MUST continue to produce `SALE` and `RETURN` movements respectively.

### FR-026C: Report consistency tests

- Vitest coverage MUST prove report consistency through `getDailyReportAction` or the report-facing stock activity source.
- Tests MUST cover sale, return, manual update, bulk update, repeated operations on the same product, and negative-stock blocking.

## Scenarios in Given/When/Then

### FR-024 scenarios
- GIVEN an authenticated admin opens `/admin/settings` WHEN the page renders THEN SideNav is visible AND the URL remains `/admin/settings`.
- GIVEN an unauthenticated user opens `/admin/settings` WHEN auth is checked THEN access is denied or redirected by the protected flow.

### FR-025 scenarios
- GIVEN a business has `hasAfipBilling` WHEN an admin opens `/admin/settings` THEN ARCA config is rendered.
- GIVEN a business lacks `hasAfipBilling` WHEN the admin opens `/admin/settings` THEN ARCA config is not exposed AND the standard feature-blocked flow is shown.
- GIVEN a business lacks `hasAfipBilling` WHEN an ARCA read/write action is called directly THEN it returns an error AND no config is returned or mutated.

### FR-026A scenarios
- GIVEN an existing import from `@/actions/stock` WHEN the duplicate flat file is removed or neutralized THEN the import still resolves AND exports match prior consumers.
- GIVEN a stock mutation request WHEN the user is unauthenticated, wrong-business, or write-blocked THEN no stock or movement write occurs.

### FR-026B scenarios
- GIVEN a product is created with amount `5` WHEN creation succeeds THEN stock is `5` AND a `PURCHASE` movement of `+5` exists.
- GIVEN a product is created with amount `0` WHEN creation succeeds THEN no movement is created.
- GIVEN a product amount changes from `10` to `7` WHEN update succeeds THEN an `ADJUSTMENT` movement of `-3` exists.
- GIVEN multiple products are bulk updated WHEN the transaction succeeds THEN each changed product has its matching movement; if any update fails, none are written.
- GIVEN a product with final stock `4` WHEN it is deleted THEN a reportable `ADJUSTMENT` of `-4` remains visible in stock activity.
- GIVEN any path would produce negative stock WHEN submitted THEN the action returns an error AND no stock or movement mutation is committed.

### FR-026C scenarios
- GIVEN a product is sold WHEN the daily report is generated THEN stock outs include the product with the `SALE` quantity.
- GIVEN a sale is returned WHEN the daily report is generated THEN stock ins include the product with the `RETURN` quantity.
- GIVEN manual and bulk adjustments occur WHEN the daily report is generated THEN stock activity reflects every delta.
- GIVEN the same product has multiple operations WHEN totals are generated THEN ins/outs aggregate consistently by product.

## Non-functional requirements

- Mutations MUST be atomic: stock value and movement rows succeed or roll back together.
- Multi-tenant isolation MUST use `businessId` filters for reads and writes.
- Bulk operations SHOULD batch movement creation to avoid avoidable write overhead.
- Tests SHOULD use deterministic dates/business IDs to avoid flaky report windows.
- Import-resolution changes MUST be reviewed carefully because `moduleResolution: "bundler"` currently allows the flat `src/actions/stock.ts` to shadow the folder barrel.

## Acceptance criteria

- `/admin/settings` shows SideNav and keeps the same URL.
- Businesses without `hasAfipBilling` cannot view, read, or mutate ARCA config.
- `@/actions/stock` has stable export parity after deduplication.
- All stock-mutating paths are authenticated, write-checked, business-scoped, and movement-backed.
- Reports reflect sales, returns, manual adjustments, bulk changes, repeated operations, and deletion removals.
- Negative stock is blocked and covered by tests.

## Split recommendation for implementation tasks

1. Ship FR-024/FR-025 first: route move plus page/action feature gates.
2. FR-026A: neutralize/remove flat `stock.ts`, preserve barrel exports, verify import consumers.
3. FR-026B: add transactional movement semantics and negative-stock guards.
4. FR-026C: add Vitest report consistency tests for all required stock scenarios.
