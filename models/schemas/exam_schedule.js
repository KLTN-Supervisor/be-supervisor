const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const examScheduleSchema = new Schema(
  {
    room: { type: Types.ObjectId, ref: "Room", required: true },
    inspectors: [{ type: Types.ObjectId, ref: "Inspector" }],
    subject: { type: String, required: true },
    term: { type: Number, required: true },
    start_time: { type: Date, required: true },
    exam_type: { type: String, required: true, enum: ["PRACTICE", "THEORY"] },
    students: [
      {
        student: { type: Types.ObjectId, ref: "Student" },
        attendance: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
examScheduleSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Exam_shedule", examScheduleSchema);
