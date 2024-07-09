const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcryptjs");
const HttpError = require("../application/httpError");

const { Schema, Types } = mongoose;

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
    email: { type: String, required: true, unique: true, trim: true },
    search_keywords: { type: String, required: true, default: "" },
    avatar: { type: String, trim: true, default: "" },
    inspector: { type: Types.ObjectId, ref: "Inspector" },
    online: { type: Boolean },
    last_online: { type: Date, default: new Date() },
    banned: { type: Boolean, required: true, default: false },
    role: {
      type: String,
      enum: ["USER", "ADMIN", "ACADEMIC_AFFAIRS_OFFICE"],
      default: "USER",
    },
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

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
