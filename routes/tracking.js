const express = require("express");
const router  = express.Router();
const { verifyDriver, verifyCompanyAdmin } = require("../middleware/auth");
const { insertLocation, getLiveLocations, getLocationHistory } = require("../controllers/trackingController");
router.post("/location",           verifyDriver,       insertLocation);
router.get("/live",                verifyCompanyAdmin, getLiveLocations);
router.get("/history/:bus_id",     verifyCompanyAdmin, getLocationHistory);
module.exports = router;
