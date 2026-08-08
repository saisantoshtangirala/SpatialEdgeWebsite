/**
 * One-time helper to load your course catalog into Firestore.
 *
 * 1. Export your SQL Server "Courses" table to a JSON array and save it as
 *    courses.json in this project's root folder (next to firebase.json).
 *    Each entry needs: CourseID, CourseName, Duration, OriginalPrice,
 *    DiscountedPrice, Description — see courses.sample.json for the shape.
 *
 * 2. Run from the project root (where the firebase-adminsdk key file lives):
 *      node scripts/seed-courses.js courses.json
 *
 * This uses the existing service account key
 * (spatialedge-solutions-firebase-adminsdk-fbsvc-89586dcb74.json) so it
 * talks to Firestore directly — no firebase login needed for this step.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node scripts/seed-courses.js <path-to-courses.json>");
  process.exit(1);
}

const keyPath = path.join(
  __dirname,
  "..",
  "spatialedge-solutions-firebase-adminsdk-fbsvc-89586dcb74.json"
);

if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}`);
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const raw = fs.readFileSync(path.resolve(inputFile), "utf8");
  const courses = JSON.parse(raw);

  if (!Array.isArray(courses)) {
    throw new Error("courses.json must contain a JSON array of course objects.");
  }

  const batch = db.batch();
  for (const course of courses) {
    if (!course.CourseID) {
      throw new Error(`Course missing CourseID: ${JSON.stringify(course)}`);
    }
    const ref = db.collection("courses").doc(String(course.CourseID));
    const { CourseID, ...fields } = course;
    batch.set(ref, fields);
  }

  await batch.commit();
  console.log(`Seeded ${courses.length} course(s) into Firestore.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
