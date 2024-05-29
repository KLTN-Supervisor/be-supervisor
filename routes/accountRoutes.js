const express = require("express");
const AccountController = require("../controllers/accountsController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

router.post("/login", AccountController.login);
router.get("/logout", AccountController.logout);

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", AccountController.getLoginAccountInformation);

module.exports = router;
