# Coreon EDU — Technical & Product Status

**Audit date:** 2026-08-02
**Auditor:** CTO / architecture review
**Commit audited:** `786a6e8` (main)
**Scope:** app · core · server · mobile · e2e · docs · CI/CD · live environments

> This document is the reference for future development. It records what is
> **verified true**, not what is intended. Every ✅ below is backed by an
> execution, a scan, or a live-browser observation named in the evidence column.
> Where a claim could not be verified, it says so.

---

## 0. Executive summary

Coreon EDU is **substantially more mature than a prototype**. The codebase is
disciplined: zero `TODO`/`FIXME` in 448 files, 0.40 % duplication, 132 passing
tests, a green three-stage CI, branch protection, secret-scanning with push
protection, and a written constitution (`ARCHITECTURE-BIBLE.md`) whose own
self-assessment matches this independent audit almost exactly.

The gap between where it is and a commercial multi-school SaaS is **not quality —
it is architecture**. Specifically:

1. **What runs in production today is a browser-local application.** The deployed
   sites are static bundles; the school lives in `localStorage`. The server
   exists, is well written and tested, but **is not deployed anywhere**.
2. **The server is single-school by design.** One process = one school = one JSON
   blob = one global revision lock.
3. Therefore the answer to "can it serve 10 schools / 100 schools / thousands of
   students" is: **not in this form** — and the Bible already says so.

Everything else — the module surface, the role model, the i18n, the test
discipline — is ahead of where most products are at this stage.

**Production readiness score: 58 / 100** (rubric in §9). Reads as: *excellent
engineering, unfinished platform.*

---

## 1. Architecture map

```
Kogia_Education/
│
├── app/            React 19 · Vite 8 · Tailwind 4 · oxlint · JSX, no TypeScript
│   └── src/
│       ├── pages/          52 business screens + public marketing site
│       ├── components/     18 shared components (DataTable, Bulletin, charts, dnd…)
│       ├── remote.js       ← the seam: server mode vs local mode
│       └── mail.js         Cloudflare Worker → Zoho SMTP relay
│
├── core/           THE DOMAIN — 55 modules, zero dependencies, shared by web+mobile+server
│   ├── db.js       814 lines · schema v24 · seed + migrate() · the whole school as one object
│   ├── acl.js      read/write permissions per role  ← the security centre of gravity
│   ├── auth.js · audit.js · access.js
│   ├── i18n.js + i18n.ar.js (2 385 entries) + i18n.en.js (2 184 entries)
│   └── 45 business modules (finance, hr, admissions, accidents, canteen…)
│
├── server/         7 files · zero dependencies · node:http + node:crypto + JSON files
│   ├── server.mjs  9 endpoints · scrypt · sessions · ACL-filtered blobs · rev-lock
│   └── store.mjs   atomic write (tmp+rename) · 0700/0600 · 6-hourly backup, keep 30
│
├── mobile/         Expo / React Native · 35 files
├── e2e/            22 browser journeys + 17 diagnostic scripts (Playwright)
├── docs/           48 markdown files · quality/ · operations/ · release/ · development/
└── .github/workflows/  deploy.yml · envs.yml · securite.yml
```

### The two operating modes (the single most important thing to understand)

`app/src/remote.js` decides at runtime:

```js
export const apiUrl  = () => localStorage.getItem('coreon_api') || import.meta.env.VITE_COREON_API || ''
export const isRemote = () => !!apiUrl()
```

| | Local mode (**what is live today**) | Server mode (**built, tested, not deployed**) |
|---|---|---|
| Storage | `localStorage['coreon_db']` | JSON files on the server |
| Auth | seed passwords in the blob | scrypt hashes, 8 h sessions |
| Data isolation | none — the browser holds everything | `acl.js` filters server-side |
| Concurrency | none | revision lock, HTTP 409 on stale write |
| Backups | none | 6-hourly, rotation 30 |
| Schools per instance | 1 (the demo) | 1 |

**Verified:** the deployed bundle at `int.edu.kogiagroup.com` contains all nine
`/api/*` paths compiled in, but no API base is configured — so it runs 100 %
local. The public demo is genuinely a demo.

### Deployment topology

| Branch | Environment | Host | Pipeline |
|---|---|---|---|
| `dev` | `dev.edu.kogiagroup.com` | Cloudflare Pages | fast: core+server tests, build, smoke |
| `int` | `int.edu.kogiagroup.com` | Cloudflare Pages | full: all 22 e2e journeys |
| `main` | `edu.kogiagroup.com` | GitHub Pages | quality → build → e2e → deploy |

Flow is `dev → int → main`, enforced by convention and by branch protection on
`main` (two required status checks). Default branch is `dev`. **No backend is
deployed in any environment.**

---

## 2. Feature inventory

Legend: ✅ production ready · 🟡 partial · 🔴 missing · ⚠️ risk

Classification rule applied conservatively: a module is ✅ only if the screen
exists **and** the domain logic is in `core/` **and** something tests it. A
screen that renders seed data but has no write path is 🟡, however finished it
looks.

### Platform & cross-cutting

| Module | State | Evidence / note |
|---|---|---|
| Multi-country config (BH/QA/TN/LY) | ✅ | `locales.js`, `tunisia.js`; no `if (country===…)` in business code |
| Reference/ID system (ERP ref + UUID + human ID) | ✅ | `refs.js`, `assignRef()`, tested |
| Role model (10 roles) | ✅ spec, 🟡 enforcement | `role-model.md` + `acl.js`; enforcement is server-side only, and the server isn't deployed |
| Audit log | ✅ | `audit.js` (CR-039), 117-test suite covers it; ⚠️ not immutable — a staff write can rewrite history |
| i18n FR/AR/EN | ✅ | 1 975 `t()` phrases, **100 % covered in both AR and EN** |
| RTL (Arabic) | ✅ | verified live on 8 authenticated screens: `dir=rtl`, zero direction-mismatched nodes, zero horizontal overflow |
| Multi-tenant isolation | 🔴 ⚠️ | **the blocker.** One process = one school |
| Onboarding wizard | 🔴 | Bible §11 marks it ⛔; bricks exist, journey doesn't |
| Notifications in-app + email | 🟡 | in-app ✅, email via Worker relay ✅, **SMS/push 🔴** |
| Reporting engine | 🟡 | `insights.js` is static heuristics, not an engine |
| AI layer | 🔴 | not started — correctly not blocking |

### Business modules (52 screens)

| Module | State | Note |
|---|---|---|
| Dashboard | ✅ | role-aware, 1 087 DOM nodes, renders in 3 languages |
| Students / StudentProfile / ChildFile | ✅ | full CRUD, health, pickups, attachments |
| Parents (accounts + parent space) | ✅ | `blobForParent` rebuilds the blob key-by-key, deny-by-default |
| Teachers / Staff | ✅ | |
| Attendance (students) | ✅ | 45 days seeded, deterministic |
| Attendance (staff) + Pointage | ✅ | virtual badge clock |
| Evaluation (`Evaluate`, placements, badges) | ✅ | the product's differentiator; ~10 months of history seeded |
| Classes / Timetable / Subjects | ✅ | shared subject table web+native |
| Exams / Results / Bulletin | ✅ | PDF via jsPDF |
| Homework / Journal / Behavior / Moments | ✅ | |
| Admissions (`Inscription`, `Admissions`) | ✅ | 5-stage pipeline with history, public pre-registration |
| Finance / Payments / Accounting / Budget | ✅ | fee schedule per level, sibling discounts, invoices, receipts |
| HR (contracts, payroll, leave, recruit) | ✅ | multi-component salary (CR-028) |
| Canteen / Transport / Library / Inventory | ✅ | |
| Incidents / Accidents | ✅ | accident declaration with witness→approver→ack chain |
| Security post (visitors, rounds, logbook) | ✅ | distinct from supervisor — good role modelling |
| Social / Events / Gallery / Notices | ✅ | parent-proposed activities with approval chain |
| Facilities (rental) | ✅ | school slots protected from paying clubs |
| Documents / Requests | ✅ | multi-level approval chain |
| Messages | 🟡 ⚠️ | **parent messaging returns `[]` in server mode** — `acl.js:148` says "V1.1". Honest, but a hole |
| Live / LessonMap / Workbench | 🟡 | 180 kB chunk; demo-oriented |
| Interop (OneRoster) | 🟡 | `oneroster.js` exists; not verified against a real SIS |
| Import (`ImportData`, `server/import.mjs`) | ✅ | |
| Settings / Setup / Schools (owner console) | ✅ | |
| Meteo / Fêtes corner | ✅ | ⚠️ calls an external weather API from the client |

### Mobile

| Item | State | Note |
|---|---|---|
| Expo app, 35 files, ~15 screens | 🟡 | shares `core/`, correct per Bible §6 |
| Feature parity with web | 🔴 | a fraction of the 52 web screens |
| Store release (iOS/Android) | 🔴 | no build/signing pipeline in CI |
| Offline sync | 🔴 | `uuid` groundwork exists, sync doesn't |

---

## 3. Production readiness

### 3.1 Security

**Strong.** A full Semgrep run (`p/javascript`, `p/react`, `p/secrets`,
`p/owasp-top-ten`) produced **20 findings, all 20 in CI workflow files, zero in
application code**. For 448 files that is an unusually clean result.

The 2026-07-25 internal audit was real and its fixes are in the code — path
traversal (S-2), privilege escalation on the credential registry (S-1), ACL read
alignment (ACL-1), file modes 0700/0600 (S-14), backup of `auth.json`.

| Control | State | Note |
|---|---|---|
| Password hashing | ✅ | scrypt (`pw.mjs`) |
| Sessions | ✅ | 8 h TTL, revoked immediately on account disable |
| Rate limiting | ✅ | login 20/15 min, forgot 5/h, apply 10/h, reset 10/h, mail 60/h |
| Password reset | ✅ | single-use, 60 min, neutral response, kills all sessions |
| Deny-by-default for parents | ✅ | `blobForParent` rebuilds, never "everything except" |
| CSV formula injection | ✅ | tested |
| Secret scanning + push protection | ✅ | enabled on the public repo |
| Branch protection on `main` | ✅ | 2 required checks; ⚠️ `enforce_admins: false` |
| **Staff ACL is deny-list, not allow-list** | ⚠️ | see below |
| **Dependabot security alerts** | 🔴 | **disabled** — version PRs run, vulnerability alerts do not |
| **HTTP security headers** | 🔴 | HSTS, CSP, X-Frame-Options, Permissions-Policy all **missing** on live |
| **Leaked secret in git history** | ⚠️ | see below |
| CI shell injection | ⚠️ | `envs.yml:78` interpolates `${{ github.ref_name }}` into `run:` |
| Mutable action tags | ⚠️ | 16 uses of `@v3`/`@v4` instead of pinned SHAs |

**Finding SEC-1 — staff ACL is allow-by-default.** `acl.js` states as principle
#1 "DÉFAUT = REFUS", and `blobForParent` honours it. But `blobForStaff` is a
**deny-list**:

```js
export function blobForStaff(d, role) {
  const strip = new Set(READ_STRIP[role] || [])
  for (const k of Object.keys(d)) { if (!strip.has(k)) out[k] = d[k] }   // everything not stripped
}
```

Any collection added to the schema in future is **automatically readable by every
staff role** — including `teacher`, `supervisor` and `security` — unless someone
remembers to add it to `READ_STRIP`. This is a latent child-data leak by
omission, and it contradicts the file's own stated law. Invert it to an
allow-list.

**Finding SEC-2 — a Worker token lived in the public repo.** Gitleaks over 243
commits found one leak: `WORKER_TOKEN` in `app/src/mail.js:15`, commit `50d4c48`
(2026-07-21). It has since been moved to `import.meta.env`, and push protection
now prevents recurrence — but **removal from HEAD is not revocation**. The value
is still in git history on a public repository. **Rotate that Worker token if it
has not already been rotated.**

### 3.2 Performance

Measured live against `int.edu.kogiagroup.com` (real browser, real network):

| Locale | FCP | DOMContentLoaded | Console errors |
|---|---|---|---|
| fr | 392 ms | 290 ms | none |
| ar | 892 ms | 579 ms | none |
| en | 588 ms | 292 ms | none |

Authenticated screens render in ~2 s with zero page errors across both `ar` and
`en`. Route-level code splitting is properly configured.

Bundle weight (gzipped) — the heavy tail:

| Chunk | Raw | Gzip |
|---|---|---|
| `ui` | 748 kB | 198 kB |
| `jspdf` | 400 kB | 130 kB |
| `charts` | 371 kB | 106 kB |
| `html2canvas` | 200 kB | 47 kB |
| `i18n.ar` | 177 kB | 60 kB |
| `i18n.en` | 132 kB | 49 kB |

⚠️ `jspdf` + `html2canvas` = 177 kB gzip loaded for a feature (PDF export) most
users touch rarely. Should be dynamically imported at click time. On a Tunisian
school's mobile connection this is the difference between fast and slow.

⚠️ `pixi.js` is a dependency — a WebGL engine in a school ERP. Verify it is
actually reachable in a route chunk and not just dead weight.

### 3.3 Reliability

| Control | State |
|---|---|
| Atomic writes (tmp + rename) | ✅ server mode |
| Backups, 6-hourly, rotation 30, both files | ✅ server mode, tested (`backup.test.mjs`) |
| Documented backup / rollback / incident-response plans | ✅ `docs/operations/`, `docs/release/` |
| Error handling | ✅ server wraps everything, returns 500 without leaking |
| **Backups in production** | 🔴 **none** — production is `localStorage`. Clearing browser data destroys the school |
| **Error tracking (Sentry or equivalent)** | 🔴 none |
| **Uptime / synthetic monitoring** | 🔴 `monitoring-plan.md` exists; nothing is running |
| **Structured server logs** | 🔴 `console.log` only |

**Finding REL-1 — production has no durability story.** This is the honest
consequence of §1: in local mode there is no server, so there is nothing to back
up. It is not a bug; it is the architecture. It becomes a *critical* risk the
moment a real school types real children's data into it.

### 3.4 Scalability

Answering the question directly, from the code:

```js
// server.mjs
let school = store.read('school', null)      // ONE school, in memory, whole
school = { rev: school.rev + 1, blob: merged }  // EVERY write replaces the WHOLE blob
persistSchool()                                  // and rewrites the WHOLE file
```

| Question | Answer | Why |
|---|---|---|
| 1 school, ~120 students | ✅ yes | this is the current demo, and it works well |
| 1 school, ~1 000 students | 🟡 probably | blob grows; every write serialises it entirely |
| **10 schools** | 🔴 **not without 10 separate processes** | one process holds exactly one school |
| **100 schools** | 🔴 no | no tenant column, no per-tenant routing, no shared DB |
| **Concurrent writers in one school** | 🔴 ⚠️ | **global revision lock.** Two teachers taking attendance in different classes at the same second → one gets HTTP 409 and reloads. Not a corruption bug (the design is safe), but it will not survive a real school at 08:00 |

The measured direction blob is 371 kB raw / 32 kB gzip **for a demo school of
~120 students**. Every staff write is a full read-modify-write of that object.

This is the ceiling, and it is the whole roadmap.

---

## 4. Hidden problems

Searched: `TODO`, `FIXME`, `HACK`, `XXX`, hardcoded values, dead code,
duplication, mixed language, missing tests.

| Check | Result |
|---|---|
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** across app, core, server, mobile |
| Code duplication (jscpd, ≥8 lines) | **0.40 %** — 10 clones, 147 lines in 225 files. Excellent |
| Largest clone | 40 lines, `mobile/screens/Notifications.js` ↔ `Requests.js` |
| Semgrep in application code | **0 findings** |
| Console/page errors on live app | **0** across 16 screen-loads in 2 languages |

### 4.1 The real i18n finding

The headline number is good: **1 975 distinct `t()` phrases, 100 % present in
both `i18n.ar.js` and `i18n.en.js`**. There are no gaps at call sites. The recent
"zéro français à l'écran" work genuinely landed.

⚠️ **The stale comment in `core/src/i18n.js` is now wrong** and should be
deleted — it still claims English is "Tranche 1 : l'écorce … le reste retombe
honnêtement sur le français". That has not been true since 2026-08-01, and it
will mislead the next person (it misled this audit initially).

**But a second class of strings never goes through `t()` at all** — reference and
seed data. Live in English mode, the following French appears on screen:

| String | Where | Verdict |
|---|---|---|
| `"Accès non autorisé pour votre rôle."` | `/app/evaluate`, `/app/settings` | 🔴 **real bug** — a system message, hardcoded |
| `"7 encouragements · 1 reminder this week · surtout « A aidé un camarade"` | Dashboard insight | 🔴 **real bug — one sentence, two languages.** The worst example |
| `"Absentéisme en hausse"` | Dashboard insight | 🔴 untranslated insight string |
| `"Fête de la Femme"` | app chrome, every screen | 🔴 holiday names untranslated |
| `"Éducatrice"`, `"Surveillant général"` | `/app/hr` | 🔴 job titles untranslated |
| `"Fév"`, `"Déc"` | `/app/finance` | 🔴 month abbreviations (`FEE_MONTHS` in `db.js`) |
| `"École Al-Nour · Tunis"` | header | ✅ correct — proper noun |
| `"Béja"`, `"Gabès"`, `"Médenine"` | Settings | ✅ correct — Tunisian place names |
| `"5ème A"`, `"Crèche · Les Coccinelles"` | class pickers | ✅ acceptable — school-entered data |
| `"ع"` | language switcher button | ✅ correct by design |

The pattern: **UI strings are fully translated; reference data is not.** The fix
is to route `insights.js`, `fetes.js`, `hr.js` position labels and `FEE_MONTHS`
through `t()` — not a new i18n system.

Note the project already has an e2e test for exactly this
(`parcours.fuites-langue.mjs`). It should be extended to assert on these
categories, in English mode, on authenticated screens.

### 4.2 Other observations

- ⚠️ `blobForStaff` deny-list (SEC-1 above) — the highest-value single fix in the report.
- ⚠️ Audit log is mutable — Bible §11 already flags "⛔ immuabilité serveur (D9)".
- ⚠️ Parent messaging is a stub returning `[]` in server mode (`acl.js:148`).
- ⚠️ Demo passwords (`owner`/`admin`/`teacher`/`parent`) live in `db.js`. Correct for a demo; must be impossible to seed in a school instance.
- ⚠️ `i18n.ar.js` has 2 385 entries for 1 975 call sites — ~400 stale keys. Harmless, but drift.
- ⚠️ Weather API called directly from the client (`meteo.js`).

---

## 5. Testing

### What exists — and it is substantial

| Suite | Count | Result |
|---|---|---|
| Core domain (`core/test/core.test.mjs`) | **117 tests** | **117 pass, 0 fail** (39.7 s) |
| Server (`server/test/`) | **15 tests** | **15 pass, 0 fail** (7.4 s) |
| E2E browser journeys (`e2e/parcours.*.mjs`) | **22** | run in CI on `int` and `main` |
| Diagnostic scripts (`e2e/diag.*.mjs`) | **17** | on-demand |
| **Total automated tests** | **132 + 22 journeys** | all green |

The e2e suite is genuinely impressive and covers things most teams never test:
`parcours.arabe.mjs`, `parcours.fuites-langue.mjs` (language leaks),
`parcours.perf.mjs`, `parcours.scroll.mjs`, `parcours.uiux.mjs`,
`parcours.audit.mjs`.

### Gaps

| Missing | Priority |
|---|---|
| **Multi-user concurrency test** — two sessions writing at once, assert 409 and no data loss | P0 |
| **ACL negative tests per role** — assert each role *cannot* read what it must not (currently the deny-list is untested for new collections) | P0 |
| **Load test** — N concurrent writers against `server.mjs`, find the actual break point | P0 |
| **Restore test** — backups are tested for *creation*, not for *restoration into a working system* | P1 |
| **i18n assertions on authenticated screens in EN** (the §4.1 categories) | P1 |
| Mobile has no test suite at all | P1 |
| Visual regression / screenshot diffing | P2 |
| Accessibility (axe) — not checked anywhere | P2 |

### Release checklist (every release)

1. `node --test core/test/` → 117/117
2. `node --test server/test/` → 15/15
3. `cd e2e && npm run all` → 22 journeys green
4. `npm run build` in `app/` → no chunk regression >10 %
5. Gitleaks clean on the diff
6. Semgrep clean on application code
7. Live smoke in **fr, ar, en** — assert `dir=rtl` in Arabic, zero console errors
8. Language-leak check on authenticated screens in **English**
9. `dev` → `int` → `main`, never skipping

---

## 6. AI engineering workflow

Goal: less time collecting information, more time solving problems.

| Recommendation | Why |
|---|---|
| **`scripts/health.mjs`** emitting one JSON: test counts, coverage, bundle sizes, i18n coverage, leak count, TODO count, open alerts | The single biggest lever. Every future session starts informed instead of re-exploring |
| **`CLAUDE.md` at repo root** stating: dual-mode architecture, French-is-the-i18n-key, `core/` is shared by 3 clients, `dev→int→main` | Prevents re-deriving the architecture every session — this audit spent most of its time on that |
| **Enable Dependabot security alerts** | Currently off. Free, one toggle |
| **Pin GitHub Actions to SHAs** + fix `envs.yml:78` shell injection | 17 of 20 Semgrep findings disappear |
| **Add Semgrep + gitleaks to `securite.yml`** | Complements CodeQL; catches what CodeQL misses |
| **Sentry** (or GlitchTip, self-hosted) | Turns "a school reported a bug" into a stack trace. Requires server mode to be meaningful |
| **Uptime monitoring** on the three environments | `monitoring-plan.md` documents it; nothing runs it |
| **Lighthouse CI budget** in the pipeline | Locks in the current good FCP; fails the build on regression |
| **`dependency-cruiser` encoding the Bible as executable rules** | Makes §1's "non-negotiable principles" fail CI instead of needing a human to remember them |

---

## 7. Technical debt register

| ID | Item | Severity |
|---|---|---|
| TD-1 | Single-school server; no tenant isolation | **Critical** |
| TD-2 | Whole-blob read-modify-write + global revision lock | **Critical** |
| TD-3 | No backend deployed; production is `localStorage` | **Critical** |
| TD-4 | `blobForStaff` is a deny-list, contradicting deny-by-default | **High** |
| TD-5 | Worker token in git history on a public repo | **High** |
| TD-6 | Missing HSTS / CSP / X-Frame-Options / Permissions-Policy | **High** |
| TD-7 | Dependabot security alerts disabled | **High** |
| TD-8 | Reference data (insights, holidays, positions, months) not translated | **Medium** |
| TD-9 | Audit log is mutable | **Medium** |
| TD-10 | `jspdf` + `html2canvas` eagerly bundled (177 kB gzip) | **Medium** |
| TD-11 | Parent messaging stubbed to `[]` in server mode | **Medium** |
| TD-12 | Mobile at a fraction of parity, untested, no release pipeline | **Medium** |
| TD-13 | CI shell injection + 16 mutable action tags | **Medium** |
| TD-14 | Stale comment in `i18n.js` contradicting the code | **Low** |
| TD-15 | ~400 stale i18n keys | **Low** |
| TD-16 | `enforce_admins: false` on `main` | **Low** |

---

## 8. Roadmap — 30 / 60 / 90 days

**P0 = blocks commercial launch · P1 = important · P2 = nice to have**

### Days 0–30 — "make one real school safe"

| P | Item | Ref |
|---|---|---|
| P0 | **Rotate the Worker token** (still in public git history) | TD-5 |
| P0 | **Deploy the server** for one pilot school — the architecture exists, it just isn't running | TD-3 |
| P0 | **Invert `blobForStaff` to an allow-list** + negative ACL tests per role | TD-4 |
| P0 | Add HSTS, CSP, X-Frame-Options, Permissions-Policy (Cloudflare `_headers`) | TD-6 |
| P0 | Enable Dependabot security alerts; pin actions to SHAs; fix `envs.yml:78` | TD-7, TD-13 |
| P0 | Concurrency test: two writers, assert 409 + zero data loss | §5 |
| P1 | Verified restore drill — restore a backup into a working instance | §5 |
| P1 | `scripts/health.mjs` + root `CLAUDE.md` | §6 |
| P1 | Sentry on the pilot | §3.3 |

### Days 30–60 — "make it multi-school"

| P | Item | Ref |
|---|---|---|
| P0 | **Tenant isolation**: `tenant/school/country` on every record; server routes by tenant | TD-1 |
| P0 | **Replace whole-blob writes with per-collection writes** — kill the global lock | TD-2 |
| P1 | Translate reference data (`insights`, `fetes`, HR positions, `FEE_MONTHS`) + extend `parcours.fuites-langue` to assert it in EN | TD-8 |
| P1 | Dynamic-import `jspdf`/`html2canvas`; audit whether `pixi.js` is reachable | TD-10 |
| P1 | Server-side append-only audit log | TD-9 |
| P1 | Load test → publish the real per-instance student ceiling | §3.4 |
| P2 | Onboarding wizard (Bible §11) | — |

### Days 60–90 — "make it sellable at scale"

| P | Item | Ref |
|---|---|---|
| P0 | Migrate JSON store → a real database (Postgres or D1), keeping `core/` untouched | TD-1/2 |
| P1 | Parent messaging in server mode | TD-11 |
| P1 | Mobile: parity on the parent journey, tests, store pipeline | TD-12 |
| P1 | Reporting engine (adaptive by country/school/role/year) | Bible §11 |
| P2 | SMS/push notifications | Bible §11 |
| P2 | Curriculum config layer — **only after a country is signed** (Bible §13 explicitly warns against speculating here) | Bible §13 |
| P2 | AI layer | Bible §9 |

---

## 9. Production readiness score — 58 / 100

| Dimension | Weight | Score | Rationale |
|---|---:|---:|---|
| Code quality | 15 | **14** | 0 TODO, 0.40 % duplication, 0 SAST findings in app code |
| Test coverage & discipline | 15 | **12** | 132 passing + 22 journeys; missing concurrency/load/ACL-negative |
| Security (application) | 15 | **11** | strong auth/ACL design, real prior audit; deny-list flaw, headers, leaked token |
| Architecture & domain design | 15 | **13** | `core/` shared by 3 clients is genuinely good; Bible is real and honest |
| **Scalability** | 15 | **3** | single-school, whole-blob writes, global lock |
| **Operational readiness** | 15 | **4** | no backend deployed, no backups in prod, no monitoring, no error tracking |
| i18n / localisation | 5 | **4** | 100 % at call sites, verified RTL; reference data leaks |
| CI/CD | 5 | **5** | three-stage gated pipeline, branch protection, green |
| **Total** | **100** | **58** | |

**Reading:** the two 15-point dimensions scoring 3 and 4 are the entire gap. They
are not quality problems — they are the same architectural decision seen twice.
Fixing that decision moves this product from ~58 to ~85 without touching the
things that are already excellent.

---

## 10. What NOT to do

- **Do not rewrite `core/`.** 55 zero-dependency modules shared by web, mobile
  and server, with 117 tests around them, is the most valuable asset here.
- **Do not restructure the frontend.** 0.40 % duplication and zero console
  errors across 16 live screen-loads. It works.
- **Do not start the curriculum layer** before a country signs — the Bible §13
  warns against this explicitly and it is right.
- **Do not add TypeScript now.** It is a real improvement and a large
  distraction; it does not move the 58.

The single highest-leverage sentence in this document: **deploy the server you
already wrote, then make it multi-tenant.**
