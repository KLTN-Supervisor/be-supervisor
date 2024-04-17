const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const studentSchema = new Schema(
  {
    student_id: {
      type: String,
      required: true,
      trim: true,
      minLength: 8,
      maxLength: 12,
      unique: true,
    },
    citizen_identification_number: {
      type: String,
      required: true,
      trim: true,
      minLength: 9,
      maxLength: 12,
      unique: true,
    },
    portrait_img: { type: String, required: true },
    first_name: { type: String, required: true, minLength: 1, maxLength: 8 },
    middle_name: { type: String, required: true, minLength: 2 },
    last_name: { type: String, required: true, minLength: 3, maxLength: 12 },
    date_of_birth: { type: Date, required: true },
    place_of_birth: { type: String, required: true },
    gender: { type: Boolean },
    email: { type: String, required: true, trim: true, unique: true },
    phone: { type: String, minLength: 10, maxLength: 12 },
    high_school: { type: String },
    student_type: { type: String, enum: ["FORMAL"], required: true },
    learning_status: {
      type: String,
      enum: ["LEARNING", "STOPPED", "PAUSE", "GRADUATED"],
      required: true,
    },
    college: { type: String },
    nationality: { type: String, required: true },
    permanent_address: {
      address: { type: String, required: true },
      city_or_province: { type: String, required: true },
      district: { type: String, required: true },
    },
    school_year: {
      from: { type: Number },
      to: { type: Number },
      year_end_training: { type: Number },
    },
    education_program: { type: String, required: true, minLength: 6 },
    class: { type: String, required: true, minLength: 6 },
    current_address: { type: String, required: true },
    hometown: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
studentSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Student", studentSchema);
