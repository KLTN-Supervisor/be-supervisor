const express = require("express");
const router = express.Router();

const studentsRoutes = require("./studentsRoutes");
const inspectorRoutes = require("./inspectorRoutes");
const buildingRoutes = require("./buildingRoutes");
const examScheduleRoutes = require("./examScheduleRoutes");
const adminStudentRoutes = require("./admin/studentRoutes");

router.use("/students", studentsRoutes);
router.use("/inspectors", inspectorRoutes);
router.use("/buildings", buildingRoutes);
router.use("/admin/students", adminStudentRoutes);

router.use("/examSchedule", examScheduleRoutes);

module.exports = router;
