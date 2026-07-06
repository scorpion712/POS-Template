# Tasks: Overdue Payment Blocker

> **Change:** `overdue-payment-modal` (FR-023)
> **Status:** Draft
> **Total tasks:** 14 (Groups A–E)

---

## Group A: Foundation

No dependencies. Foundation layer that both the blocker and the interceptor depend on.

### T1 — Create `useDelinquentStore` (Zustand)

**Description:** Create a Zustand store that holds the delinquent state globally. The store is importable from outside the React tree (for the interceptor utility) and reactive inside React components (for the blocker).

**Files:**
- `src/stores/useDelinquentStore.ts` — **NEW**

**Spec:**
```typescript
interface DelinquentState {
  isDelinquent: boolean;   // source-of-truth from server
  showBlocker: boolean;    // display decision (mirrors isDelinquent)
  setDelinquent: (status: boolean) => void;
  triggerBlocker: () => void;  // force-show on interceptor signal
}
```
- `setDelinquent(true)` sets both `isDelinquent` and `showBlocker` to `true`
- `setDelinquent(false)` sets both to `false`
- `triggerBlocker()` always forces both to `true` (used by interceptor)

**Verification:**
- Import store in a test file, call `setDelinquent(true)`, verify `isDelinquent === true`
- Call `getState().setDelinquent(false)` from outside React, verify state updates
- `triggerBlocker()` sets both fields to `true`

**Dependencies:** None

---

### T2 — Create `delinquent-interceptor.ts`

**Description:** Utility wrapper for client-side Server Action calls. When a Server Action returns `{ success: false, code: "DELINQUENT" }`, the interceptor calls `useDelinquentStore.getState().setDelinquent(true)` and suppresses the toast (the blocker IS the notification). The original response is returned so the caller can still handle it.

**Files:**
- `src/lib/delinquent-interceptor.ts` — **NEW**

**Spec:**
```typescript
export async function withDelinquentGuard<T extends { error?: string; code?: string; success?: boolean }>(
  actionCall: Promise<T>
): Promise<T>
```

- Awaits the action call
- If `result.code === "DELINQUENT"` and `result.success === false`: calls `useDelinquentStore.getState().triggerBlocker()` (or `setDelinquent(true)`)
- Returns the original result unchanged
- Non-DELINQUENT errors pass through transparently

**Verification:**
- Call `withDelinquentGuard(Promise.resolve({ success: false, error: "X", code: "DELINQUENT" }))` → store state becomes delinquent
- Call `withDelinquentGuard(Promise.resolve({ success: true }))` → store unchanged
- Call with `{ error: "X" }` (no code) → store unchanged

**Dependencies:** T1 (uses `useDelinquentStore`)

---

## Group B: Core Components

Depends on Group A (the store must exist for the blocker to read from).

### T3 — Create `OverduePaymentBlocker.tsx`

**Description:** "use client" component that renders an immovable fullscreen overlay covering the entire viewport at `z-[99999]`. No close mechanism, no Escape key, no click-outside. Includes:
- **Session sync**: On mount, reads `session.user.business.accountStatus`; if "MOROSO", calls `setDelinquent(true)`
- **MutationObserver**: Watches `document.body` for removal of its own DOM node; on removal, redirects to `/payment-blocked` within 100ms
- **Focus trap**: Uses `@radix-ui/react-focus-scope` to trap Tab cycling inside the modal
- **Polling**: Every 30s calls `getBusinessStatusAction()` while `isDelinquent === true`; if status changes to ACTIVO, calls `setDelinquent(false)`
- **WhatsApp CTA**: Prominent button linking to `https://wa.me/5492265418113` with `target="_blank" rel="noopener noreferrer"`

**Files:**
- `src/components/OverduePaymentBlocker.tsx` — **NEW**

**Spec:**
- Return `null` when `isDelinquent === false`
- Render fullscreen overlay when `isDelinquent === true`
- Outer wrapper: `fixed inset-0 z-[99999] pointer-events-none bg-black/70 backdrop-blur-sm`
- Modal card: `pointer-events-auto`, `role="alertdialog"`, `aria-modal="true"`, `aria-label="Cuenta con deuda"`
- WhatsApp URL: `https://wa.me/5492265418113`
- `onKeyDown` on outer div prevents Escape: `e.key === "Escape" && e.preventDefault()`
- MutationObserver activates only when `isDelinquent === true`, disconnected on cleanup
- Polling interval: `30_000` ms (30s), only active when `isDelinquent === true`

**Edge cases:**
- Session not yet loaded → no overlay briefly; when session arrives, overlay appears
- Polling fails (network error) → existing status preserved, retry in 30s
- Multiple rapid DELINQUENT signals → idempotent, no thrash

**Dependencies:** T1 (reads `useDelinquentStore`)

**Verification:**
- Manual: set `isDelinquent` to `true` in store → overlay renders
- Try pressing Escape → nothing happens
- Try Tab cycling → focus stays inside modal
- Click WhatsApp → opens new tab, modal stays
- Remove overlay via DevTools → redirect to `/payment-blocked` within 100ms

---

### T4 — Create `/payment-blocked/` page

**Description:** Fallback blocked page when user bypasses the overlay via DevTools. Consists of a static RSC page (`page.tsx`) and a client component (`PaymentBlockedContent.tsx`). No navigation back to the app, WhatsApp as the only action.

**Files:**
- `src/app/payment-blocked/page.tsx` — **NEW** (RSC)
- `src/app/payment-blocked/PaymentBlockedContent.tsx` — **NEW** (Client)

**Spec for `page.tsx`:**
- `export const metadata: Metadata` with `title: "Cuenta bloqueada"` and `robots: "noindex"`
- Full viewport centered layout: dark gradient background (`from-slate-900 to-slate-800`)
- Renders `<PaymentBlockedContent />`

**Spec for `PaymentBlockedContent.tsx`:**
- `"use client"`
- `useEffect` with `history.pushState(null, "", window.location.href)` to prevent back button
- `popstate` listener re-pushes state (prevents back navigation)
- Glassmorphism card (`bg-white/10 backdrop-blur-lg rounded-3xl p-8`)
- Lock icon + "Cuenta bloqueada" heading + description text
- WhatsApp button: `href="https://wa.me/5492265418113" target="_blank" rel="noopener noreferrer"`
- No "Volver" link, no header, no footer

**Dependencies:** None (T4 is independent of the store)

**Verification:**
- Navigate to `/payment-blocked` → see full-page blocked design
- Try browser back → stays on `/payment-blocked`
- WhatsApp button opens in new tab
- Page has `<meta name="robots" content="noindex">`

---

## Group C: Integration

Depends on Group B (the blocker component must exist).

### T5 — Refactor `PaymentStatusGuard.tsx`

**Description:** Replace the current MOROSO toast behavior with `OverduePaymentBlocker`. Add a synchronous session check for `accountStatus === "MOROSO"` to render the blocker on first paint instead of after an async fetch.

**Files:**
- `src/components/PaymentStatusGuard.tsx` — **MODIFIED**

**Changes:**
1. Add `import { useSession } from "next-auth/react"` and `import { OverduePaymentBlocker } from "@/components/OverduePaymentBlocker"`
2. Add synchronous session check: `const { data: session } = useSession()` and `const isMoroso = session?.user?.business?.accountStatus === "MOROSO"`
3. At top of render, before the async status check: if `isMoroso`, return `<OverduePaymentBlocker />`
4. Remove the `toast.error` call for MOROSO (the `id: "payment-error"` toast)
5. Keep the DESACTIVADO path entirely unchanged (it still shows the blocking overlay via `status?.shouldBlock`)
6. Keep warning/info toasts for non-blocking reminders

**Resulting structure:**
```tsx
export const PaymentStatusGuard = () => {
  const { data: session } = useSession();
  const isMoroso = session?.user?.business?.accountStatus === "MOROSO";

  // MOROSO → render blocker immediately (synchronous)
  if (isMoroso) {
    return <OverduePaymentBlocker />;
  }

  // ... existing async status check for DESACTIVADO and reminders
};
```

**Dependencies:** T3 (imports `OverduePaymentBlocker`)

**Verification:**
- When `accountStatus === "MOROSO"`, `PaymentStatusGuard` renders `<OverduePaymentBlocker />` (not toast)
- When `accountStatus === "DESACTIVADO"`, existing blocking overlay shows (unchanged)
- When `accountStatus === "ACTIVO"`, nothing renders (unchanged)
- Warning toast for overdue payment (day 1–10) still shows if applicable

---

### T6 — Cleanup `feature-blocked-modal.tsx`

**Description:** Remove the `"delinquent"` variant from `FeatureBlockedModal` since the overdue payment blocking now lives in the dedicated `OverduePaymentBlocker`.

**Files:**
- `src/components/ui/feature-blocked-modal.tsx` — **MODIFIED**

**Changes:**
1. Remove `"delinquent"` from the `ModalVariant` type union:
   - BEFORE: `type ModalVariant = "feature" | "limit" | "delinquent";`
   - AFTER: `type ModalVariant = "feature" | "limit";`
2. Remove the entire `delinquent: { ... }` entry from the `VARIANTS` record (lines 61–70)
3. Keep `feature` and `limit` variants intact
4. Remove unused imports: `AlertTriangle` from the lucide-react import if it's no longer used

**Dependencies:** None

**Verification:**
- `FeatureBlockedModal` with `variant="feature"` works as before
- `FeatureBlockedModal` with `variant="limit"` works as before
- TypeScript compilation succeeds (no references to `"delinquent"` variant remain)
- Search project for `"delinquent"` to confirm no other references exist

---

## Group D: Action Audit

**Note on file structure:** The design document references `src/actions/stock.ts`, but the actual project has a directory `src/actions/stock/` with split files. Tasks below use the REAL file structure.

**Canonical guard pattern** (add after `auth()` and businessId check in each action):
```typescript
import { assertWritePermission } from "@/lib/auth-gates";

const permission = await assertWritePermission();
if (!permission.success) {
  return { error: permission.error, code: permission.code };
}
```

---

### T7 — Guard `billing.ts` (4 actions) + `sales/process.ts` (2 actions) + `sales/update.ts` (2 actions)

**Total: 8 actions across 3 files**

#### File: `src/actions/billing.ts` — 4 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `updateBusinessBalance` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateProductsStock` | Same | Same |
| `updateMonthlyRankingAction` | Same | Same |
| `saveOrderAction` | Same | Same |

#### File: `src/actions/sales/process.ts` — 2 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `processReturnAction` | `if (!businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateOrderAction` | `if (!businessId \|\| !userId) return { error }` + role check | Add `assertWritePermission()` after `auth()`, BEFORE the role check |
| `processSaleAction` | Already covered by `requireFeature("hasAfipBilling")` (conditional) | **No change needed** per design — but NOTE: `requireFeature` is only called when CAE data is present. Without CAE, `assertWritePermission` is NOT called. If this is a concern, add unconditional `assertWritePermission()` as well. |

#### File: `src/actions/sales/update.ts` — 2 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `updateOrderCaeAction` | `if (!businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `deleteOrderAction` | Same | Same |

**Verification per action:**
- Session check (`if (!session?.user?.businessId)`) is preserved as defense-in-depth
- `assertWritePermission()` is called immediately after `auth()`, before any business logic
- Guard follows the canonical pattern above
- Build succeeds, no TypeScript errors

**Dependencies:** None

---

### T8 — Guard `stock/` actions (9 actions across 3 files) + fix `updateStockAmount` security gap

**Total: 9 actions across 3 files**

#### File: `src/actions/stock/products.ts` — 5 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createProduct` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateProduct` | Same | Same |
| `updateStockAmount` | ❌ **No auth at all** | **Add `const session = await auth(); if (!session?.user?.businessId) return { error: "No autorizado" }`** THEN add `assertWritePermission()` |
| `deleteProduct` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `toggleProductCatalogAction` | Same | Same |

**⚠️ Security gap — `updateStockAmount`:**
- Currently has NO session check, NO auth call. Directly operates on products.
- Must add: `const session = await auth(); if (!session?.user?.businessId) return { error: "No autorizado" };`
- Then add: `const permission = await assertWritePermission(); if (!permission.success) return { error: permission.error, code: permission.code };`
- Note: `updateStockAmount` uses `fail()` from `@/lib/action-result` for its error returns. The guard should follow the existing pattern of the file (either `fail()` or `{ error, code }`), but since the guard runs before any try/catch, `return { error, code }` is simpler.

#### File: `src/actions/stock/suppliers.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createSupplier` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

#### File: `src/actions/stock/bulk.ts` — 3 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `bulkUpdatePrices` | `if (!session?.user?.businessId) return { success: false, error }` | Add `assertWritePermission()` after `auth()` |
| `bulkUpdateAmounts` | Same | Same |
| `createProductsBulk` | Same | Add `assertWritePermission()` after `auth()` |

**Note on `previewProductsBulk`:** Read-only (calculates preview), exempt from guard.
**Note on `processBulkProductBatch`:** This function does not exist in the actual codebase. Skip.
**Note on `finalizeBulkImport`:** This function does not exist in the actual codebase. Skip.

**Verification per action:**
- `updateStockAmount`: `auth()` call + session check added, then `assertWritePermission()`
- All other actions: `assertWritePermission()` added after existing `auth()` call
- Build succeeds

**Dependencies:** None

---

### T9 — Guard remaining actions (6 actions across 6 files) + fix `updateClientBalance` security gap

**Total: 6 actions across 6 files**

#### File: `src/actions/clients.ts` — 2 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createClient` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateClientBalance` | ❌ **No auth at all** | **Add `const session = await auth(); if (!session?.user?.businessId) return { error: "No autorizado" }`** THEN add `assertWritePermission()` |

**⚠️ Security gap — `updateClientBalance`:**
- Currently has NO session check, NO auth call. Directly operates on clients.
- Must add: `const session = await auth(); if (!session?.user?.businessId) return { error: "No autorizado" };`
- Then add: `const permission = await assertWritePermission(); if (!permission.success) return { error: permission.error, code: permission.code };`
- Note: `updateClientBalance` uses `fail()` from `@/lib/action-result`. The guard should use `{ error, code }` pattern since it's outside the try/catch.

#### File: `src/actions/categories.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createCategory` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

#### File: `src/actions/subcategories.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createSubcategory` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

#### File: `src/actions/brands.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createBrand` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

#### File: `src/actions/movements.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createMovement` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

#### File: `src/actions/business-config.ts` — 1 action

| Action | Current Auth | Change |
|--------|-------------|--------|
| `updateBusinessConfig` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |

**Verification per action:**
- `updateClientBalance`: `auth()` call + session check added, then `assertWritePermission()`
- All other actions: `assertWritePermission()` added after existing `auth()` call
- Build succeeds

**Dependencies:** None

---

### T10 — Guard `unpaid-orders.ts` (5 actions)

**Total: 5 actions in 1 file**

#### File: `src/actions/unpaid-orders.ts` — 5 actions

| Action | Current Auth | Change |
|--------|-------------|--------|
| `registerPayment` | `if (!businessId) return { success: false, error }` | Add `assertWritePermission()` after `auth()` |
| `cancelUnpaidOrder` | Same | Same |
| `addItemsToOrder` | Same | Same |
| `updateOrderItem` | Same | Same |
| `removeOrderItem` | Same | Same |

**Note:** `createUnpaidOrder` is already covered — it calls `requireFeature("hasClientLedger")` which internally calls `assertWritePermission()`. No change needed.

**Note on pattern:** These actions use `ActionResult` type with `{ success: false, error }` shape. The guard should use the same pattern: `if (!permission.success) return { success: false, error: permission.error };` — or include the code via `{ success: false, error: permission.error, code: permission.code }`.

**Verification:**
- Each of the 5 actions has `assertWritePermission()` after `auth()` / businessId check
- Build succeeds
- No TypeScript errors with `ActionResult` return types

**Dependencies:** None

---

### Summary: Action Audit Count

| File | Actions | Guard Added | Security Gap Fixed |
|------|---------|-------------|-------------------|
| `src/actions/billing.ts` | 4 | ✅ | — |
| `src/actions/stock/products.ts` | 5 | ✅ | `updateStockAmount` |
| `src/actions/stock/suppliers.ts` | 1 | ✅ | — |
| `src/actions/stock/bulk.ts` | 3 | ✅ | — |
| `src/actions/clients.ts` | 2 | ✅ | `updateClientBalance` |
| `src/actions/categories.ts` | 1 | ✅ | — |
| `src/actions/subcategories.ts` | 1 | ✅ | — |
| `src/actions/brands.ts` | 1 | ✅ | — |
| `src/actions/movements.ts` | 1 | ✅ | — |
| `src/actions/business-config.ts` | 1 | ✅ | — |
| `src/actions/sales/process.ts` | 2 | ✅ | — |
| `src/actions/sales/update.ts` | 2 | ✅ | — |
| `src/actions/unpaid-orders.ts` | 5 | ✅ | — |
| **Total** | **29** | **29** | **2** |

**Already covered (no changes needed):**
- `src/actions/budget.ts` → `createBudgetAction` calls `requireFeature("hasBudget")`
- `src/actions/sales/process.ts` → `processSaleAction` conditionally calls `requireFeature("hasAfipBilling")`
- `src/actions/ledger/index.ts` → both actions call `requireFeature("hasClientLedger")`
- `src/actions/unpaid-orders.ts` → `createUnpaidOrder` calls `requireFeature("hasClientLedger")`
- `src/actions/orders.ts` → already directly calls `assertWritePermission()`
- `src/actions/plan.ts` → `getTrialInfo` is read-only
- `src/actions/voucher.ts` → `getVoucherNumberAction` is read-only

---

## Group E: Verification

Depends on all implementation tasks (Group C + D).

### T11 — Build & Verification

**Description:** Run the full build pipeline, verify lint passes, and manually confirm all acceptance criteria from the spec.

**Files:** None (verification only)

**Checklist:**

- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run lint` passes with no new warnings/errors
- [ ] Regressions: existing Server Actions not in the audit still work (orders, budget, ledger, superadmin, business)
- [ ] All 29 actions in audit have `assertWritePermission()` call

**Manual smoke tests:**
- [ ] `OverduePaymentBlocker` renders at `z-[99999]` above all content
- [ ] No close/X/Escape mechanisms work on the blocker
- [ ] WhatsApp button opens `https://wa.me/5492265418113` in new tab
- [ ] DevTools DOM removal → redirect to `/payment-blocked` within 100ms
- [ ] `/payment-blocked` shows glassmorphism card with WhatsApp button, no back navigation
- [ ] Polling: 30s interval active when `isDelinquent === true`
- [ ] `PaymentStatusGuard` renders `<OverduePaymentBlocker />` for MOROSO, existing overlay for DESACTIVADO
- [ ] `feature-blocked-modal.tsx`: `"delinquent"` variant no longer exists
- [ ] `updateStockAmount` now has session auth
- [ ] `updateClientBalance` now has session auth

**Dependencies:** T5, T6, T7, T8, T9, T10

---

## Dependency Graph

```
T1 (store) ──→ T2 (interceptor)
                   │
T1 ──→ T3 (blocker) ──→ T5 (PaymentStatusGuard refactor)
                   │
T4 (payment-blocked page) ──→ T5 (for completeness check)
                             
T6 (feature-blocked-modal cleanup) [independent]

T7 (billing + sales audit) ──┐
T8 (stock audit) ─────────────┤
T9 (remaining audit) ─────────┤──→ T11 (verification)
T10 (unpaid-orders audit) ────┘

T5 + T6 ──→ T11
```

---

## File Change Summary

| File | Type | Task |
|------|------|------|
| `src/stores/useDelinquentStore.ts` | **NEW** | T1 |
| `src/lib/delinquent-interceptor.ts` | **NEW** | T2 |
| `src/components/OverduePaymentBlocker.tsx` | **NEW** | T3 |
| `src/app/payment-blocked/page.tsx` | **NEW** | T4 |
| `src/app/payment-blocked/PaymentBlockedContent.tsx` | **NEW** | T4 |
| `src/components/PaymentStatusGuard.tsx` | MODIFIED | T5 |
| `src/components/ui/feature-blocked-modal.tsx` | MODIFIED | T6 |
| `src/actions/billing.ts` | MODIFIED | T7 |
| `src/actions/sales/process.ts` | MODIFIED | T7 |
| `src/actions/sales/update.ts` | MODIFIED | T7 |
| `src/actions/stock/products.ts` | MODIFIED | T8 |
| `src/actions/stock/suppliers.ts` | MODIFIED | T8 |
| `src/actions/stock/bulk.ts` | MODIFIED | T8 |
| `src/actions/clients.ts` | MODIFIED | T9 |
| `src/actions/categories.ts` | MODIFIED | T9 |
| `src/actions/subcategories.ts` | MODIFIED | T9 |
| `src/actions/brands.ts` | MODIFIED | T9 |
| `src/actions/movements.ts` | MODIFIED | T9 |
| `src/actions/business-config.ts` | MODIFIED | T9 |
| `src/actions/unpaid-orders.ts` | MODIFIED | T10 |
