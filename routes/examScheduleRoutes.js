const express = require("express");
const ExamScheduleController = require("../controllers/examScheduleController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");
const { uploadToFolderPath } = require("../configs/multerConfig");
const path = require("path");

const router = express.Router();

// routes need access token
// router.use(tokenHandler.verifyAccessToken);

router.get("/getYear", ExamScheduleController.getExamYears);
router.get("/getTerm", ExamScheduleController.getTermsOfYear);
router.get("/getDate", ExamScheduleController.getExamDatesByTerm);
router.get("/getBuilding", ExamScheduleController.getBuildingByDate);
router.get("/getTime", ExamScheduleController.getExamTimeByBuilding);
router.get("/getRoom", ExamScheduleController.getRoomByExamTime);
router.get("/getStudent", ExamScheduleController.getStudentByRoom);
router.get("/getExamScheduleByDate", ExamScheduleController.getExamScheduleByDate);
router.get("/getInfo", ExamScheduleController.getRoomInfo);
router.get("/getSuspicious", ExamScheduleController.getSuspiciousStudents);
router.put("/attendance", ExamScheduleController.attendanceStudent);
router.put("/deleteReport", ExamScheduleController.deleteExamScheduleReport);

router.post(
  "/report",
  uploadToFolderPath("report-images").array("image"),
  ExamScheduleController.noteReport
);

router.get("/getExamReports", ExamScheduleController.getExamScheduleReport);

module.exports = router;
