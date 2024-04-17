const express = require("express");
const router = express.Router();

const studentsRoutes = require("./studentsRoutes");
const examScheduleRoutes = require("./examScheduleRoutes");

router.use("/students", studentsRoutes);
router.use("/examSchedule", examScheduleRoutes);

module.exports = router;
