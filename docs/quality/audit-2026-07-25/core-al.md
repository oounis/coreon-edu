# Core A–L audit (agent, 2026-07-25) — condensed

## Per-module readiness|priority + key issues
- academic 3|P1: CAPACITY=24 dup w/ admissions; previewPromotion 2 db() parses/student; rp id collides same-ms; runPromotion no radiation doc/no invoice cancel; TERMS 3 trimesters fixed
- access 3|P1: exact-match only — canAccess('teacher','/app/eleve/s1')=false → deep links dead; hr/accountant can't see /app/students
- accidents 3|P0: pendingAck NaN after reload (now() Date→string); SAMU 190 Tunisian; approve no role check; acknowledge free-string name (signature not attributable)
- accounting 2|P0: NO due date/instalments/overdue state; nextNumber = list.length+1 (re-issues numbers after restore); financials 1 db() parse/student; no VAT; facilities cash never enters ledger; floats for BHD
- accounts 2|P0: MANAGEABLE_ROLES omits hr+accountant (customer CANNOT create dept accounts!); pw default '1234'; reset 6-char Math.random; cin/governorate fields ignore pack
- acl 3|P0: READ_STRIP.admin=[] → admin READS payroll/invoices/salaries (contradicts CR-016/020); mergeWrite '*' users stripped of pw → schooladmin sync CAN WIPE server passwords (caller re-extracts, not enforced here); parent blob leaks settings tenantCode, class-level journal/moments (sibling privacy); stripSecrets misses resetToken/salary
- admissions-mail 3|P1: FR-only; fallback signature 'Votre établissement'; shows raw app.id not ref
- admissions 3|P1: advance() TypeError on unknown stage (L163); DOCS Tunisian list not pack-driven; CAPACITY dup; a+Date.now id collides; no waitlist promotion on freed seat
- auth 1|P0: plaintext pw===; u.email.toLowerCase() throws if no email; loginAs = unauthenticated impersonation primitive; TTL not refreshed
- behavior 3|P1: at:now() Date→string → classClimate empty on real data; notifies parentId only (childIds-linked parents missed); entriesFor exported unfiltered of removed
- budget 3|P2: wages wrong when bonus added (hr.setBonus bug flows in); yearSeries 24 blob parses; no planned-vs-actual
- canteen 2|P0 CHILD SAFETY: allergy match FRENCH tokens only — 'Peanut allergy'/'حساسية' match NOTHING (alert silently empty); 'Peau sensible' false-positives gluten ('ble' substring); DAYS lun-ven (no Sunday menu for BH); ignores childcare.healthOf allergies (two stores)
- charts 3|P3: Recharts-shaped in core; 7th-series grouping unimplemented
- childcare 3|P1: VACCINES = Tunisian schedule (regulatory exposure BH); monthsOld ±30d error; addPickup demands 'cin'; handOver no double-release check, no ID verify; revoke no notification
- clock 2|P0: now() returns Date (ROOT of NaN class); isWeekend Sun/Sat + dayIndex Mon-Fri hardcoded; SCHOOL_OPEN 08:00-15:00; rentree Sep 15; no timezone handling; isDemoLive writes on read
- currency 2|P0: money() fr-FR hardcoded, no min fraction digits (BHD 12.5 → "12,5" not 12.500); 'DT' default; not ISO codes; module state not persisted
- data 1|P0: SCHEDULE = hardcoded demo timetable (Othman's Mathématiques!) served to EVERY teacher; teacherTimetable synthesized from string hash — CONTRADICTS Direction-edited db.timetables; DAYS/PERIODS hardcoded
- db 2|P0: db() = full parse+migrate PER CALL (hot paths call per row); FRESH INSTALL AUTO-SEEDS DEMO SCHOOL (120 fake students + published demo passwords; Setup never purges); 5MB quota; uid Math.random; migrate from<22 leaves _v undefined
- documents 3|P1: nextNumber length+1 (dup serials after restore); no template/PDF/letterhead — document doesn't exist physically; Tunisian doc types
- enrolment 4|P2: TN placeholders (+216, Tunis); TERMS.data generic FR consent instead of pack legal.consent; no age-vs-level check; no dup detection; PHONE_RE accepts '--------'
- facilities 2|P1: priceFor returns 0|object → book price undefined → revenue NaN; bookRecurring toISOString UTC bug; hour-granularity only; payBooking no receipt, never touches accounting
- features 3|P2: OVERRIDES read at import (RN broken); setModuleOverrides never persists; no dependency graph
- fetes 3|P1: BH Eid al-Fitr should be 3 days not 2 (fix!); tables end 2027 no user warning; holidays display-only (not wired to attendance/payroll)
- gallery 2|P0: consentOnly stored but NEVER ENFORCED (PDPL exposure); removeMoment hard-delete no permission check; at:now() Date bug; share notifies whole class even child-tagged; base64 in blob quota
- hr 2|P0: setBonus reads FRESH db → payroll.total stays stale (validated+paid+booked WRONG total, verified); leave counts weekends/holidays in quota; unpaid leave charged to start month only; /30 prorates allowances; NO GOSI/EOSB (statutory BH); decideLeave no balance check; two leave models (hrLeaves vs staffLeaves)
- i18n 2|P0: NO ENGLISH locale (BH secondary=en, subjects English); business pages fallback FR; coverage test only nav/sections/roles/levels; dateLocale 'ar-TN' wrong region for BH; t() exact-match (no interpolation/plurals)
- insights 3|P1: behaviorClimate broken on real data (Date bug); feeSignal reads LEGACY d.payments not accounting → reports demo forever; attendanceSignal UTC/local mix ±3h
- inventory 3|P2: movement log truncated to 30 (trace promise broken); no unit/cost/expiry/supplier; no link to budget
- journal 2|P0 (differentiator, ZERO tests): startNap Date bug → napMinutes NaN; 2 blob parses per tap; upsert full RMW (2 tablets overwrite each other); no validation; no un-send; photos never written; no bottle/meds/temp
- levels 4|P2: schoolLevels defaults PRIMARY → unconfigured school LOSES early-years modules (the differentiator); labels FR no pack mapping (KG1/Grade1); age bounds unused
- livestatus 2|P0: summer = July–Sep15 Tunisian; weekend Sun/Sat; Bahrain Friday shows MONDAY timetable "in class"; breaks hardcoded; segs[0] throw on empty timetable; FR strings inline
- locales 4|P1: validId decorative (||length>=5 accepts 'abcde'); idTypes patterns never used; MISSING FIELDS: weekend/timezone/schoolHours/academicYearStart/termModel/currency decimals/emergency numbers; DEFAULT_PACK TN; PACKS mutated at import; LY legal empty

## Cross-cutting
1. now() Date vs number schism — one fix: now() → epoch number + normalize on read. Breaks accidents/behavior/insights/journal/gallery/hr/facilities/childcare/academic on real data; invisible to CI (seeds use Date.now()).
2. Pack layer missing exactly: weekend, timezone, school hours, academic year, currency decimals, emergency numbers → all calendar bugs trace here.
3. No server-grade data layer: db() full parse per call; hot paths per-row; no index/pagination/transactions.
4. Error shapes inconsistent ({error}/{ok}/throw); no input validation vs own enums.
5. IDs ad-hoc ('xx'+Date.now().toString(36)) in 9 modules; serials = length+1 (audit failure).
6. Two of everything: invoices vs payments; hrLeaves vs staffLeaves; 2×CAPACITY; 2×allergies; 2×timetables.
7. Security: plaintext pw, loginAs primitive, admin reads money, mergeWrite pw wipe, consentOnly ignored, exact-match ACL.
8. SHIP-BLOCKER: fresh install auto-seeds demo school; Setup never purges; MANAGEABLE_ROLES blocks creating hr/accountant.
