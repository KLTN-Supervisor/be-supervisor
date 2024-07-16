const HttpError = require("../../models/application/httpError");
const Inspector = require("../../models/schemas/inspector");
const { validationResult } = require("express-validator");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");
const StreamZip = require("node-stream-zip");
const unrar = require("node-unrar-js");
const { transformObjectFields } = require("../../utils/objectFunctions");
const { getValidFields } = require("../../utils/validators");
const removeVietnameseTones = require("../../utils/removeVietnameseTones");

const importInpectors = async (req, res, next) => {
  try {
    const csvdata = await csv({
      colParser: {
        date_of_birth: function (item, head, resultRow, row, colIdx) {
          const parts = item.split("/");
          return new Date(parts[2], parts[1] - 1, parts[0]);
        },
        gender: function (item, head, resultRow, row, colIdx) {
          if (item.toLowerCase() === "nữ" || item.toLowerCase() === "female")
            return false;
          else return true;
        },
      },
    }).fromFile(req.file.path);

    //console.log("data: ", csvdata);

    if (csvdata.length > 0) {
      csvdata.forEach((inspector) => {
        const fullName = `${inspector.last_name} ${inspector.middle_name} ${inspector.first_name}`;
        inspector.search_keywords = `${fullName} ${removeVietnameseTones(
          fullName
        )}`;
      });
      // Tạo một danh sách các student_id từ dữ liệu CSV
      const inspectorIds = csvdata.map((inspector) => inspector.inspector_id);

      // Tìm các student_id trùng lặp
      const duplicateInspectorIds = await Inspector.find({
        inspector_id: { $in: inspectorIds },
      }).distinct("inspector_id");

      // Tạo danh sách các bản ghi cần cập nhật
      const inspectorsToUpdate = csvdata.filter((inspector) =>
        duplicateInspectorIds.includes(inspector.inspector_id)
      );

      // Thực hiện cập nhật dữ liệu
      if (inspectorsToUpdate.length > 0) {
        // Tạo danh sách các phép cập nhật
        const updateOperations = inspectorsToUpdate.map((inspector) => ({
          updateOne: {
            filter: { inspector_id: inspector.inspector_id },
            update: {
              $set: inspector,
            },
          },
        }));

        // Thực hiện các phép cập nhật
        if (updateOperations.length > 0) {
          await Inspector.bulkWrite(updateOperations);
        }
      }

      // Tiến hành insert các bản ghi mới (các bản ghi không trùng lặp)
      const newInspectors = csvdata.filter(
        (inspector) => !duplicateInspectorIds.includes(inspector.inspector_id)
      );

      if (newInspectors.length > 0) {
        await Inspector.insertMany(newInspectors);
      }
    }

    res.json({ message: "Import success!" });
  } catch (err) {
    console.error("admin import students----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const handleUncompressFile = async (req, res, next) => {
  try {
    // Kiểm tra xem có file được upload hay không
    if (!req.file) {
      const error = new HttpError("No file uploaded!", 400);
      return next(error);
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(filePath);
    const targetPath = path.join("public", "uploads", "students-images");

    if (fileExtension === ".zip") {
      await extractZipArchive(filePath, targetPath);
    } else if (fileExtension === ".rar") {
      await extractRarArchive(filePath, targetPath);
    } else {
      const error = new HttpError(
        "Unsupported file format. Please upload a .zip or .rar file!",
        400
      );
      return next(error);
    }

    res.json({ message: "Uncompress success!" });
  } catch (err) {
    console.error("admin import students images----------- ", err);
    const error = new HttpError(err.message, 500);
    return next(error);
  }
};

const extractZipArchive = async (filePath, destination) => {
  try {
    const zip = new StreamZip.async({ file: filePath });

    const entries = await zip.entries();
    const folderInsideZipPath = Object.values(entries)[0].name.split("/");

    await zip.extract(
      folderInsideZipPath.length >= 2 ? folderInsideZipPath[0] : null,
      destination
    );
    await zip.close();
  } catch (err) {
    throw err;
  }
};

const extractRarArchive = async (filePath, destination) => {
  try {
    // Create the extractor with the file information (returns a promise)
    const extractor = await unrar.createExtractorFromFile({
      filepath: filePath,
      targetPath: destination,
      filenameTransform: (filename) => {
        const fileNameArray = filename.split("/");
        return fileNameArray[fileNameArray.length - 1];
      },
    });

    // Extract the files
    [
      ...extractor.extract({
        files: (fileHeader) => fileHeader.flags.directory === false,
      }).files,
    ];
  } catch (err) {
    throw err;
  }
};

const getInspectorsPaginated = async (req, res, next) => {
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
      const searchQueryNoAccents = removeVietnameseTones(searchQuery);
      const searchRegexNoAccents = new RegExp(searchQueryNoAccents, "i");
      query = {
        $or: [
          { inspector_id: searchRegex },
          { first_name: searchRegex },
          { middle_name: searchRegex },
          { last_name: searchRegex },
          { search_keywords: searchRegex },
          { search_keywords: searchRegexNoAccents },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const inspectors = await Inspector.aggregate([
      { $match: query },
      { $sort: { inspector_id: 1, first_name: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalInspectors = await Inspector.countDocuments(query);

    res.json({
      inspectors: inspectors,
      current_page: page,
      total_pages: Math.ceil(totalInspectors / limit),
      total_inspectors: totalInspectors,
    });
  } catch (err) {
    console.error("get inspectors----------- ", err);
    const error = new HttpError(
      "Có lỗi khi lấy thông tin thanh tra, vui lòng thử lại!",
      500
    );
    return next(error);
  }
};

const updateInspectorFields = async (currentInspector, updateFields) => {
  try {
    // Sử dụng findOneAndUpdate để cập nhật nhiều trường
    const inspector = await Inspector.findOneAndUpdate(
      { _id: currentInspector._id },
      { $set: updateFields },
      { new: true }
    );

    if (!inspector) {
      throw new HttpError("Không tìm thấy thanh tra cần cập nhật!", 404);
    }

    // Xóa file ảnh cũ nếu có và cập nhật thành công
    if (
      currentInspector &&
      currentInspector.portrait_img &&
      currentInspector.portrait_img
    ) {
      const oldImagePath = path.join(
        __dirname,
        "public",
        "uploads",
        currentInspector.portrait_img
      );

      fs.access(oldImagePath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error("Không thể xóa ảnh cũ:", err);
            } else {
              console.log("Đã xóa ảnh cũ:", oldImagePath);
            }
          });
        } else {
          console.log("File ảnh cũ không tồn tại:", oldImagePath);
        }
      });
    }

    return inspector;
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin thanh tra: ", err);
    throw new HttpError(
      "Có lỗi khi cập nhật thông tin thanh tra, vui lòng thử lại!",
      500
    );
  }
};

const createInspector = async (req, res, next) => {
  try {
    const formData = req.body;
    const image = req.file;

    // Combine first_name, middle_name, last_name into full_name
    const fullName = `${formData.last_name} ${formData.middle_name} ${formData.first_name}`;

    const searchKeywords = `${fullName} ${removeVietnameseTones(fullName)}`;

    // Check for existing inspector_id, CID or email
    const existingInspector = await Inspector.findOne({
      $or: [
        { inspector_id: formData.inspector_id },
        {
          citizen_identification_number: formData.citizen_identification_number,
        },
        { email: formData.email },
      ],
    });

    if (existingInspector) {
      if (existingInspector.inspector_id === formData.inspector_id) {
        return next(new HttpError("Mã thanh tra đã tồn tại!", 409));
      }
      if (
        existingInspector.citizen_identification_number ===
        formData.citizen_identification_number
      ) {
        return next(new HttpError("Số CCCD/CMND đã tồn tại!", 409));
      }
      if (existingInspector.email === formData.email) {
        return next(new HttpError("Email đã tồn tại!", 409));
      }
    }

    // Tạo địa chỉ thường trú từ các trường city_or_province, district và address
    const permanent_address = {
      city_or_province: formData.city_or_province,
      district: formData.district,
      address: formData.address,
    };

    // Tạo đối tượng sinh viên mới
    const newInspector = new Inspector({
      inspector_id: formData.inspector_id,
      citizen_identification_number: formData.citizen_identification_number,
      portrait_img: image ? image.path.replace("public\\uploads\\", "") : "",
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      search_keywords: searchKeywords,
      date_of_birth: new Date(formData.date_of_birth),
      place_of_birth: formData.place_of_birth,
      gender: formData.gender,
      email: formData.email.trim(),
      nationality: formData.nationality,
      permanent_address: permanent_address,
      current_address: formData.current_address,
    });

    // Lưu đối tượng sinh viên mới vào cơ sở dữ liệu
    await newInspector.save();

    res.status(201).json({ inspector: newInspector });
  } catch (err) {
    console.log("Lỗi tạo mới thanh tra: ", err);
    const error = new HttpError(
      "Có lỗi xảy ra khi tạo mới, vui lòng thử lại sau!",
      500
    );
    return next(error);
  }
};

const updateInspector = async (req, res, next) => {
  const id = req.params.id;
  const updateFields = req.body; // Chứa các trường cần cập nhật
  const image = req.file;

  // Combine first_name, middle_name, last_name into full_name
  const fullName = `${updateFields.last_name} ${updateFields.middle_name} ${updateFields.first_name}`;

  const searchKeywords = `${fullName} ${removeVietnameseTones(fullName)}`;

  // Gộp các trường thành permanent_address
  const permanent_address = {
    city_or_province: updateFields.city_or_province,
    district: updateFields.district,
    address: updateFields.address,
  };

  // Xóa các trường không cần thiết
  delete updateFields.city_or_province;
  delete updateFields.district;
  delete updateFields.address;

  const fieldsToUpdate = {
    ...updateFields,
    permanent_address,
    search_keywords: searchKeywords,
  };

  if (image)
    fieldsToUpdate.portrait_img = image.path.replace("public\\uploads\\", "");

  // Lấy thông tin sinh viên hiện tại để kiểm tra và xóa file ảnh cũ
  let currentInspector;
  try {
    currentInspector = await Inspector.findById(id);
    if (!currentInspector) {
      const error = new HttpError(
        "Không tìm thấy thanh tra cần cập nhật!",
        404
      );
      return next(error);
    }
  } catch (err) {
    const error = new HttpError("Lỗi khi tìm thanh tra!", 500);
    return next(error);
  }

  // Check for existing inspector_id, CID or email
  const existingInspector = await Inspector.findOne({
    $or: [
      { inspector_id: updateFields.inspector_id },
      {
        citizen_identification_number:
          updateFields.citizen_identification_number,
      },
      { email: updateFields.email },
    ],
    _id: { $ne: id }, // Exclude the current inspector from the check
  });

  if (existingInspector) {
    if (existingInspector.inspector_id === updateFields.inspector_id) {
      return next(new HttpError("Mã thanh tra đã tồn tại!", 409));
    }
    if (
      existingInspector.citizen_identification_number ===
      updateFields.citizen_identification_number
    ) {
      return next(new HttpError("Số căn cước công dân đã tồn tại!", 409));
    }
    if (existingInspector.email === updateFields.email) {
      return next(new HttpError("Email đã tồn tại!", 409));
    }
  }

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
  // Lọc và chỉ giữ lại các trường hợp lệ
  const validUpdateFields = getValidFields(fieldsToUpdate, []);

  if (Object.keys(validUpdateFields).length === 0) {
    const error = new HttpError("Invalid input!", 422);
    return next(error);
  }
  const transformedFields = transformObjectFields(validUpdateFields);

  try {
    const inspector = await updateInspectorFields(
      currentInspector,
      transformedFields
    );
    res.json({ inspector: inspector });
  } catch (err) {
    console.log("update inspector: ", err);
    const error = new HttpError("Có lỗi xảy ra khi cập nhật!", 500);
    return next(error);
  }
};

module.exports = {
  importInpectors,
  getInspectorsPaginated,
  handleUncompressFile,
  updateInspector,
  createInspector,
};
