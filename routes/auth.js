const express = require("express");
const router = express.Router();
const { verifyCompanyAdmin, verifyToken } = require("../middleware/auth");
const {
  changeCompanyAdminPassword,
  companyAdminLogin,
  driverLogin,
  getSession,
  mainAdminLogin,
} = require("../controllers/authController");

router.post("/main-admin/login", mainAdminLogin);
router.post("/company-admin/login", companyAdminLogin);
router.post("/company-admin/change-password", verifyCompanyAdmin, changeCompanyAdminPassword);
router.get("/me", verifyToken, getSession);
router.post("/driver/login", driverLogin);

module.exports = router;
