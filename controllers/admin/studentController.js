const HttpError = require("../../models/application/httpError");
const Student = require("../../models/schemas/student");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const StreamZip = require("node-stream-zip");
const unrar = require("node-unrar-js");

const importStudents = async (req, res, next) => {
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
      const studentIds = csvdata.map((student) => student.student_id);

      // Tìm các student_id trùng lặp
      const duplicateStudentIds = await Student.find({
        student_id: { $in: studentIds },
      }).distinct("student_id");

      // Tạo danh sách các bản ghi cần cập nhật
      const studentsToUpdate = csvdata.filter((student) =>
        duplicateStudentIds.includes(student.student_id)
      );

      // Thực hiện cập nhật dữ liệu
      if (studentsToUpdate.length > 0) {
        // Tạo danh sách các phép cập nhật
        const updateOperations = studentsToUpdate.map((student) => ({
          updateOne: {
            filter: { student_id: student.student_id },
            update: {
              $set: student,
            },
          },
        }));

        // Thực hiện các phép cập nhật
        if (updateOperations.length > 0) {
          await Student.bulkWrite(updateOperations);
        }
      }

      // Tiến hành insert các bản ghi mới (các bản ghi không trùng lặp)
      const newStudents = csvdata.filter(
        (student) => !duplicateStudentIds.includes(student.student_id)
      );

      if (newStudents.length > 0) {
        await Student.insertMany(newStudents);
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

    await organizeFilesById(targetPath);

    res.json({ message: "Upload images success!" });
  } catch (err) {
    console.error("admin import students images----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const organizeFilesById = async (targetPath) => {
  try {
    const files = await fs.promises.readdir(targetPath);

    for (const file of files) {
      const filePath = path.join(targetPath, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const [id] = file.split("_");
        const newDirPath = path.join(targetPath, id);

        if (!fs.existsSync(newDirPath)) {
          await fs.promises.mkdir(newDirPath);
        }

        const newFilePath = path.join(newDirPath, file);
        await fs.promises.rename(filePath, newFilePath);
      }
    }
  } catch (err) {
    console.error("Error while organizing files: ", err);
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

const getStudentsPaginated = async (req, res, next) => {
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

    const students = await Student.aggregate([
      {
        $match: query,
      },
      {
        $sort: { student_id: 1, first_name: 1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const totalStudents = await Student.countDocuments(query);

    res.json({
      students: students,
      current_page: page,
      total_pages: Math.ceil(totalStudents / limit),
      total_students: totalStudents,
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

module.exports = { importStudents, getStudentsPaginated, handleUncompressFile };
