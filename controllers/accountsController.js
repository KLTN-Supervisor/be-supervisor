const HttpError = require("../models/application/httpError");
const Account = require("../models/schemas/account");
const { validationResult } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");
const sendMail = require("../utils/email");
const removeVietnameseTones = require("../utils/removeVietnameseTones");
const generateOTP = require("../utils/otp-generator");

const getOtpSignUp = async (req, res, next) => {
  const username = req.params.username;
  const email = req.params.email;

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ "user_info.email": email }, { username: username }],
    });
  } catch (err) {
    console.log("db: ", err);
    const error = new HttpError(
      "An error has occured, please try again later!",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("Username or Email exists!", 422);
    return next(error);
  }

  const OTP = generateOTP(6);
  let otpToken;

  try {
    otpToken = tokenHandler.generateOtpToken(username, OTP);
    const message = `Mã OTP để xác thực email đăng ký người dùng là: ${OTP}`;
    const subject = `Hoàn tất xác thực đăng ký người dùng`;
    await sendMail({ mailto: email, subject: subject, emailMessage: message });
  } catch (err) {
    console.log("Mail: ", err);
    const error = new HttpError(
      "An error has occured, please try again later!",
      500
    );
    return next(error);
  }

  res.status(200).json({ otpToken: otpToken });
};

// body:{
//     "email":"",
//     "fullname":"",
//     "username":"",
//     "password":""
// }
const signUp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid input!", 422));
  }
  const { otp, otpToken, email, fullname, username, password } = req.body;

  const decodedToken = tokenHandler.verifyOtpToken(otpToken);
  if (!decodedToken) {
    const error = new HttpError("Có lỗi khi xác thực!", 403);
    return next(error);
  }

  if (
    decodedToken.otp.toString() !== otp.trim() ||
    decodedToken.username.trim() !== username.trim()
  ) {
    const error = new HttpError("Xác thực không thành công!", 403);
    return next(error);
  }

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ "user_info.email": email }, { username: username }],
    });
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("Tên người dùng hoặc email đã tồn tại!", 422);
    return next(error);
  }

  const newUser = new User({
    username: username,
    password: password,
    full_name: fullname,
    user_info: {
      email: email,
    },
    search_keyword: `${removeVietnameseTones(fullname)}`,
  });

  try {
    await newUser.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.status(201).json({ message: "Đăng ký thành công!" });
};

const login = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const existingUser = await Account.findOne({
      username: username,
    }).select("+password");

    if (!existingUser) {
      const error = new HttpError(
        "Tên tài khoản hoặc mật khẩu không đúng!",
        401
      );
      return next(error);
    }

    if (existingUser.banned) {
      const error = new HttpError("Tài khoản bị khóa, hãy liên hệ admin!", 403);
      return next(error);
    }

    const isValidPassword = await existingUser.comparePassword(password);

    if (!isValidPassword) {
      const error = new HttpError(
        "Tên tài khoản hoặc mật khẩu không đúng!",
        401
      );
      return next(error);
    }

    const accessToken = tokenHandler.generateToken(
      existingUser,
      "access",
      "8h"
    );

    req.session.access_token = accessToken;

    req.session.save(function (err) {
      if (err) next(err);
      res.json({ message: "Đăng nhập thành công!" });
    });

    console.log("session: ", req.session);
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Có lỗi trong quá trình đăng nhập, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    const error = new HttpError("Chưa xác thực!", 401);
    return next(error);
  }

  const refreshToken = cookies.jwt;
  const decodedToken = tokenHandler.verifyRefreshToken(refreshToken);
  if (!decodedToken) {
    const error = new HttpError("Có lỗi khi xác thực!", 403);
    return next(error);
  }

  try {
    const existingUser = await Account.findById(decodedToken.id).select(
      "+password"
    );

    if (!existingUser) {
      const error = new HttpError("Không thể xác thực!", 401);
      return next(error);
    }

    if (existingUser.banned) {
      const error = new HttpError("Tài khoản đã bị khóa!", 403);
      return next(error);
    }

    const accessToken = tokenHandler.generateToken(
      existingUser,
      "access",
      "7h"
    );
    res.json({ accessToken: accessToken });
  } catch (err) {
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }
};

const logout = (req, res) => {
  if (req?.session?.id)
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("ISSsession", {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "Lax" : "None",
        secure: process.env.NODE_ENV === "production",
      });
      res.sendStatus(204);
    });
  else {
    res.status(204).json({ message: "Không có phiên!" });
  }
};

const sendResetVerification = async (req, res, next) => {
  const { usernameOrEmail } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { "user_info.email": usernameOrEmail },
      ],
      admin: false,
    });
  } catch (err) {
    console.log("1-----------: ", err);
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Tên tài khoản hoặc email không tồn tại!", 404);
    return next(error);
  }

  let resetToken;
  try {
    resetToken = tokenHandler.generateResetToken(existingUser._id);
    existingUser.reset_token = resetToken;
    await existingUser.save();
  } catch (err) {
    console.log("2------------: ", err);
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }

  const resetUrl = `${req.get("origin")}/accounts/reset-password/${resetToken}`;
  const email = existingUser.user_info.email;

  const message = `Nhấn vào đường dẫn dưới đây để có thể đặt lại mật khẩu:\n\n${resetUrl}\n\nVui lòng không được chia sẻ đường dẫn này cho bất kì ai!`;
  const subject = `Yêu cầu đặt lại mật khẩu của người dùng ${existingUser.full_name}`;
  try {
    await sendMail({ mailto: email, subject: subject, emailMessage: message });
  } catch (err) {
    console.log("Mail: ", err);
    const error = new HttpError("Có lỗi xảy ra, vui lòng thử lại sau!", 500);
    return next(error);
  }

  res.json({
    message: "Đã gửi đường dẫn đặt lại mật khẩu đến email của người dùng!",
  });
};

const verifyResetLink = async (req, res, next) => {
  const token = req.params.token;

  const decodedToken = tokenHandler.verifyResetToken(token);
  if (!decodedToken) {
    const error = new HttpError("Đường dẫn hết hạn!", 403);
    return next(error);
  }

  const id = decodedToken.id;

  let existingUser;
  try {
    existingUser = await User.findOne({ _id: id, admin: false });
  } catch (err) {
    const error = new HttpError("Có lỗi trong quá trình xác thực!", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Đường dẫn không hợp lệ!", 403);
    return next(error);
  }

  if (existingUser.reset_token.trim() !== token) {
    const error = new HttpError("Đường dẫn không hợp lệ!", 403);
    return next(error);
  }

  res.json({ message: "Đường dẫn đặt lại mật khẩu hợp lệ!" });
};

const resetPassword = async (req, res, next) => {
  const { resetToken, password } = req.body;

  const decodedToken = tokenHandler.verifyResetToken(resetToken);
  if (!decodedToken) {
    const error = new HttpError("Có lỗi xác thực!", 403);
    return next(error);
  }

  const id = decodedToken.id;

  let existingUser;
  try {
    existingUser = await User.findOne({ _id: id, admin: false });
  } catch (err) {
    const error = new HttpError("Có lỗi trong quá trình xác thực!", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Người dùng không tồn tại!", 401);
    return next(error);
  }

  if (existingUser.reset_token.trim() !== resetToken) {
    const error = new HttpError("Đặt lại mật khẩu thất bại!", 403);
    return next(error);
  }

  try {
    existingUser.password = password;
    existingUser.reset_token = "";
    await existingUser.save();
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đặt lại mật khẩu, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }

  res.json({ message: "Đặt lại mật khẩu thành công!" });
};

const getLoginAccountInformation = async (req, res, next) => {
  const userId = req.userData.id;

  try {
    const user = await Account.findOne(
      { _id: userId, banned: false },
      {
        username: 1,
        avatar: 1,
        full_name: 1,
        role: 1,
      }
    );

    if (!user) {
      const error = new HttpError("Tài khoản không tồn tại!", 404);
      return next(error);
    }

    res.json({ user: user });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Có lỗi xảy ra khi lấy thông tin tài khoản!",
      500
    );
    return next(error);
  }
};

exports.getOtpSignUp = getOtpSignUp;
exports.signUp = signUp;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.sendResetVerification = sendResetVerification;
exports.verifyResetLink = verifyResetLink;
exports.resetPassword = resetPassword;
exports.getLoginAccountInformation = getLoginAccountInformation;
