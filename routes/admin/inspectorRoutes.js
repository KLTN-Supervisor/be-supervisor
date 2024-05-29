const express = require("express");
const { uploadToFolderPath } = require("../../configs/multerConfig");
const InspectorController = require("../../controllers/admin/inspectorController");
const { check } = require("express-validator");
const tokenHandler = require("../../middlewares/token-handler");
const path = require("path");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAdminAccessToken);

router.get("/", InspectorController.getInspectorsPaginated);
router.post(
  "/csv-import",
  uploadToFolderPath("inspectors-info").single("file"),
  InspectorController.importInpectors
);
// router.post(
//   "/images-import",
//   uploadToFolderPath("students-images-compress").single("file"),
//   InspectorController.handleUncompressFile
// );
router.put(
  "/:id",
  uploadToFolderPath(path.join("portrait-images", "inspector-images")).single(
    "image"
  ),
  InspectorController.updateInspector
);
router.post(
  "/",
  uploadToFolderPath(path.join("portrait-images", "inspector-images")).single(
    "image"
  ),
  InspectorController.createInspector
);

module.exports = router;
