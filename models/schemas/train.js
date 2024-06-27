const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const trainSchema = new Schema(
  {
    label: [{ type: String, trim: true }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
trainSchema.plugin(uniqueValidator);

const Train = mongoose.model("Train", trainSchema);

module.exports = Train;
