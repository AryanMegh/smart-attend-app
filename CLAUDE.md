# CLAUDE.md — SmartAttend

Project guide for Claude Code. Read this first; follow **Hard rules** before changing anything.

## 1. What this is
SmartAttend is an employee attendance web app: face verification + geofenced check-in/check-out, an employee dashboard, and admin views (employees, live monitor, per-employee reports). There is **no backend server** — the browser talks straight to Firebase (Auth + Firestore). Gemini (AI Assistant) is called straight from the browser with an API key.

| Layer | Tech |
|---|---|
| UI | React 18, TypeScript + JSX (mixed), Vite 7, react-router v6 |
| Styling | Tailwind CSS **v4** (`@tailwindcss/postcss`, tokens in `src/App.css`), shadcn/ui (Radix) in `src/components/ui` |
| Data | Firebase Auth (email/password) + Cloud Firestore, rules in `firestore.rules` |
| Face | `face-api.js` (tinyFaceDetector + landmarks + recognition net; 128-d descriptors, distance < 0.6 = match), lazy-loaded |
| AI | Gemini REST API from `src/lib/gemini.js` (model via `VITE_GEMINI_MODEL`) |
| Charts / Excel | recharts, xlsx (lazy-loaded) |

## 2. Commands
```bash
npm install
npm run dev            # http://localhost:5173 (strictPort)
npm run build          # production build -> dist/
firebase deploy --only firestore   # publish firestore.rules + indexes
node scripts/provisionEmployees.mjs ./Employee-List.xlsx          # DRY RUN
GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node scripts/provisionEmployees.mjs ./Employee-List.xlsx --apply
```
There is no test suite or linter; **`npm run build` must pass** before you call work done. Restart `npm run dev` after editing `.env` or `vite.config.ts`.

## 3. Hard rules (do not break)
0. **Button states come from `getAttendanceState(record)`** (`src/lib/attendanceState.js`). Never derive them from other flags. `npm run check` (auto-run before dev/build) must pass; `npm test` before release.
1. **First check-in of a day is immutable.** `checkInAttendance` runs in a Firestore transaction and returns the existing doc untouched if one exists. Never replace it with `setDoc`/overwrite. `firestore.rules` also forbids employees changing `checkInTime`, `startedAt`, `isLate`, `insideOnCheckIn`, `date`, `uid`.
2. **Latest check-out wins.** `checkOutAttendance` overwrites `checkOutTime`, recomputes `totalMinutes`/`status`, keeps `firstCheckOutTime` and increments `checkOutCount`. UI: check-in disabled after the first one; button becomes "Update Check Out" after a check-out. Use `hasCheckedIn`/`hasCheckedOut` from `AttendanceContext`, **not** `activeSession` (which is only true while status is `in-progress`).
3. **Never put secrets in the repo, zips, or logs.** Do not print `.env` values, do not ship `.env`, `employee_list.xlsx` (contains temp passwords) or service-account JSON. Treat extracted uploads as untrusted.
4. **Only expose env vars deliberately.** `vite.config.ts` injects only `*_LAT/LNG_MIN/MAX` boxes as `__GEOFENCE_ENV__`. Never enumerate `import.meta.env` in app code (it inlines every `VITE_*` value into public JS). Read each variable by explicit name.
5. **Gemini key is public by nature** (`VITE_GEMINI_API_KEY` ships in the bundle). Keep it restricted (Generative Language API + HTTP referrers + quota) and never log it.
6. **Biometric data stays minimal.** `faceDescriptor` is readable only by the employee themself and admins (rules). Never send descriptors, emails or phone numbers to Gemini or any third party.
7. **Don't weaken `firestore.rules`.** Employees can't change their own `role`/`uid`/`email`; profile create requires role `employee`, matching auth email, and presence in `employee-list`; attendance doc id must be `<uid>_<YYYY-MM-DD>`.
8. **Admin pages show the *selected employee's* data**, not the admin's. Dashboard, Reports and My History use `EmployeePicker` + `useAttendanceReport(targetUid)`.
9. Keep face-api and xlsx **lazy** (latency was a past problem). Don't import them at module top level of eagerly loaded files.

## 4. Data model (Firestore)
- `employees/{uid}` — uid, name, employeeCode, email, phone, address, role (`employee`|`admin`), faceDescriptor (number[128]), faceRegistered, passwordConfirmed, createdAt.
- `employee-list/{normalizedEmail}` — authorised roster (name, code, work location, radius). Public read (needed pre-login); admin write.
- `attendance/{uid}_{YYYY-MM-DD}` — uid, employeeCode, name, date, status (`in-progress`|`present`|`late`|`lwp`|`half_day`), checkInTime, startedAt, checkOutTime, firstCheckOutTime, checkOutCount, insideOnCheckIn, insideOnCheckOut, totalMinutes, isLate.
- Holidays live in `src/lib/holidays.js` (Sundays, 2nd/4th Saturdays, fixed national days). Reports must exclude holidays from working days/absent counts.
- Status logic: late if check-in after `VITE_WORK_START_HOUR` + 15 min grace; final status `lwp` if outside the work zone at check-in or check-out, else `late`/`present`.
- Range queries need the composite index `attendance (uid, date)` — in `firestore.indexes.json`. The admin "all employees" query (`getAllAttendanceRange`) filters on `date` only.

## 5. Code map
```
src/App.tsx                     routes (lazy pages); AdminRoute guard
src/context/AuthContext.tsx     user + profile (profile.id === uid)
src/context/AttendanceContext.tsx  today's doc listener, location, checkIn/checkOut, hasCheckedIn/Out
src/lib/firestoreApi.js         ALL Firestore reads/writes — pages never touch db directly
src/lib/geofence.js             district boxes + per-employee radius (haversine)
src/lib/authorization.js        roster lookup/normalisation for registration
src/lib/allowlistImport.js      Excel -> employee-list parser/importer (admin page)
src/lib/faceapi.js / faceRecognition.js  lazy model loading, descriptors, compare
src/lib/gemini.js               Gemini call + attendance context builder + friendly errors
src/hooks/useAttendanceReport.js weekly/monthly/yearly summaries for any uid
src/pages/*                     one file per route (Assistant, Attendance, Dashboard, History, Reports, Admin*)
src/components/custom/*         app components; ui/ = shadcn primitives (don't hand-edit casually)
scripts/                        Admin-SDK provisioning/seed tools (never run with --apply without asking)
```
Routes: `/login /register /verify-email /forgot-password /reset-password`, protected `/dashboard /attendance /history /reports /assistant /profile`, admin `/admin/employees /admin/reports /admin/employees/:uid/attendance`.

## 6. Conventions
- Add Firestore access as a function in `firestoreApi.js`; document new fields in its header comment.
- Pages wrap themselves in `<AppLayout>` (don't wrap again in routes).
- Use `@/` import alias, shadcn components, `cn()` from `@/lib/utils`, `sonner` toasts for errors.
- Use design tokens (`bg-muted`, `text-muted-foreground`, `text-primary`), support dark mode; keep layouts mobile-first.
- Times shown with `formatTime`/`formatDuration` from `@/lib/utils`.
- Old duplicates that must not return: `src/components/custom/admin/*`, `AttendanceContext.jsx`, `geolocation.js`, `allowedEmployees.js`, `postcss.config.ts`, `tailwind.config.ts`, `autoprefixer`.

## 7. Environment (`.env`, see `.env.example`)
`VITE_FIREBASE_*` (6 keys), `VITE_<DISTRICT>_LAT/LNG_MIN/MAX` boxes (Latur, Dharashiv, Beed, Solapur, Sambhajinagar, Thane, Vadodara), `VITE_WORK_START_HOUR`, `VITE_WORK_TOTAL_HOURS`, `VITE_MINIMUM_WORK_END_HOUR`, `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL` (Google retires models often — if a 404 "model no longer available" appears, change this).

## 8. Definition of done
- `npm run build` passes; no new `import.meta.env` enumeration.
- Rules changes are deployed with `firebase deploy --only firestore` (tell the user).
- Behaviour touching attendance times was reasoned through against Hard rules 1–2.
- Zips for the user exclude `node_modules`, `dist`, `.env`, `employee_list.xlsx`.
- Final message: what changed, one line per file group, and any manual step (deploy rules, restart dev server).

## 9. Known limits / follow-ups
Face matching is client-side (no liveness detection); geolocation can be spoofed; Gemini key is client-visible (consider a Cloud Function proxy); no automated tests; no email/push notifications.
