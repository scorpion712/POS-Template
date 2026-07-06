# Spec: Overdue Payment Blocker

> **Change:** `overdue-payment-modal` (FR-023)
> **Status:** Draft
> **Depends on:** None

---

## Overview

Replace the current dismissable MOROSO toast with an **immovable fullscreen overlay** that blocks all interaction when `business.accountStatus === "MOROSO"`. The overlay has no close mechanism, detects DevTools DOM removal (redirects to `/payment-blocked`), and intercepts `DELINQUENT` errors returned by Server Actions. An audit of ~22 uncovered Server Actions adds `assertWritePermission()` so every mutation is guarded server-side.

---

## Scenarios

### Scenario 1: User is MOROSO → sees immovable overlay on every page

```
Given the business has accountStatus = "MOROSO"
When the user navigates to any protected page
Then an immovable fullscreen overlay covers the entire viewport
And there is NO close button, NO X, NO "Entendido" button
And pressing Escape does NOT dismiss the overlay
And clicking outside does NOT dismiss the overlay
And the overlay has z-[99999] to cover all content
```

### Scenario 2: WhatsApp button → opens in new tab, modal stays

```
Given the overlay is visible
When the user clicks the WhatsApp contact button
Then WhatsApp opens in a new browser tab
And the overlay remains visible on the original tab
And the user CANNOT interact with the original tab
```

### Scenario 3: Page refresh → overlay re-appears

```
Given the business has accountStatus = "MOROSO"
When the user refreshes the page (F5 / Cmd+R)
Then the overlay re-appears immediately after page load
And no flash of protected content is visible
```

### Scenario 4: DevTools DOM removal → redirect to /payment-blocked

```
Given the overlay is visible on a page
When the user removes the overlay DOM node via DevTools
Then within 100ms the browser navigates to /payment-blocked
And /payment-blocked is a static RSC page (no escape)
```

### Scenario 5: /payment-blocked page → elegant design with WhatsApp, no escape

```
Given the user is on /payment-blocked
Then the page shows a visually modern, branded blocked-state design
And includes a WhatsApp contact button (target="_blank")
And there is NO navigation back to the app
And the browser back button is intercepted or pushes history forward
```

### Scenario 6: Server Action returns DELINQUENT → overlay appears (not toast)

```
Given the user is on any page and an action returns { success: false, code: "DELINQUENT" }
Then the overlay appears immediately
And NO toast is shown for that DELINQUENT error
```

### Scenario 7: Admin sets ACTIVO → overlay disappears on next action

```
Given the overlay is visible
When the superadmin changes the business accountStatus to "ACTIVO"
And the user triggers any Server Action or the polling interval fires
Then the overlay disappears
And the user can interact with the application normally
```

### Scenario 8: Server Action without guard → returns DELINQUENT (audit)

```
Given a Server Action that mutates business data
When it does NOT call assertWritePermission() at the top
Then the action is audited and assertWritePermission() is added
And if the business is MOROSO, the action returns { success: false, code: "DELINQUENT" }
And the frontend DELINQUENT interceptor catches it and shows the overlay
```

---

## Non-functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Performance** | `MutationObserver` MUST only be active when `isDelinquent === true`. Polling interval NO MORE than 30s. No layout shift — overlay uses `fixed inset-0`. |
| **UX** | Overlay MUST render above ALL content (`z-[99999]`). No flash of protected content — render overlay on first paint if status is MOROSO. WhatsApp CTA must be prominent. |
| **Accessibility** | Focus MUST be trapped inside the overlay. All interactive elements behind the overlay MUST be inert. The overlay MUST be announced by screen readers. |
| **Security** | Backend guard (`assertWritePermission()`) is the SOURCE OF TRUTH — frontend overlay is UX, not security. DevTools DOM removal redirect is a UX safeguard, not a security boundary. |
| **SEO** | `/payment-blocked` page MUST have `<meta name="robots" content="noindex">`. |

---

## Acceptance Criteria

- [ ] `OverduePaymentBlocker` component renders immovable overlay when `accountStatus === "MOROSO"`:
  - No close/X/Entendido button
  - Escape key prevented
  - Click-outside prevented
  - `z-[99999]` with backdrop blur
- [ ] WhatsApp button opens `https://wa.me/5492265418113` in `target="_blank"`, does NOT close overlay
- [ ] Page refresh re-renders overlay immediately (MOROSO persists)
- [ ] `MutationObserver` watches overlay DOM node; on removal → `window.location.href = "/payment-blocked"` within 100ms
- [ ] `/payment-blocked` is a static RSC page with:
  - Elegant modern design (brand styling, large icon, clear message)
  - WhatsApp CTA button
  - No navigation back to the app
  - `noindex` meta tag
- [ ] `delinquent-interceptor.ts` wraps client-side Server Action calls; detects `{ success: false, code: "DELINQUENT" }` → sets global delinquent state
- [ ] `useDelinquentState.ts` provides global reactive state (Zustand store or React context) consumed by `OverduePaymentBlocker`
- [ ] `PaymentStatusGuard.tsx` refactored:
  - MOROSO status triggers `OverduePaymentBlocker` (not toast)
  - DESACTIVADO status continues to show the existing blocking overlay
  - Toast removed for MOROSO
- [ ] `feature-blocked-modal.tsx`: `delinquent` variant removed
- [ ] Action audit: every Server Action that mutates business data calls `assertWritePermission()` as its first auth check
- [ ] Polling: `getBusinessStatusAction` is called on mount and every 30s to detect ACTIVO → MOROSO or MOROSO → ACTIVO transitions

### Action Audit Scope (files requiring `assertWritePermission()`)

The following Server Action files currently lack `assertWritePermission()`:

| File | Actions to Guard |
|------|------------------|
| `src/actions/billing.ts` | `updateBusinessBalance`, `updateProductsStock`, `updateMonthlyRankingAction`, `saveOrderAction` |
| `src/actions/stock.ts` | `createSupplier`, `createProduct`, `updateProduct`, `updateStockAmount`, `deleteProduct`, `bulkUpdatePrices`, `bulkUpdateAmounts`, `toggleProductCatalogAction`, `processBulkProductBatch`, `finalizeBulkImport`, `createProductsBulk` |
| `src/actions/clients.ts` | `createClient`, `updateClientBalance` |
| `src/actions/categories.ts` | `createCategory` |
| `src/actions/subcategories.ts` | `createSubcategory` |
| `src/actions/brands.ts` | `createBrand` |
| `src/actions/movements.ts` | `createMovement` |
| `src/actions/budget.ts` | `createBudgetAction` |
| `src/actions/business-config.ts` | (all mutation actions) |
| `src/actions/sales/process.ts` | `processSaleAction`, `processReturnAction`, `updateOrderAction` |
| `src/actions/sales/update.ts` | `updateOrderCaeAction`, `deleteOrderAction` |
| `src/actions/unpaid-orders.ts` | `createUnpaidOrder`, `registerPayment`, `cancelUnpaidOrder`, `addItemsToOrder`, `updateOrderItem`, `removeOrderItem` |
| `src/actions/ledger/index.ts` | `createLedgerAccountAction`, `addProductsToLedgerAction` |
| `src/actions/plan.ts` | (any mutation actions) |
| `src/actions/voucher.ts` | `getVoucherNumberAction` (read-only, may be exempt) |

**Note:** Read-only actions (e.g., `getProducts`, `getClients`, `getCategories`) are exempt. Only mutations need the guard.

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/OverduePaymentBlocker.tsx` | **NEW** — "use client", fullscreen immovable overlay, MutationObserver, WhatsApp CTA |
| `src/app/payment-blocked/page.tsx` | **NEW** — Static RSC without layout, elegant design, WhatsApp button, noindex |
| `src/hooks/useDelinquentState.ts` | **NEW** — Zustand store or React context for delinquent state |
| `src/lib/delinquent-interceptor.ts` | **NEW** — Wrapper: catches `{ success: false, code: "DELINQUENT" }` → sets state |
| `src/components/PaymentStatusGuard.tsx` | **MODIFIED** — Replace MOROSO toast with `<OverduePaymentBlocker />` |
| `src/components/ui/feature-blocked-modal.tsx` | **MODIFIED** — Remove `delinquent` variant type and entry |
| `src/app/layout.tsx` | **MODIFIED** — `PaymentStatusGuard` stays (it now renders `<OverduePaymentBlocker />`) |
| `src/actions/{billing,stock,clients,categories,subcategories,brands,movements,budget,business-config,sales/*,unpaid-orders,ledger/*}.ts` | **MODIFIED** — Add `assertWritePermission()` call at top of each mutation action |
