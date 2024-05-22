const express = require("express");
const ExamScheduleController = require("../controllers/examScheduleController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// // routes need access token
// router.use(tokenHandler.verifyAccessToken);

router.get("/getYear", ExamScheduleController.getExamYears);
router.get("/getTerm", ExamScheduleController.getTermsOfYear);
router.get("/getDate", ExamScheduleController.getExamDatesByTerm);
router.get("/getBuilding", ExamScheduleController.getBuildingByDate);
router.get("/getTime", ExamScheduleController.getExamTimeByBuilding);
router.get("/getRoom", ExamScheduleController.getRoomByExamTime);
router.get("/getStudent", ExamScheduleController.getStudentByRoom);
router.get("/getSuspicious", ExamScheduleController.getSuspiciousStudents);
router.put("/attendance", ExamScheduleController.attendanceStudent);

module.exports = router;
