# PEA Frontend Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Deliver the seven English pages in the approved en-black design as a working Vue application connected to FastAPI.

**Architecture:** Vue Router owns navigation; Pinia owns authentication and session-only recent records. Typed fetch client and domain helpers isolate API contracts. Page-local data and abortable polling prevent cross-user caching.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus, Pinia, Vitest, Playwright.

**Spec:** ../../pea-backend/docs/frontend-design.md and ../../pea-backend/docs/frontend-images/en-black/.

## Global Constraints

- English UI, black/white/gray; seven routes from the design.
- Public configuration only in frontend .env; no backend secrets copied.
- No production fixture data or fabricated list APIs/metrics.
- Empty evidence allowed; 30 items, 4000 code points each, 24000 total.
- Authentication sessionStorage only; refresh verifies /me; 401 clears session, 403 preserves it.
- Explicit submission retries reuse idempotency keys; never automatically retry POST.
- Evaluation submit false, partial follow-up false, holdout frozen false by default.

## Review Focus

- Password whitespace and safe local redirects.
- Expired sessions and interrupted requests cannot repopulate old user data.
- Empty evidence, supplementary Unicode, date and scope boundaries.
- Failed runs never become insufficient labels; unknown costs never become zero.
- Missing optional follow-up fields and partial evaluation summaries.

## Task 1: Authenticated shell

Files: package.json, vite.config.ts, src/api/client.ts, src/types/index.ts, src/stores/auth.ts, src/router/index.ts, src/layouts/AppLayout.vue, src/pages/LoginPage.vue, src/pages/WorkspacePage.vue, tests/core.test.ts.
Interfaces: request<T>(path, options), useAuthStore(), recordPath(kind,id), safeRedirect(value).
- [x] Add tests for request envelope errors, password preservation, redirect rejection, session clearing.
- [x] Run tests before implementation; implement API/session/layout and login/workspace; run tests.

## Task 2: Audit and review

Files: src/domain/audit.ts, src/composables/useSubmission.ts, src/pages/NewAuditPage.vue, src/pages/AuditDetailPage.vue, src/components/ReviewForm.vue, src/components/EvidenceCard.vue, tests/audit.test.ts.
Interfaces: validateAudit(payload,user), followupBlock(audit,user,allowPartial), reviewPayload(audit,form), createIdempotency().
- [x] Test empty/oversized/Unicode evidence, periods/scopes, review actions and follow-up eligibility before implementation.
- [x] Implement blank form, exclusions, citations, human review, follow-up submission; run suite.

## Task 3: Follow-up and evaluation

Files: src/composables/useRecord.ts, src/pages/FollowupPage.vue, src/pages/NewEvaluationPage.vue, src/pages/EvaluationPage.vue, src/components/EvaluationMetrics.vue, tests/polling.test.ts, tests/e2e.spec.ts.
Interfaces: useRecord<T>(kind,id), cost(value,status), percent(value), polling with terminal detection.
- [x] Add polling and browser tests for seven routes, no-result states and evaluation errors before implementation.
- [x] Implement optional evidence fallback, polling, metric tables and confusion matrix, local filtering/pagination.
- [x] Run unit tests, typecheck/build, browser checks (desktop/mobile), isolated real backend rule-audit smoke.

## Task 4: Delivery

- [x] Write startup, environment and deployment instructions, nginx example.
- [x] Run independent code review; fix material findings with regression tests.
- [x] Record validation and limitations.

## Execution ledger

- User explicitly requested implementation of existing design; proceed inline with no additional design approval gate.
- Ruling: Workspace is not a Git repository. Create sibling pea-frontend in the requested Practice directory; no worktree or commits apply. Files remain directly reviewable.
- Pre-flight: Tasks 2/3 consume Task 1 API types/session; Task 3 shares Task 2 detail components. Field names anchored to actual backend schemas and metrics.py.

- Task 1: complete; auth/shell/workspace tests and real login smoke passed.
- Task 2: complete; audit validation/review/follow-up browser and domain tests passed.
- Task 3: complete; all seven routes, polling and metrics verified in development and production preview.
- Task 4: complete; README, environment examples, nginx sample and verification record saved.
- Final review: independent reviewer found two session issues. Both reproduced RED and fixed GREEN; full unit suite 14/14, browser suite 6/6 in dev and production.
- Ruling: Pin TypeScript 5.9.3 for vue-tsc compatibility; use explicit Element Plus registration to avoid development dependency reloads. Cost: a ~545 KB shared JS chunk with a build size advisory.
- Final scope: live paid providers and production deployment require deployment configuration and were not executed; controlled API browser tests plus a real rule-audit backend smoke establish frontend behavior.
