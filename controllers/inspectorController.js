const HttpError = require("../models/application/httpError");
const Inspector = require("../models/schemas/inspector");
const { validationResult } = require("express-validator");

const createInspector = async (req, res, next) => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     return next(new HttpError("Invalid input!", 422));
  //   }
  //   const { otp, otpToken, email, fullname, username, password } = req.body;

  const newInspector1 = new Inspector({
    inspector_id: "INSP00001",
    citizen_identification_number: "046575518025",
    first_name: "Trung",
    middle_name: "Hữu",
    last_name: "Nguyễn",
    portrait_img:
      "https://www.vciambulances.com/wp-content/uploads/2017/12/no-avatar.png",
    date_of_birth: new Date("1989-04-11"),
    place_of_birth: "TP Hồ Chí Minh",
    gender: true,
    email: "trungnh@gmail.com",
    phone: "0353045356",
    working_status: "WORKING",
    nationality: "Vietnam",
    permanent_address: {
      address: "55, Trần Hưng Đạo, Xã Phước Long",
      district: "Gò Vấp",
      city_or_province: "TP Hồ Chí Minh",
    },
    current_address: "TP Hồ Chí Minh",
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
    await newInspector1.save();
    //await newStudent2.save();
  } catch (err) {
    console.log("create inspector ----------- ", err);
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Đăng ký thành công!" });
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

module.exports = { createInspector };
