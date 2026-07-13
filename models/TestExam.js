const mongoose = require("mongoose");

const testExamSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Test", "Exam"],
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // "HH:mm"
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    semester: {
      type: String,
      enum: ["First", "Second"],
      required: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

testExamSchema.index({ department: 1, level: 1, semester: 1, date: 1 });

module.exports = mongoose.model("TestExam", testExamSchema);
