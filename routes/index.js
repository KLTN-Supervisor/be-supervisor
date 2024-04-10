const express = require("express");
const router = express.Router();

const studentsRoutes = require("./studentsRoutes");

router.use("/students", studentsRoutes);

module.exports = router;
