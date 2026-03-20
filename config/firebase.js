// config/firebase.js - Firebase Admin SDK for real-time GPS
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let db = null;

try {
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

  // Check if service account exists to prevent ADC credential spam
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    }
    db = admin.database();
    console.log("✅ Firebase Admin connected successfully!");
  } else {
    console.warn("⚠️  Firebase serviceAccountKey.json not found!");
    console.warn("   To fix Firebase errors: Download your Firebase Service Account JSON");
    console.warn("   from Firebase Console > Project Settings > Service Accounts.");
    console.warn("   Rename it to 'serviceAccountKey.json' and place it in the bus-backend folder.");
    console.warn("   GPS real-time features will be DISABLED until this is added.");
  }
} catch (err) {
  console.warn("⚠️  Firebase Admin initialization failed:", err.message);
}

module.exports = { admin, db };
