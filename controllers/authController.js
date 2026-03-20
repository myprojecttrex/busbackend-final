// controllers/authController.js
const db = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ── POST /api/auth/main-admin/login ────────────────────────
async function mainAdminLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: "Username and password required" });

    const [rows] = await db.query(
      "SELECT * FROM main_admin WHERE username = ? LIMIT 1",
      [username]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    const admin = rows[0];
    // NOTE: Plain text comparison for now
    // After you run hash migration, switch to: bcrypt.compare(password, admin.password)
    if (admin.password !== password)
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    const token = makeToken({ id: admin.id, username: admin.username, role: "superadmin" });
    return res.json({
      success: true, token,
      user: { id: admin.id, username: admin.username, role: "superadmin" },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// ── POST /api/auth/company-admin/login ─────────────────────
async function companyAdminLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: "Username and password required" });

    const [rows] = await db.query(
      `SELECT ca.*, c.company_name, c.phone AS company_phone,
              c.address, c.status AS company_status
       FROM company_admins ca
       JOIN companies c ON ca.company_id = c.company_id
       WHERE ca.username = ? AND ca.status = 1 LIMIT 1`,
      [username]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    const admin = rows[0];
    if (!admin.company_status)
      return res.status(403).json({ success: false, error: "Company is inactive" });
    if (admin.password !== password)
      return res.status(401).json({ success: false, error: "Invalid credentials" });

    const token = makeToken({
      id: admin.company_admin_id,
      username: admin.username,
      company_id: admin.company_id,
      role: "company_admin",
    });
    return res.json({
      success: true, token,
      user: {
        id: admin.company_admin_id,
        username: admin.username,
        name: admin.name,
        company_id: admin.company_id,
        company_name: admin.company_name,
        company_phone: admin.company_phone,
        address: admin.address,
        role: "company_admin",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

// ── POST /api/auth/driver/login ────────────────────────────
async function driverLogin(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, error: "Phone and password required" });

    const [rows] = await db.query(
      `SELECT d.*,
              b.bus_number, b.bus_id,
              c.company_name
       FROM drivers d
       LEFT JOIN driver_bus_assign dba ON d.driver_id = dba.driver_id
       LEFT JOIN buses b               ON dba.bus_id   = b.bus_id
       LEFT JOIN companies c           ON d.company_id = c.company_id
       WHERE d.phone = ? LIMIT 1`,
      [phone]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, error: "Invalid phone or password" });

    const driver = rows[0];
    if (driver.password !== password)
      return res.status(401).json({ success: false, error: "Invalid phone or password" });

    const token = makeToken({
      id: driver.driver_id,
      phone: driver.phone,
      company_id: driver.company_id,
      role: "driver",
    });
    return res.json({
      success: true, token,
      user: {
        driver_id: driver.driver_id,
        name: driver.name,
        phone: driver.phone,
        company_name: driver.company_name,
        bus_number: driver.bus_number || null,
        bus_id: driver.bus_id || null,
        role: "driver",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = { mainAdminLogin, companyAdminLogin, driverLogin };
