# Security + i18n + Bahrain sweep (agent, 2026-07-25) — condensed

## SECURITY
- S-1 CRIT server.mjs:259-267 pw loop before ACL → any staff overwrites director credentials. Fix: gate by mayWriteCollection(role,'users') / self-only.
- S-2 CRIT server.mjs:293-299 path traversal → auth.json dump. Fix: normalize+startsWith.
- S-3 CRIT Attach.jsx:117-123 stored XSS via filename (public inscription form → admin opens attachment → about:blank inherits origin → steals coreon_token from localStorage). Fix: escape name / createElement.
- S-4 HIGH mail.js:15 worker token committed public (since 50d4c48). Rotate + env.
- S-5 HIGH no rate limit on /api/login (also /api/reset unlimited).
- S-6 HIGH /api/apply → admissions.apply spreads ...rest unvalidated; rest can override id (collide existing records); files unchecked server-side (30MB).
- S-7 HIGH plaintext pw in demo blob (auth.js u.pw===pw; db.js seeds; parents pw '1234').
- S-8 HIGH accounts.js:95 Math.random 6-char pw; :40 default '1234'; no policy on create.
- S-9 HIGH Login.jsx loginAs() reachable in server mode (#/login after RemoteGate) → client-side role escalation UI bypass. Fix: redirect /login → /app when isRemote().
- S-10 MED token in localStorage 8h fixed no rotation.
- S-11 MED readBody parses any content-type → no-preflight POST spam to /api/apply.
- S-12 MED no security headers (CSP/nosniff/XFO/HSTS); unknown ext → text/html.
- S-13 MED CORS default echoes ORIGINS[0].
- S-14 MED store.mjs 0644 perms on auth.json + backups; not encrypted/pruned.
- S-15 MED mutate() discards save() bool → core write APIs return ok on quota failure; setSession swallows.
- S-16 LOW acl '*' wholesale replace (truncated blob deletes server collections).
- S-17 LOW 30MB body accumulated before check.
- S-18 GOOD: no dangerouslySetInnerHTML/eval anywhere; JSX escapes names.

## I18N/RTL
- Physical Tailwind worst: HR 16, Dashboard 10, AppShell 9, Payslip 8, Staff/Results/Evaluate/ui.jsx 7, Security/Requests/Documents/Attendance/Academic 6, DataTable 5. ~150 physical vs 34 logical, 5 rtl: variants, ZERO [dir=rtl] css. ui.jsx:234-236 search input icon overlaps AR text (shared Input = every page); DataTable text-left; Payslip+Bulletin printed docs LTR-only.
- Recharts not mirrored (YAxis left) Dashboard 313,522, Results, Finance.
- DT/Tunisie leaks: currency.js:5-8 (CUR='DT', fr-FR); Social.jsx:27,497; Schools.jsx:53-94; Teachers.jsx:73; Requests.jsx:239,245,259 (PDF ", Tunisie"); Documents.jsx:48,69; Bulletin.jsx:37,55 ("République Tunisienne · Ministère"); Settings.jsx:101; Students.jsx:15 (nationality/governorate/grade defaults); Inscription.jsx:297-299; Accounts.jsx:109,130 ("Identité (Tunisie)"); db.js:500,613,283,403; tunisia.js:54-60,40-41; Security.jsx:467,497 + mobile Security.js:460,491 (emergency numbers); childcare.js:22 (TN vaccination schedule).
- Mobile: ZERO t() calls, no I18nManager. Unshippable AR.
- 13+ sites hardcode 'fr-FR' dates instead of dateLocale(); Results/Events import {fr} unconditionally.
- AR coverage: Landing~100%, Security95, Dashboard90, Accounts/Settings90, Students85, Inscription85, logins90, AppShell70 — everything else 0%. ~38/49 pages 0%. App-wide 25-30%.
- Core data tables untranslated: tunisia.js REQUEST_DEFS, security.js ID_TYPES, accounting stages/methods, academic TERMS, admissions stages.

## BAHRAIN
- B-1 CRIT currency.js:8 money() no fraction digits: BHD 3-decimals; 12.345 renders "12,345" (looks like 12345!). +5 duplicate money impls (Payslip, HR, Settings, Social, mobile Social). Floats + no rounding drift (accounting.js:106). Fix: Intl currency w/ decimals map {BHD,KWD,OMR,TND,LYD:3}, store minor units later.
- B-2 CRIT Mon-Fri week hardcoded everywhere: clock.js:55-61 dayIndex/isWeekend(Sun/Sat), data.js:56 DAYS Lun-Ven, db.js:61,732 6x5 grid, :469,516 seeds, livestatus.js:55,62, canteen.js:26-28 keys lun..ven, Timetable.jsx:30, Events.jsx:39/Results.jsx:23 weekStartsOn:1, Staff.jsx:26-28,135 isWeekend() payroll (docked for Sunday work!), mobile Live.js. BH week = Sun-Thu, weekend Fri-Sat. Fix: pack weekend/weekStart/schoolDays + clock helper.
- B-3 CRIT NO VAT anywhere (BH 10% since 2022, NBR tax invoice content). No taxRate/taxNumber/tax lines/compliant invoice. Facilities rental+canteen+events standard-rated.
- B-4 HIGH levels.js labels FR hardcoded; BH needs KG1/KG2, Primary 1-6, cycle1/2 split; move levels into pack.
- B-5 HIGH academic.js TERMS = 3 trimestres; BH = 2 semesters. Not in pack.
- B-6 HIGH defaults French/TN: DEFAULT_PACK='TN', DEFAULT_SETTINGS country TN currency DT no locale key, Setup wizard never asks country/language/currency; no English locale at all (BH private schools use EN).
- B-7 HIGH CPR declared in pack but UI says CIN: Accounts.jsx:111,130 (8-digit placeholder), Teachers.jsx:73, ChildFile.jsx:162-163 (pickup screen!), Security.jsx:247+security.js:118 ID_TYPES, Requests.jsx:118,234,239. idLabelFor/idTypesFor exist — screens don't call them.
- B-8 MED payroll 30-day month, no GOSI/LMRA/EOSB; TN labour code quotes (18/24j, art 66/244) legally wrong in BH.
- B-9 MED academic.js MARK_MAX=20 module default before applyCurriculum; mobile never calls applyCurriculum.
- B-10 MED Security pages TN emergency numbers (BH=999).
- B-11 GOOD: hijri OK, BH holidays OK, PDPL consent OK, BH curriculum block OK, packCurrency plumbing OK.
- B-12 LOW rentreeDate hardcodes Sep 15; MONTHS Sep-Juin 10-month billing.

## TOP-10 go-live: S-1, S-2, B-1, B-2, S-3, B-3, S-4, B-6+B-7, i18n 38 pages+mobile, RTL logical props (ui.jsx+DataTable first).
