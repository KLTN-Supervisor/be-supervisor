const HttpError = require("../models/application/httpError");
const ExamSchedule = require("../models/schemas/exam_schedule");
const Room = require("../models/schemas/room");
const Building = require("../models/schemas/building");
const Student = require("../models/schemas/student");
const Report = require("../models/schemas/report");
const Subject = require("../models/schemas/subject");
const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const getTermsOfYear = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || 2024;
    const startOfYear = new Date(`${year}-10-02`);
    const endOfYear = new Date(`${year + 1}-10-01`);

    const terms = await ExamSchedule.find({
      start_time: { $gte: startOfYear, $lte: endOfYear },
    }).distinct("term");

    res.json(terms);
  } catch (error) {
    return next(error);
  }
};

const getExamYears = async (req, res, next) => {
  try {
    const examSchedules = await ExamSchedule.find({});

    const years = examSchedules.map((examSchedule) => {
      const startYear = examSchedule.start_time.getFullYear(); // Lấy năm từ trường start_time
      const termYear = examSchedule.term; // Tính toán năm từ trường term
      if (termYear > 1) return startYear - 1;
      else return startYear;
    });

    const uniqueYears = years.filter(
      (year, index) => years.indexOf(year) === index
    );

    res.json(uniqueYears);
  } catch (error) {
    return next(error);
  }
};

const getExamDatesByTerm = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year);
    const startOfYear = new Date(`${year}-10-02`);
    const endOfYear = new Date(`${year + 1}-10-01`);
    const term = parseInt(req.query.term) || 1;
    const examDates = await ExamSchedule.find({
      term: term,
      start_time: { $gte: startOfYear, $lte: endOfYear },
    }).distinct("start_time");
    res.json(examDates);
  } catch (error) {
    return next(error);
  }
};

const getBuildingByDate = async (req, res, next) => {
  //console.log("vào get building");
  try {
    const dateParam = req.query.date || "00/00/0000";
    const [day, month, year] = dateParam.split("/").map(Number);
    const date = new Date(year, month - 1, day); // Tạo đối tượng Date từ ngày, tháng và năm

    console.log(date);

    const roomIds = await ExamSchedule.find({
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },
          { $dateToString: { format: "%Y-%m-%d", date: date } },
        ],
      },
    }).distinct("room");

    console.log(roomIds);

    const rooms = await Room.find({ _id: { $in: roomIds } });
    const buildingIds = rooms.map((room) => room.building);

    console.log(buildingIds);
    const buildings = await Building.find({ _id: { $in: buildingIds } });
    console.log(buildings);
    res.json(buildings);
  } catch (error) {
    return next(error);
  }
};

const getExamTimeByBuilding = async (req, res, next) => {
  try {
    const building_id = req.query.building_id;
    const rooms = await Room.find({ building: building_id });
    const dateParam = req.query.date || "00/00/0000";
    const [day, month, year] = dateParam.split("/").map(Number);
    const date = new Date(year, month - 1, day + 1); // Tạo đối tượng Date từ ngày, tháng và năm

    const examSchedules = await ExamSchedule.find({
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },
          { $dateToString: { format: "%Y-%m-%d", date: date } },
        ],
      },
      room: { $in: rooms },
    });
    let times = [];
    const uniqueexamSchedules = examSchedules.filter(
      (examSchedule, index) => examSchedules.indexOf(examSchedule) === index
    );

    if (uniqueexamSchedules) {
      uniqueexamSchedules.forEach((examSchedule) => {
        const startTime = examSchedule.start_time;
        times.push(startTime);
      });
    } else {
      console.log("Không tìm thấy lịch thi cho ngày và phòng thi cụ thể.");
    }
    const uniqueTimes = times
      .map((time) => time.toISOString()) // Chuyển đổi các đối tượng Date thành chuỗi ISO
      .filter((time, index, array) => array.indexOf(time) === index);
    res.json(uniqueTimes);
  } catch (error) {
    return next(error);
  }
};

const getRoomByExamTime = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const building_id = req.query.building_id;
    const rooms = await Room.find({ building: building_id });
    const examSchedules = await ExamSchedule.find({
      start_time: date,
      room: { $in: rooms },
    });
    const examRoomIds = examSchedules.map((exam) => exam.room);
    const examRooms = await Room.find({ _id: { $in: examRoomIds } });
    res.json(examRooms);
  } catch (error) {
    return next(error);
  }
};

const getStudentByRoom = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const room = req.query.room;
    const examSchedules = await ExamSchedule.findOne({
      start_time: date,
      room: room,
    });
    let examStudents = [];
    for (const student of examSchedules.students) {
      const examStudent = await Student.findOne({ _id: student.student });
      examStudents.push({
        student: examStudent,
        attendance: student.attendance,
      });
    }

    res.json(examStudents);
  } catch (error) {
    return next(error);
  }
};

const getRoomInfo = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const room = req.query.room;
    const examSchedule = await ExamSchedule.findOne({
      start_time: date,
      room: room,
    });
    const examRoom = await Room.findOne({ _id: examSchedule.room });
    const examSubject = await Subject.findOne({ _id: examSchedule.subject });

    res.json({
      room_name: examRoom.room_name,
      start_time: date,
      year: examSchedule.year,
      term: examSchedule.term,
      subject_id: examSubject.subject_id,
      subject_name: examSubject.subject_name,
      subject_credit: examSubject.credit,
      quantity: examSchedule.students.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getSuspiciousStudents = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const [day, month, year] = date.split("/").map(Number);

    const examSchedules = await ExamSchedule.find({
      start_time: {
        $gte: new Date(year, month - 1, day, 0, 0, 0),
        $lt: new Date(year, month - 1, day + 1, 0, 0, 0),
      },
    });
    // Tạo một đối tượng để lưu trữ các sinh viên và các lịch thi của họ
    const frequencyMap = {};
    // Duyệt qua từng lịch thi
    examSchedules.forEach((exam) => {
      // Duyệt qua từng sinh viên trong lịch thi
      exam.students.forEach((student) => {
        if (frequencyMap[student.student]) {
          frequencyMap[student.student]++;
        } else {
          // Nếu chưa xuất hiện, thêm phần tử vào frequencyMap với số lần xuất hiện là 1
          frequencyMap[student.student] = 1;
        }
      });
    });

    // Tìm các phần tử có số lần xuất hiện lớn hơn 1 (tức là các phần tử trùng nhau)
    const duplicateStudents = Object.keys(frequencyMap).filter(
      (student) => frequencyMap[student] > 1
    );

    let examStudents = [];
    for (const student of duplicateStudents) {
      const examStudent = await Student.findOne({ _id: student });
      const schedules = [];
      for (const exam of examSchedules) {
        const isStudentPresent = exam.students.some(
          (s) => s.student.toString() === student
        );
        if (isStudentPresent) {
          const examRoom = await Room.findOne({ _id: exam.room });
          if (examRoom) {
            schedules.push({ room: examRoom.room_name, time: exam.start_time });
          }
        }
      }
      const studentWithSchedules = examStudent.toJSON();
      studentWithSchedules.schedules = schedules;
      examStudents.push(studentWithSchedules);
    }
    res.json(examStudents);
  } catch (err) {
    return next(err);
  }
};

const attendanceStudent = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const room = req.query.room;
    const studentId = req.query.studentId;
    const attendance = req.query.attendance; // ID của Student

    const examStudent = await Student.findOne({ student_id: studentId });
    const updated = await ExamSchedule.updateOne(
      {
        start_time: date,
        room: room,
        "students.student": examStudent._id,
      },
      {
        $set: {
          "students.$.attendance": attendance,
        },
      }
    );
    if (updated) res.json(true);
  } catch (err) {
    return next(err);
  }
};

const noteReport = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const room = req.query.room;
    const { reportType, note } = req.body;
    const images = req.files;

    const imagesPath = images.map((image, i) =>
      image.path.replace("public\\uploads\\", "")
    );

    const examSchedule = await ExamSchedule.findOne({
      start_time: date,
      room: room,
    });

    const newReport = new Report({
      note: note,
      report_type: reportType.toUpperCase(),
      time: examSchedule._id,
      images: imagesPath,
    });

    await newReport.save();

    res.json({ new_report: newReport });
  } catch (err) {
    return next(err);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const { reportType, note, reportId } = req.body;
    const removed_images = JSON.parse(req.body.removed_images);
    const images = req.files;

    // Get existing report from the database
    const report = await Report.findById(reportId);
    if (!report) {
      const error = new HttpError("Không tìm thấy biên bản cần cập nhật!", 404);
      return next(error);
    }

    let updatedImages = report.images || [];

    // Remove specified images
    if (removed_images && Array.isArray(removed_images)) {
      for (let i = 0; i < removed_images.length; i++) {
        const imagePath = removed_images[i];
        const fullPath = path.join("public", "uploads", imagePath);

        //console.log("Đường dẫn: ", fullPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // Delete the file from the system
        }
      }

      // Remove image paths from the updatedImages array
      updatedImages = updatedImages.filter(
        (img) => !removed_images.includes(img)
      );
    }

    // Add new images
    const newImagesPath = images.map((image) =>
      image.path.replace("public\\uploads\\", "")
    );

    updatedImages = updatedImages.concat(newImagesPath);

    // Update the report document
    report.report_type = reportType.toUpperCase();
    report.note = note;
    report.images = updatedImages;

    await report.save();

    res.json({ report: report });
  } catch (err) {
    console.log("Cập nhật report: ", err);
    const error = new HttpError("Có lỗi khi cập nhật!", 500);
    return next(error);
  }
};

const getExamScheduleReport = async (req, res, next) => {
  try {
    const date = req.query.date || "00/00/0000";
    const room = req.query.room;

    const examSchedule = await ExamSchedule.findOne({
      start_time: date,
      room: room,
    });

    const reports = await Report.find({
      time: examSchedule._id,
    });

    res.json(reports);
  } catch (err) {
    return next(err);
  }
};

const deleteExamScheduleReport = async (req, res, next) => {
  try {
    const id = req.query.reportId;
    await Report.deleteOne({
      _id: id,
    });
    res.json(true);
  } catch (err) {
    return next(err);
  }
};

const getExamScheduleByDate = async (req, res, next) => {
  try {
    const dateParam = req.query.date || "00/00/0000";
    const [day, month, year] = dateParam.split("/").map(Number);
    const date = new Date(year, month - 1, day + 1); // Tạo đối tượng Date từ ngày, tháng và năm

    const examSchedules = await ExamSchedule.find({
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$start_time" } },
          { $dateToString: { format: "%Y-%m-%d", date: date } },
        ],
      },
    });

    let examScheduleInfos = [];
    for (const examSchedule of examSchedules) {
      const examRoom = await Room.findOne({ _id: examSchedule.room });
      const examSubject = await Subject.findOne({ _id: examSchedule.subject });

      let examStudents = [];
      for (const student of examSchedule.students) {
        const examStudent = await Student.findOne({ _id: student.student });
        examStudents.push({
          student: examStudent,
          attendance: student.attendance,
        });
      }

      examScheduleInfos.push({
        room_name: examRoom.room_name,
        start_time: examSchedule.start_time,
        year: examSchedule.year,
        term: examSchedule.term,
        subject_id: examSubject.subject_id,
        subject_name: examSubject.subject_name,
        subject_credit: examSubject.credit,
        quantity: examSchedule.students.length,
        students: examStudents,
      });
    }
    res.json(examScheduleInfos);
  } catch (error) {
    return next(error);
  }
};

exports.getExamYears = getExamYears;
exports.getTermsOfYear = getTermsOfYear;
exports.getExamDatesByTerm = getExamDatesByTerm;
exports.getBuildingByDate = getBuildingByDate;
exports.getExamTimeByBuilding = getExamTimeByBuilding;
exports.getRoomByExamTime = getRoomByExamTime;
exports.getStudentByRoom = getStudentByRoom;
exports.getSuspiciousStudents = getSuspiciousStudents;
exports.attendanceStudent = attendanceStudent;
exports.noteReport = noteReport;
exports.updateReport = updateReport;
exports.getExamScheduleReport = getExamScheduleReport;
exports.deleteExamScheduleReport = deleteExamScheduleReport;
exports.getRoomInfo = getRoomInfo;
exports.getExamScheduleByDate = getExamScheduleByDate;
