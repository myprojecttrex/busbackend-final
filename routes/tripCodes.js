const express = require("express");
const router = express.Router();
const { verifyCompanyAdmin, verifyDriver, verifyToken } = require("../middleware/auth");
const { generateTripCode, validateTripCode, getAllTripCodes, endTrip } = require("../controllers/tripCodeController");
router.post("/generate", verifyCompanyAdmin, generateTripCode);
router.post("/validate", validateTripCode);   // public — driver app calls this
router.get("/", verifyCompanyAdmin, getAllTripCodes);
router.post("/end", verifyToken, endTrip);
module.exports = router;
