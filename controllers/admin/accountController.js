const HttpError = require("../../models/application/httpError");
const Account = require("../../models/schemas/account");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const removeVietnameseTones = require("../../utils/removeVietnameseTones");
const { getValidFields } = require("../../utils/validators");
const { transformObjectFields } = require("../../utils/objectFunctions");
const sendMail = require("../../utils/email");

const createAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Dữ liệu nhập không hợp lệ!", 422));
  }
  const { fullname, username, password, email, role } = req.body;
  const image = req.file;

  try {
    const existingUser = await Account.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
      const error = new HttpError("Tên đăng nhập hoặc email đã tồn tại!", 422);
      return next(error);
    }

    const newAccount = new Account({
      username: username,
      password: password,
      full_name: fullname,
      email: email,
      avatar: image ? image.path.replace("public\\uploads\\", "") : "",
      search_keywords: `${removeVietnameseTones(fullname)}`,
      role: role,
    });

    await newAccount.save();
    res.status(201).json({ account: newAccount });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Có lỗi trong quá trình tạo tài khoản, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const updateStudentFields = async (id, updateFields) => {
  try {
    // Sử dụng findOneAndUpdate để cập nhật nhiều trường
    const student = await Account.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { new: true }
    );

    if (!student) {
      throw new HttpError("Không tìm thấy user cần cập nhật!", 404);
    }

    return student;
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin người dùng: ", err);
    throw new HttpError(
      "Có lỗi khi cập nhật thông tin người dùng, vui lòng thử lại!",
      500
    );
  }
};

const updateAccount = async (req, res, next) => {
  const id = req.params.id;
  const updateFields = req.body; // Chứa các trường cần cập nhật
  const image = req.file;

  if (image) updateFields.avatar = image.path.replace("public\\uploads\\", "");

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
  const validUpdateFields = getValidFields(updateFields, []);

  if (Object.keys(validUpdateFields).length === 0) {
    const error = new HttpError("Dữ liệu nhập không hợp lệ!", 422);
    return next(error);
  }
  const transformedFields = transformObjectFields(validUpdateFields);

  try {
    const student = await updateStudentFields(id, transformedFields);
    res.json({ account: student });
  } catch (err) {
    console.log("update student: ", err);
    const error = new HttpError("Có lỗi xảy ra khi cập nhật!", 500);
    return next(error);
  }
};

const generateRandomPassword = (length = 8) => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
};

const resetAccountPassword = async (req, res, next) => {
  const id = req.params.id;

  try {
    // Tìm tài khoản theo ID
    const account = await Account.findById(id).select("+password");
    if (!account) {
      const error = new HttpError("Không tìm thấy tài khoản!", 404);
      return next(error);
    }

    const newPassword = generateRandomPassword(8);

    account.password = newPassword;

    // Lưu tài khoản với mật khẩu mới
    await account.save();

    // Gửi email thông báo mật khẩu mới
    const email = account.email;

    await sendMail({
      mailto: email,
      subject: "Cấp lại mật khẩu",
      emailMessage: `Mật khẩu của bạn đã được đặt lại. Mật khẩu mới là: ${newPassword}`,
    });

    res.json({ message: "Đặt lại thành công!" });
  } catch (err) {
    console.log("reset pass: ", err);
    const error = new HttpError("Có lỗi xảy ra khi cập nhật!", 500);
    return next(error);
  }
};

const getAccountsPaginated = async (req, res, next) => {
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
      query = {
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { search_keywords: searchRegex },
          { full_name: searchRegex },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const accounts = await Account.aggregate([
      {
        $match: query,
      },
      {
        $sort: { username: 1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const totalAccounts = await Account.countDocuments(query);

    res.json({
      accounts: accounts,
      current_page: page,
      total_pages: Math.ceil(totalAccounts / limit),
      total_accounts: totalAccounts,
    });
  } catch (err) {
    console.error("get accounts----------- ", err);
    const error = new HttpError(
      "Có lỗi xảy ra khi lấy dữ liệu tài khoản, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const banAccount = async (req, res, next) => {
  const userIdToBan = req.params.id;

  try {
    // Cập nhật trạng thái cấm và lưu lại
    const userToBan = await Account.findByIdAndUpdate(
      userIdToBan,
      { banned: true },
      { new: true }
    );

    if (!userToBan) {
      const error = new HttpError("Không tìm thấy người dùng để cấm!", 404);
      return next(error);
    }

    res.json({ message: "Người dùng đã được cấm thành công!" });
  } catch (err) {
    console.error("Lỗi khi cấm người dùng:", err);
    const error = new HttpError(
      "Đã xảy ra lỗi trong quá trình cấm tài khoản!",
      500
    );
    return next(error);
  }
};

const unbanAccount = async (req, res, next) => {
  const userIdToUnban = req.params.id;

  try {
    // Cập nhật trạng thái cấm và lưu lại
    const userToUnban = await Account.findByIdAndUpdate(
      userIdToUnban,
      { banned: false },
      { new: true }
    );

    if (!userToUnban) {
      const error = new HttpError("Không tìm thấy người dùng để bỏ cấm!", 404);
      return next(error);
    }

    res.json({ message: "Người dùng đã được bỏ cấm thành công!" });
  } catch (err) {
    console.error("Lỗi khi bỏ cấm người dùng:", err);
    const error = new HttpError(
      "Đã xảy ra lỗi trong quá trình bỏ cấm tài khoản!",
      500
    );
    return next(error);
  }
};

module.exports = {
  getAccountsPaginated,
  createAccount,
  updateAccount,
  banAccount,
  unbanAccount,
  resetAccountPassword,
};
