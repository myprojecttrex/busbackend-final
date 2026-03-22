const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (req.user.companyId && !req.user.company_id) {
      req.user.company_id = req.user.companyId;
    }
    if (typeof req.user.mustChangePassword === "undefined") {
      req.user.mustChangePassword = false;
    }
    next();
  } catch {
    return res.status(403).json({ success: false, error: "Invalid or expired token" });
  }
}

function verifyMainAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!["superadmin", "main_admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Main admin access required" });
    }
    next();
  });
}

function verifyCompanyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!["superadmin", "main_admin", "company_admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Company admin access required" });
    }
    next();
  });
}

function verifyDriver(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== "driver") {
      return res.status(403).json({ success: false, error: "Driver access required" });
    }
    next();
  });
}

function enforcePasswordChange(req, res, next) {
  if (req.user?.role === "company_admin" && req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: "Password change required before accessing company resources",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }
  next();
}

module.exports = {
  enforcePasswordChange,
  verifyToken,
  verifyMainAdmin,
  verifyCompanyAdmin,
  verifyDriver,
};
