// controllers/tripCodeController.js
// ═══════════════════════════════════════════════════════════
// Trip Code generation & validation — stored in MySQL
// Also syncs to Firebase for real-time driver app validation
// ═══════════════════════════════════════════════════════════

const db = require("../config/db");
const { db: firebaseDb } = require("../config/firebase");
require("dotenv").config();

// Generate secure 6-character code
function generateCode() {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0,O,1,I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// ── POST /api/tripcodes/generate ──────────────────────────
// Company Admin creates a trip code for a driver
// Body: { driver_id, bus_id, from_location, to_location }
async function generateTripCode(req, res) {
  try {
    const { driver_id, bus_id, from_location, to_location } = req.body;
    const company_id = req.user.company_id;

    if (!driver_id || !bus_id || !from_location || !to_location)
      return res.status(400).json({ success: false, error: "All fields required" });

    // Verify driver belongs to this company
    const [driverRows] = await db.query(
      "SELECT * FROM drivers WHERE driver_id = ? AND company_id = ? LIMIT 1",
      [driver_id, company_id]
    );
    if (!driverRows.length)
      return res.status(404).json({ success: false, error: "Driver not found in your company" });

    // Verify bus belongs to this company
    const [busRows] = await db.query(
      "SELECT * FROM buses WHERE bus_id = ? AND company_id = ? LIMIT 1",
      [bus_id, company_id]
    );
    if (!busRows.length)
      return res.status(404).json({ success: false, error: "Bus not found in your company" });

    const driver = driverRows[0];
    const bus = busRows[0];

    // Generate unique trip code
    let tripCode, exists;
    let attempts = 0;
    do {
      tripCode = generateCode();
      const [check] = await db.query(
        "SELECT trip_code FROM trip_codes WHERE trip_code = ? LIMIT 1",
        [tripCode]
      );
      exists = check.length > 0;
      attempts++;
      if (attempts > 20) throw new Error("Failed to generate unique code");
    } while (exists);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Save to MySQL
    const [result] = await db.query(
      `INSERT INTO trip_codes
       (trip_code, driver_id, bus_id, company_id, from_location, to_location,
        status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
      [tripCode, driver_id, bus_id, company_id, from_location, to_location, expiresAt]
    );

    const tripData = {
      tripCode,
      driverPhone: driver.phone,
      driverName: driver.name,
      busNo: bus.bus_number,
      from: from_location,
      to: to_location,
      status: "pending",
      createdAt: now.getTime(),
      expiresAt: expiresAt.getTime(),
    };

    // ✅ Also sync to Firebase so Driver App can validate without backend call
    if (firebaseDb) {
      await firebaseDb.ref(`tripCodes/${tripCode}`).set(tripData);
    }

    return res.status(201).json({
      success: true,
      tripCode,
      message: "Trip code generated successfully. Share with the driver.",
      data: tripData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/tripcodes/validate ──────────────────────────
// Driver app validates trip code before starting GPS
// Body: { trip_code, phone }
async function validateTripCode(req, res) {
  try {
    const { trip_code, phone } = req.body;
    if (!trip_code || !phone)
      return res.status(400).json({ valid: false, reason: "Trip code and phone required" });

    const [rows] = await db.query(
      `SELECT tc.*,
              d.name AS driver_name, d.phone AS driver_phone,
              b.bus_number
       FROM trip_codes tc
       JOIN drivers d ON tc.driver_id = d.driver_id
       JOIN buses   b ON tc.bus_id    = b.bus_id
       WHERE tc.trip_code = ? LIMIT 1`,
      [trip_code.toUpperCase()]
    );

    if (!rows.length)
      return res.json({ valid: false, reason: "Invalid trip code. Please check and try again." });

    const tc = rows[0];

    if (tc.driver_phone !== String(phone))
      return res.json({ valid: false, reason: "Invalid trip code or this trip is not assigned to this driver." });

    if (tc.status === "active")
      return res.json({ valid: false, reason: "This trip is already in progress." });

    if (tc.status === "ended")
      return res.json({ valid: false, reason: "This trip code has already been completed." });

    if (tc.status === "expired" || new Date() > new Date(tc.expires_at)) {
      await db.query("UPDATE trip_codes SET status = 'expired' WHERE trip_code = ?", [trip_code]);
      return res.json({ valid: false, reason: "This trip code has expired. Please request a new one." });
    }

    // ✅ Activate trip
    await db.query(
      "UPDATE trip_codes SET status = 'active', activated_at = NOW() WHERE trip_code = ?",
      [trip_code]
    );

    // ✅ Log entire trip details in database upon journey start (per user request)
    await db.query(
      `INSERT INTO trips_log (trip_code, driver_name, bus_number, from_location, to_location, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tc.trip_code, tc.driver_name, tc.bus_number, tc.from_location, tc.to_location, tc.company_id]
    ).catch(e => console.error("Could not insert trips_log:", e));

    // Sync status to Firebase
    if (firebaseDb) {
      await firebaseDb.ref(`tripCodes/${trip_code}`).update({
        status: "active",
        activatedAt: Date.now(),
      });
    }

    return res.json({
      valid: true,
      message: "Trip code validated! GPS tracking is now enabled.",
      tripDetails: {
        tripCode: tc.trip_code,
        from: tc.from_location,
        to: tc.to_location,
        busNo: tc.bus_number,
        driverName: tc.driver_name,
        driverPhone: tc.driver_phone,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ valid: false, reason: "Server error. Try again." });
  }
}

// ── GET /api/tripcodes ─────────────────────────────────────
// Company Admin: get all trip codes for their company
async function getAllTripCodes(req, res) {
  try {
    const company_id = req.user.company_id;
    const [rows] = await db.query(
      `SELECT tc.*, d.name AS driver_name, d.phone AS driver_phone,
              b.bus_number
       FROM trip_codes tc
       JOIN drivers d ON tc.driver_id = d.driver_id
       JOIN buses   b ON tc.bus_id    = b.bus_id
       WHERE tc.company_id = ?
       ORDER BY tc.created_at DESC`,
      [company_id]
    );
    return res.json({ success: true, tripCodes: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/tripcodes/end ────────────────────────────────
// Driver marks trip as ended
async function endTrip(req, res) {
  try {
    const { trip_code, phone } = req.body;
    const [rows] = await db.query(
      `SELECT tc.*, d.phone AS driver_phone FROM trip_codes tc
       JOIN drivers d ON tc.driver_id = d.driver_id
       WHERE tc.trip_code = ? LIMIT 1`,
      [trip_code]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: "Trip not found" });
    if (rows[0].driver_phone !== String(phone))
      return res.status(403).json({ success: false, error: "Not your trip" });

    await db.query(
      "UPDATE trip_codes SET status = 'ended', ended_at = NOW() WHERE trip_code = ?",
      [trip_code]
    );

    if (firebaseDb) {
      await firebaseDb.ref(`tripCodes/${trip_code}`).update({ status: "ended", endedAt: Date.now() });
      await firebaseDb.ref(`trips/${trip_code}`).update({ status: "ended", endedAt: Date.now() });
    }

    return res.json({ success: true, message: "Trip ended." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { generateTripCode, validateTripCode, getAllTripCodes, endTrip };
