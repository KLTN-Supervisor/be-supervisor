const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const AdminExamScheduleController = require("../../controllers/admin/examScheduleController");
const ExamScheduleController = require("../../controllers/examScheduleController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");

const router = express.Router();

router.post(
  "/csv-import",
  uploadToFolderPath("exam-schedules").single("file"),
  AdminExamScheduleController.importExamSchedules
);

router.post(
  "/excels-upload",
  uploadToFolderPath("exam-schedules").array("file"),
  AdminExamScheduleController.importExamSchedulesExcels
);

router.post(
  "/excel-import",
  AdminExamScheduleController.importExamSchedulesFromExcel
);
router.get("/excel-files", AdminExamScheduleController.getFilesList);
router.get("/getYear", ExamScheduleController.getExamYears);
router.get("/getTerm", ExamScheduleController.getTermsOfYear);
router.get("/getDate", ExamScheduleController.getExamDatesByTerm);
router.get("/getBuilding", ExamScheduleController.getBuildingByDate);
router.get("/getTime", ExamScheduleController.getExamTimeByBuilding);
router.get("/getRoom", ExamScheduleController.getRoomByExamTime);
router.get("/getStudent", ExamScheduleController.getStudentByRoom);

router.get("/reports", AdminExamScheduleController.getExamScheduleReport);

module.exports = router;
