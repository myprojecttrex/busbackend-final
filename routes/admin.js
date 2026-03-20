const express = require("express");
const router = express.Router();
const { verifyMainAdmin } = require("../middleware/auth");
const { getAllCompanies, addCompany, toggleCompanyStatus, getGlobalStats, getAllTripsGlobal } = require("../controllers/mainAdminController");

router.get("/companies", verifyMainAdmin, getAllCompanies);
router.post("/companies", verifyMainAdmin, addCompany);
router.patch("/companies/:id/status", verifyMainAdmin, toggleCompanyStatus);
router.get("/stats", verifyMainAdmin, getGlobalStats);
router.get("/trips", verifyMainAdmin, getAllTripsGlobal);

module.exports = router;
