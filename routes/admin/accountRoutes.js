const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const AccountController = require("../../controllers/admin/accountController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");
const {
  createLengthValidator,
  createEnumValidator,
  createSpecialCharValidator,
} = require("../../utils/validators");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAdminAccessToken);

router.get("/", AccountController.getAccountsPaginated);
router.post(
  "/",
  uploadToFolderPath("user-avatars").single("avatar"),
  [
    createLengthValidator("username", 5, 15),
    createLengthValidator("password", 5, 20),
    createSpecialCharValidator("fullname"),
    createEnumValidator("role", ["USER", "ADMIN", "ACADEMIC_AFFAIRS_OFFICE"]),
  ],
  AccountController.createAccount
);
router.put(
  "/",
  uploadToFolderPath("user-avatars").single("avatar"),
  [
    createLengthValidator("username", 5, 15),
    createLengthValidator("password", 5, 20),
    createSpecialCharValidator("fullname"),
    createEnumValidator("role", ["USER", "ADMIN", "ACADEMIC_AFFAIRS_OFFICE"]),
  ],
  AccountController.updateAccount
);

module.exports = router;
