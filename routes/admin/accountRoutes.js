const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const AccountController = require("../../controllers/admin/accountController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");

const router = express.Router();

router.get("/", AccountController.getAccountsPaginated);

module.exports = router;
