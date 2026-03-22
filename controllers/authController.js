const db = require("../config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { comparePassword, hashPassword } = require("../utils/authCredentials");

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

async function mainAdminLogin(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM main_admin WHERE username = ? LIMIT 1",
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const admin = rows[0];
    const passwordMatches = await comparePassword(password, admin.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = makeToken({
      id: admin.id,
      username: admin.username,
      role: "main_admin",
    });

    return res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: "main_admin",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function companyAdminLogin(req, res) {
  try {
    const userId = String(req.body.userId || req.body.user_id || req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!userId || !password) {
      return res.status(400).json({ success: false, error: "userId and password required" });
    }

    const [rows] = await db.query(
      `SELECT ca.*, c.company_name, c.phone AS company_phone,
              c.address, c.status AS company_status
         FROM company_admins ca
         JOIN companies c ON ca.company_id = c.company_id
        WHERE (ca.user_id = ? OR ca.username = ?) AND ca.status = 1
        LIMIT 1`,
      [userId, userId]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const admin = rows[0];
    if (!admin.company_status) {
      return res.status(403).json({ success: false, error: "Company is inactive" });
    }

    const passwordMatches = await comparePassword(password, admin.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    await db.query(
      "UPDATE company_admins SET last_login_at = NOW() WHERE company_admin_id = ?",
      [admin.company_admin_id]
    );

    const token = makeToken({
      id: admin.company_admin_id,
      userId: admin.user_id,
      company_id: admin.company_id,
      companyId: admin.company_id,
      role: admin.role || "company_admin",
      mustChangePassword: !!admin.must_change_password,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: admin.company_admin_id,
        userId: admin.user_id,
        name: admin.name,
        email: admin.email,
        company_id: admin.company_id,
        company_name: admin.company_name,
        company_phone: admin.company_phone,
        address: admin.address,
        role: admin.role || "company_admin",
        mustChangePassword: !!admin.must_change_password,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function driverLogin(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: "Phone and password required" });
    }

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

    if (!rows.length) {
      return res.status(401).json({ success: false, error: "Invalid phone or password" });
    }

    const driver = rows[0];
    const passwordMatches = await comparePassword(password, driver.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Invalid phone or password" });
    }

    const token = makeToken({
      id: driver.driver_id,
      phone: driver.phone,
      company_id: driver.company_id,
      role: "driver",
    });

    return res.json({
      success: true,
      token,
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

async function changeCompanyAdminPassword(req, res) {
  try {
    const companyAdminId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "currentPassword and newPassword are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters long",
      });
    }

    const [rows] = await db.query(
      `SELECT company_admin_id, user_id, company_id, name, password, role
         FROM company_admins
        WHERE company_admin_id = ? AND status = 1
        LIMIT 1`,
      [companyAdminId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Company admin not found" });
    }

    const admin = rows[0];
    const passwordMatches = await comparePassword(currentPassword, admin.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.query(
      `UPDATE company_admins
          SET password = ?,
              must_change_password = 0,
              password_changed_at = NOW()
        WHERE company_admin_id = ?`,
      [hashedPassword, companyAdminId]
    );

    const token = makeToken({
      id: admin.company_admin_id,
      userId: admin.user_id,
      company_id: admin.company_id,
      companyId: admin.company_id,
      role: admin.role || "company_admin",
      mustChangePassword: false,
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
      token,
      user: {
        id: admin.company_admin_id,
        userId: admin.user_id,
        name: admin.name,
        company_id: admin.company_id,
        role: admin.role || "company_admin",
        mustChangePassword: false,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

async function getSession(req, res) {
  try {
    if (req.user.role === "company_admin") {
      const [rows] = await db.query(
        `SELECT ca.company_admin_id, ca.name, ca.email, ca.user_id,
                ca.company_id, ca.role, ca.must_change_password,
                c.company_name
           FROM company_admins ca
           JOIN companies c ON c.company_id = ca.company_id
          WHERE ca.company_admin_id = ?
          LIMIT 1`,
        [req.user.id]
      );

      if (!rows.length) {
        return res.status(404).json({ success: false, error: "Session user not found" });
      }

      return res.json({ success: true, user: rows[0] });
    }

    return res.json({ success: true, user: req.user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = {
  changeCompanyAdminPassword,
  companyAdminLogin,
  driverLogin,
  getSession,
  mainAdminLogin,
};
