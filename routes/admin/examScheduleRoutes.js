const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const ExamScheduleController = require("../../controllers/admin/examScheduleController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");

const router = express.Router();

router.post(
  "/csv-import",
  uploadToFolderPath("exam-schedules").single("file"),
  ExamScheduleController.importExamSchedules
);

router.post(
  "/excels-upload",
  uploadToFolderPath("exam-schedules").array("file"),
  ExamScheduleController.importExamSchedulesExcels
);

router.post(
  "/excel-import",
  ExamScheduleController.importExamSchedulesFromExcel
);
router.get("/excel-files", ExamScheduleController.getFilesList);

module.exports = router;
