# Compact Rules Bundle — Agnostic
> Universal skills that apply to any project, regardless of tech stack.
> Updated via `/sdd-update-skills`. Pre-compiled — orchestrator reads ONCE.

---

## general-context
Rules for EVERY sub-agent, always injected.

### Task Discipline
- ✅ Stay inside delegated task boundary — no scope creep
- ✅ Return structured results: status, executive_summary, artifacts, risks
- ✅ Report blockers immediately — do NOT guess or fabricate
- ❌ Do NOT modify files outside the delegated scope
- ❌ Do NOT run destructive commands (git reset, rm -rf) without approval

### Security (Universal Principles)
- ✅ ALL user input must be validated before processing
- ✅ ALL authenticated operations must verify authorization
- ✅ Use parameterized queries / prepared statements for database access
- ❌ NEVER hardcode credentials, API keys, or secrets
- ❌ NEVER expose internal error details, stack traces, or DB errors to clients
- ❌ NEVER store secrets in client-accessible code (frontend bundles, client-side env vars)
- ❌ NEVER commit `.env` files or secrets to version control

### Error Handling (Universal)
- ✅ Return structured error responses: `{ error: string }` or `{ success: true, data }`
- ✅ Log errors server-side with sufficient context for debugging
- ❌ Do NOT expose internal implementation details in error messages

---

## git-context
Rules for any git/commit operation.

### Conventional Commits
- ✅ Format: `type(scope): description`
- ✅ Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- ✅ Scope is optional but recommended: `feat(auth): add login`
- ❌ NEVER add `Co-Authored-By` or AI attribution trailers
- ❌ NEVER use vague messages like "fix bug", "update", "changes"

### Commit Discipline
- ✅ Each commit = ONE deliverable work unit (behavior, fix, migration, or docs)
- ❌ Do NOT commit by file type (models first, then services, then tests separately)
- ✅ Tests belong in the SAME commit as the behavior they verify
- ✅ Docs belong with the feature or workflow they explain
- ✅ Each commit should tell a story — reviewer understands why from diff + message
- ✅ Before committing: confirm one clear purpose, rollback is reasonable without reverting unrelated work

### Branch Naming
- ✅ Type-based: `type/description` (e.g., `feat/user-login`, `fix/null-pointer`)
- ✅ Lowercase, alphanumeric and `._-` only
- ❌ NEVER force-push to shared branches

---

## pr-context
Rules for PR creation and review.

### PR Quality
- ✅ EVERY PR links an approved issue
- ✅ PR title = conventional commit format
- ✅ PR body includes: Linked Issue, Summary, Changes, Test Plan
- ❌ NO vague titles or empty descriptions
- ❌ NO PRs >400 changed lines without explicit `size:exception`

### Size Management
| Condition | Action |
|-----------|--------|
| PR ≤400 lines, focused | Single PR |
| PR >400, slices can land independently | Stacked PRs to main |
| PR >400, feature must integrate as whole | Feature Branch Chain with tracker |
| Generated/vendor/migration diff can't split | Ask maintainer for `size:exception` |

### Chained PR Rules
- ✅ Split PRs over 400 lines (unless maintainer accepts `size:exception`)
- ✅ Keep each PR reviewable in ≤60 minutes
- ✅ One deliverable work unit per PR
- ✅ State: start, end, dependencies, follow-up, out-of-scope in every chained PR
- ✅ Every child PR includes dependency diagram marking current PR with `📍`

---

## review-context
Rules for code review and verification.

### Review Quality
- ✅ Always review with FRESH context (new task agent) — never share implementer's context
- ✅ Produce compliance matrix: requirement → scenario → test → result
- ✅ Check edge cases AND error paths, not just happy path
- ✅ Verify: task completion, test coverage, security, edge cases, deviations from spec
- ❌ Do NOT approve without running tests / build
- ❌ Do NOT skip security review for auth/permission changes

### Classification
- 🔴 CRITICAL — Must fix before merge (security hole, broken feature, data loss)
- 🟡 WARNING — Should fix (code quality, missing edge case, test gaps)
- 🔵 SUGGESTION — Nice to have (style preference, future optimization)

---

## comment-context
Rules for writing PR feedback, issues, and team communication.

- ✅ Start with the actionable point — do NOT recap the whole PR before feedback
- ✅ Be warm and direct — sound like a thoughtful teammate, not a bot
- ✅ Keep it short: 1-3 paragraphs or a tight bullet list
- ✅ Explain WHY when asking for a change (technical reason)
- ❌ Do NOT pile on — comment on the highest-value issue, not every tiny preference
- ✅ Match the thread's language
- ✅ Format: `<Direct observation or request>` → `<Why it matters (if needed)>` → `<Concrete next action>`

---

## doc-context
Rules for writing technical documentation.

- ✅ Lead with the answer: decision, action, or outcome FIRST. Context after.
- ✅ Progressive disclosure: happy path first, then details, edge cases, references
- ✅ Chunk related information into small sections with clear headings
- ✅ Use tables, checklists, examples over dense prose
- ✅ Design so reviewers can verify intent without reconstructing the whole story
- ✅ Default structure: Title → Summary → Quick path → Details (table) → Checklist → Next step
