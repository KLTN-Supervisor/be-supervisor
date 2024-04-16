const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const { Schema, Types } = mongoose;

const roomSchema = new Schema(
  {
    room_name: { type: String, required: true },
    building: { type: Types.ObjectId, ref: "Building" },
    floor: { type: Number, required: true },
    status: { type: Boolean, required: true },
    max_seats: { type: Number, required: true },
    room_type: {
      type: String,
      enum: [
        "NORMAL",
        "COMPUTER_ROOM",
        "CHEMISTRY_PRACTICE_ROOM",
        "PHYSICS_PRACTICE_ROOM",
        "WORKSHOP_ROOM",
      ],
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

//Plugins, methods, middlewares, statics, query helpers
roomSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Room", roomSchema);
