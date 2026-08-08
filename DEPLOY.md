# Deploying SpatialEdge Solutions to Firebase

This folder is now a complete Firebase project targeting `spatialedge-solutions`.
Your site's HTML/CSS/JS/images stay right where they already are (project
root) — Firebase Hosting is configured to publish this whole folder, minus
the files listed below.

- `firebase.json` publishes the project root as Hosting content, but
  **excludes** `functions/`, `scripts/`, `server.js`, `.env`, the
  `*firebase-adminsdk*.json` service-account key, `package.json` /
  `package-lock.json`, `courses*.json`, `DEPLOY.md`, `uploads/`, and
  `New folder/` — none of those get published to the live site.
- `contact.html`, `training.html`, and `course-detail.html` now call
  `/api/...` instead of `http://localhost:5000/api/...`.
- `functions/` — a Cloud Function (`api`) that replaces `server.js`. Same three
  endpoints (`/api/courses`, `/api/enroll`, `/api/inquiries`), but backed by
  **Firestore** instead of your local SQL Server, and receipt uploads go to
  **Cloud Storage** instead of a local `uploads/` folder.
- `.firebaserc`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`
  — Firebase config, already pointed at the `spatialedge-solutions` project
  (matching your existing service account key).
- `scripts/seed-courses.js` — one-time script to load your course catalog into
  Firestore (see step 3 below).

Your old `server.js`, `.env`, and `node_modules` (SQL Server backend) are left
in place untouched — they're no longer used by the deployed site but nothing
was deleted.

## Prerequisites (one-time)

Install Node.js 18+ if you don't have it, then install the Firebase CLI:

```
npm install -g firebase-tools
```

## Steps

**1. Log in to Firebase as maddurinarasimha19@gmail.com**

```
firebase login
```

This opens a browser window — sign in with that Google account and approve.

**2. Install the Cloud Functions dependencies**

```
cd functions
npm install
cd ..
```

**3. Load your course catalog into Firestore**

Export your SQL Server `Courses` table (SSMS → right-click table → Export
Data, or run `SELECT * FROM Courses` and save the results) as a JSON array
matching the shape in `courses.sample.json`, save it as `courses.json` in this
folder, then run:

```
node scripts/seed-courses.js courses.json
```

(This step only needs your existing service-account key file, already in this
folder — no `firebase login` required for it.)

**4. Deploy**

```
firebase deploy --project spatialedge-solutions
```

This deploys Hosting, the Cloud Function, and the (locked-down) Firestore/
Storage rules. When it finishes it prints your live Hosting URL, something
like:

```
Hosting URL: https://spatialedge-solutions.web.app
```

## Notes / things to double check afterward

- **Enable Firestore and Storage first** if this project hasn't used them
  before: in the [Firebase Console](https://console.firebase.google.com/)
  for `spatialedge-solutions`, go to Build → Firestore Database → Create
  database, and Build → Storage → Get started. Do this before step 4, or the
  deploy will fail with a "not enabled" error.
- **Cloud Functions requires the Blaze (pay-as-you-go) billing plan** — the
  free Spark plan doesn't support Functions. You won't be charged unless
  usage is high; there's a generous free tier.
- The `enrollments` and `inquiries` collections in Firestore, and the
  `receipts/` folder in Storage, will be empty until real form submissions
  come in (or you add test data).
- If you ever want to view/edit the enrollment or inquiry data, use the
  Firebase Console → Firestore Database, rather than SQL Server Management
  Studio.
