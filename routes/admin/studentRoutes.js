const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const StudentController = require("../../controllers/admin/studentController");
const TrainningController = require("../../controllers/trainningDataController");
const { body } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");
const path = require("path");

const router = express.Router();

const studentValidationRules = [
  body("student_id")
    .isLength({ min: 8, max: 12 })
    .withMessage("MSSV phải có độ dài từ 8 đến 12 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("MSSV là bắt buộc."),
  body("citizen_identification_number")
    .isLength({ min: 9, max: 12 })
    .withMessage("Số CCCD/CMND phải có độ dài từ 9 đến 12 ký tự.")
    .matches(/^\d+$/)
    .withMessage("Số CCCD/CMND chỉ được chứa các ký tự số.")
    .trim()
    .notEmpty()
    .withMessage("Số CCCD/CMND là bắt buộc."),
  body("first_name")
    .isLength({ min: 1, max: 10 })
    .withMessage("Tên phải có độ dài từ 1 đến 10 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("Tên là bắt buộc."),
  body("middle_name")
    .isLength({ min: 2 })
    .withMessage("Tên đệm phải có ít nhất 2 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("Tên đệm là bắt buộc."),
  body("last_name")
    .isLength({ min: 2, max: 12 })
    .withMessage("Họ phải có độ dài từ 2 đến 12 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("Họ là bắt buộc."),
  body("date_of_birth")
    .isISO8601()
    .withMessage("Ngày sinh phải là định dạng ngày hợp lệ.")
    .notEmpty()
    .withMessage("Ngày sinh là bắt buộc."),
  body("place_of_birth").trim().notEmpty().withMessage("Nơi sinh là bắt buộc."),
  body("gender")
    .isBoolean()
    .withMessage("Giới tính phải là true hoặc false.")
    .notEmpty()
    .withMessage("Giới tính là bắt buộc."),
  body("nationality").trim().notEmpty().withMessage("Quốc tịch là bắt buộc."),
  body("class")
    .isLength({ min: 6 })
    .withMessage("Lớp học phải có ít nhất 6 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("Lớp học là bắt buộc."),
  body("education_program")
    .isLength({ min: 6 })
    .withMessage("Chương trình học phải có ít nhất 6 ký tự.")
    .trim()
    .notEmpty()
    .withMessage("Chương trình học là bắt buộc."),
  body("current_address")
    .trim()
    .notEmpty()
    .withMessage("Địa chỉ hiện tại là bắt buộc."),
  body("major").trim().notEmpty().withMessage("Ngành học là bắt buộc."),
  body("faculty").trim().notEmpty().withMessage("Khoa là bắt buộc."),
  // Add additional validation rules as per the schema if needed
];

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
  studentValidationRules,
  StudentController.updateStudent
);
router.post(
  "/",
  uploadToFolderPath(path.join("portrait-images", "student-images")).single(
    "image"
  ),
  studentValidationRules,
  StudentController.createStudent
);

router.get("/train", TrainningController.trainingData);

module.exports = router;
