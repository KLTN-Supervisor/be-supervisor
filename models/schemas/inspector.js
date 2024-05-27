const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const inspectorSchema = new Schema(
  {
    inspector_id: {
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
    portrait_img: { type: String, default: "" },
    first_name: { type: String, required: true, minLength: 1, maxLength: 8 },
    middle_name: { type: String, required: true, minLength: 2 },
    last_name: { type: String, required: true, minLength: 3, maxLength: 12 },
    date_of_birth: { type: Date, required: true },
    place_of_birth: { type: String, required: true },
    gender: { type: Boolean },
    email: { type: String, trim: true, unique: true },
    phone: { type: String, minLength: 10, maxLength: 12 },
    nationality: { type: String, required: true },
    permanent_address: {
      address: { type: String, required: true },
      city_or_province: { type: String, required: true },
      district: { type: String, required: true },
    },
    current_address: { type: String, required: true },
    hometown: { type: String },
    working_status: {
      type: String,
      enum: ["WORKING", "LEAVE_WORK", "BREAK_WORK", "SUSPENDED", "RETIREMENT"],
      default: "WORKING",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
inspectorSchema.plugin(uniqueValidator);

const Inspector = mongoose.model("Inspector", inspectorSchema);

module.exports = Inspector;
