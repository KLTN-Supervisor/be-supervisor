const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcryptjs");
const HttpError = require("../application/httpError");

const { Schema, Types } = mongoose;

const userInfoSchema = new Schema(
  {
    bio: { type: String, default: "", maxLength: 150 },
    date_of_birth: { type: Date },
    gender: { type: Boolean },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, minLength: 10, maxLength: 12 },
    job: { type: String },
    workplace: { type: String },
    high_school: { type: String },
    college: { type: String },
    current_city: { type: String },
    hometown: { type: String },
  },
  { _id: false }
);

const userSettingSchema = new Schema(
  {
    notification_setting: { type: String },
    privacy_setting: { type: String },
    theme: { type: String },
  },
  { _id: false }
);

const accountSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: 5,
      maxLength: 15,
    },
    password: { type: String, required: true, minLength: 4, select: false },
    full_name: { type: String, required: true },
    search_keyword: { type: String, required: true, default: "" },
    profile_picture: { type: String, trim: true, default: "" },
    online: { type: Boolean },
    last_online: { type: Date, default: new Date() },
    banned: { type: Boolean, required: true, default: false },
    admin: { type: Boolean, required: true, default: false },
    reset_token: { type: String },
    deleted_by: {
      user: { type: Types.ObjectId, ref: "User" },
      user_role: { type: String, enum: ["USER", "ADMIN"] },
    },
  },
  {
    toJSON: { virtuals: true }, // So `res.json()` and other `JSON.stringify()` functions include virtuals
    //toObject: { virtuals: true }, // So `console.log()` and other functions that use `toObject()` include virtuals
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

//Plugins, methods, middlewares, statics, query helpers
accountSchema.plugin(uniqueValidator);

accountSchema.methods.comparePassword = async function (
  candidatePassword,
  next
) {
  try {
    const isValidPassword = await bcrypt.compare(
      candidatePassword,
      this.password
    );
    return isValidPassword;
  } catch (err) {
    return next(err);
  }
};

accountSchema.pre(
  "save",
  { document: true, query: false },
  async function (next) {
    if (!this.isNew) {
      if (!this.isModified("password")) return next();
    }

    try {
      console.log("Có hash pass");
      const saltRounds = 10;
      const hashedPass = await bcrypt.hash(this.password, saltRounds);
      this.password = hashedPass;
      next();
    } catch (err) {
      const error = new HttpError("An error occured, please try again!", 500);
      return next(error);
    }
  }
);

module.exports = mongoose.model("Account", accountSchema);
