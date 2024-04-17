const express = require("express");
const InspectorController = require("../controllers/inspectorController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// // routes need access token
// router.use(tokenHandler.verifyAccessToken);

router.post("/create", InspectorController.createInspector);
//router.get("/", StudentController.getStudentsPaginated);

module.exports = router;
