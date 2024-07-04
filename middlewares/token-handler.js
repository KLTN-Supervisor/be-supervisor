const jwt = require("jsonwebtoken");
const HttpError = require("../models/application/httpError");
const Account = require("../models/schemas/account");
// const access_key = process.env.ACCESS_TOKEN_SECRET;
// const refresh_key = process.env.REFRESH_TOKEN_SECRET;
// const reset_key = process.env.REFRESH_TOKEN_SECRET;

const generateToken = (user, key = "access", expiredTime = "120") => {
  return jwt.sign(
    { id: user._id, pw: user.password, fn: user.full_name, role: user.role },
    key === "access"
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: expiredTime }
  );
};

const generateResetToken = (id) => {
  return jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "5m",
  });
};

const generateOtpToken = (username, otp) => {
  return jwt.sign(
    { username: username, otp: otp },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "2m",
    }
  );
};

const verifyOtpToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

const verifyAccessToken = async (req, res, next) => {
  //console.log("Session before check: ", req?.session?.id);

  if (!req.session?.access_token) {
    const error = new HttpError("Chưa xác thực!", 401);
    return next(error);
  }

  try {
    const token = req.session.access_token;

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await Account.findById(decodedToken.id).select("+password");

    const isValidPassword = decodedToken.pw.trim() === user.password.trim();

    if (!isValidPassword || user.banned) {
      req.session.destroy((err) => {
        if (err) {
          return next(new HttpError("Có lỗi xảy ra khi xác thực!", 500));
        }
        res.clearCookie("connect.sid", {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          secure: process.env.NODE_ENV === "production",
        });
        return next(new HttpError("Phiên hoạt động của bạn đã hết hạn!", 401));
      });
    } else {
      req.userData = decodedToken;
      next();
    }
  } catch (err) {
    console.log("1---access---------------------: ", err);
    const error = new HttpError("An error occurred!", 500);
    return next(error);
  }
};

const verifyAdminAccessToken = async (req, res, next) => {
  if (!req.session?.access_token) {
    const error = new HttpError("Chưa xác thực!", 401);
    return next(error);
  }

  try {
    const token = req.session.access_token;

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decodedToken.role === "USER") {
      const error = new HttpError("Không có quyền truy cập!", 403);
      return next(error);
    }

    const user = await Account.findById(decodedToken.id).select("+password");

    const isValidPassword = decodedToken.pw.trim() === user.password.trim();

    if (!isValidPassword || user.banned) {
      req.session.destroy((err) => {
        if (err) {
          return next(new HttpError("Có lỗi xảy ra khi xác thực!", 500));
        }
        res.clearCookie("ISSsession", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        return next(new HttpError("Phiên hoạt động của bạn đã hết hạn!", 401));
      });
    } else {
      req.userData = decodedToken;
      next();
    }
  } catch (err) {
    console.log("1---access---------------------: ", err);
    const error = new HttpError("Có lỗi khi xác thực!", 500);
    return next(error);
  }
};

const verifyRefreshToken = (refreshToken) => {
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    return decodedToken;
  } catch (err) {
    return null;
  }
};

exports.generateToken = generateToken;
exports.generateOtpToken = generateOtpToken;
exports.generateResetToken = generateResetToken;
exports.verifyResetToken = verifyResetToken;
exports.verifyOtpToken = verifyOtpToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.verifyAdminAccessToken = verifyAdminAccessToken;
