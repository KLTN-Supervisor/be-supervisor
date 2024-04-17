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
        const endOfYear = new Date(`${year+1}-10-01`);

        const terms = await ExamSchedule.find({
        start_time: { $gte: startOfYear, $lte: endOfYear }
        }).distinct('term');

        res.json(terms);
    } catch (error) {
        return next(error);
    }
};


const getExamYears = async (req, res, next) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
    
        const startOfYear = new Date(`${currentYear}-01-01`);
        const endOfYear = new Date(`${currentYear}-12-31`);
    
        const examYears = await ExamSchedule.find({
          $or: [
            { start_time: { $gte: startOfYear, $lte: endOfYear }, month: { $gt: 10 } },
            { start_time: { $gte: startOfYear, $lte: endOfYear }, month: { $lt: 10 } }
          ]
        }).sort(-1).distinct('start_time');
    
        const years = examYears.map((start_time) => {
          const year = new Date(start_time).getFullYear();
          return new Date(start_time).getMonth() > 10 ? year : year - 1;
        });

        const uniqueYears = years.filter((year, index) => years.indexOf(year) === index);

        res.json(uniqueYears);
    } catch (error) {
        return next(error);
    }
};

const getExamDatesByTerm = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year)
        const startOfYear = new Date(`${year}-10-02`);
        const endOfYear = new Date(`${year+1}-10-01`);
        const term = parseInt(req.query.term) || 1;
        const examDates = await ExamSchedule.find({ term: term, start_time: { $gte: startOfYear, $lte: endOfYear } }).distinct('start_time');
        res.json(examDates);
    } catch (error) {
        return next(error);
    }
};

const getBuildingByDate = async (req, res, next) => {
    try {
        const date = parseInt(req.query.date) || 1;
        const roomIds = await ExamSchedule.find({
            $expr: {
              $eq: [
                { $dateToString: { format: '%Y-%m-%d', date: '$start_time' } },
                { $dateToString: { format: '%Y-%m-%d', date: date } }
              ]
            }
          }).distinct('room');
        const rooms = await Room.find({ _id: { $in: roomIds } });
        const buildingIds = rooms.map(room => room.building);
        const buildings = await Building.find({ _id: { $in: buildingIds } });
        res.json(buildings);
    } catch (error) {
        return next(error);
    }
};

const getExamTimeByBuilding = async (req, res, next) => {
    try {
        const date = parseInt(req.query.date) || 1;
        const building_id = req.query.building_id;
        const rooms = await Room.find({ building: building_id });
        const examSchedules = await ExamSchedule.find({ 
            $expr: {
                $eq: [
                { $dateToString: { format: '%Y-%m-%d', date: '$start_time' } },
                { $dateToString: { format: '%Y-%m-%d', date: date } }
                ]
          }, room: { $in: rooms } });
        let times= [];
        if (examSchedules) {
            examSchedules.forEach(examSchedule => {
              const startTime = examSchedule.start_time;
              console.log(startTime);
              times.push(startTime)
            });
          } else {
            console.log('Không tìm thấy lịch thi cho ngày và phòng thi cụ thể.');
          }
        res.json(times);
    } catch (error) {
        return next(error);
    }
};

const getRoomByExamTime = async (req, res, next) => {
    try {
        const date = parseInt(req.query.date) || 1;
        const building_id = req.query.building_id;
        const rooms = await Room.find({ building: building_id });
        const examSchedules = await ExamSchedule.find({ start_time: date, room: { $in: rooms } });
        const examRoomIds = examSchedules.map(exam => exam.room);
        const examRooms = await Room.find({ _id: { $in: examRoomIds } });
        
        res.json(examRooms);
    } catch (error) {
        return next(error);
    }
};

const getStudentByRoom = async (req, res, next) => {
    try {
        const date = parseInt(req.query.date) || 1;
        const room = req.query.room;
        const examSchedules = await ExamSchedule.find({ start_time: date, room: room });
        const examStudentIds = examSchedules.map(exam => exam.students);
        const examStudents = await Student.find({ _id: { $in: examStudentIds } });
        
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