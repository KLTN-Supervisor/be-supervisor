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

  if (validFields.length === 0) {
    return updateFields;
  }

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

const createLengthValidator = (field, minLength, maxLength) => {
  return check(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(
      `${field} must be between ${minLength} and ${maxLength} characters`
    )
    .not()
    .isEmpty()
    .withMessage(`${field} is required`);
};

const createEnumValidator = (field, checkEnum) => {
  return check(field)
    .trim()
    .toUpperCase()
    .isIn(checkEnum)
    .withMessage(`${field} must be one of ${checkEnum}`);
};

const createSpecialCharValidator = (field) => {
  return check(field)
    .trim()
    .not()
    .isEmpty()
    .withMessage(`${field} is required`)
    .matches(/^[a-zA-ZÀ-ỹ\s]*$/)
    .withMessage(`${field} must not contain special characters`);
};

module.exports = {
  validatePagination,
  getValidFields,
  createLengthValidator,
  createEnumValidator,
  createSpecialCharValidator,
};
