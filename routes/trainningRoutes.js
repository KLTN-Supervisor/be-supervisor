const express = require("express");
const TrainningController = require("../controllers/trainningDataController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// // routes need access token
// router.use(tokenHandler.verifyAccessToken);

router.get("/train", TrainningController.trainingData);
router.get("/", TrainningController.getTrainningData);
module.exports = router;
