const express = require("express");
const router  = express.Router();
const { mainAdminLogin, companyAdminLogin, driverLogin } = require("../controllers/authController");
router.post("/main-admin/login",    mainAdminLogin);
router.post("/company-admin/login", companyAdminLogin);
router.post("/driver/login",        driverLogin);
module.exports = router;
