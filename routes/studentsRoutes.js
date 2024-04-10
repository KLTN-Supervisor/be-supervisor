const express = require("express");
const StudentController = require("../controllers/studentsController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// // routes need access token
// router.use(tokenHandler.verifyAccessToken);

router.post("/create", StudentController.createStudent);
router.get("/", StudentController.getStudentsPaginated);

module.exports = router;
