const HttpError = require("../models/application/httpError");
const Building = require("../models/schemas/building");
const Room = require("../models/schemas/room");
const { validationResult } = require("express-validator");

const createBuilding = async (req, res, next) => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return next(new HttpError("Invalid input!", 422));
  //   }
  //   const { otp, otpToken, email, fullname, username, password } = req.body;

  const newBuilding1 = new Building({
    building_name: "Tòa nhà trung tâm",
    location: { lat: "03503785048s003", long: "0350378504823d3" },
    construction_start_date: new Date("1985-03-01"),
    opening_date: new Date("1985-08-01"),
    status: true,
    number_of_floors: 12,
    number_of_rooms: 40,
  });

  //   const newStudent2 = new Student({
  //     student_id: "20110627",
  //     citizen_identification_number: "080180019376",
  //     first_name: "Dương",
  //     middle_name: "Khắc",
  //     last_name: "Nguyễn",
  //     portrait_img:
  //       "https://www.vciambulances.com/wp-content/uploads/2017/12/no-avatar.png",
  //     date_of_birth: new Date("2002-01-24"),
  //     place_of_birth: "TP Bảo Lộc",
  //     gender: true,
  //     email: "duongnk@gmail.com",
  //     phone: "0393879086",
  //     student_type: "FORMAL",
  //     learning_status: "LEARNING",
  //     nationality: "Vietnam",
  //     permanent_address: {
  //       address: "49, Trị Yên",
  //       district: "Bảo Lộc",
  //       city_or_province: "Đà Lạt",
  //     },
  //     school_year: { from: 2020, to: 2024, year_end_training: 2028 },
  //     education_program: "20110ST",
  //     class: "20110ST6",
  //     current_address: "TP Hồ Chí Minh",
  //   });

  try {
    await newBuilding1.save();
    //await newStudent2.save();
  } catch (err) {
    console.log("create building ----------- ", err);
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Success!" });
};

const createRoom = async (req, res, next) => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return next(new HttpError("Invalid input!", 422));
  //   }
  //   const { otp, otpToken, email, fullname, username, password } = req.body;

  const newRoom1 = new Room({
    room_name: "A5-204",
    building: "661fe81f908f6ee90702e199",
    floor: 2,
    status: true,
    max_seats: 50,
    room_type: "COMPUTER_ROOM",
  });
  const newRoom2 = new Room({
    room_name: "A5-303",
    building: "661fe81f908f6ee90702e199",
    floor: 3,
    status: true,
    max_seats: 50,
    room_type: "COMPUTER_ROOM",
  });
  const newRoom3 = new Room({
    room_name: "A5-302",
    building: "661fe81f908f6ee90702e199",
    floor: 3,
    status: true,
    max_seats: 40,
    room_type: "NORMAL",
  });

  //   const newStudent2 = new Student({
  //     student_id: "20110627",
  //     citizen_identification_number: "080180019376",
  //     first_name: "Dương",
  //     middle_name: "Khắc",
  //     last_name: "Nguyễn",
  //     portrait_img:
  //       "https://www.vciambulances.com/wp-content/uploads/2017/12/no-avatar.png",
  //     date_of_birth: new Date("2002-01-24"),
  //     place_of_birth: "TP Bảo Lộc",
  //     gender: true,
  //     email: "duongnk@gmail.com",
  //     phone: "0393879086",
  //     student_type: "FORMAL",
  //     learning_status: "LEARNING",
  //     nationality: "Vietnam",
  //     permanent_address: {
  //       address: "49, Trị Yên",
  //       district: "Bảo Lộc",
  //       city_or_province: "Đà Lạt",
  //     },
  //     school_year: { from: 2020, to: 2024, year_end_training: 2028 },
  //     education_program: "20110ST",
  //     class: "20110ST6",
  //     current_address: "TP Hồ Chí Minh",
  //   });

  try {
    await newRoom1.save();
    await newRoom2.save();
    await newRoom3.save();
    //await newStudent2.save();
  } catch (err) {
    console.log("create Room ----------- ", err);
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Success!" });
};

// const getStudentsPaginated = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 15;
//     const searchQuery = req.query.search || null;

//     if (page < 1 || limit < 1) {
//       return res.status(400).json({ message: "Invalid page or limit value" });
//     }

//     let query = {};

//     if (searchQuery) {
//       query = { first_name: { $regex: searchQuery, $options: "i" } };
//     }

//     const skip = (page - 1) * limit;

//     const students = await Student.aggregate([
//       {
//         $match: query,
//       },
//       {
//         $sort: { student_id: 1, first_name: 1 },
//       },
//       {
//         $skip: skip,
//       },
//       {
//         $limit: limit,
//       },
//     ]);

//     const totalStudents = await Student.countDocuments(query);

//     res.json({
//       students: students,
//       currentPage: page,
//       totalPages: Math.ceil(totalStudents / limit),
//       totalStudents: totalStudents,
//     });
//   } catch (err) {
//     console.error("get students----------- ", err);
//     const error = new HttpError(
//       "An error occured, please try again later!",
//       500
//     );
//     return next(error);
//   }
// };

module.exports = { createBuilding, createRoom };
