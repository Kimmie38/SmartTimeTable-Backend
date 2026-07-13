const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    // Reference back to the original timetable entry this record came from
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now, // the actual date the class held, set by admin on completion
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
    lecturer: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String, // e.g. "10:00 - 12:00", kept as a simple display string
      required: true,
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
    attachment: {
      // PDF or image the admin uploads for that completed class (e.g. slides, handout)
      url: { type: String, default: null },
      fileType: { type: String, enum: ["pdf", "image", null], default: null },
      fileName: { type: String, default: null },
    },
  },
  { timestamps: true }
);

historySchema.index({ department: 1, level: 1, semester: 1, date: -1 });

module.exports = mongoose.model("History", historySchema);
