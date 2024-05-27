const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const examScheduleSchema = new Schema(
  {
    room: { type: Types.ObjectId, ref: "Room", required: true },
    inspectors: [{ type: Types.ObjectId, ref: "Inspector" }],
    students: [
      {
        student: { type: Types.ObjectId, ref: "Student" },
        attendance: { type: Boolean, default: false },
      },
    ],
    subject: { type: Types.ObjectId, required: true, ref: "Subject" },
    term: { type: Number, required: true },
    year: {
      from: { type: Number, required: true },
      to: { type: Number, required: true },
    },
    start_time: { type: Date, required: true },
    exam_type: {
      type: String,
      required: true,
      enum: ["PRACTICE", "THEORY"],
      default: "THEORY",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
examScheduleSchema.plugin(uniqueValidator);

const ExamSchedule = mongoose.model("Exam_shedule", examScheduleSchema);

module.exports = ExamSchedule;
