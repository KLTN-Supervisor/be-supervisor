const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const StudentController = require("../../controllers/admin/studentController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");

const router = express.Router();

router.get("/", StudentController.getStudentsPaginated);
router.post(
  "/csv-import",
  uploadToFolderPath("students-info").single("file"),
  StudentController.importStudents
);
router.post(
  "/images-import",
  uploadToFolderPath("students-images-compress").single("file"),
  StudentController.handleUncompressFile
);
router.put("/:id", StudentController.updateStudent);

module.exports = router;
