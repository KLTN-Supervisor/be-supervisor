const HttpError = require("../../models/application/httpError");
const ExamSchedules = require("../../models/schemas/exam_schedule");
const Student = require("../../models/schemas/student");
const Inspector = require("../../models/schemas/inspector");
const Room = require("../../models/schemas/room");
const Subject = require("../../models/schemas/subject");
const UploadFile = require("../../models/schemas/uploadFile");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const importExamSchedules = async (req, res, next) => {
  try {
    // Kiểm tra sự tồn tại của các ID
    const studentIds = new Set();
    const inspectorIds = new Set();
    const roomIds = new Set();

    const csvdata = await csv({
      colParser: {
        room: async function (item, head, resultRow, row, colIdx) {
          roomIds.add(item);
          const room = await Room.findOne({ room_name: item });
          return room ? room._id : null;
        },
        students: async function (item, head, resultRow, row, colIdx) {
          const studentsArray = item.split(";");
          studentsArray.map((student, i) => {
            studentIds.add(student);
          });
          const idsStudents = await Student.find({
            student_id: { $in: studentsArray },
          }).select("student_id");
          return idsStudents.map((idStudent, i) => {
            return { student: idStudent._id };
          });
        },
        inspectors: async function (item, head, resultRow, row, colIdx) {
          const inspectorsArray = item.split(";");
          inspectorsArray.map((inspector, i) => {
            inspectorIds.add(inspector);
          });
          const idsInspectors = await Inspector.find({
            inspector_id: { $in: inspectorsArray },
          }).select("inspector_id");
          return idsInspectors.map((idInspector, i) => {
            return idInspector._id;
          });
        },
        start_time: function (item, head, resultRow, row, colIdx) {
          const [datePart, timePart] = item.split(" "); // Tách phần ngày và phần giờ
          const dateParts = datePart.split("/");
          const timeParts = timePart.split(":");
          // Tạo đối tượng Date từ phần ngày và phần giờ
          return new Date(
            dateParts[2],
            dateParts[1] - 1,
            dateParts[0],
            timeParts[0],
            timeParts[1],
            timeParts[2]
          );
        },
      },
    }).fromFile(req.file.path);

    if (csvdata.length > 0) {
      // Kiểm tra sự tồn tại của các ID trong cơ sở dữ liệu
      const validStudents = await Student.find({
        student_id: { $in: Array.from(studentIds) },
      }).distinct("student_id");
      const validInspectors = await Inspector.find({
        inspector_id: { $in: Array.from(inspectorIds) },
      }).distinct("inspector_id");
      const validRooms = await Room.find({
        room_name: { $in: Array.from(roomIds) },
      }).distinct("room_name");

      // Kiểm tra xem tất cả các ID có tồn tại không
      const allIdsValid =
        validStudents.length === studentIds.size &&
        validInspectors.length === inspectorIds.size &&
        validRooms.length === roomIds.size;

      if (allIdsValid) {
        // Chỉ chèn dữ liệu vào cơ sở dữ liệu nếu tất cả các ID đều hợp lệ
        await ExamSchedules.insertMany(csvdata);
        res.json({ message: "Import success!" });
      } else {
        // Ghi ra các ID không hợp lệ
        const invalidStudents = Array.from(studentIds).filter(
          (id) => !validStudents.includes(id)
        );
        const invalidInspectors = Array.from(inspectorIds).filter(
          (id) => !validInspectors.includes(id)
        );
        const invalidRooms = Array.from(roomIds).filter(
          (id) => !validRooms.includes(id)
        );

        // console.error("Invalid student IDs:", invalidStudents);
        // console.error("Invalid inspector IDs:", invalidInspectors);
        // console.error("Invalid room IDs:", invalidRooms);

        const error = new HttpError(
          "Some ids are invalid: \nInvalid student IDs: " +
            invalidStudents +
            "\nInvalid inspector IDs: " +
            invalidInspectors +
            "\nInvalid room IDs: " +
            invalidRooms,
          422
        );
        return next(error);
      }
    }
  } catch (err) {
    console.error("admin import exam schedules----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const importExamSchedulesExcels = async (req, res, next) => {
  try {
    if (req.files.length > 0) {
      const newFiles = req.files.map((file, i) => {
        return {
          file_name: file.originalname,
          mimetype: file.mimetype,
          type: "EXCEL",
          file_path: file.path,
        };
      });
      const uploadedFiles = await UploadFile.insertMany(newFiles);

      res.json({ uploaded_files: uploadedFiles });
    } else {
      const error = new HttpError("No files has been upload!", 404);
      return next(error);
    }
  } catch (err) {
    console.log("upload files -------", err);
    const error = new HttpError("Error occured, please try again!", 500);
    return next(error);
  }
};

const getFilesList = async (req, res, next) => {
  const folderPath = path.join("public", "uploads", "exam-schedules");

  try {
    const files = await UploadFile.find().sort({ created_at: -1 });
    res.json({ files: files });
  } catch (err) {
    console.log("error readir: ", err);
    const error = new HttpError("Error occurred!", 500);
    return next(error);
  }
};

const importExamSchedulesFromExcel = async (req, res, next) => {
  const fileIds = req.body.chooseFiles;

  try {
    const files = await UploadFile.find({ _id: { $in: fileIds } });

    for (const file of files) {
      const result = await readFileDataFromExcel(file.file_path);
      await ExamSchedules.insertMany(result);
      file.has_used = true;
      await file.save();
    }
    console.log("import success: ", files);
    res.json({ message: "Import success" });
  } catch (err) {
    console.error("admin import exam schedules----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const readFileDataFromExcel = async (path) => {
  try {
    // Kiểm tra sự tồn tại của các ID
    const studentIds = new Set();
    const inspectorIds = new Set();
    const roomIds = new Set();
    const workbook = xlsx.readFile(path);
    // Chọn sheet đầu tiên
    const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet1, { header: "A" });

    let result = [];
    let currentExam = null;

    for (let item of data) {
      if (item?.["C"] === "Ngày Thi :") {
        if (currentExam !== null) {
          const students = await Student.find({
            student_id: { $in: currentExam.students },
          });

          const examStudents = students.map((student, i) => {
            return { student: student._id };
          });

          currentExam.students = examStudents;

          result.push(currentExam);
        }
        const [time, room_name] = item?.["E"]?.split(" - Phòng thi: ");
        const [term, year] = data
          .find((i) => i?.["A"] === "Học Kỳ 02 - Năm Học 2023-2024")
          ?.["A"]?.split(" - ");

        const [datePart, timePart] = time.split(" - Giờ Thi: ");
        const dateParts = datePart.split("/");
        const timeParts = timePart.split(" -   phút - ")[0].split("g");

        const start_time = new Date(
          dateParts[2],
          dateParts[1] - 1,
          dateParts[0],
          timeParts[0],
          timeParts[1]
        );

        const room = await Room.findOne({ room_name: room_name });
        const subject = await Subject.findOne({
          subject_id: data.find((i) => i?.["C"] === "Mã Môn Học:")?.["E"],
        });

        currentExam = {
          room: room._id,
          start_time: start_time,
          term: term?.split(" Kỳ ")[1],
          year: {
            from: year?.split(" Học ")[1]?.split("-")[0],
            to: year?.split(" Học ")[1]?.split("-")[1],
          },
          subject: subject._id,
          students: [],
        };
      } else if (item?.["B"] && typeof item["B"] === "number") {
        currentExam.students.push(item?.["D"]);
      }
    }

    if (currentExam !== null) {
      const students = await Student.find({
        student_id: { $in: currentExam.students },
      });

      const examStudents = students.map((student, i) => {
        return { student: student._id };
      });

      currentExam.students = examStudents;
      result.push(currentExam);
    }
    return result;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  importExamSchedules,
  importExamSchedulesExcels,
  importExamSchedulesFromExcel,
  getFilesList,
};
