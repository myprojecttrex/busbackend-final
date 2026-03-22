const express = require("express");
const router = express.Router();
const { verifyMainAdmin } = require("../middleware/auth");
const {
  addCompany,
  addCompanyAdmin,
  getAllCompanies,
  getAllCompanyAdmins,
  getAllTripsGlobal,
  getGlobalStats,
  resetCompanyAdminPassword,
  toggleCompanyStatus,
} = require("../controllers/mainAdminController");

router.get("/dashboard", verifyMainAdmin, getGlobalStats);
router.get("/companies", verifyMainAdmin, getAllCompanies);
router.post("/companies", verifyMainAdmin, addCompany);
router.patch("/companies/:id/status", verifyMainAdmin, toggleCompanyStatus);
router.get("/company-admins", verifyMainAdmin, getAllCompanyAdmins);
router.post("/company-admins", verifyMainAdmin, addCompanyAdmin);
router.post("/company-admins/:id/reset-password", verifyMainAdmin, resetCompanyAdminPassword);
router.get("/stats", verifyMainAdmin, getGlobalStats);
router.get("/trips", verifyMainAdmin, getAllTripsGlobal);
router.get("/trip-monitor", verifyMainAdmin, getAllTripsGlobal);

module.exports = router;
