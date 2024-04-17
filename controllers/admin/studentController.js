const HttpError = require("../../models/application/httpError");
const Student = require("../../models/schemas/student");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");

const importStudents = async (req, res, next) => {
  try {
    const csvdata = await csv().fromFile(req.file.path);

    if (csvdata.length > 0) {
      for (const student of csvdata) {
        // Xử lý giới tính và ngày tháng
        if (
          student.gender.toLowerCase() === "nữ" ||
          student.gender.toLowerCase() === "female"
        )
          student.gender = false;
        else student.gender = true;

        const parts = student.date_of_birth.split("/");
        const dateOfBirth = new Date(parts[2], parts[1] - 1, parts[0]);
        student.date_of_birth = dateOfBirth;
      }

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

module.exports = { importStudents };
