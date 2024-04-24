const HttpError = require("../../models/application/httpError");
const Account = require("../../models/schemas/account");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");

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

module.exports = { getAccountsPaginated };
