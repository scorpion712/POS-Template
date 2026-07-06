# Proposal: test-ui-feature-gates (FR-203)

## Intent

FR-203 — UI components gate functionality via `useFeatures()` but have no tests verifying conditional rendering per plan. BillButtons already has 4 tests (mock pattern works), but FeatureBlockedModal, PrintableTable (supplier filter), and BudgetButton have zero coverage. Also fixes 46 failing tests in PrintableTable that break due to missing SessionProvider.

## Scope

### In Scope
- **FeatureBlockedModal** — new `tests/components/feature-blocked-modal.test.tsx` (5 tests: renders feature variant, limit variant, acknowledge button, WhatsApp link, closed state)
- **PrintableTable supplier-filter gate** — new `tests/components/PrintableTable-gates.test.tsx` (2 tests: column hidden on BASIC, visible on ENTERPRISE)
- **BudgetButton gate** — new `tests/components/BudgetButton.test.tsx` (2 tests: budget renders when hasBudget=true, hidden when false)
- Fix 46 existing failing PrintableTable tests (missing SessionProvider wrapper)

### Out of Scope
- Sidebar/Stock page gating (no useFeatures usage per code audit)
- FeatureBlockedModal integration tests with parent components (BillButtons, CheckoutModal, etc.)
- FR-201/FR-202 (already covered in `tests/plan/`)

## Capabilities

### New Capabilities
- `feature-gate-tests`: Test suite verifying each UI component's conditional rendering in response to plan feature flags

### Modified Capabilities
- None — pure test additions, no spec-level behavior change

## Approach

All tests mock `useFeatures` from `@/hooks/useFeatures` directly — no session mocking needed. Use `tests/test-utils.tsx` render function (wraps SessionProvider, BillContext, CashboxProvider). Follow existing BillButtons test pattern.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/components/feature-blocked-modal.test.tsx` | New | 5 tests for FeatureBlockedModal variants |
| `tests/components/PrintableTable-gates.test.tsx` | New | 2 tests for hasSupplierFilter conditional |
| `tests/components/BudgetButton.test.tsx` | New | 2 tests for hasBudget conditional rendering |
| `tests/components/BillButtons.test.tsx` | Modify | +1 test for BudgetButton gate (optional) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PrintableTable uses SessionProvider indirectly (useFeatures hook) triggering missing-session errors in tests | Med | Add vi.mock for useFeatures BEFORE render; test-utils.tsx already wraps in SessionProvider |
| FeatureBlockedModal uses Dialog from Radix UI — portal rendering may fail in jsdom | Low | Use `screen.getByRole('dialog')` which works with portals in @testing-library/react |

## Rollback Plan

Remove all new test files. Restore BillButtons.test.tsx if modified. Revert PrintableTable test updates if changed.

## Dependencies

- FR-201 test pattern (mocks useFeatures directly, no integration tests needed)

## Success Criteria

- [ ] `npx vitest run tests/components/ --reporter=verbose` passes all tests
- [ ] `npx vitest run` passes (no regressions on 46 existing PrintableTable tests)
- [ ] Each variant path in FeatureBlockedModal is exercised (feature, limit, acknowledge, closed)
