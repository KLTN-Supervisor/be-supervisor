const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storeFolder = (folder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(`./public/uploads/${folder}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // Create the directory if it doesn't exist
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname); // Lấy extension của file gốc
      const filename = path.basename(file.originalname, ext); // Lấy tên file (không có extension)
      cb(null, `${filename}-${Date.now()}${ext}`); // Ghép chuỗi đúng định dạng
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
