const multer = require("multer");

const storeFolder = (folder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, `./public/uploads/${folder}`);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });
  return storage;
};

const uploadToFolderPath = (folder) => {
  const upload = multer({ storage: storeFolder(folder) });
  return upload;
};

exports.storeFolder = storeFolder;
exports.uploadToFolderPath = uploadToFolderPath;
