const transformObjectFields = (fields, prefix = "") => {
  const transformedFields = {};

  for (const key in fields) {
    const fieldKey = prefix ? `${prefix}.${key}` : key;
    const fieldValue = fields[key];

    if (typeof fieldValue === "object") {
      // Nếu là một đối tượng, tiếp tục đệ quy để biến đổi các trường con
      const transformedSubFields = transformObjectFields(fieldValue, fieldKey);
      Object.assign(transformedFields, transformedSubFields);
    } else {
      // Nếu không phải đối tượng, thêm trường vào danh sách đã biến đổi
      transformedFields[fieldKey] = fieldValue;
    }
  }

  return transformedFields;
};

module.exports = { transformObjectFields };
