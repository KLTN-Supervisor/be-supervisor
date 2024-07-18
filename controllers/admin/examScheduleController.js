const HttpError = require("../../models/application/httpError");
const ExamSchedule = require("../../models/schemas/exam_schedule");
const Student = require("../../models/schemas/student");
const Inspector = require("../../models/schemas/inspector");
const Room = require("../../models/schemas/room");
const Report = require("../../models/schemas/report");
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
        await ExamSchedule.insertMany(csvdata);
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
          "Các mã sinh viên không hợp lệ: " +
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

const uploadExamSchedulesExcels = async (req, res, next) => {
  const { term, schoolYear } = req.body;

  try {
    if (req.files.length > 0) {
      // Tách chuỗi schoolYear thành các giá trị from và to
      const schoolYearParts = schoolYear.split("-").map((part) => part.trim());
      const fromYear = parseInt(schoolYearParts[0], 10);
      const toYear = parseInt(schoolYearParts[1], 10);

      const newFiles = [];

      for (const file of req.files) {
        // Kiểm tra xem file đã tồn tại chưa
        const existingFile = await UploadFile.findOne({
          file_name: file.originalname,
          term: term,
          "year.from": fromYear,
          "year.to": toYear,
        });

        if (existingFile) {
          // Cập nhật thông tin file trong cơ sở dữ liệu
          existingFile.file_path = file.path;
          existingFile.has_used = false;
          await existingFile.save();
        } else {
          // Thêm file mới vào danh sách
          newFiles.push({
            file_name: file.originalname,
            mimetype: file.mimetype,
            type: "EXCEL",
            file_path: file.path,
            term: term,
            year: {
              from: fromYear,
              to: toYear,
            },
          });
        }
      }

      // Lưu các file mới vào cơ sở dữ liệu
      const uploadedFiles =
        newFiles.length > 0 ? await UploadFile.insertMany(newFiles) : [];

      res.json({ uploaded_files: uploadedFiles });
    } else {
      const error = new HttpError("Không có files được tải lên!", 404);
      return next(error);
    }
  } catch (err) {
    console.log("upload files -------", err);
    const error = new HttpError("Có lỗi trong quá trình tải files", 500);
    return next(error);
  }
};

const getUploadedFileYears = async (req, res, next) => {
  try {
    const uploadFiles = await UploadFile.find({});

    const years = uploadFiles.map((uploadFile) => {
      return uploadFile.year.from; // Lấy năm từ trường from của year
    });

    const uniqueYears = years.filter(
      (year, index) => years.indexOf(year) === index
    );

    res.json(uniqueYears);
  } catch (error) {
    return next(error);
  }
};

const getFilesList = async (req, res, next) => {
  //const folderPath = path.join("public", "uploads", "exam-schedules");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const term = parseInt(req.query.term, 10) || 1;
  const currentYear = new Date().getFullYear();

  let fromYear, toYear;

  const schoolYear = req.query.schoolYear;

  if (schoolYear) {
    const schoolYearParts = schoolYear.split("-").map((part) => part.trim());
    fromYear = parseInt(schoolYearParts[0], 10);
    toYear = parseInt(schoolYearParts[1], 10);

    if (isNaN(fromYear) || isNaN(toYear)) {
      const error = new HttpError("Năm học không hợp lệ!", 400);
      return next(error);
    }
  } else {
    if (term === 1) {
      fromYear = currentYear;
    } else if (term === 2 || term === 3) {
      fromYear = currentYear - 1;
    } else {
      const error = new HttpError("Học kỳ không hợp lệ!", 400);
      return next(error);
    }
    toYear = fromYear + 1;
  }

  const skip = (page - 1) * limit;
  const filter = {
    term: term,
    year: { from: fromYear, to: toYear },
  };

  try {
    const files = await UploadFile.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalFiles = await UploadFile.countDocuments(filter);

    res.json({
      files: files,
      current_page: page,
      total_pages: Math.ceil(totalFiles / limit),
      total_files: totalFiles,
    });
  } catch (err) {
    console.log("error readir: ", err);
    const error = new HttpError("Error occurred!", 500);
    return next(error);
  }
};

const importExamSchedulesFromExcel = async (req, res, next) => {
  const fileIds = req.body.selectedFiles;

  try {
    const files = await UploadFile.find({ _id: { $in: fileIds } });
    let allExams = [];

    for (const file of files) {
      const result = await readFileDataFromExcel2(file.file_path);
      allExams = allExams.concat(result);
      file.has_used = true;
      await file.save();
    }

    // Get potential duplicates in one query
    const duplicateChecks = allExams.map((exam) => ({
      room: exam.room,
      term: exam.term,
      start_time: exam.start_time,
    }));

    const existingExams = await ExamSchedule.find({
      $or: duplicateChecks,
    }).populate({ path: "room", select: "room_name" });

    const existingExamSet = new Set(
      existingExams.map(
        (exam) => `${exam.room._id.toString()}-${exam.term}-${exam.start_time}`
      )
    );

    const filteredExams = allExams.filter(
      (exam) =>
        !existingExamSet.has(
          `${exam.room.toString()}-${Number(exam.term)}-${exam.start_time}`
        )
    );

    // Insert non-duplicate exams
    if (filteredExams.length > 0) {
      await ExamSchedule.insertMany(filteredExams);
    }

    res.json({ duplicates: existingExams, new_records: filteredExams.length });
  } catch (err) {
    console.error("admin import exam schedules----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const deleteSelectedFiles = async (req, res, next) => {
  const fileIds = req.body.selectedFiles;

  try {
    const files = await UploadFile.find({ _id: { $in: fileIds } });

    if (files.length > 0) {
      const failedDeletionFiles = await deleteFiles(files);
      res.json({ failed_deletion_files: failedDeletionFiles });
    } else {
      const error = new HttpError("Không xác định được files đã chọn!");
      return next(error);
    }
  } catch (err) {
    console.error("delete exam schedules files----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const deleteFiles = async (files) => {
  const failedDeletions = [];

  if (files.length > 0) {
    const deletePromises = files.map(async (file) => {
      const filePath = path.join(file.file_path);
      let fileUnlinked = false;

      try {
        await fs.promises.unlink(filePath);
        fileUnlinked = true;
      } catch (err) {
        if (err.code === "ENOENT") {
          console.error("File không tồn tại:", filePath);
          fileUnlinked = true; // Treat as successfully unlinked
        } else {
          console.error("Không thể xóa file:", err);
          failedDeletions.push({ _id: file._id, file_name: file.file_name });
        }
      }

      if (fileUnlinked) {
        try {
          await UploadFile.findByIdAndDelete(file._id);
        } catch (err) {
          console.error("Xóa dữ liệu db không thành công:", err);
          // Optionally add the file to failedDeletions here if needed
        }
      }
    });
    try {
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Lỗi khi xử lý xóa các file:", err);
      throw err;
    }
  }

  return failedDeletions;
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

    // Regular expression to match the term and year format
    const termYearRegex = /Học Kỳ (\d+) - Năm Học (\d{4}-\d{4})/;
    const termYearMatch = data.find((i) => termYearRegex.test(i?.["A"]));

    //console.log(data);

    if (!termYearMatch) {
      throw new Error(
        "Không tìm thấy thông tin học kỳ và năm học trong file excel!"
      );
    }

    const [_, term, year] = termYearMatch?.["A"].match(termYearRegex);
    const [fromYear, toYear] = year.split("-").map(Number);

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
          term: term,
          year: {
            from: fromYear,
            to: toYear,
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

const readFileDataFromExcel2 = async (path) => {
  try {
    const studentIds = new Set();
    const inspectorIds = new Set();
    const roomIds = new Set();
    const workbook = xlsx.readFile(path);
    const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet1, { header: "A" });

    let result = [];
    let currentExam = null;

    const termYearRegex = /học kỳ (\d+) - năm học (\d{4}-\d{4})/i;
    const termYearMatch = data.find((i) =>
      termYearRegex.test(i?.["A"]?.toLowerCase())
    );

    if (!termYearMatch) {
      throw new Error(
        "Không tìm thấy thông tin học kỳ và năm học trong file excel!"
      );
    }

    const [_, term, year] = termYearMatch?.["A"]
      .toLowerCase()
      .match(termYearRegex);
    const [fromYear, toYear] = year.split("-").map(Number);

    for (let item of data) {
      //console.log(item);
      if (
        item?.["C"] &&
        typeof item["C"] === "string" &&
        item["C"]?.toLowerCase() === "ngày thi :"
      ) {
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

        const examInfo = item?.["E"]?.toLowerCase();
        const [timeInfo, room_name] = examInfo.split(" - phòng thi: ");

        const [datePart, timePart] = timeInfo.split(" - giờ thi: ");
        const dateParts = datePart.trim().split("/");
        const timeParts = timePart
          .trim()
          .split(" -   phút - ")[0]
          .trim()
          .split(/g|:/); // Split by either "g" or ":"

        const start_time = new Date(
          dateParts[2],
          dateParts[1] - 1,
          dateParts[0],
          process.env.NODE_ENV === "production"
            ? timeParts[0] - 7
            : timeParts[0],
          timeParts[1]
        );

        const room = await Room.findOne({
          room_name: room_name.toUpperCase().trim(),
        });
        const subject = await Subject.findOne({
          subject_id: data.find(
            (i) => i?.["C"]?.toLowerCase() === "mã môn học:"
          )?.["E"],
        });

        currentExam = {
          room: room._id,
          start_time: start_time,
          term: term,
          year: {
            from: fromYear,
            to: toYear,
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

const getExamScheduleReport = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const year = parseInt(req.query.year);
  const term = parseInt(req.query.term) || 1;
  const searchQuery = req.query.search || null;
  const typeFilter = req.query.type || null;

  if (isNaN(year)) {
    const error = new HttpError("Năm không hợp lệ!", 400);
    return next(error);
  }

  try {
    const skip = (page - 1) * limit;
    const startOfYear = new Date(`${year}-10-02`);
    const endOfYear = new Date(`${year + 1}-10-01`);

    let examScheduleQuery = {
      term: term,
      start_time: { $gte: startOfYear, $lte: endOfYear },
    };

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      const roomIds = await Room.find({ room_name: searchRegex }).distinct(
        "_id"
      );
      examScheduleQuery = {
        ...examScheduleQuery,
        room: { $in: roomIds },
      };
    }

    const examSchedules = await ExamSchedule.find(examScheduleQuery).select(
      "_id"
    );
    const esIds = examSchedules.map((examSchedule) => examSchedule._id);

    let reportQuery = { time: { $in: esIds } };

    if (typeFilter) {
      reportQuery = { ...reportQuery, report_type: typeFilter };
    }

    const reports = await Report.find(reportQuery)
      .populate({
        path: "time",
        select: "room subject start_time",
        populate: [{ path: "room" }, { path: "subject" }],
      })
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(limit);

    const totalRecords = await Report.countDocuments({ time: { $in: esIds } });

    res.json({
      reports: reports,
      current_page: page,
      total_pages: Math.ceil(totalRecords / limit),
      total_records: totalRecords,
    });
  } catch (err) {
    console.log(err);
    const error = new HttpError("Error occured!", 500);
    return next(error);
  }
};

module.exports = {
  importExamSchedules,
  uploadExamSchedulesExcels,
  importExamSchedulesFromExcel,
  getFilesList,
  getExamScheduleReport,
  deleteSelectedFiles,
  getUploadedFileYears,
};
