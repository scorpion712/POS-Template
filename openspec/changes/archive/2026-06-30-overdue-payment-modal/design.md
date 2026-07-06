# Design: Overdue Payment Blocker

> **Change:** `overdue-payment-modal` (FR-023)
> **Status:** Draft
> **Depends on:** None

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Component Design](#2-component-design)
3. [State Management](#3-state-management)
4. [Interceptor Layer](#4-interceptor-layer)
5. [PaymentStatusGuard Refactor](#5-paymentstatusguard-refactor)
6. [FeatureBlockedModal Cleanup](#6-featureblockedmodal-cleanup)
7. [/payment-blocked Page](#7-payment-blocked-page)
8. [Action Audit](#8-action-audit)
9. [File-by-File Change Summary](#9-file-by-file-change-summary)
10. [Edge Cases & Risks](#10-edge-cases--risks)

---

## 1. Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Root Layout                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  <PaymentStatusGuard>                                    │   │
│  │    ├── DESACTIVADO → existing blocking overlay (unchanged)│   │
│  │    └── MOROSO → <OverduePaymentBlocker />                 │   │
│  │       ├── useDelinquentStore.isDelinquent === true        │   │
│  │       ├── MutationObserver on own root DOM node           │   │
│  │       ├── FocusScope (radix)                              │   │
│  │       └── Polling: getBusinessStatusAction() every 30s    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  {children} (protected content)                          │   │
│  │    └── Client Component calls Server Action              │   │
│  │         └── via delinquent-interceptor.ts wrapper         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### State Sources (in priority order)

| Source | When | How |
|--------|------|-----|
| `session.user.business.accountStatus` | First paint (synchronous) | `useSession()` → check `accountStatus === "MOROSO"` |
| `delinquent-interceptor` | After any Server Action returns `{ code: "DELINQUENT" }` | Calls `useDelinquentStore.setDelinquent(true)` |
| Polling: `getBusinessStatusAction()` | Every 30s while `isDelinquent === true` | Calls `useDelinquentStore.setDelinquent(true/false)` |

### Key Decisions

1. **Zustand over React Context** — The interceptor needs to set state from OUTSIDE the React tree (plain utility function). Context requires a provider wrapper. Zustand's store can be imported and called synchronously anywhere. Zustand 5 is already in the project.

2. **Single store, two states** — `isDelinquent: boolean` and `showBlocker: boolean` are semantically different: `isDelinquent` reflects actual server status, `showBlocker` is the display flag. They are always set together but separated for clarity in case we need to decouple them in the future.

3. **MutationObserver in the component, not a separate abstraction** — The overlay component owns its DOM node, so the MutationObserver lives inside it. No need for a separate hook or service — the observer only watches `this.overlayRef.current`'s parent.

4. **No flash** — Session is available synchronously via `useSession()` in the client. The check `business.accountStatus === "MOROSO"` is a simple property access, no fetch. The overlay renders on the very first React commit, before any paint.

5. **assertWritePermission return type** — Currently returns `ActionResult`. All Server Actions that already use it check `if (!permissionResult.success) return { error: permissionResult.error }`. New additions follow the same pattern. Actions that use `requireFeature` or `assertLimit` are already covered (they call `assertWritePermission` internally).

---

## 2. OverduePaymentBlocker Component

### File: `src/components/OverduePaymentBlocker.tsx` (NEW)

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, AlertTriangle } from "lucide-react";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { useDelinquentStore } from "@/stores/useDelinquentStore";
import { getBusinessStatusAction } from "@/actions/business";

const POLL_INTERVAL = 30_000; // 30 seconds
const WHATSAPP_NUMBER = "5492265418113";
```

### Render Logic

```
isDelinquent === true → render fullscreen overlay
isDelinquent === false → return null
```

### Structure

```
<div ref={overlayRef} className="fixed inset-0 z-[99999] ...">  ← pointer-events-none
  <FocusScope trapped loop>
    <div className="...modal-card..." role="alertdialog" aria-modal="true">  ← pointer-events-auto
      <div> icon (AlertTriangle) </div>
      <h2> Cuenta con deuda </h2>
      <p> Tu cuenta posee facturas vencidas impagas. </p>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <Button> Contactar por WhatsApp </Button>
      </a>
    </div>
  </FocusScope>
</div>
```

### Critical Behaviors

| Behavior | Implementation |
|----------|---------------|
| **No close** | No X button, no "Entendido", no `onOpenChange` |
| **No Escape** | `<FocusScope>` from Radix does not auto-close on Escape. We also add `onKeyDown={(e) => e.key === "Escape" && e.preventDefault()}` on the outer div |
| **No click outside** | Overlay covers 100% of viewport (`fixed inset-0`). Nothing outside is reachable |
| **Content behind is inert** | Outer wrapper has `pointer-events-none`, modal card has `pointer-events-auto` |
| **WhatsApp opens in new tab** | `target="_blank" rel="noopener noreferrer"`. Modal stays visible. |
| **Backdrop** | `bg-black/70 backdrop-blur-sm` |
| **Focus trap** | `@radix-ui/react-focus-scope` traps Tab cycling inside the modal card |
| **Screen reader** | `role="alertdialog" aria-modal="true" aria-label="Cuenta con deuda"` |

### MutationObserver (DevTools Evasion)

```typescript
useEffect(() => {
  if (!isDelinquent) return;

  const node = overlayRef.current;
  if (!node) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === node || node.contains(removedNode as Node)) {
          window.location.href = "/payment-blocked";
          return;
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}, [isDelinquent]);
```

**Why this works:** We observe `document.body` for childList + subtree changes. When DevTools removes the overlay's root div, the observer fires and immediately navigates. The check `removedNode === node || node.contains(removedNode as Node)` catches both direct removal and removal of a parent.

### Polling

```typescript
useEffect(() => {
  if (!isDelinquent) return;

  const poll = async () => {
    const result = await getBusinessStatusAction();
    if (result?.status === "ACTIVO") {
      useDelinquentStore.getState().setDelinquent(false);
    }
  };

  const intervalId = setInterval(poll, POLL_INTERVAL);
  return () => clearInterval(intervalId);
}, [isDelinquent]);
```

Only active when `isDelinquent === true`. The component re-renders when the store changes, so cleanup runs automatically.

### Initial Check (Synchronous from Session)

```typescript
const { data: session } = useSession();
const { isDelinquent, setDelinquent } = useDelinquentStore();

// Sync session state on mount (only once)
useEffect(() => {
  if (session?.user?.business?.accountStatus === "MOROSO") {
    setDelinquent(true);
  }
}, [session]);
```

The session is available on first render (NextAuth session is loaded in the provider). This ensures the overlay renders immediately, no flash of content.

### Edge Cases

- **Session not yet loaded** → `session` is `undefined` → `isDelinquent` defaults to `false` → no overlay. When session loads, if MOROSO, overlay appears. This means there's a brief flash of content while the session loads. Acceptable tradeoff — the backend guards prevent any mutation. To eliminate this, we could read from a cookie set server-side, but that's out of scope.
- **Poll detects ACTIVO** → `setDelinquent(false)` → component returns `null` → user can interact. Next Server Action call will succeed.

---

## 3. useDelinquentStore (Zustand)

### File: `src/stores/useDelinquentStore.ts` (NEW)

```typescript
import { create } from "zustand";

interface DelinquentState {
  /** True when the business accountStatus === "MOROSO" */
  isDelinquent: boolean;
  /** True when the blocker should be visible (mirrors isDelinquent) */
  showBlocker: boolean;

  /** Set both isDelinquent and showBlocker */
  setDelinquent: (status: boolean) => void;
  /** Force show the blocker (called by interceptor) */
  triggerBlocker: () => void;
}

export const useDelinquentStore = create<DelinquentState>((set) => ({
  isDelinquent: false,
  showBlocker: false,

  setDelinquent: (status) =>
    set({ isDelinquent: status, showBlocker: status }),

  triggerBlocker: () =>
    set({ isDelinquent: true, showBlocker: true }),
}));
```

### Why two fields?

`isDelinquent` = source-of-truth status from server. `showBlocker` = display decision. Currently always set together, but separating them means:
- We could show the blocker based on interceptor signals even without polling confirmation
- We could delay hiding the blocker after status changes to ACTIVO (fade-out transition)
- Cleaner mental model for debug logging

### Usage

```typescript
// In OverduePaymentBlocker
const isDelinquent = useDelinquentStore((s) => s.isDelinquent);

// In delinquent-interceptor (outside React)
import { useDelinquentStore } from "@/stores/useDelinquentStore";
useDelinquentStore.getState().setDelinquent(true);
```

---

## 4. delinquent-interceptor (Utility)

### File: `src/lib/delinquent-interceptor.ts` (NEW)

```typescript
import { useDelinquentStore } from "@/stores/useDelinquentStore";

type ActionResult = { error?: string; code?: string; success?: boolean } | 
                    { success: false; error: string; code?: string };

/**
 * Wraps a Server Action call and detects DELINQUENT responses.
 * When DELINQUENT is detected:
 *   - Shows the overdue blocker (via Zustand)
 *   - Does NOT show a toast
 *   - Returns the original response so the caller can still handle it
 */
export async function withDelinquentGuard<T extends ActionResult>(
  actionCall: Promise<T>
): Promise<T> {
  const result = await actionCall;

  if (
    "code" in result && 
    result.code === "DELINQUENT" &&
    "success" in result &&
    result.success === false
  ) {
    useDelinquentStore.getState().setDelinquent(true);
    // No toast — the blocker is the notification
  }

  return result;
}
```

### Usage Pattern

```typescript
// Before
const result = await createProduct(data);

// After
const result = await withDelinquentGuard(createProduct(data));
```

### Integration Strategy

The interceptor is opt-in, not automatic. We add it to:
1. All client components that call mutation Server Actions
2. The `PaymentStatusGuard` poll (already covered by component-level check)

**Why not automatic?** Wrapping every Server Action call globally would require monkey-patching or middleware. Opt-in is simpler, more explicit, and matches the existing codebase pattern.

**Alternative considered:** A React hook `useDelinquentAction` that wraps `startTransition`. Rejected because it would require changing every call site to use a hook, which is more invasive. `withDelinquentGuard` is a plain function that works anywhere.

---

## 5. PaymentStatusGuard Refactor

### File: `src/components/PaymentStatusGuard.tsx` (MODIFIED)

Current behavior:
- `DESACTIVADO` → renders blocking overlay (icon + email)
- `MOROSO` → shows dismissable toast via `toast.error()`

New behavior:
- `DESACTIVADO` → unchanged
- `MOROSO` → renders `<OverduePaymentBlocker />` instead of toast
- Toast import for MOROSO removed (the warning toast for "pago vencido" stays if desired)

### Key Changes

1. Remove `toast` from imports for MOROSO path
2. When `status.status === "MOROSO"` → render `<OverduePaymentBlocker />`
3. The existing `shouldBlock` check already handles `DESACTIVADO` — keep that branch
4. Remove the `toast.error` call for MOROSO (line that shows `id: "payment-error"`)

### Resulting Structure

```typescript
if (status?.shouldBlock) {
  // DESACTIVADO path — existing overlay (unchanged)
  return (/* existing blocking overlay */);
}

// MOROSO path — only when shouldBlock is false but status is MOROSO
// (shouldBlock is currently only true for DESACTIVADO)
// The OverduePaymentBlocker reads from the Zustand store, not from this component's state
```

Wait — actually looking at the existing code more carefully:

```typescript
// Current getBusinessStatusAction returns:
// - DESACTIVADO → shouldBlock: true, type: "error"
// - MOROSO (not explicitly handled) → shouldBlock stays false via default
```

The current `getBusinessStatusAction` does NOT return `shouldBlock: true` for MOROSO. It only returns it for `DESACTIVADO`. So the current component only blocks for `DESACTIVADO`.

The refactored approach: The `PaymentStatusGuard` continues to handle `DESACTIVADO` as before. The MOROSO path is now handled entirely by `OverduePaymentBlocker`, which reads from the Zustand store (set via session check, interceptor, and polling).

So the actual refactor in `PaymentStatusGuard`:
1. Remove the `toast.error` call for MOROSO (the `toast.error(res.message, { id: "payment-error", duration: Infinity })` line — this is what currently shows the dismissable toast)
2. No need to render `<OverduePaymentBlocker />` from here — the blocker is already mounted at the layout level via `PaymentStatusGuard`'s own return

Actually, hold on — the current `PaymentStatusGuard` checks status via `getBusinessStatusAction()`, which runs in a `useEffect`. If we want the overlay to show immediately on first paint, we need the session check, not an async fetch.

Let me reconsider the architecture. The `OverduePaymentBlocker` reads from the Zustand store. The store is hydrated:
1. On mount (in OverduePaymentBlocker's useEffect): check `session.user.business.accountStatus`
2. Via interceptor: when any Server Action returns DELINQUENT
3. Via polling: every 30s

So the PaymentStatusGuard doesn't need to render OverduePaymentBlocker — the blocker already lives at the layout level and manages its own visibility.

Actually, re-reading the spec: "PaymentStatusGuard Refactor: MOROSO path → render `<OverduePaymentBlocker />` instead of toast". This means the blocker is rendered BY PaymentStatusGuard.

But that conflicts with "render overlay on first paint if status is MOROSO" because PaymentStatusGuard currently checks `getBusinessStatusAction()` in a useEffect (async).

New approach for PaymentStatusGuard:
1. Keep existing `DESACTIVADO` path unchanged
2. For MOROSO: use `useSession()` to check `business.accountStatus` synchronously, render `<OverduePaymentBlocker />` if MOROSO

Let me design this properly:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getBusinessStatusAction } from "@/actions/business";
import { OverduePaymentBlocker } from "@/components/OverduePaymentBlocker";
import { AlertTriangle, Lock } from "lucide-react";

export const PaymentStatusGuard = () => {
  const { data: session } = useSession();
  
  // Synchronous check from session
  const isMoroso = session?.user?.business?.accountStatus === "MOROSO";
  
  // DESACTIVADO check still needs the async call for the full message
  const [status, setStatus] = useState<{...} or null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const res = await getBusinessStatusAction();
      if (res) {
        setStatus(res);
        // ... show warning/info toasts (but NOT error for MOROSO)
      }
    };
    checkStatus();
  }, []);

  // MOROSO → render blocker (synchronous, immediate)
  if (isMoroso) {
    return <OverduePaymentBlocker />;
  }

  // DESACTIVADO → existing blocking overlay
  if (status?.shouldBlock) {
    return (/* existing DESACTIVADO overlay */);
  }

  return null;
};
```

This way:
- MOROSO blocks on first paint (session check is synchronous)
- DESACTIVADO still blocks via the async check (it's already working)
- No toast shown for MOROSO

---

## 6. FeatureBlockedModal Cleanup

### File: `src/components/ui/feature-blocked-modal.tsx` (MODIFIED)

**Changes:**
1. Remove `"delinquent"` from `ModalVariant` type union
2. Remove the `delinquent` entry from the `VARIANTS` record
3. No other changes — `feature` and `limit` variants stay intact

### Before
```typescript
type ModalVariant = "feature" | "limit" | "delinquent";
```

### After
```typescript
type ModalVariant = "feature" | "limit";
```

Remove the entire `delinquent: { ... }` block from `VARIANTS`.

---

## 7. /payment-blocked Page

### File: `src/app/payment-blocked/page.tsx` (NEW)

RSC (Server Component) — no "use client".

```typescript
import type { Metadata } from "next";
import { PaymentBlockedContent } from "./PaymentBlockedContent";

export const metadata: Metadata = {
  title: "Cuenta bloqueada",
  robots: "noindex",  // via next-seo or metadata
};

export default function PaymentBlockedPage() {
  return (
    // Full viewport centered layout
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <PaymentBlockedContent />
    </div>
  );
}
```

### PaymentBlockedContent (Client Component)

```typescript
"use client";

import { useEffect } from "react";
import { MessageCircle, Lock } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5492265418113";

export function PaymentBlockedContent() {
  // Prevent browser back button
  useEffect(() => {
    history.pushState(null, "", window.location.href);
    
    const handlePopState = () => {
      history.pushState(null, "", window.location.href);
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="max-w-md w-full">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center space-y-6 border border-white/10 shadow-2xl">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-10 w-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Cuenta bloqueada
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Tu cuenta tiene facturas vencidas impagas. 
            Contactanos para regularizar tu situación.
          </p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="..."
        >
          <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white ...">
            <MessageCircle className="h-5 w-5" />
            Contactar por WhatsApp
          </Button>
        </a>
      </div>
    </div>
  );
}
```

### Key Behaviors

| Behavior | Implementation |
|----------|---------------|
| **No back navigation** | `history.pushState` on mount + `popstate` listener re-pushes |
| **No index** | `robots: "noindex"` in metadata |
| **WhatsApp opens in new tab** | `target="_blank"` on the link. Since this is the only action, the blocked tab stays |
| **No navigation links** | Only the WhatsApp link. No "Volver", no header, no footer |
| **Styling** | Dark gradient background, glassmorphism card, brand consistent |

---

## 8. Action Audit

### Pattern

Every mutation Server Action that does NOT already call `requireFeature()` or `assertLimit()` (which internally call `assertWritePermission()`) needs the following added at the top, after `auth()`:

```typescript
const permission = await assertWritePermission();
if (!permission.success) {
  return { error: permission.error, code: permission.code };
}
```

### Already Covered (no changes needed)

| File | Action(s) | Reason |
|------|-----------|--------|
| `src/actions/orders.ts` | `createOrder`, `updateOrderStatus`, `getOrderForPrint`, `updateOrderPaidStatus` | Already call `assertWritePermission()` directly |
| `src/actions/budget.ts` | `createBudgetAction` | Calls `requireFeature("hasBudget")` |
| `src/actions/sales/process.ts` | `processSaleAction` | Calls `requireFeature("hasAfipBilling")` (conditional) |
| `src/actions/ledger/index.ts` | `createLedgerAccountAction`, `addProductsToLedgerAction` | Both call `requireFeature("hasClientLedger")` |
| `src/actions/unpaid-orders.ts` | `createUnpaidOrder` | Calls `requireFeature("hasClientLedger")` |
| `src/actions/stock.ts` | `processBulkProductBatch` | Calls `assertLimit("maxProducts", ...)` |

### Actions Needing `assertWritePermission()`

**Note:** `assertWritePermission()` replaces the manual `if (!session?.user?.businessId) return { error: "No autorizado" }` check in files that currently have it. Both are redundant — `assertWritePermission` already checks for authenticated session. Keep both for defense-in-depth? No — `assertWritePermission()` returns the DELINQUENT code, which is the whole point. Replace the manual check.

#### 1. `src/actions/billing.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `updateBusinessBalance` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateProductsStock` | Same | Same |
| `updateMonthlyRankingAction` | Same | Same |
| `saveOrderAction` | Same | Same |

#### 2. `src/actions/stock.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createSupplier` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `createProduct` | Same | Same |
| `updateProduct` | Same | Same |
| `updateStockAmount` | ❌ No auth at all (only catches thrown errors) | Add `auth()` + `assertWritePermission()` |
| `deleteProduct` | `if (!session?.user?.businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `bulkUpdatePrices` | Same | Same |
| `bulkUpdateAmounts` | Same | Same |
| `toggleProductCatalogAction` | Same | Same |
| `finalizeBulkImport` | Same | Same |
| `createProductsBulk` | Same | Same (delegates to `processBulkProductBatch` which already has `assertLimit` → covered) |

**Note on `createProductsBulk`:** It calls `processBulkProductBatch` which has `assertLimit`. However, `createProductsBulk` itself performs no DB mutations — it's a coordinator. It's still good practice to add the guard for early rejection.

**Note on `updateStockAmount`:** This action has NO session check at all — it directly operates on products. This is a bug. It needs both `auth()` and `assertWritePermission()` added.

#### 3. `src/actions/clients.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `createClient` | `if (!session?.user?.businessId) return { error }` + `checkLimit` | Add `assertWritePermission()` after `auth()` |
| `updateClientBalance` | ❌ No auth at all (uses `fail()` for generic errors, no session check) | Add `auth()` + `assertWritePermission()` |

**Note on `updateClientBalance`:** No session check exists. This is a security gap. Add `const session = await auth(); if (!session?.user?.businessId) return { error: "No autorizado" }` + `assertWritePermission()`.

#### 4. `src/actions/categories.ts`

| Action | Change |
|--------|--------|
| `createCategory` | Add `assertWritePermission()` after `auth()` |

#### 5. `src/actions/subcategories.ts`

| Action | Change |
|--------|--------|
| `createSubcategory` | Add `assertWritePermission()` after `auth()` |

#### 6. `src/actions/brands.ts`

| Action | Change |
|--------|--------|
| `createBrand` | Add `assertWritePermission()` after `auth()` |

#### 7. `src/actions/movements.ts`

| Action | Change |
|--------|--------|
| `createMovement` | Add `assertWritePermission()` after `auth()` |

#### 8. `src/actions/business-config.ts`

| Action | Change |
|--------|--------|
| `updateBusinessConfig` | Add `assertWritePermission()` after `auth()` |

#### 9. `src/actions/sales/process.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `processReturnAction` | `if (!businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `updateOrderAction` | `if (!businessId || !userId) return { error }` + role check | Add `assertWritePermission()` after `auth()` |

**Note on `updateOrderAction`:** Currently has role check (`ADMIN` only). Keep that AFTER the `assertWritePermission` check. `assertWritePermission` checks MOROSO status; the role check is a separate concern.

#### 10. `src/actions/sales/update.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `updateOrderCaeAction` | `if (!businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `deleteOrderAction` | Same | Same |

#### 11. `src/actions/unpaid-orders.ts`

| Action | Current Auth | Change |
|--------|-------------|--------|
| `registerPayment` | `if (!businessId) return { error }` | Add `assertWritePermission()` after `auth()` |
| `cancelUnpaidOrder` | Same | Same |
| `addItemsToOrder` | Same | Same |
| `updateOrderItem` | Same | Same |
| `removeOrderItem` | Same | Same |

**Note:** `createUnpaidOrder` already calls `requireFeature("hasClientLedger")` → covered by `assertWritePermission` inside it. ✅

#### 12. `src/actions/ledger/index.ts`

Already covered by `requireFeature("hasClientLedger")`. ✅

#### 13. `src/actions/plan.ts`

`getTrialInfo` is read-only. No change needed. ✅

#### 14. `src/actions/voucher.ts`

`getVoucherNumberAction` is read-only (fetches from external API, no DB mutation). No change needed. ✅

### Audit Summary

| File | Actions Requiring Guard |
|------|------------------------|
| `src/actions/billing.ts` | 4 |
| `src/actions/stock.ts` | 9 (excluding `createProductsBulk`) |
| `src/actions/clients.ts` | 2 |
| `src/actions/categories.ts` | 1 |
| `src/actions/subcategories.ts` | 1 |
| `src/actions/brands.ts` | 1 |
| `src/actions/movements.ts` | 1 |
| `src/actions/business-config.ts` | 1 |
| `src/actions/sales/process.ts` | 2 |
| `src/actions/sales/update.ts` | 2 |
| `src/actions/unpaid-orders.ts` | 5 |
| **Total** | **29** |

### Implementation Snippet (Canonical Form)

```typescript
// BEFORE
export const someAction = async (data: Input) => {
  const session = await auth();
  if (!session?.user?.businessId) return { error: "No autorizado" };
  // ... database operations
};

// AFTER
import { assertWritePermission } from "@/lib/auth-gates";

export const someAction = async (data: Input) => {
  const session = await auth();
  if (!session?.user?.businessId) return { error: "No autorizado" };
  
  const permission = await assertWritePermission();
  if (!permission.success) {
    return { error: permission.error, code: permission.code };
  }
  
  // ... database operations
};
```

---

## 9. File-by-File Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| `src/components/OverduePaymentBlocker.tsx` | **NEW** | Fullscreen immovable overlay, MutationObserver, focus trap, polling, WhatsApp CTA |
| `src/app/payment-blocked/page.tsx` | **NEW** | RSC page, noindex, dark gradient, glassmorphism card |
| `src/app/payment-blocked/PaymentBlockedContent.tsx` | **NEW** | Client component: history.pushState, WhatsApp button |
| `src/stores/useDelinquentStore.ts` | **NEW** | Zustand store: `{ isDelinquent, showBlocker, setDelinquent, triggerBlocker }` |
| `src/lib/delinquent-interceptor.ts` | **NEW** | `withDelinquentGuard<T>(actionCall): Promise<T>` — catches DELINQUENT, sets store |
| `src/components/PaymentStatusGuard.tsx` | **MODIFIED** | Add synchronous session check for MOROSO → render `<OverduePaymentBlocker />`. Remove toast for MOROSO. Keep DESACTIVADO path as-is. |
| `src/components/ui/feature-blocked-modal.tsx` | **MODIFIED** | Remove `"delinquent"` from `ModalVariant` type and `VARIANTS` record |
| `src/app/layout.tsx` | No change | `PaymentStatusGuard` already mounted |
| `src/actions/billing.ts` | **MODIFIED** | Add `assertWritePermission()` to 4 mutation actions |
| `src/actions/stock.ts` | **MODIFIED** | Add `assertWritePermission()` to 9 mutation actions (fix `updateStockAmount` session bug) |
| `src/actions/clients.ts` | **MODIFIED** | Add `assertWritePermission()` to 2 mutation actions (fix `updateClientBalance` session gap) |
| `src/actions/categories.ts` | **MODIFIED** | Add `assertWritePermission()` to `createCategory` |
| `src/actions/subcategories.ts` | **MODIFIED** | Add `assertWritePermission()` to `createSubcategory` |
| `src/actions/brands.ts` | **MODIFIED** | Add `assertWritePermission()` to `createBrand` |
| `src/actions/movements.ts` | **MODIFIED** | Add `assertWritePermission()` to `createMovement` |
| `src/actions/business-config.ts` | **MODIFIED** | Add `assertWritePermission()` to `updateBusinessConfig` |
| `src/actions/sales/process.ts` | **MODIFIED** | Add `assertWritePermission()` to `processReturnAction` and `updateOrderAction` |
| `src/actions/sales/update.ts` | **MODIFIED** | Add `assertWritePermission()` to `updateOrderCaeAction` and `deleteOrderAction` |
| `src/actions/unpaid-orders.ts` | **MODIFIED** | Add `assertWritePermission()` to `registerPayment`, `cancelUnpaidOrder`, `addItemsToOrder`, `updateOrderItem`, `removeOrderItem` |

### Count: 6 new files + 12 modified files = 18 total

---

## 10. Edge Cases & Risks

### Edge Cases

| Scenario | Behavior | Notes |
|----------|----------|-------|
| **Session loading** | Brief flash of content while NextAuth loads session | Acceptable — backend guards prevent mutations during this window |
| **MOROSO → ACTIVO transition** | Poll detects change at next 30s interval (or next Server Action triggers interceptor with success) | Component re-renders, returns null, overlay disappears |
| **ACTIVO → MOROSO transition** | Poll detects change at next 30s interval (or next Server Action returns DELINQUENT) | Component re-renders, overlay appears |
| **Multiple rapid DELINQUENT responses** | Zustand `setDelinquent(true)` is idempotent — no thrash | The blocker is already visible |
| **Network error during polling** | `getBusinessStatusAction` returns `null` → no state change | Existing status preserved. Next poll retries in 30s |
| **MutationObserver fires for parent removal** | `document.body` observer catches any ancestor removal | `contains()` check catches if a parent is removed |
| **User opens WhatsApp, returns to tab** | Modal is still visible | No state change on visibility change |
| **User removes overlay AND `/payment-blocked` elements** | At that point no fallback — user is intentionally breaking their own UI | Not a security boundary, per spec |

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **MutationObserver performance** | Low | Observer is disconnected when `isDelinquent === false`. Only active while blocker is visible. |
| **Zustand store and session desync** | Low | Polling ensures state is refreshed within 30s. Interceptor catches it immediately on any action. |
| **Forgotten interceptor wrapping** | Med | The `withDelinquentGuard` wrapper is opt-in. Missing it means DELINQUENT falls through to a toast (if the caller has error handling) or shows nothing except the backend rejection. The backend is the source of truth — no data corruption risk. |
| **assertWritePermission added to read-only action by mistake** | Low | Spec explicitly lists only mutation actions. Reviewers should catch this. |
| **assertWritePermission blocks superadmin actions** | None | Superadmin bypasses via role check — but wait, `assertWritePermission` only checks MOROSO, not role. Superadmin actions in a MOROSO business would be blocked. **This is intentional.** If superadmin wants to change the status, they should use the admin panel's `updateBusinessStatusAction`. Regular actions by superadmin users in a MOROSO business should also be blocked. |
| **Backward compat: actions returning `{ error }` without `code`** | Low | Interceptor checks for `code === "DELINQUENT"` — if missing, it won't trigger. Those actions would need `assertWritePermission` to return the code. Already implemented in `auth-gates.ts`. |

---

## Appendix A: assertWritePermission Return Contract

```typescript
// Success
{ success: true, data: { id, businessId, role, business } }

// Unauthenticated
{ success: false, error: "Debes iniciar sesión...", code: "UNAUTHENTICATED" }

// Delinquent
{ success: false, error: "Acción bloqueada...", code: "DELINQUENT" }
```

## Appendix B: Server Action Error Response Contract

All mutation actions follow this return shape:

```typescript
// Success
{ success: true, ...data }

// Error
{ error: string, code?: string }
```

The interceptor checks for `code === "DELINQUENT"` specifically. Other error codes pass through unchanged.

## Appendix C: Polling vs WebSocket Decision

| Approach | Pros | Cons |
|----------|------|------|
| **Polling (chosen)** | Simple, no WebSocket infrastructure, works with any backend | 30s delay in detecting ACTIVO transition |
| **Pusher WebSocket** | Instant status change | Already in project but for different use cases; adds complexity for a simple check |

Polling is adequate because:
- MOROSO→ACTIVO transition is admin-driven, not time-critical
- 30s is acceptable for a lock screen
- Server Action interceptor catches it immediately if user tries any action
- Polling is already a pattern the codebase uses (no new infra)

---

*Design prepared for change `overdue-payment-modal` (FR-023)*
