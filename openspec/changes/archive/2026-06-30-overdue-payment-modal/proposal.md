# Proposal: Overdue Payment Blocker

## Intent

FR-023 — When a business has `accountStatus = "MOROSO"`, all interaction must be blocked by an immovable modal. Current `PaymentStatusGuard` only shows a dismissable toast for MOROSO — no blocking. Backend via `assertWritePermission()` already returns `DELINQUENT` errors, but frontend doesn't intercept them to show the modal.

## Scope

### In Scope
- New `OverduePaymentBlocker` component (immovable fullscreen overlay, no close/X/Escape)
- MutationObserver to detect DOM removal → redirect to `/payment-blocked`
- `/payment-blocked` static route (final fallback page)
- Frontend interceptor for `DELINQUENT` Server Action errors → show overlay (not toast)
- Audit ~22 uncovered Server Actions, add `assertWritePermission()` to each

### Out of Scope
- Changes to `FeatureBlockedModal` (feature/plan/limit modals stay as-is)
- Changes to `PaymentStatusGuard` for `DESACTIVADO` status (already works)
- Styling improvements beyond what's needed for the blocker

## Capabilities

### New Capabilities
- `overdue-payment-blocker`: Immovable fullscreen overlay for MOROSO status, DevTools evasion, and `DELINQUENT` error interception from Server Actions

### Modified Capabilities
- `feature-blocked-modal`: Remove `delinquent` variant — overdue behavior moves to new dedicated component

## Approach

1. **`OverduePaymentBlocker`** — "use client" component mounted in root layout. Polls `getBusinessStatusAction()` on mount & interval. When `MOROSO`: renders fullscreen z-[99999] overlay with WhatsApp link (target="\_blank"), no close mechanism. Uses `useEffect` cleanup to prevent back navigation.
2. **DevTools evasion** — `MutationObserver` inside the component watching its own DOM node. On removal: redirect to `/payment-blocked`.
3. **`/payment-blocked`** — static RSC page with identical message, no escape.
4. **`DELINQUENT` interceptor** — wrapper utility for client-side Server Action calls. Catches `{ error, code: "DELINQUENT" }` return → sets a global state (Zustand or React context) that `OverduePaymentBlocker` reads.
5. **Action audit** — add `assertWritePermission()` to the ~22 Server Actions that bypass it.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/PaymentStatusGuard.tsx` | Modified | Replace MOROSO toast with `OverduePaymentBlocker` |
| `src/components/OverduePaymentBlocker.tsx` | **New** | Immovable overlay + MutationObserver |
| `src/app/payment-blocked/page.tsx` | **New** | Static blockage route |
| `src/lib/delinquent-interceptor.ts` | **New** | Wrapper for client-side action calls |
| `src/hooks/useDelinquentState.ts` | **New** | Global state for interceptor → blocker |
| `src/components/ui/feature-blocked-modal.tsx` | Modified | Remove `delinquent` variant |
| `src/actions/*.ts` (~22 files) | Modified | Add `assertWritePermission()` guard |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MutationObserver false positives | Low | Simple check: only react to own node removal; `/payment-blocked` as fallback |
| User frustration with unblockable modal | High | Clear message + WhatsApp contact visible; admin can fix instantly |
| Missed actions in audit | Med | Use grep for all Server Actions without `assertWritePermission` call; add to review checklist |

## Rollback Plan

1. Revert `PaymentStatusGuard.tsx` to original
2. Delete `OverduePaymentBlocker.tsx`, `/payment-blocked` route, and interceptor files
3. Remove `DELINQUENT` interceptor calls from client components
4. Actions audit can be partially reverted or left in place (harmless — they already return DELINQUENT)

## Dependencies

- None. All backend guards (`assertWritePermission`, `DELINQUENT` code) already exist.

## Success Criteria

- [ ] MOROSO user sees fullscreen overlay on every page — no close, no Escape, no X
- [ ] WhatsApp button opens in new tab, modal stays visible
- [ ] Page refresh re-shows overlay
- [ ] DevTools DOM removal → redirect to `/payment-blocked` within 100ms
- [ ] Server Actions return `{ error, code: "DELINQUENT" }` → overlay appears (not toast)
- [ ] Admin sets `accountStatus = "ACTIVO"` → overlay gone on next navigation/action
- [ ] ~22 uncovered Server Actions now use `assertWritePermission()`
