// Provisions everyone in the employee Excel so they can log in immediately:
//
//   1. employee-list/{email}  -> the allow-list (lets them self-register too)
//   2. Firebase Auth account  -> email + the temporary password from the sheet
//   3. employees/{uid}        -> profile (role "employee", no face yet)
//
// On first login each person is walked through face registration, and the
// dashboard then forces them to replace the temporary password
// (passwordConfirmed:false -> SetStrongPasswordModal).
//
// Safe by default: it is a DRY RUN unless you pass --apply.
// It never changes the password or role of an account that already exists
// (so your admin account is untouched), and it never writes the password to
// Firestore - the sheet is the only place it lives.
//
//   node scripts/provisionEmployees.mjs ./Employee-List.xlsx            # preview
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/NEW-key.json \
//     node scripts/provisionEmployees.mjs ./Employee-List.xlsx --apply  # do it
//
// The service-account key must be a freshly generated one (Firebase Console ->
// Project settings -> Service accounts). Never commit or zip it.

import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const file = args.find((a) => !a.startsWith("--")) ?? "./Employee-List.xlsx";

const norm = (v) => String(v ?? "").trim().toLowerCase();
const normEmail = (v) => String(v ?? "").replace(/\s+/g, "").toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const splitEmails = (cell) =>
  cell == null
    ? []
    : String(cell).split(/[;,\n\r\/|]+|\s{2,}/).map(normEmail).filter(isEmail);

function parse(path) {
  const wb = XLSX.read(readFileSync(path));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1, defval: null, blankrows: false,
  });
  // header row = the one (of the first 5) mentioning the most known columns
  let hi = 0, best = -1;
  rows.slice(0, 5).forEach((r, i) => {
    const h = (r || []).map(norm);
    const score = ["name", "email", "code", "location"].filter((k) => h.some((c) => c.includes(k))).length;
    if (score > best) { best = score; hi = i; }
  });
  const h = rows[hi].map(norm);
  const col = (...names) => { for (const n of names) { const i = h.findIndex((c) => c.includes(n)); if (i !== -1) return i; } return -1; };
  const c = {
    code: col("employee code", "emp code", "code"),
    name: col("name"),
    location: col("location"),
    email: col("email (login)", "login", "lasa-email", "email"),
    password: col("password"),
    radius: col("radius"),
  };
  const people = [];
  const seen = new Set();
  const warnings = [];
  for (const r of rows.slice(hi + 1)) {
    const name = c.name !== -1 ? String(r[c.name] ?? "").trim() : "";
    if (!name) continue;
    const emails = c.email !== -1 ? splitEmails(r[c.email]) : [];
    if (!emails.length) { warnings.push(`No valid email for "${name}" - skipped`); continue; }
    const fresh = emails.filter((e) => !seen.has(e));
    emails.filter((e) => seen.has(e)).forEach((e) => warnings.push(`Duplicate address ${e} ("${name}") - ignored`));
    if (!fresh.length) continue;
    fresh.forEach((e) => seen.add(e));
    const radius = Number(r[c.radius]);
    people.push({
      emails: fresh,                       // every address may use the app
      primary: fresh[0],                   // the one an Auth account is made for
      name,
      employeeCode: c.code !== -1 && r[c.code] != null ? String(r[c.code]).trim() : null,
      location: c.location !== -1 && r[c.location] != null ? String(r[c.location]).trim() : null,
      radiusKm: Number.isFinite(radius) && radius > 0 ? radius : null,
      password: c.password !== -1 && r[c.password] != null ? String(r[c.password]) : null,
    });
  }
  return { people, warnings };
}

const { people, warnings } = parse(file);
console.log(`\nRead ${people.length} employees from ${file}`);
console.log(`  addresses on the allow-list: ${people.reduce((n, p) => n + p.emails.length, 0)}`);
console.log(`  without a temp password:     ${people.filter((p) => !p.password || p.password.length < 6).length}`);
warnings.forEach((w) => console.log("  ! " + w));

if (!apply) {
  console.log("\nDRY RUN - nothing written. Re-run with --apply (and GOOGLE_APPLICATION_CREDENTIALS set) to provision.\n");
  people.slice(0, 5).forEach((p) =>
    console.log(`  e.g. ${p.employeeCode ?? "-"} | ${p.name} | ${p.primary} | ${p.location ?? "-"} | radius ${p.radiusKm ?? "-"}`));
  process.exit(0);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("\nSet GOOGLE_APPLICATION_CREDENTIALS to a NEW service-account key file first.");
  process.exit(1);
}

const { initializeApp, applicationDefault } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

let created = 0, existing = 0, rosterOnly = 0, failed = 0;
for (const p of people) {
  try {
    // 1) allow-list entries (no password, no phone - this collection is public-read)
    for (const email of p.emails) {
      await db.collection("employee-list").doc(email).set(
        { email, name: p.name, employeeCode: p.employeeCode, location: p.location, radiusKm: p.radiusKm },
        { merge: true },
      );
    }

    // 2) Auth account - never touch one that already exists
    let user = null;
    try { user = await auth.getUserByEmail(p.primary); } catch (e) { if (e.code !== "auth/user-not-found") throw e; }
    if (user) { existing++; continue; }
    if (!p.password || p.password.length < 6) { rosterOnly++; console.log(`  - ${p.primary}: no usable temp password, allow-list only (they can self-register)`); continue; }

    user = await auth.createUser({ email: p.primary, password: p.password, displayName: p.name });

    // 3) profile
    await db.collection("employees").doc(user.uid).set({
      uid: user.uid,
      name: p.name,
      employeeCode: p.employeeCode ?? "",
      email: p.primary,
      location: p.location,
      radiusKm: p.radiusKm,
      role: "employee",
      faceRegistered: false,
      passwordConfirmed: false,
      createdAt: FieldValue.serverTimestamp(),
      provisioned: true,
    });
    created++;
    console.log(`  + ${p.primary}`);
  } catch (e) {
    failed++;
    console.error(`  x ${p.primary}: ${e.message}`);
  }
}
console.log(`\nDone. created: ${created}, already had an account: ${existing}, allow-list only: ${rosterOnly}, failed: ${failed}\n`);
