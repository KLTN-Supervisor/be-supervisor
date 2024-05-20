const HttpError = require("../../models/application/httpError");
const ExamSchedules = require("../../models/schemas/exam_schedule");
const Student = require("../../models/schemas/student");
const Inspector = require("../../models/schemas/inspector");
const Room = require("../../models/schemas/room");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const xlsx = require("xlsx");

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

const importExamSchedulesExcel = async (req, res, next) => {
  try {
    // Kiểm tra sự tồn tại của các ID
    const studentIds = new Set();
    const inspectorIds = new Set();
    const roomIds = new Set();

    const workbook = xlsx.readFile(req.file.path);
    // Chọn sheet đầu tiên
    const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet1, { header: "A" });
    res.json({ message: "success" });
  } catch (err) {
    console.error("admin import exam schedules----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const getExamSchedulesExcel = async (req, res, next) => {
  try {
    const workbook = xlsx.readFile(
      "public/uploads/exam-schedules/1716179532662-DSSVDuThiAVDR_17.03.24.xls"
    );
    // Chọn sheet đầu tiên
    const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet1, { header: "A" });

    let result = [];
    let currentExam = null;

    for (let item of data) {
      if (item?.["C"] === "Ngày Thi :") {
        if (currentExam !== null) {
          result.push(currentExam);
        }
        let roomAndTime = item?.["E"]?.split(" - Phòng thi: ");
        let termAndYear = data
          .find((i) => i?.["A"] === "Học Kỳ 02 - Năm Học 2023-2024")
          ?.["A"]?.split(" - ");
        currentExam = {
          room: roomAndTime?.[1],
          start_time: roomAndTime?.[0]
            ?.split(" - Giờ Thi: ")[1]
            ?.split(" -   phút")[0],
          term: termAndYear?.[0],
          school_year: termAndYear?.[1],
          subject: data.find((i) => i?.["C"] === "Môn Học: ")?.["E"],
          students: [],
        };
      } else if (item?.["B"] && typeof item["B"] === "number") {
        currentExam.students.push({
          student: item?.["D"],
        });
      }
    }

    if (currentExam !== null) {
      result.push(currentExam);
    }

    res.json(result);
  } catch (err) {
    console.error("admin import exam schedules----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

module.exports = {
  importExamSchedules,
  importExamSchedulesExcel,
  getExamSchedulesExcel,
};
