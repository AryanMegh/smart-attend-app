// Mirrors src/data/allowedEmployees.js into a Firestore "employee-list"
// collection, which is what firestore.rules actually checks when someone
// registers. This is only a fallback/manual tool for bulk-seeding from a
// known-good snapshot — day-to-day, the Admin > Employees page's Excel
// import (src/lib/allowlistImport.js) already writes to this same
// collection automatically, no admin SDK or manual step needed.
//
// IMPORTANT — service account credentials:
//   This script needs a Firebase Admin service account key. Do NOT hardcode
//   it here and do NOT reuse an old key that has ever been committed,
//   zipped, or shared outside your machine — treat any such key as
//   compromised and rotate it first:
//     Firebase Console -> Project settings -> Service accounts
//       -> Generate new private key
//     (then also delete the old key under "Service accounts" if it's listed)
//
//   Then run:
//     GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-new-key.json node scripts/seedAllowedEmployees.mjs
//
// This script is intentionally never run automatically and never bundled
// into the web app — it uses firebase-admin, which must not ship to the
// browser.

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reads the same array the web app uses, so the two never drift apart.
const allowedEmployeesSrc = readFileSync(
  path.join(__dirname, "../src/data/allowedEmployees.js"),
  "utf8",
);
const match = allowedEmployeesSrc.match(
  /export const ALLOWED_EMPLOYEES = (\[[\s\S]*?\n\]);/,
);
if (!match) {
  throw new Error("Could not find ALLOWED_EMPLOYEES array in allowedEmployees.js");
}
// eslint-disable-next-line no-eval
const ALLOWED_EMPLOYEES = eval(match[1]);

function normalizeEmail(raw) {
  return String(raw || "").replace(/\s+/g, "").trim().toLowerCase();
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error(
    "Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase Admin service account " +
      "key before running this script. See the comment at the top of this file.",
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const batch = db.batch();
let count = 0;

for (const emp of ALLOWED_EMPLOYEES) {
  const emailId = normalizeEmail(emp.email);
  if (!emailId) {
    console.warn("Skipping entry with no email:", emp);
    continue;
  }
  const ref = db.collection("employee-list").doc(emailId);
  batch.set(ref, {
    employeeCode: emp.employeeCode || null,
    name: emp.name || null,
    location: emp.location || null,
    email: emailId,
  });
  count++;
}

await batch.commit();
console.log(`Seeded ${count} authorized employees into Firestore.`);
console.log(
  "Anyone previously registered but NOT on this list still has an existing " +
    "employees/{uid} doc — this script only controls new registrations. " +
    "Remove old unauthorized profiles manually from the Firestore console " +
    "or the Admin -> Employees page if needed.",
);
