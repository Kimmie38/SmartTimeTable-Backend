const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // e.g. CSC401
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true, // e.g. Software Engineering
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
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    startTime: {
      type: String, // stored as "HH:mm" 24hr format, e.g. "10:00"
      required: true,
    },
    endTime: {
      type: String, // "HH:mm"
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
    status: {
      // set by admin: pending until class starts, ongoing during class time,
      // or cancelled if admin cancels it for that day
      type: String,
      enum: ["Pending", "Ongoing", "Cancelled", "Completed"],
      default: "Pending",
    },
    eventType: {
      type: String,
      enum: ["Lecture", "Tutorial", "Lab", "Other"],
      default: "Lecture",
    },
  },
  { timestamps: true }
);

// Speeds up the most common student-side query:
// "give me this department + level + semester + day's classes"
timetableSchema.index({ department: 1, level: 1, semester: 1, day: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);
