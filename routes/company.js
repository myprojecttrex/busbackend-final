const express = require("express");
const router = express.Router();
const { verifyCompanyAdmin, verifyDriver } = require("../middleware/auth");
const { getDashboard, getDrivers, addDriver, deleteDriver, getBuses, addBus, deleteBus, getAssignedBus } = require("../controllers/companyController");
router.get("/dashboard", verifyCompanyAdmin, getDashboard);
router.get("/drivers", verifyCompanyAdmin, getDrivers);
router.post("/drivers", verifyCompanyAdmin, addDriver);
router.delete("/drivers/:id", verifyCompanyAdmin, deleteDriver);
router.get("/buses", verifyCompanyAdmin, getBuses);
router.post("/buses", verifyCompanyAdmin, addBus);
router.delete("/buses/:id", verifyCompanyAdmin, deleteBus);

router.get("/driver/bus", verifyDriver, getAssignedBus);
module.exports = router;
