const HttpError = require("../models/application/httpError");
const ExamSchedule = require("../models/schemas/exam_schedule");
const Room = require("../models/schemas/room");
const Building = require("../models/schemas/building");
const Student = require("../models/schemas/student");

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
      const termYear = startYear + examSchedule.term; // Tính toán năm từ trường term
      if (termYear > 1) return startYear - 1;
      else return startYear;
    });

    const uniqueYears = years.filter(
      (year, index) => years.indexOf(year) === index
    );
    console.log(uniqueYears);

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
  try {
    const dateParam = req.query.date || "00/00/0000";
    const [day, month, year] = dateParam.split("/").map(Number);
    const date = new Date(year, month - 1, day + 1); // Tạo đối tượng Date từ ngày, tháng và năm
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
    const buildings = await Building.find({ _id: { $in: buildingIds } });
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
    // console.log(uniqueexamSchedules);
    if (uniqueexamSchedules) {
      uniqueexamSchedules.forEach((examSchedule) => {
        const startTime = examSchedule.start_time;
        console.log(startTime);
        times.push(startTime);
      });
    } else {
      console.log("Không tìm thấy lịch thi cho ngày và phòng thi cụ thể.");
    }
    const uniqueTimes = times
      .map((time) => time.toISOString()) // Chuyển đổi các đối tượng Date thành chuỗi ISO
      .filter((time, index, array) => array.indexOf(time) === index);
    console.log(uniqueTimes);
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
    console.log(examRooms);
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
    console.log(examSchedules);
    let examStudents = [];
    for (const student of examSchedules.students) {
      console.log(student);
      const examStudent = await Student.findOne({ _id: student.student });
      console.log("examStudent", examStudent);
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

exports.getExamYears = getExamYears;
exports.getTermsOfYear = getTermsOfYear;
exports.getExamDatesByTerm = getExamDatesByTerm;
exports.getBuildingByDate = getBuildingByDate;
exports.getExamTimeByBuilding = getExamTimeByBuilding;
exports.getRoomByExamTime = getRoomByExamTime;
exports.getStudentByRoom = getStudentByRoom;
