const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const StudentController = require("../../controllers/admin/studentController");
const TrainningController = require("../../controllers/trainningDataController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");
const path = require("path");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAdminAccessToken);

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
router.put(
  "/:id",
  uploadToFolderPath(path.join("portrait-images", "student-images")).single(
    "image"
  ),
  StudentController.updateStudent
);
router.post(
  "/",
  uploadToFolderPath(path.join("portrait-images", "student-images")).single(
    "image"
  ),
  StudentController.createStudent
);

router.get("/train", TrainningController.trainingData);

module.exports = router;
