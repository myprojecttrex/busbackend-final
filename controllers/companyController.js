// controllers/companyController.js
// ═══════════════════════════════════════════════════════════
// Company Admin APIs — Drivers, Buses, Routes, Dashboard
// ═══════════════════════════════════════════════════════════

const db = require("../config/db");

// ── GET /api/company/dashboard ────────────────────────────
async function getDashboard(req, res) {
  try {
    const company_id = req.user.company_id;

    const [[{ drivers }]] = await db.query("SELECT COUNT(*) AS drivers FROM drivers WHERE company_id = ?", [company_id]);
    const [[{ buses }]] = await db.query("SELECT COUNT(*) AS buses FROM buses WHERE company_id = ?", [company_id]);
    const [[{ pending }]] = await db.query("SELECT COUNT(*) AS pending FROM trip_codes WHERE company_id = ? AND status = 'pending'", [company_id]);
    const [[{ active }]] = await db.query("SELECT COUNT(*) AS active FROM trip_codes WHERE company_id = ? AND status = 'active'", [company_id]);

    return res.json({
      success: true,
      stats: { drivers, buses, pendingTrips: pending, activeTrips: active },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/company/drivers ──────────────────────────────
async function getDrivers(req, res) {
  try {
    const company_id = req.user.company_id;
    const [rows] = await db.query(
      `SELECT d.driver_id, d.name, d.phone, d.password, 
              d.address, d.licence_number, d.licence_expiry, d.experience, d.police_verification,
              b.bus_number, b.bus_id
       FROM drivers d
       LEFT JOIN driver_bus_assign dba ON d.driver_id = dba.driver_id
       LEFT JOIN buses b               ON dba.bus_id   = b.bus_id
       WHERE d.company_id = ?
       ORDER BY d.driver_id ASC`,
      [company_id]
    );
    return res.json({ success: true, drivers: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/company/drivers ─────────────────────────────
async function addDriver(req, res) {
  try {
    const company_id = req.user.company_id;
    const { name, phone, password, address, licence_number, licence_expiry, experience, police_verification } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ success: false, error: "name, phone, password required" });

    // Check duplicate phone
    const [existing] = await db.query("SELECT driver_id FROM drivers WHERE phone = ? LIMIT 1", [phone]);
    if (existing.length)
      return res.status(409).json({ success: false, error: "Phone number already registered" });

    const [result] = await db.query(
      `INSERT INTO drivers (company_id, name, phone, password, address, licence_number, licence_expiry, experience, police_verification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id, name, phone, password, address || null, licence_number || null, licence_expiry || null, experience || null, police_verification || 'pending']
    );
    return res.status(201).json({ success: true, driver_id: result.insertId, phone, password, message: "Driver added" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/company/buses ────────────────────────────────
async function getBuses(req, res) {
  try {
    const company_id = req.user.company_id;
    const [rows] = await db.query(
      `SELECT b.*,
              d.name AS driver_name, d.phone AS driver_phone
       FROM buses b
       LEFT JOIN driver_bus_assign dba ON b.bus_id     = dba.bus_id
       LEFT JOIN drivers d             ON dba.driver_id = d.driver_id
       WHERE b.company_id = ?`,
      [company_id]
    );
    return res.json({ success: true, buses: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}



// ── GET /api/company/driver/bus ───────────────────────────
// Driver gets their assigned bus (called from driver app)
async function getAssignedBus(req, res) {
  try {
    const driver_id = req.user.id;
    const [rows] = await db.query(
      `SELECT b.bus_id, b.bus_number
       FROM driver_bus_assign dba
       JOIN buses  b ON dba.bus_id   = b.bus_id
       WHERE dba.driver_id = ? LIMIT 1`,
      [driver_id]
    );
    if (!rows.length)
      return res.json({ success: true, bus: null, message: "No bus assigned" });
    return res.json({ success: true, bus: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/company/buses ─────────────────────────────
async function addBus(req, res) {
  try {
    const company_id = req.user.company_id;
    const { bus_number } = req.body;
    if (!bus_number)
      return res.status(400).json({ success: false, error: "bus_number required" });

    const [existing] = await db.query("SELECT bus_id FROM buses WHERE bus_number = ? LIMIT 1", [bus_number]);
    if (existing.length)
      return res.status(409).json({ success: false, error: "Bus number already registered" });

    const [result] = await db.query(
      "INSERT INTO buses (company_id, bus_number) VALUES (?, ?)",
      [company_id, bus_number]
    );
    return res.status(201).json({ success: true, bus_id: result.insertId, message: "Bus added" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── DELETE /api/company/drivers/:id ─────────────────────
async function deleteDriver(req, res) {
  try {
    const company_id = req.user.company_id;
    const driver_id = req.params.id;
    await db.query("DELETE FROM drivers WHERE driver_id = ? AND company_id = ?", [driver_id, company_id]);
    return res.json({ success: true, message: "Driver deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── DELETE /api/company/buses/:id ───────────────────────
async function deleteBus(req, res) {
  try {
    const company_id = req.user.company_id;
    const bus_id = req.params.id;
    await db.query("DELETE FROM buses WHERE bus_id = ? AND company_id = ?", [bus_id, company_id]);
    return res.json({ success: true, message: "Bus deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getDashboard, getDrivers, addDriver, deleteDriver, getBuses, addBus, deleteBus, getAssignedBus };
