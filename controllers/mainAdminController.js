const db = require("../config/db");
const {
  buildCompanyAdminUserId,
  buildCompanyCode,
  generateSecurePassword,
  hashPassword,
} = require("../utils/authCredentials");

async function getAllCompanies(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
              COUNT(DISTINCT ca.company_admin_id) AS company_admin_count,
              COUNT(DISTINCT d.driver_id) AS driver_count,
              COUNT(DISTINCT b.bus_id) AS bus_count
         FROM companies c
         LEFT JOIN company_admins ca ON c.company_id = ca.company_id
         LEFT JOIN drivers d ON c.company_id = d.company_id
         LEFT JOIN buses b ON c.company_id = b.company_id
        GROUP BY c.company_id
        ORDER BY c.created_at DESC`
    );

    return res.json({ success: true, companies: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function addCompany(req, res) {
  try {
    const { company_name, email, phone, address } = req.body;
    if (!company_name || !phone) {
      return res.status(400).json({
        success: false,
        error: "company_name and phone are required",
      });
    }

    const conditions = ["phone = ?"];
    const params = [phone];
    if (email) {
      conditions.push("email = ?");
      params.push(email);
    }

    const [existing] = await db.query(
      `SELECT company_id FROM companies WHERE ${conditions.join(" OR ")} LIMIT 1`,
      params
    );
    if (existing.length) {
      return res.status(409).json({
        success: false,
        error: "Company already exists with this email or phone",
      });
    }

    const [result] = await db.query(
      "INSERT INTO companies (company_name, email, phone, address) VALUES (?, ?, ?, ?)",
      [company_name, email || "", phone, address || ""]
    );

    const company_id = result.insertId;
    const company_code = buildCompanyCode(company_id);
    await db.query("UPDATE companies SET company_code = ? WHERE company_id = ?", [
      company_code,
      company_id,
    ]);

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      company: {
        company_id,
        company_code,
        company_name,
        email: email || "",
        phone,
        address: address || "",
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function toggleCompanyStatus(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT status FROM companies WHERE company_id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Company not found" });
    }

    const newStatus = rows[0].status ? 0 : 1;
    await db.query("UPDATE companies SET status = ? WHERE company_id = ?", [newStatus, id]);
    return res.json({
      success: true,
      status: newStatus,
      message: newStatus ? "Company activated" : "Company deactivated",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getGlobalStats(req, res) {
  try {
    const [[{ companies }]] = await db.query("SELECT COUNT(*) AS companies FROM companies");
    const [[{ drivers }]] = await db.query("SELECT COUNT(*) AS drivers FROM drivers");
    const [[{ buses }]] = await db.query("SELECT COUNT(*) AS buses FROM buses");
    const [[{ active }]] = await db.query("SELECT COUNT(*) AS active FROM trip_codes WHERE status = 'active'");
    const [[{ companyAdmins }]] = await db.query(
      "SELECT COUNT(*) AS companyAdmins FROM company_admins WHERE status = 1"
    );

    return res.json({
      success: true,
      tabs: ["Dashboard", "Companies", "Company Admins", "Trip Monitor"],
      stats: { companies, companyAdmins, drivers, buses, activeTrips: active },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getAllTripsGlobal(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT tc.*,
              d.name AS driver_name, d.phone AS driver_phone,
              b.bus_number,
              c.company_name
         FROM trip_codes tc
         JOIN drivers d ON tc.driver_id = d.driver_id
         JOIN buses b ON tc.bus_id = b.bus_id
         JOIN companies c ON tc.company_id = c.company_id
        ORDER BY tc.created_at DESC`
    );

    return res.json({ success: true, trips: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getAllCompanyAdmins(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT ca.company_admin_id, ca.company_id, ca.name, ca.email, ca.user_id,
              ca.role, ca.status, ca.must_change_password, ca.last_login_at,
              c.company_name, c.company_code
         FROM company_admins ca
         JOIN companies c ON c.company_id = ca.company_id
        ORDER BY ca.company_admin_id DESC`
    );

    return res.json({ success: true, companyAdmins: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function addCompanyAdmin(req, res) {
  try {
    const { name, email, companyId } = req.body;
    if (!name || !email || !companyId) {
      return res.status(400).json({
        success: false,
        error: "name, email and companyId are required",
      });
    }

    const [companyRows] = await db.query(
      "SELECT company_id, company_name, company_code FROM companies WHERE company_id = ? LIMIT 1",
      [companyId]
    );
    if (!companyRows.length) {
      return res.status(404).json({ success: false, error: "Company not found" });
    }

    const [existingEmail] = await db.query(
      "SELECT company_admin_id FROM company_admins WHERE email = ? LIMIT 1",
      [email]
    );
    if (existingEmail.length) {
      return res.status(409).json({ success: false, error: "Email already exists" });
    }

    const company = companyRows[0];
    const [existingAdmins] = await db.query(
      "SELECT user_id FROM company_admins WHERE company_id = ? ORDER BY company_admin_id ASC",
      [companyId]
    );

    const userId = buildCompanyAdminUserId(
      company.company_code || buildCompanyCode(company.company_id),
      existingAdmins.map((admin) => admin.user_id)
    );
    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const [result] = await db.query(
      `INSERT INTO company_admins
         (company_id, name, email, user_id, username, password, role, must_change_password, status)
       VALUES (?, ?, ?, ?, ?, ?, 'company_admin', 1, 1)`,
      [companyId, name, email, userId, userId, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: "Company admin created successfully",
      companyAdmin: {
        company_admin_id: result.insertId,
        company_id: companyId,
        company_name: company.company_name,
        name,
        email,
        userId,
        role: "company_admin",
        mustChangePassword: true,
      },
      credentials: {
        userId,
        password: plainPassword,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function resetCompanyAdminPassword(req, res) {
  try {
    const companyAdminId = req.params.id;
    const [rows] = await db.query(
      `SELECT company_admin_id, user_id
         FROM company_admins
        WHERE company_admin_id = ?
        LIMIT 1`,
      [companyAdminId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Company admin not found" });
    }

    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    await db.query(
      `UPDATE company_admins
          SET password = ?,
              must_change_password = 1,
              password_changed_at = NULL
        WHERE company_admin_id = ?`,
      [hashedPassword, companyAdminId]
    );

    return res.json({
      success: true,
      message: "Password reset successfully",
      credentials: {
        userId: rows[0].user_id,
        password: plainPassword,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  addCompany,
  addCompanyAdmin,
  getAllCompanies,
  getAllCompanyAdmins,
  getAllTripsGlobal,
  getGlobalStats,
  resetCompanyAdminPassword,
  toggleCompanyStatus,
};
