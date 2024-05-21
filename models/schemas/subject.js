const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const subjectSchema = new Schema(
  {
    subject_id: { type: String, required: true },
    subject_name: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
subjectSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Subject", subjectSchema);
