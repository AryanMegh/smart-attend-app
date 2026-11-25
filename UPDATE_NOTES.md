# What changed in this update

Two separate things were fixed: iOS camera errors, and the employee allowlist
enforcement (the allowlist work didn't carry over from a previous zip, so
it's been reapplied here from scratch against this upload).

## 1. iOS camera fix (the main ask this round)

**Root cause:** iOS Safari often ignores the `autoPlay` attribute on
`<video>` when the stream (`srcObject`) is attached to it programmatically
from JavaScript, even with `muted` + `playsInline` set. It needs an explicit
`.play()` call after `srcObject` is assigned, or the camera view just stays
black / frozen on iPhone.

Your codebase had already discovered and worked around this once, in
`LoginPage.tsx`'s face-scan modal — there's a comment there explaining it —
but the same fix was missing from the other two camera flows:

- **`src/components/custom/attendance/FaceScanner.jsx`** (attendance
  marking) — now calls `video.play()` right after setting `srcObject`, with
  a `.catch()` in case the browser blocks it. Also added the
  `webkit-playsinline` attribute as extra insurance for older iOS versions.
- **`src/pages/RegisterPage.jsx`** (face capture during registration) — had
  the same missing `.play()`, plus a race condition: it used
  `setTimeout(..., 0)` to try to grab the `<video>` ref immediately after
  flipping `cameraActive` to `true`, but the element only mounts on the next
  render. Replaced with the same effect-based pattern already proven in
  `LoginPage.tsx`: a `useEffect` keyed on `cameraActive` that attaches the
  stream and calls `.play()` once the element has actually mounted.

If you still see camera issues on a specific iPhone/iOS version after this,
the exact error message (shown via the toast/error text) would help narrow
down whether it's a permissions issue, an `OverconstrainedError` from the
camera resolution request, or something else.

## 2. Employee allowlist enforcement (reapplied)

- Regenerated `src/data/allowedEmployees.js` from the `Employee_list.xlsx`
  bundled in this upload (32 people).
- `RegisterPage.jsx` now calls `findAuthorizedEmployee()` before creating
  the account, blocking anyone not on the list with the existing
  `UNAUTHORIZED_MESSAGE`.
- `firestore.rules` now requires a matching document in a new
  `allowedEmployees` Firestore collection before an `employees/{uid}`
  profile can be **created** — this is the real server-side enforcement,
  since a client-side check alone can be bypassed by calling the Firebase
  SDK directly. That collection is locked to clients (`allow write: if
  false`) — only the Admin SDK can populate it.
- `scripts/seedAllowedEmployees.mjs` mirrors the list into that collection.
  **You need to run this once** for the rule to have anything to check
  against.

### To deploy the allowlist changes

1. **Rotate your Firebase Admin key.** `firebaseAdmin_Credentials.json` was
   in the zip you uploaded again — that's a live service-account private
   key, and it's not included in what's given back to you here. Go to
   Firebase Console → Project settings → Service accounts, generate a new
   key, and revoke the old one. Don't zip/commit this file going forward —
   it's in `.gitignore`, but a zip export doesn't respect that.
2. Publish the updated rules: Firestore → Rules tab → paste
   `firestore.rules` → Publish.
3. Run the seed script with your new key:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/new-key.json node scripts/seedAllowedEmployees.mjs
   ```
4. Existing accounts aren't affected — this only gates new registrations.
   Remove any already-registered unauthorized profiles manually via the
   Admin → Employees page if needed.

## Round 4: admin Dashboard, Reports and My History show a chosen employee (EmployeePicker)

## Round 3 changes
- Check-in is final for the day: written in a Firestore transaction, never overwritten; Firestore rules also block employees from editing checkInTime/startedAt/isLate/insideOnCheckIn/date/uid.
- Check-out can be repeated: the latest time replaces the earlier one (firstCheckOutTime + checkOutCount kept for audit). Buttons now: Check In disabled after first check-in; "Update Check Out" after a check-out.
- Gemini AI Assistant (/assistant) calls the Gemini API directly: set VITE_GEMINI_API_KEY (or VITE_GOOGLE_API_KEY) in .env; restrict the key by HTTP referrer and Generative Language API only. Model: VITE_GEMINI_MODEL (default gemini-3.8-flash).
- vite.config.ts no longer lets geofence.js inline every VITE_* var; only the geofence variables are injected now; the Gemini key is read explicitly.
- Removed stale files (admin/ duplicates, AttendanceContext.jsx, geolocation.js, allowedEmployees.js, postcss.config.ts, tailwind.config.ts, autoprefixer).
- Deploy rules: firebase deploy --only firestore

## Round 5: check-out reliability + documentation
- Check-out no longer fails when GPS can't be read (recorded as unverified), works after midnight (yesterday's open session), and Firestore rules no longer reject legacy records missing fields.
- Added docs/ (15 documents), root README rewritten (old one kept as docs/legacy-README.md).

## Round 6: holiday calendar
- New src/lib/holidays.js: every Sunday, 2nd and 4th Saturday, Jan 26, Aug 15, Oct 2, Dec 25 are holidays (add more in FIXED_HOLIDAYS / EXTRA_HOLIDAYS).
- Holidays are excluded from working days and never counted absent; reports/history show a "Holiday" row with the reason; attendance % uses working days only; yearly chart and month summary updated.
- Today card and Attendance page show a holiday notice (check-in still allowed if someone works); the AI assistant knows the holiday rules.

## Round 7: "Currently Working" but Check In offered / Check Out disabled
Cause: an old src/context/AttendanceContext.jsx (left behind by unzipping over an old folder) shadowed the new AttendanceContext.tsx, so `hasCheckedIn` was undefined while the record said checked-in.
Fixes + prevention:
- src/lib/attendanceState.js: ONE function decides button states; Today card, Attendance page and context all derive from the record with it.
- scripts/checkProject.mjs runs before `npm run dev` / `npm run build`: fails with exact instructions if stale/duplicate files or old versions of key files are found.
- ErrorBoundary: a crash shows a Reload screen instead of a blank page.
- netlify.toml: SPA redirect, no-cache index.html (no stale bundles after deploy), long cache for hashed assets.
- `npm test`: 4 tests (button states, holidays). Run before releases.
