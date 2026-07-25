# QA/CI/docs audit (agent, 2026-07-25) — condensed

## Zero unit-test core modules
charts, currency, data, journal, livestatus, mark, meteo, oneroster, security, subjects, theme, tokens. (oneroster + journal + security + currency = sold differentiators, untested.)

## Zero e2e pages
/setup (UNGUARDED — App.jsx:111 outside Protected), /app/eleve/:id (diag only), exams/homework/library/transport (flagged off), mot-de-passe-oublie + reinitialiser (diag only), public site pages (/modules /tarifs /faq /donnees), /app/schools. No unit tests in app/ or mobile/.

## Missing e2e journeys flagged in test-plan.md (still open)
- accident chain end-to-end UI ❌ · payroll prepare→prime→validate→lock ❌ · règle n°9 gap ⚠️ · cross-family notification leak regression test ⚠️ (regression-checklist)

## CI (deploy.yml) gaps
- npm audit NEVER fails (`|| echo warning`), app-only, --omit=dev
- Header claims lint step; NO lint in CI (oxlint installed, never run)
- e2e uses `npm install` not ci; playwright caret ^1.61.1 vs browser pinned 1.61 → drift risk
- Browser binaries not cached (~1-2min/run); mobile npm ci uncached
- npm run all = 18 scripts && fail-fast; no artifacts/screenshots/traces on failure; no timeout-minutes; pages artifact retention 1 day
- concurrency group workflow-wide: PR run can cancel in-flight main deploy
- No notifications on failure; no CodeQL/secret-scanning/dependency-review; no nightly
- No rollback step (only git revert + 20min rerun); smoke-prod detects but doesn't act
- permissions granted workflow-level to all jobs

## CRITICAL security
- app/src/mail.js:15 live bearer token in PUBLIC repo + git history (smoke-test-report #4: rotate + scrub) — STILL THERE
- /setup unguarded (smoke-test-report #5)
- Deployed default = demo mode: plaintext pw in localStorage, client-side role
- server = one school per process, no tenant isolation; no audit journal (gap #1)

## Flaky test patterns
- ~340 waitForTimeout across e2e; lib.mjs login fixed 900ms; no waitForSelector in assertions
- Fixed port COLLISIONS: 8955 comportement+presence · 8961 uiux+live · 8981 public+perf · 8982 demandes+audit-clics · 8983 arabe+tuiles-mortes · 8994 scroll+diag.curriculum
- serveDist returns 200 for missing files (404 regressions invisible); no error handler; scenario() close not awaited
- parcours.scroll.mjs:331 scenario() without await (floating promise)
- perf budgets hardcoded 450/600KB vs measured 371KB
- core.test.mjs: 1 file, singleton db, only 13/100 tests resetDb → order-dependent; server tests share rate-limit counters
- Date pinned tests: fetes 2026/2027 only, hijri 1447/1448, rentree 2026, facilities slot 2026-07-20; some tests read REAL clock (lines 269, 603)
- 14/15 diag.*.mjs have NO exit code (can't fail); smoke.production.mjs (the RBAC/negative-auth suite — strongest in repo) NOT in CI; diag country/Bahrain scripts NOT in CI

## Doc contradictions
- HANDOFF.md stale (recommends Supabase, ignores server/)
- quality README says "19 tests" (actual 100); smoke report "276/276"
- production-readiness "NO REAL SCHOOL DATA" lock vs BACKEND.md "levée en code"
- performance-plan self-contradicts on code-splitting
- release-checklist: versioning/tags/protected main/RC/rollback-drill all unchecked

## Top-10 prod risks (ranked)
1. demo-mode default (plaintext pw) for real school; 2. no audit log; 3. (WAS no staging/rollback — envs now built 2026-07-25); 4. audit gate never fails + no lint; 5. mail.js token public; 6. strongest suites not in CI; 7. sleep-based e2e will flake on runners; 8. rule-1/accident/payroll journeys unproven in UI; 9. Bahrain Tier-1 all open (Benefit, VAT/NBR, Hijri everywhere, MOE, transport; WPS/SIF, iqama expiry); 10. order/date-dependent test suites, no coverage measurement.
