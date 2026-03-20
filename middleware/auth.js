// middleware/auth.js - JWT verification middleware
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Verify any logged-in user
function verifyToken(req, res, next) {
  const auth  = req.headers["authorization"];
  const token = auth && auth.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ success: false, error: "No token provided" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, error: "Invalid or expired token" });
  }
}

// Only main admin
function verifyMainAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== "superadmin")
      return res.status(403).json({ success: false, error: "Main admin access required" });
    next();
  });
}

// Company admin OR main admin
function verifyCompanyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!["superadmin", "company_admin"].includes(req.user.role))
      return res.status(403).json({ success: false, error: "Company admin access required" });
    next();
  });
}

// Driver only
function verifyDriver(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== "driver")
      return res.status(403).json({ success: false, error: "Driver access required" });
    next();
  });
}

module.exports = { verifyToken, verifyMainAdmin, verifyCompanyAdmin, verifyDriver };
