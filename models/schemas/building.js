const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const buildingSchema = new Schema(
  {
    building_name: { type: String, required: true },
    location: { lat: { type: String }, long: { type: String } },
    construction_start_date: { type: Date, required: true },
    opening_date: { type: Date },
    status: { type: Boolean, required: true },
    number_of_floors: { type: Number, min: 1 },
    number_of_rooms: { type: Number, min: 1 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
buildingSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Building", buildingSchema);
