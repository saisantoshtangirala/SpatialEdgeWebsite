const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Firebase Hosting forwards the full "/api/..." path to this function.
// Normalize it so routes can be defined without the "/api" prefix.
app.use((req, res, next) => {
  if (req.url === "/api") req.url = "/";
  else if (req.url.startsWith("/api/")) req.url = req.url.slice(4);
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.get("/test", (req, res) => {
  res.json({ message: "Server is running!" });
});

// GET /api/courses -> read the "courses" collection in Firestore.
// Each document's ID should be the CourseID (e.g. "1", "2" ...) and its
// fields should match: CourseName, Duration, OriginalPrice, DiscountedPrice, Description
app.get("/courses", async (req, res) => {
  try {
    const snap = await db.collection("courses").get();
    const courses = snap.docs
      .map((d) => ({ CourseID: Number(d.id), ...d.data() }))
      .sort((a, b) => a.CourseID - b.CourseID);
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching courses");
  }
});

// POST /api/enroll (multipart/form-data) -> saves enrollment to Firestore,
// uploads the receipt file (if any) to Cloud Storage under receipts/.
app.post("/enroll", upload.single("receipt"), async (req, res) => {
  const { courseName, fullName, organizationName, phoneNumber, email } = req.body;

  if (!courseName || !fullName || !phoneNumber || !email) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  try {
    let receiptFileName = null;

    if (req.file) {
      receiptFileName = `${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(`receipts/${receiptFileName}`);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: { cacheControl: "private, max-age=0" },
      });
    }

    await db.collection("enrollments").add({
      courseName,
      fullName,
      organizationName: organizationName || "",
      phoneNumber,
      email,
      receiptFileName,
      receiptStoragePath: receiptFileName ? `receipts/${receiptFileName}` : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, message: "Enrollment submitted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving enrollment" });
  }
});

// POST /api/inquiries (application/json) -> saves inquiry to Firestore.
app.post("/inquiries", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  try {
    await db.collection("inquiries").add({
      name,
      email,
      phone: phone || "",
      message: message || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ success: true, message: "Inquiry saved successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving inquiry" });
  }
});

exports.api = onRequest(app);
