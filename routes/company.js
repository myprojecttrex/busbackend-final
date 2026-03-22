const express = require("express");
const router = express.Router();
const {
  enforcePasswordChange,
  verifyCompanyAdmin,
  verifyDriver,
} = require("../middleware/auth");
const {
  addBus,
  addDriver,
  deleteBus,
  deleteDriver,
  getAssignedBus,
  getBuses,
  getDashboard,
  getDrivers,
} = require("../controllers/companyController");

router.get("/dashboard", verifyCompanyAdmin, enforcePasswordChange, getDashboard);
router.get("/drivers", verifyCompanyAdmin, enforcePasswordChange, getDrivers);
router.post("/drivers", verifyCompanyAdmin, enforcePasswordChange, addDriver);
router.delete("/drivers/:id", verifyCompanyAdmin, enforcePasswordChange, deleteDriver);
router.get("/buses", verifyCompanyAdmin, enforcePasswordChange, getBuses);
router.post("/buses", verifyCompanyAdmin, enforcePasswordChange, addBus);
router.delete("/buses/:id", verifyCompanyAdmin, enforcePasswordChange, deleteBus);

router.get("/driver/bus", verifyDriver, getAssignedBus);

module.exports = router;
