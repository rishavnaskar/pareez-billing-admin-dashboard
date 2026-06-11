/**
 * Seed demo data for the NEW collections this dashboard owns: `products` and
 * `employees`. These don't exist in the billing app, so the catalog & staff
 * pages start empty. Run this once to populate sample data.
 *
 * Usage:
 *   1. Put a Firebase Admin service account key at scripts/serviceAccountKey.json
 *      (Firebase console → Project settings → Service accounts → Generate key).
 *   2. node scripts/seed-demo-data.js            # dry run (prints what it would add)
 *      node scripts/seed-demo-data.js --commit   # actually write to Firestore
 *
 * This NEVER touches customers / bills / walletTransactions.
 */

const path = require("path");
const admin = require("firebase-admin");

const COMMIT = process.argv.includes("--commit");

let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
} catch {
  console.error(
    "\n✗ Missing scripts/serviceAccountKey.json\n" +
      "  Download it from Firebase console → Project settings → Service accounts.\n"
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const PRODUCTS = [
  { name: "Men's Haircut", category: "Hair", price: 250, durationMinutes: 30, sku: "HAIR-M-01" },
  { name: "Women's Haircut", category: "Hair", price: 600, durationMinutes: 60, sku: "HAIR-W-01" },
  { name: "Hair Spa", category: "Spa", price: 1200, durationMinutes: 75, sku: "SPA-01" },
  { name: "Hair Colour (Global)", category: "Hair", price: 2500, durationMinutes: 120, sku: "HAIR-CLR-01" },
  { name: "Beard Trim & Shape", category: "Beard", price: 200, durationMinutes: 20, sku: "BEARD-01" },
  { name: "Classic Facial", category: "Skin", price: 900, durationMinutes: 60, sku: "SKIN-FAC-01" },
  { name: "Gold Facial", category: "Skin", price: 1800, durationMinutes: 75, sku: "SKIN-FAC-02" },
  { name: "Threading (Eyebrows)", category: "Skin", price: 60, durationMinutes: 10, sku: "SKIN-THR-01" },
  { name: "Manicure", category: "Nails", price: 500, durationMinutes: 45, sku: "NAIL-01" },
  { name: "Pedicure", category: "Nails", price: 700, durationMinutes: 50, sku: "NAIL-02" },
  { name: "Gel Nail Extensions", category: "Nails", price: 1500, durationMinutes: 90, sku: "NAIL-03" },
  { name: "Full Body Massage", category: "Massage", price: 2000, durationMinutes: 60, sku: "MSG-01" },
  { name: "Bridal Makeup", category: "Makeup", price: 8000, durationMinutes: 150, sku: "MK-BRIDAL-01" },
  { name: "Party Makeup", category: "Makeup", price: 3000, durationMinutes: 90, sku: "MK-PARTY-01" },
  { name: "Keratin Treatment", category: "Hair", price: 4500, durationMinutes: 150, sku: "HAIR-KRT-01" },
  { name: "Shampoo (Retail 200ml)", category: "Retail", price: 450, sku: "RTL-SH-01" },
  { name: "Hair Serum (Retail)", category: "Retail", price: 650, sku: "RTL-SR-01" },
];

const EMPLOYEES = [
  { name: "Aman Verma", designation: "Senior Stylist", phone: "9876500011", dateOfBirth: "1992-06-09", joinedAt: "2021-03-01" },
  { name: "Priya Sharma", designation: "Beautician", phone: "9876500022", dateOfBirth: "1995-11-21", joinedAt: "2022-01-15" },
  { name: "Rahul Das", designation: "Stylist", phone: "9876500033", dateOfBirth: "1998-02-14", joinedAt: "2023-07-10" },
  { name: "Sneha Roy", designation: "Spa Therapist", phone: "9876500044", dateOfBirth: "1994-09-30", joinedAt: "2022-09-05" },
  { name: "Kunal Singh", designation: "Nail Artist", phone: "9876500055", dateOfBirth: "1996-12-25", joinedAt: "2023-02-20" },
  { name: "Meena Gupta", designation: "Manager", phone: "9876500066", dateOfBirth: "1988-04-18", joinedAt: "2020-06-01" },
  { name: "Farhan Khan", designation: "Receptionist", phone: "9876500077", dateOfBirth: "1999-07-07", joinedAt: "2024-01-08" },
];

async function run() {
  console.log(`\nPareez Admin — demo seed ${COMMIT ? "(COMMIT)" : "(dry run)"}\n`);

  console.log(`Products to add: ${PRODUCTS.length}`);
  console.log(`Employees to add: ${EMPLOYEES.length}\n`);

  if (!COMMIT) {
    console.log("Dry run — pass --commit to write. Sample:");
    console.log("  •", PRODUCTS[0].name, "→ ₹" + PRODUCTS[0].price);
    console.log("  •", EMPLOYEES[0].name, "→", EMPLOYEES[0].designation);
    console.log("\nNothing was written.\n");
    return;
  }

  const batch = db.batch();
  for (const p of PRODUCTS) {
    const ref = db.collection("products").doc();
    batch.set(ref, { ...p, active: true, branchId: "", createdAt: now, updatedAt: now });
  }
  for (const e of EMPLOYEES) {
    const ref = db.collection("employees").doc();
    batch.set(ref, { ...e, active: true, branchId: "", createdAt: now, updatedAt: now });
  }
  await batch.commit();
  console.log("✓ Seeded products & employees.\n");
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
