const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // e.g. "Computer Science"
    },
    faculty: {
      type: String,
      required: true,
      trim: true, // e.g. "Faculty of Science"
    },
    levels: {
      type: [Number], // e.g. [100, 200, 300, 400]
      default: [100, 200, 300, 400],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
