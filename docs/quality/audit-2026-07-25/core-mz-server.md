# Core M–Z + server audit (agent, 2026-07-25) — condensed

## Per-module (readiness | priority | key issues)
- mailer.js 3|P1: no email validation; N un-awaited sends per class; failures not persisted; remoteMail calls /api/mail WHICH SERVER DOESN'T IMPLEMENT → all prod emails fail
- mark.js 4|P3: duplicate MARK vs tokens.js
- meteo.js 2|P1: CITIES Tunisia-only, coordsOf falls back to TUNIS (Manama sees Tunis weather); FR labels; no timeout/NaN guard
- nav.js 3|P2: NAV computed at module load (stale after settings change); hr/accountant missing from /app + /messages + /notices entries
- notify.js 2|P0: L30-31 hardcodes 'École Al-Nour'+'Coreon EDU' in every email → must read settings().schoolName; markRead throws on fresh db; ACL divergence: parents never get role-broadcasts in server mode; studentId dropped; unbounded growth
- oneroster.js 2|P2: SCHOOL_YEAR '2025-2026' hardcoded; hyphen classIds lose enrollments; ascii() collisions; dateLastModified=now; 1 teacher/class
- opsprofile.js 3|P2: .coreon.app vs edu.kogiagroup.com (3 hosts); live/demo labels INVERTED; "Joignable: Oui" unconditional
- recruit.js 3|P2: inline ids not uid()/refs; advanceCandidate throws TypeError on unknown stage; closePost ambiguous; no ACL
- refs.js 4|P1: nextRef under ACL-stripped blobs re-issues seq 1 (duplicate refs, server no uniqueness check); Luhn lettersToDigits collisions (AB=L); qrPayload /#/verifier route DOESN'T EXIST
- requests.js 3|P1: no authorization (anyone can assign/close any request); null-guard gaps; monthReport open/overdue vs today not month
- results.js 2|P0: mentionFor hardcodes /100 scale vs country markMax (TN=20) — WRONG GRADES on bulletins; 24 call sites; bulletinFor O(days×classes) + counts other classes' attendance; NaN on empty
- security.js 1|P0: TUNISIAN EMERGENCY NUMBERS hardcoded (198/190/197/193 — Bahrain=999) also inside CONSIGNES text; no t(); badgeNumber collides >999; no write functions (mutations live in Security.jsx untested)
- social.js 2|P1: sweep mutates during render + parents can't persist (ACL) → parent/direction see different states; promoteFromWaitlist break-not-continue blocks queue; TZ-dependent deadlines; IDEAS prices bare numbers authored in DT ("12 BHD" for 100 DT dinner); Tunisia catalogue FR-only
- storage.js 3|P1: 5MB ceiling = hard product limit (500 students already 4.5MB); impl captured at load; server adapter reparses whole blob per read
- subjects.js 3|P2: FR/Latin regexes only — English/Arabic subject names fall to grey fallback for BH
- theme.js 4|P3: hr/accountant hexes invented (violates tokens rule); accent persists after logout
- tokens.js 4|P2: FONT.display 'Sora' vs actually-loaded Plus Jakarta Sans; mix() naive sRGB, no validation
- tunisia.js 2|P0: "(DT)" hardcoded in 3 request field labels; Tunisian labour-code articles cited for BH; DOC_TYPES CIN/Bulletin n°3/RIB; typesForRole missing hr/accountant (departments can't file requests); def:"2026 / 2027"
- workbench.js 4|P1: hr/accountant/teacher/etc get NO queue (hr doesn't see pending payroll!); L116 chain deref throw risk blanks dashboard; sub strings FR-only
- remote.js 2|P0: NO try/catch — pushing flag stuck true forever on first network blip (silent sync death, UI keeps confirming saves); 409 → overwrite local + reload = data loss no merge; token in localStorage; whole 371KB blob per push; setInterval precedence bug; remoteMail→404
- RemoteGate.jsx 2|P1: expired token mounts app → 401 reload loop; NO password-forgot link in server mode; FR-only no RTL; invented hex; StrictMode double startSync

## SERVER CRITICAL (server/)
1. **P0 privilege escalation server.mjs:260-266**: pw-extraction loop on posted blob runs BEFORE mergeWrite, NOT gated by mayWriteCollection — any staff role can replace director's {email,pw} in auth. Fix: gate behind mayWriteCollection(role,'users').
2. **P0 path traversal server.mjs:295**: join(STATIC, req.url) no containment — /../data/auth.json served (hashes + session tokens). Fix: normalize + startsWith check.
3. auth: scrypt N=16384 below OWASP floor, params not stored per-hash; scryptSync blocks event loop (DoS); /api/login + /api/reset NO rate limit; sessions plaintext in auth.json; fixed 8h TTL no renewal; import.mjs random pw for missing (guessable format)
4. rate limiter keys on socket.remoteAddress — behind reverse proxy ALL clients share one bucket; log Map never evicts
5. backups: auth.json NEVER backed up (restore = nobody can log in!); minute-precision collisions; same disk; no offsite; restore untested end-to-end with auth
6. schooladmin/owner mergeWrite takes posted blob WHOLESALE — truncated local blob deletes server collections
7. no fsync after rename; readBody 30MB no cap; no security headers/CSP/HSTS; no audit log (PDPL/INPDP legal requirement); no structured logging/metrics/alerting/systemd/Dockerfile; single school per process
8. API map: /api/health (public, leaks rev), /api/login, /api/logout, /api/forgot (5/h), /api/reset (NO limit), /api/apply (10/h), /api/rev, /api/db GET/POST, /api/op (parent ops), NO /api/mail (but client calls it)

## Cross-cutting
1. The blob IS the ceiling (5MB, full rewrite per write) — fine for 1 pilot, not 2 schools
2. Country pack adopted by only 3 modules; security/meteo/tunisia-defs/social/notify/oneroster/results still hard-Tunisia
3. Authorization is UI-only in core mutators; acl.js good but bypassed at server.mjs:260
4. FR hardcoded exactly where least-French users are (guards, parents, RemoteGate)
5. Production data path (remote.js) = least tested code; no server-mode e2e
6. Failures absorbed not surfaced (mail, pull, push)
7. P0 sequence: (a) gate pw loop (b) contain static path (c) remote.js try/catch/finally (d) backup auth.json + restore drill (e) emergency numbers/currency/legal into country pack (f) rate-limit login/reset + X-Forwarded-For
