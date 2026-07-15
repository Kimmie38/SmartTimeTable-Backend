const asyncHandler = require("express-async-handler");
const Timetable = require("../models/Timetable");
const History = require("../models/History");
const TestExam = require("../models/TestExam");
const User = require("../models/User");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Helper: get today's day name, or null if it's the weekend
const getTodayName = () => {
  const dayIndex = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const map = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
  };
  return map[dayIndex] || null;
};

// @desc    Dashboard - today's lectures for the logged-in student's
//          department/level/semester, in whatever status the admin has set
//          (Pending, Ongoing, Cancelled)
// @route   GET /api/student/dashboard
// @access  Private (student)
const getDashboard = asyncHandler(async (req, res) => {
  const { department, level, semester } = req.user;
  const today = getTodayName();

  if (!today) {
    return res.json({
      success: true,
      date: new Date(),
      day: "Weekend",
      classes: [],
      message: "No classes scheduled — it's the weekend",
    });
  }

  const classes = await Timetable.find({
    department: department._id,
    level,
    semester,
    day: today,
    status: { $ne: "Completed" }, // completed classes move to History, not the live dashboard
  }).sort({ startTime: 1 });

  res.json({
    success: true,
    date: new Date(),
    day: today,
    classes: classes.map((c) => ({
      id: c._id,
      courseCode: c.courseCode,
      courseTitle: c.courseTitle,
      lecturer: c.lecturer,
      venue: c.venue,
      startTime: c.startTime,
      endTime: c.endTime,
      status: c.status, // Ongoing / Pending / Cancelled
    })),
  });
});

// @desc    Full Monday-Friday timetable for the student's department/level/semester,
//          plus the current actual date (so the frontend can highlight "today")
// @route   GET /api/student/timetable
// @access  Private (student)
const getWeekTimetable = asyncHandler(async (req, res) => {
  const { department, level, semester } = req.user;

  const entries = await Timetable.find({
    department: department._id,
    level,
    semester,
  }).sort({ day: 1, startTime: 1 });

  // Group entries by day so the frontend can render Mon-Fri columns directly
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});

  entries.forEach((entry) => {
    grouped[entry.day].push({
      id: entry._id,
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle,
      lecturer: entry.lecturer,
      venue: entry.venue,
      startTime: entry.startTime,
      endTime: entry.endTime,
      status: entry.status,
    });
  });

  res.json({
    success: true,
    currentDate: new Date(), // frontend should recompute this client-side too, as the day rolls over
    today: getTodayName() || "Weekend",
    timetable: grouped,
  });
});

// @desc    History - classes already marked Complete by the admin
// @route   GET /api/student/history
// @access  Private (student)
const getHistory = asyncHandler(async (req, res) => {
  const { department, level, semester } = req.user;

  const history = await History.find({
    department: department._id,
    level,
    semester,
  }).sort({ date: -1 });

  res.json({
    success: true,
    count: history.length,
    history: history.map((h) => ({
      id: h._id,
      date: h.date,
      courseCode: h.courseCode,
      courseTitle: h.courseTitle,
      lecturer: h.lecturer,
      venue: h.venue,
      time: h.time,
      attachment: h.attachment.url ? h.attachment : null,
    })),
  });
});

// @desc    Upcoming tests and exams for the student's department/level/semester
// @route   GET /api/student/tests-exams
// @access  Private (student)
const getTestsExams = asyncHandler(async (req, res) => {
  const { department, level, semester } = req.user;

  const items = await TestExam.find({
    department: department._id,
    level,
    semester,
    date: { $gte: new Date() }, // only upcoming, not past ones
  }).sort({ date: 1 });

  res.json({
    success: true,
    count: items.length,
    items: items.map((i) => ({
      id: i._id,
      type: i.type,
      courseCode: i.courseCode,
      courseTitle: i.courseTitle,
      date: i.date,
      startTime: i.startTime,
      endTime: i.endTime,
      venue: i.venue,
      instructions: i.instructions,
    })),
  });
});

// @desc    Get the logged-in student's profile
// @route   GET /api/student/profile
// @access  Private (student)
const getProfile = asyncHandler(async (req, res) => {
  const student = req.user;

  res.json({
    success: true,
    data: {
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      matricNumber: student.matricNumber,
      department: student.department.name,
      level: student.level,
      semester: student.semester,
      isStudent: student.isStudent,
      isAdmin: student.isAdmin,
    },
  });
});

// @desc    Update the logged-in student's profile
//          (fullName, email, and fcmToken only — matric number, department,
//          level, and semester are not self-editable)
// @route   PUT /api/student/profile
// @access  Private (student)
const updateProfile = asyncHandler(async (req, res) => {
  const student = await User.findById(req.user._id);

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  student.fullName = req.body.fullName || student.fullName;
  student.email = req.body.email || student.email;

  if (req.body.fcmToken) {
    student.fcmToken = req.body.fcmToken;
  }

  if (req.body.password) {
    student.password = req.body.password; // will be hashed by the pre-save hook
  }

  const updated = await student.save();

  res.json({
    success: true,
    data: {
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      matricNumber: updated.matricNumber,
      level: updated.level,
      semester: updated.semester,
    },
  });
});

module.exports = {
  getDashboard,
  getWeekTimetable,
  getHistory,
  getTestsExams,
  getProfile,
  updateProfile,
};
