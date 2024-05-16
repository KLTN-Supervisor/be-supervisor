const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const InspectorController = require("../../controllers/admin/inspectorController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");

const router = express.Router();

router.get("/", InspectorController.getInspectorsPaginated);
router.post(
  "/csv-import",
  uploadToFolderPath("inspectors-info").single("file"),
  InspectorController.importInpectors
);
router.post(
  "/images-import",
  uploadToFolderPath("students-images-compress").single("file"),
  InspectorController.handleUncompressFile
);

module.exports = router;
