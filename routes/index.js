const express = require("express");
const router = express.Router();

const studentsRoutes = require("./studentsRoutes");
const inspectorRoutes = require("./inspectorRoutes");
const buildingRoutes = require("./buildingRoutes");
const examScheduleRoutes = require("./examScheduleRoutes");
const accountRoutes = require("./accountRoutes");
const adminStudentRoutes = require("./admin/studentRoutes");
const adminAccountRoutes = require("./admin/accountRoutes");
const adminExamScheduleRoutes = require("./admin/examScheduleRoutes");
const adminInspectorRoutes = require("./admin/inspectorRoutes");
const trainningRoutes = require("./trainningRoutes");

router.use("/students", studentsRoutes);
router.use("/inspectors", inspectorRoutes);
router.use("/buildings", buildingRoutes);
router.use("/accounts", accountRoutes);
router.use("/examSchedule", examScheduleRoutes);
router.use("/train", trainningRoutes);

router.use("/admin/students", adminStudentRoutes);
router.use("/admin/accounts", adminAccountRoutes);
router.use("/admin/examSchedules", adminExamScheduleRoutes);
router.use("/admin/inspectors", adminInspectorRoutes);

module.exports = router;
