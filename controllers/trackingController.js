// controllers/trackingController.js
// ═══════════════════════════════════════════════════════════
// GPS Location — MySQL (history) + Firebase (real-time)
// ═══════════════════════════════════════════════════════════

const db = require("../config/db");
const { db: firebaseDb } = require("../config/firebase");

// ── POST /api/tracking/location ───────────────────────────
// Driver App sends GPS every 5 seconds
// Body: { bus_id, latitude, longitude, speed, trip_code }
async function insertLocation(req, res) {
  try {
    const { bus_id, latitude, longitude, speed = 0, trip_code } = req.body;
    const driver_id = req.user.id;

    if (!bus_id || !latitude || !longitude)
      return res.status(400).json({ success: false, error: "bus_id, latitude, longitude required" });

    // Insert into MySQL (history/analytics)
    await db.query(
      `INSERT INTO tracking_locations (bus_id, latitude, longitude, timestamp)
       VALUES (?, ?, ?, NOW())`,
      [bus_id, latitude, longitude]
    );

    // Push to Firebase (real-time live tracking)
    if (firebaseDb && trip_code) {
      await firebaseDb.ref(`trips/${trip_code}/drivers/${req.user.phone}`).update({
        latitude,
        longitude,
        speed,
        updatedAt: Date.now(),
        driverId: String(req.user.phone),
      });
    }

    return res.json({ success: true, message: "Location saved" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/tracking/live ─────────────────────────────────
// Company Admin: get latest location per bus
async function getLiveLocations(req, res) {
  try {
    const company_id = req.user.company_id || req.query.company_id;

    const [rows] = await db.query(
      `SELECT tl.bus_id, tl.latitude, tl.longitude, tl.timestamp,
              b.bus_number,
              d.name   AS driver_name,
              d.phone  AS driver_phone
       FROM tracking_locations tl
       INNER JOIN (
         SELECT bus_id, MAX(track_id) AS max_id
         FROM tracking_locations GROUP BY bus_id
       ) latest ON tl.bus_id = latest.bus_id AND tl.track_id = latest.max_id
       JOIN buses   b   ON tl.bus_id    = b.bus_id
       LEFT JOIN driver_bus_assign dba ON b.bus_id  = dba.bus_id
       LEFT JOIN drivers d             ON dba.driver_id = d.driver_id
       WHERE b.company_id = ?`,
      [company_id]
    );

    return res.json({ success: true, locations: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/tracking/history/:bus_id ─────────────────────
// Get full GPS history for a specific bus (last 100 points)
async function getLocationHistory(req, res) {
  try {
    const { bus_id } = req.params;
    const { date } = req.query; // optional: YYYY-MM-DD

    let query = "SELECT * FROM tracking_locations WHERE bus_id = ?";
    const params = [bus_id];

    if (date) {
      query += " AND DATE(timestamp) = ?";
      params.push(date);
    }
    query += " ORDER BY timestamp DESC LIMIT 100";

    const [rows] = await db.query(query, params);
    return res.json({ success: true, history: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { insertLocation, getLiveLocations, getLocationHistory };
