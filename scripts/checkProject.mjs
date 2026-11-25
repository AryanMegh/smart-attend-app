// Runs before `npm run dev` / `npm run build` (see package.json). It stops the
// build with a clear message when the folder is in a state that previously
// caused hard-to-diagnose bugs - mainly unzipping a new version OVER an old one
// and leaving stale files behind.
//
// Example it prevents: an old src/context/AttendanceContext.jsx shadowing the
// new AttendanceContext.tsx (Vite resolves .jsx before .tsx), which made the
// Attendance page show "Currently Working" yet offer "Check In" again.
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (f) => path.join(root, f);
const problems = [];

// 1. Files that must NOT exist (stale leftovers from older versions).
const STALE = {
  "src/context/AttendanceContext.jsx": "old context that shadows AttendanceContext.tsx",
  "src/lib/geolocation.js": "replaced by src/lib/geofence.js",
  "src/data/allowedEmployees.js": "roster now lives in Firestore (employee-list)",
  "src/components/custom/admin": "duplicate old components folder",
  "postcss.config.ts": "duplicate of postcss.config.js (breaks the CSS build)",
  "tailwind.config.ts": "Tailwind v4 doesn't use it",
};
for (const [f, why] of Object.entries(STALE)) {
  if (existsSync(p(f))) problems.push(`Delete  ${f}   (${why})`);
}

// 2. Files that MUST exist, and exports other files rely on.
const REQUIRED = {
  "src/lib/attendanceState.js": "getAttendanceState",
  "src/lib/holidays.js": "holidayInfo",
  "src/lib/firestoreApi.js": "runTransaction",
  "src/context/AttendanceContext.tsx": "hasCheckedIn",
  "src/lib/geofence.js": "__GEOFENCE_ENV__",
  "src/lib/gemini.js": "generativelanguage.googleapis.com",
};
for (const [f, needle] of Object.entries(REQUIRED)) {
  if (!existsSync(p(f))) { problems.push(`Missing ${f}  - your copy is incomplete; re-extract the latest zip`); continue; }
  if (!readFileSync(p(f), "utf8").includes(needle)) {
    problems.push(`${f} is an OLD version (doesn't contain "${needle}") - replace it with the one from the latest zip`);
  }
}

// 3. Tailwind must be v4.
try {
  const v = JSON.parse(readFileSync(p("node_modules/tailwindcss/package.json"), "utf8")).version;
  if (!v.startsWith("4.")) problems.push(`tailwindcss ${v} is installed but v4 is required: npm i -D tailwindcss@^4 @tailwindcss/postcss@^4`);
} catch { /* not installed yet - npm install will handle it */ }

// 4. Secrets must not be shipped in a public build var.
if (existsSync(p(".env"))) {
  const env = readFileSync(p(".env"), "utf8");
  if (/^VITE_.*(SECRET|PRIVATE_KEY|SERVICE_ACCOUNT)/mi.test(env)) problems.push(".env has a VITE_ variable that looks like a secret - VITE_ values are public in the browser");
}

if (problems.length) {
  console.error("\n❌ SmartAttend project check failed:\n");
  for (const x of problems) console.error("  - " + x);
  console.error("\nTip: always unzip a new version into a FRESH folder, then copy your .env into it.\n");
  process.exit(1);
}
console.log("✔ project check passed");
