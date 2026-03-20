// controllers/mainAdminController.js
// ═══════════════════════════════════════════════════════════
// Super Admin APIs — manage all companies & company admins
// ═══════════════════════════════════════════════════════════

const db = require("../config/db");

// ── GET /api/admin/companies ──────────────────────────────
async function getAllCompanies(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
              COUNT(DISTINCT d.driver_id) AS driver_count,
              COUNT(DISTINCT b.bus_id)    AS bus_count
       FROM companies c
       LEFT JOIN drivers d ON c.company_id = d.company_id
       LEFT JOIN buses   b ON c.company_id = b.company_id
       GROUP BY c.company_id
       ORDER BY c.created_at DESC`
    );
    return res.json({ success: true, companies: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── POST /api/admin/companies ─────────────────────────────
async function addCompany(req, res) {
  try {
    const { company_name, email, phone, address, admin_username, admin_password } = req.body;
    if (!company_name || !phone || !admin_username || !admin_password)
      return res.status(400).json({ success: false, error: "Required fields missing" });

    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      const [cResult] = await conn.query(
        "INSERT INTO companies (company_name, email, phone, address) VALUES (?, ?, ?, ?)",
        [company_name, email || "", phone, address || ""]
      );
      const company_id = cResult.insertId;

      await conn.query(
        "INSERT INTO company_admins (company_id, name, email, username, password) VALUES (?, ?, ?, ?, ?)",
        [company_id, company_name, email || "", admin_username, admin_password]
      );

      await conn.commit();
      conn.release();
      return res.status(201).json({ success: true, company_id, message: "Company and admin created" });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── PATCH /api/admin/companies/:id/status ─────────────────
async function toggleCompanyStatus(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT status FROM companies WHERE company_id = ?", [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, error: "Company not found" });

    const newStatus = rows[0].status ? 0 : 1;
    await db.query("UPDATE companies SET status = ? WHERE company_id = ?", [newStatus, id]);
    return res.json({ success: true, status: newStatus, message: newStatus ? "Company activated" : "Company deactivated" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/admin/stats ──────────────────────────────────
async function getGlobalStats(req, res) {
  try {
    const [[{ companies }]] = await db.query("SELECT COUNT(*) AS companies FROM companies");
    const [[{ drivers }]] = await db.query("SELECT COUNT(*) AS drivers FROM drivers");
    const [[{ buses }]] = await db.query("SELECT COUNT(*) AS buses FROM buses");
    const [[{ active }]] = await db.query("SELECT COUNT(*) AS active FROM trip_codes WHERE status = 'active'");
    return res.json({ success: true, stats: { companies, drivers, buses, activeTrips: active } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/admin/trips ──────────────────────────────────
// Super Admin: get all trip codes across all companies
async function getAllTripsGlobal(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT tc.*, 
              d.name AS driver_name, d.phone AS driver_phone,
              b.bus_number,
              c.company_name
       FROM trip_codes tc
       JOIN drivers d ON tc.driver_id = d.driver_id
       JOIN buses   b ON tc.bus_id    = b.bus_id
       JOIN companies c ON tc.company_id = c.company_id
       ORDER BY tc.created_at DESC`
    );
    return res.json({ success: true, trips: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { getAllCompanies, addCompany, toggleCompanyStatus, getGlobalStats, getAllTripsGlobal };
