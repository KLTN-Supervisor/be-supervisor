const HttpError = require("../../models/application/httpError");
const Student = require("../../models/schemas/student");
const Inspector = require("../../models/schemas/inspector");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const StreamZip = require("node-stream-zip");
const unrar = require("node-unrar-js");

const importInpectors = async (req, res, next) => {
  try {
    const csvdata = await csv({
      colParser: {
        date_of_birth: function (item, head, resultRow, row, colIdx) {
          const parts = item.split("/");
          return new Date(parts[2], parts[1] - 1, parts[0]);
        },
        gender: function (item, head, resultRow, row, colIdx) {
          if (item.toLowerCase() === "nữ" || item.toLowerCase() === "female")
            return false;
          else return true;
        },
      },
    }).fromFile(req.file.path);

    if (csvdata.length > 0) {
      // Tạo một danh sách các student_id từ dữ liệu CSV
      const inspectorIds = csvdata.map((inspector) => inspector.inspector_id);

      // Tìm các student_id trùng lặp
      const duplicateInspectorIds = await Inspector.find({
        inspector_id: { $in: inspectorIds },
      }).distinct("inspector_id");

      // Tạo danh sách các bản ghi cần cập nhật
      const inspectorsToUpdate = csvdata.filter((inspector) =>
        duplicateInspectorIds.includes(inspector.inspector_id)
      );

      // Thực hiện cập nhật dữ liệu
      if (inspectorsToUpdate.length > 0) {
        // Tạo danh sách các phép cập nhật
        const updateOperations = inspectorsToUpdate.map((inspector) => ({
          updateOne: {
            filter: { inspector_id: inspector.inspector_id },
            update: {
              $set: inspector,
            },
          },
        }));

        // Thực hiện các phép cập nhật
        if (updateOperations.length > 0) {
          await Inspector.bulkWrite(updateOperations);
        }
      }

      // Tiến hành insert các bản ghi mới (các bản ghi không trùng lặp)
      const newInspectors = csvdata.filter(
        (inspector) => !duplicateInspectorIds.includes(inspector.inspector_id)
      );

      if (newInspectors.length > 0) {
        await Inspector.insertMany(newInspectors);
      }
    }

    res.json({ message: "Import success!" });
  } catch (err) {
    console.error("admin import students----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const handleUncompressFile = async (req, res, next) => {
  try {
    // Kiểm tra xem có file được upload hay không
    if (!req.file) {
      const error = new HttpError("No file uploaded!", 400);
      return next(error);
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(filePath);
    const targetPath = path.join("public", "uploads", "students-images");

    if (fileExtension === ".zip") {
      await extractZipArchive(filePath, targetPath);
    } else if (fileExtension === ".rar") {
      await extractRarArchive(filePath, targetPath);
    } else {
      const error = new HttpError(
        "Unsupported file format. Please upload a .zip or .rar file!",
        400
      );
      return next(error);
    }

    res.json({ message: "Uncompress success!" });
  } catch (err) {
    console.error("admin import students images----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const extractZipArchive = async (filePath, destination) => {
  try {
    const zip = new StreamZip.async({ file: filePath });

    const entries = await zip.entries();
    const folderInsideZipPath = Object.values(entries)[0].name.split("/");

    await zip.extract(
      folderInsideZipPath.length >= 2 ? folderInsideZipPath[0] : null,
      destination
    );
    await zip.close();
  } catch (err) {
    throw err;
  }
};

const extractRarArchive = async (filePath, destination) => {
  try {
    // Create the extractor with the file information (returns a promise)
    const extractor = await unrar.createExtractorFromFile({
      filepath: filePath,
      targetPath: destination,
      filenameTransform: (filename) => {
        const fileNameArray = filename.split("/");
        return fileNameArray[fileNameArray.length - 1];
      },
    });

    // Extract the files
    [
      ...extractor.extract({
        files: (fileHeader) => fileHeader.flags.directory === false,
      }).files,
    ];
  } catch (err) {
    throw err;
  }
};

const getInspectorsPaginated = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const searchQuery = req.query.search || null;

    if (page < 1 || limit < 1) {
      const error = new HttpError("Invalid page or limit value!", 400);
      return next(error);
    }

    let query = {};

    if (searchQuery) {
      query = { first_name: { $regex: searchQuery, $options: "i" } };
    }

    const skip = (page - 1) * limit;

    const inspectors = await Inspector.aggregate([
      {
        $match: query,
      },
      {
        $sort: { inspector_id: 1, first_name: 1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const totalInspectors = await Inspector.countDocuments(query);

    res.json({
      inspectors: inspectors,
      current_page: page,
      total_pages: Math.ceil(totalInspectors / limit),
      total_inspectors: totalInspectors,
    });
  } catch (err) {
    console.error("get students----------- ", err);
    const error = new HttpError(
      "An error occured, please try again later!",
      500
    );
    return next(error);
  }
};

module.exports = {
  importInpectors,
  getInspectorsPaginated,
  handleUncompressFile,
};
