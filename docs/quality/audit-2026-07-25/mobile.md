# Mobile audit (agent, 2026-07-25) — condensed for inventory build

28 screens, hand-rolled Shell.js nav (4 tabs + Plus), Expo SDK 54 / RN 0.81.5.

## Screen readiness (1-5)
5: Welcome, Live, Bulletin, Social(741L), Security(547L), Requests(309L), Evaluate(348L), Attendance(303L), Events, Incidents, Payments
4: Login(no hr/accountant/owner quick-chips), Finance, Pointage, Results, Students(read-only), Teachers(read-only), Timetable(read-only), Messages(no attachments/unread), Accidents(ack only), Canteen(no edit)
3: Dashboard(130L vs web 579L; no fetes/meteo/insights/charts), Notifications(ORPHANED — not in NAV, unreachable for staff, no bell/badge), Staff(read-only, cannot approve leave), Behavior(read-only), Journal(read-only), Gallery(no upload, first media only, no video)

## MISSING entirely on mobile (→ ComingSoon or nothing)
Admissions, HR+Payslip, Accounting, Academic/bulletins&passage, Facilities, ChildFile, Documents, Budget, Inventory, Recruit, Interop/OneRoster(export is Blob/browser-only), Settings, Accounts, Schools(owner), StudentProfile 360°, Inscription publique, Setup wizard, password reset (MotDePasseOublie/Reinitialiser), SERVER MODE (remote.js web-only: window.localStorage, import.meta.env), Arabic/i18n (ZERO t() imports in mobile — all French literals), RTL (no I18nManager, hardcoded row/marginLeft/textAlign), hijri, country packs (App.js never calls setLocalePack/setCurrency/applyCurriculum/setLocale → Bahrain shows DT/Tunisian everything), FeteCorner, MeteoCorner, Arabic font (Nunito only).

## Bugs (mobile)
- Shell.js:70 switchTab NO canAccess check → hr/accountant get Événements tab (access.js denies) + /app itself excluded for hr/accountant in nav.js:42. ACCESS BYPASS.
- Dashboard.js:100 (d.notices||[]).length — collection doesn't exist (notices = notifications kind:'notice') → staff "Annonces" tile always 0.
- components.js:123 Btn only handles kind==='solid'; kind="ghost"×10, "line"×1 render wrong.
- Social.js:31 + Teachers.js:38 hardcode `DT`.
- Attendance.js:51-52 cls.classId TypeError if teacherSchedule empty.
- No error boundary per screen (white screen in prod), zero FlatList (ScrollView+map, 120 students; Finance ~1200 Pressables), zero accessibility labels, no push (expo-notifications absent), no offline/sync handling, AsyncStorage writes fire-and-forget.
- eas.json 14-line stub (no dev profile, no submit, no runtimeVersion, no EAS Update despite channels); app.json no permissions block, userInterfaceStyle light hard-locked; stale dist/ + .expo/ committed; metro onDemandFilesystem:false workaround fragile.
- e2e parcours.mobile.mjs: 3 roles only, asserts login+visited>=4+no pageerror, guesses nav by label text, tests react-native-web not iOS/Android. No unit tests/Detox/Maestro.

## Top 10 parity gaps (ranked for Bahrain day-1)
1. No Arabic/RTL on mobile at all
2. No server mode — phone can never see the real school (parents would see fictional children)
3. No push notifications (the reason parents install the app)
4. Notifications screen unreachable for staff, no bell/badge anywhere
5. Country pack/currency/curriculum never initialised (Bahrain = Tunisian dinars/subjects/IDs)
6. Teachers can't write early-years record on phone (Journal/Behavior/Gallery-upload/Accidents-declare read-only — the differentiators)
7. Parents: Gallery limited (no video/upload), no mobile enrolment
8. No password reset on mobile
9. 11 direction modules missing (schooladmin phone ≈ ComingSoon cards)
10. switchTab access bypass + always-zero Annonces tile
