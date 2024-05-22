const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const uploadFileSchema = new Schema(
  {
    file_name: { type: String, required: true },
    mimetype: { type: String },
    type: {
      type: String,
      required: true,
      enum: ["EXCEL", "ARCHIVE", "IMAGE", "UNDEFINED"],
      default: "UNDEFINED",
    },
    file_path: { type: String, required: true },
    has_used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
uploadFileSchema.plugin(uniqueValidator);

module.exports = mongoose.model("UploadFile", uploadFileSchema);
