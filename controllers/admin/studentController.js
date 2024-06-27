const HttpError = require("../../models/application/httpError");
const Student = require("../../models/schemas/student");
const Train = require("../../models/schemas/train");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const StreamZip = require("node-stream-zip");
const unrar = require("node-unrar-js");
const { getValidFields } = require("../../utils/validators");
const { transformObjectFields } = require("../../utils/objectFunctions");
const removeVietnameseTones = require("../../utils/removeVietnameseTones");

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
      // Combine first_name, middle_name, last_name into full_name
      const fullName = `${csvdata.last_name} ${csvdata.middle_name} ${csvdata.first_name}`;
      const searchKeywords = `${fullName} ${removeVietnameseTones(fullName)}`;

      csvdata.search_keywords = searchKeywords;

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

    res.json({ message: "Import thành công!" });
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
      const error = new HttpError("Không tìm thấy file tải lên!", 400);
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
        "Chỉ hỗ trợ file nén định dạng zip hoặc rar!",
        400
      );
      return next(error);
    }

    await organizeFilesById(targetPath);

    res.json({ message: "Tải hình ảnh lên thành công!" });
  } catch (err) {
    console.error("admin import students images----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const organizeFilesById = async (targetPath) => {
  try {
    const files = await fs.promises.readdir(targetPath);
    const labelSet = new Set();

    for (const file of files) {
      const filePath = path.join(targetPath, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const [id, name] = file.split("_");

        if (name === "avatar") {
          const newDirPath = path.join(
            "public",
            "uploads",
            "portrait-images",
            "student-images"
          );
          if (!fs.existsSync(newDirPath)) {
            await fs.promises.mkdir(newDirPath, { recursive: true });
          }

          const newFilePath = path.join(newDirPath, file);
          await fs.promises.rename(filePath, newFilePath);

          const updatedAvatar = {
            portrait_img: newFilePath.replace("public\\uploads\\", ""),
          };

          // Lấy thông tin sinh viên hiện tại để kiểm tra và xóa file ảnh cũ
          const currentStudent = await Student.findOne({ student_id: id });
          if (!currentStudent) {
            const error = new HttpError(
              "Không tìm thấy sinh viên cần cập nhật!",
              404
            );
            return next(error);
          }

          const student = await updateStudentFields(
            currentStudent,
            updatedAvatar
          );
        } else {
          const newDirPath = path.join(targetPath, id);
          if (!fs.existsSync(newDirPath)) {
            await fs.promises.mkdir(newDirPath);
          }

          const newFilePath = path.join(newDirPath, file);
          await fs.promises.rename(filePath, newFilePath);

          label.add(id);
        }
      }
    }

    const labels = Array.from(labelSet);
    const existingTrain = await Train.findOne({});
    if (!existingTrain) {
      await new Train({ label: labels }).save();
    } else {
      existingTrain.label = labels;
      await existingTrain.save();
    }
  } catch (err) {
    console.error("Error while organizing files: ", err);
    throw new HttpError("Xảy ra lỗi trong lúc phân loại ảnh!");
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
      const error = new HttpError(
        "Số trang hoặc số dòng mỗi trang yêu cầu không hơp lệ!",
        400
      );
      return next(error);
    }

    let query = {};

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      const searchQueryNoAccents = removeVietnameseTones(searchQuery);
      const searchRegexNoAccents = new RegExp(searchQueryNoAccents, "i");
      query = {
        $or: [
          { student_id: searchRegex },
          { first_name: searchRegex },
          { middle_name: searchRegex },
          { last_name: searchRegex },
          { search_keywords: searchRegex },
          { search_keywords: searchRegexNoAccents },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const students = await Student.aggregate([
      { $match: query },
      { $sort: { student_id: -1, first_name: 1 } },
      { $skip: skip },
      { $limit: limit },
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
      "Có lỗi xảy ra khi lấy dữ liệu sinh viên, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const formData = req.body;
    const image = req.file;

    // Combine first_name, middle_name, last_name into full_name
    const fullName = `${formData.last_name} ${formData.middle_name} ${formData.first_name}`;

    const searchKeywords = `${fullName} ${removeVietnameseTones(fullName)}`;

    // Tạo địa chỉ thường trú từ các trường city_or_province, district và address
    const permanent_address = {
      city_or_province: formData.city_or_province,
      district: formData.district,
      address: formData.address,
    };

    // Tách school_year thành các phần from, to, và tính year_end_training
    const schoolYearParts = formData.school_year
      .split("-")
      .map((part) => part.trim());
    const fromYear = parseInt(schoolYearParts[0], 10);
    const toYear = parseInt(schoolYearParts[1], 10);
    const yearEndTraining = fromYear + 8;

    const school_year = {
      from: fromYear,
      to: toYear,
      year_end_training: yearEndTraining,
    };

    // Tạo đối tượng sinh viên mới
    const newStudent = new Student({
      student_id: formData.student_id,
      citizen_identification_number: formData.citizen_identification_number,
      portrait_img: image ? image.path.replace("public\\uploads\\", "") : "",
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      search_keywords: searchKeywords,
      date_of_birth: new Date(formData.date_of_birth),
      place_of_birth: formData.place_of_birth,
      gender: formData.gender,
      nationality: formData.nationality,
      permanent_address: permanent_address,
      school_year: school_year,
      education_program: formData.education_program,
      class: formData.class,
      current_address: formData.current_address,
    });

    // Lưu đối tượng sinh viên mới vào cơ sở dữ liệu
    await newStudent.save();

    res.status(201).json({ student: newStudent });
  } catch (err) {
    console.log("Lỗi tạo mới sinh viên: ", err);
    const error = new HttpError(
      "Có lỗi xảy ra khi tạo mới sinh viên, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const updateStudentFields = async (currentStudent, updateFields) => {
  try {
    const student = await Student.findOneAndUpdate(
      { _id: currentStudent._id },
      { $set: updateFields },
      { new: true }
    );

    if (!student) {
      throw new HttpError("Không tìm thấy sinh viên cần cập nhật!", 404);
    }

    // Xóa file ảnh cũ nếu có và cập nhật thành công
    if (
      currentStudent &&
      currentStudent.portrait_img &&
      updateFields.portrait_img
    ) {
      const oldImagePath = path.join(
        __dirname,
        "public",
        "uploads",
        currentStudent.portrait_img
      );

      fs.access(oldImagePath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error("Không thể xóa ảnh cũ:", err);
            } else {
              console.log("Đã xóa ảnh cũ:", oldImagePath);
            }
          });
        } else {
          console.log("File ảnh cũ không tồn tại:", oldImagePath);
        }
      });
    }

    return student;
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin sinh viên: ", err);
    throw new HttpError(
      "Có lỗi khi cập nhật thông tin sinh viên, vui lòng thử lại!",
      500
    );
  }
};

const updateStudent = async (req, res, next) => {
  const id = req.params.id;
  const updateFields = req.body; // Chứa các trường cần cập nhật
  const image = req.file;

  // Combine first_name, middle_name, last_name into full_name
  const fullName = `${updateFields.last_name} ${updateFields.middle_name} ${updateFields.first_name}`;

  const searchKeywords = `${fullName} ${removeVietnameseTones(fullName)}`;

  // Gộp các trường thành permanent_address
  const permanent_address = {
    city_or_province: updateFields.city_or_province,
    district: updateFields.district,
    address: updateFields.address,
  };

  // Tách các giá trị từ school_year
  const schoolYearParts = updateFields.school_year
    .split("-")
    .map((part) => part.trim());
  const fromYear = parseInt(schoolYearParts[0], 10);
  const toYear = parseInt(schoolYearParts[1], 10);
  const yearEndTraining = fromYear + 8;

  const school_year = {
    from: fromYear,
    to: toYear,
    year_end_training: yearEndTraining,
  };

  // Xóa các trường không cần thiết
  delete updateFields.city_or_province;
  delete updateFields.district;
  delete updateFields.address;

  const fieldsToUpdate = {
    ...updateFields,
    permanent_address,
    school_year,
    search_keywords: searchKeywords,
  };

  if (image)
    fieldsToUpdate.portrait_img = image.path.replace("public\\uploads\\", "");

  // Lấy thông tin sinh viên hiện tại để kiểm tra và xóa file ảnh cũ
  let currentStudent;
  try {
    currentStudent = await Student.findById(id);
    if (!currentStudent) {
      const error = new HttpError(
        "Không tìm thấy sinh viên cần cập nhật!",
        404
      );
      return next(error);
    }
  } catch (err) {
    const error = new HttpError("Lỗi khi tìm sinh viên!", 500);
    return next(error);
  }

  // Kiểm tra và lọc các trường hợp lệ
  // const validFields = [
  //   "first_name",
  //   "bio",
  //   "email",
  //   "profile_picture",
  //   "date_of_birth",
  //   "gender",
  //   "phone",
  //   "hometown",
  //   "self_lock",
  //   "search_keyword",
  // ];
  //Lọc và chỉ giữ lại các trường hợp lệ
  const validUpdateFields = getValidFields(fieldsToUpdate, []);

  if (Object.keys(validUpdateFields).length === 0) {
    const error = new HttpError("Không có trường cần cập nhật!", 422);
    return next(error);
  }
  const transformedFields = transformObjectFields(validUpdateFields);

  try {
    const student = await updateStudentFields(
      currentStudent,
      transformedFields
    );
    res.json({ student: student });
  } catch (err) {
    console.log("update student: ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

module.exports = {
  importStudents,
  getStudentsPaginated,
  handleUncompressFile,
  updateStudent,
  createStudent,
};
