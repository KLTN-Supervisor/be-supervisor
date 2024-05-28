const HttpError = require("../../models/application/httpError");
const Account = require("../../models/schemas/account");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const removeVietnameseTones = require("../../utils/removeVietnameseTones");

const createAccount = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return next(new HttpError("Invalid input!", 422));
  }
  const { fullname, username, password, role } = req.body;
  const image = req.file;

  try {
    const existingUser = await Account.findOne({
      username: username,
    });

    if (existingUser) {
      const error = new HttpError("Username exists!", 422);
      return next(error);
    }

    const newAccount = new Account({
      username: username,
      password: password,
      full_name: fullname,
      avatar: image ? image.path.replace("public\\uploads\\", "") : "",
      search_keyword: `${removeVietnameseTones(fullname)}`,
      role: role,
    });

    await newAccount.save();
    res.status(201).json({ account: newAccount });
  } catch (err) {
    const error = new HttpError(
      "Có lỗi trong quá trình đăng ký, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const getAccountsPaginated = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const searchQuery = req.query.search || null;

    if (page < 1 || limit < 1) {
      const error = new HttpError("Invalid page or limit value!", 400);
      return next(error);
    }

    let query = {};

    if (searchQuery) {
      query = {
        username: { $regex: searchQuery, $options: "i" },
        search_keyword: { $regex: searchQuery, $options: "i" },
        full_name: { $regex: searchQuery, $options: "i" },
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
      "An error occured, please try again later!",
      500
    );
    return next(error);
  }
};

module.exports = { getAccountsPaginated, createAccount };
