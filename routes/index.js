const express = require("express");
const router = express.Router();

const studentsRoutes = require("./studentsRoutes");
const inspectorRoutes = require("./inspectorRoutes");
const buildingRoutes = require("./buildingRoutes");
const examScheduleRoutes = require("./examScheduleRoutes");
const adminStudentRoutes = require("./admin/studentRoutes");
const adminAccountRoutes = require("./admin/accountRoutes");
const adminExamScheduleRoutes = require("./admin/examScheduleRoutes");

router.use("/students", studentsRoutes);
router.use("/inspectors", inspectorRoutes);
router.use("/buildings", buildingRoutes);

router.use("/examSchedule", examScheduleRoutes);

router.use("/admin/students", adminStudentRoutes);
router.use("/admin/accounts", adminAccountRoutes);
router.use("/admin/examSchedules", adminExamScheduleRoutes);

module.exports = router;
