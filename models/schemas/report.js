const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const reportSchema = new Schema(
  {
    note: { type: String, required: true },
    images: [{ type: String, required: true }],
    time: { type: Types.ObjectId, ref: "Exam_shedule" },
    report_type: {
      type: String,
      enum: ["PROBLEM", "REPORT"],
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
reportSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Report", reportSchema);
