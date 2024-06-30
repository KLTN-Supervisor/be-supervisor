const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const AccountController = require("../../controllers/admin/accountController");
const { body } = require("express-validator");
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
  "/:id",
  uploadToFolderPath("user-avatars").single("avatar"),
  [
    createLengthValidator("username", 5, 15),
    createSpecialCharValidator("fullname"),
    createEnumValidator("role", ["USER", "ADMIN", "ACADEMIC_AFFAIRS_OFFICE"]),
  ],
  AccountController.updateAccount
);
router.put("/ban/:id", AccountController.banAccount);
router.put("/unban/:id", AccountController.unbanAccount);

router.put("/reset-password/:id", AccountController.resetAccountPassword);

module.exports = router;
