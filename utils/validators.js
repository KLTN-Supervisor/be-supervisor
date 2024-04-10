const { check } = require("express-validator");

exports.validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^[a-z0-9.-]+@[a-z.]+\.[a-z]{2,4}$/);
};

exports.validateLength = (text, min, max) => {
  if (text.length > max || text.length < min) {
    return false;
  }
  return true;
};

const getValidFields = (updateFields, validFields) => {
  const validUpdateFields = {};

  // Kiểm tra và lọc các trường hợp lệ
  for (const key in updateFields) {
    if (validFields.includes(key)) {
      validUpdateFields[key] = updateFields[key];
    } else if (typeof updateFields[key] === "object") {
      // Nếu là một đối tượng, kiểm tra và lọc các trường con
      const validSubFields = getValidFields(updateFields[key], validFields);
      if (Object.keys(validSubFields).length > 0) {
        validUpdateFields[key] = validSubFields;
      }
    }
  }

  return validUpdateFields;
};

let validatePagination = () => {
  return [
    check("page")
      .isInt({ min: 1 })
      .withMessage("Page phải là số nguyên dương >= 1"),
    check("limit")
      .isInt({ min: 1 })
      .withMessage("Limit phải là số nguyên dương >= 1"),
  ];
};

module.exports = { validatePagination, getValidFields };
