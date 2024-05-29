const express = require("express");
const BuildingController = require("../controllers/buildingController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAccessToken);

//router.post("/create-building", BuildingController.createBuilding);
router.post("/create-room", BuildingController.createRoom);
//router.get("/", StudentController.getStudentsPaginated);

module.exports = router;
