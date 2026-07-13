const asyncHandler = require("express-async-handler");
const Department = require("../models/Department");
const Timetable = require("../models/Timetable");
const History = require("../models/History");
const TestExam = require("../models/TestExam");
const { getFileTypeLabel } = require("../middleware/upload");

/* ------------------------------ DEPARTMENTS ------------------------------ */

// @desc    Create a department (in practice you'll mostly just use the
//          auto-created "Computer Science" one, but this exists for when
//          more departments are added later)
// @route   POST /api/admin/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, faculty, levels } = req.body;

  if (!name || !faculty) {
    res.status(400);
    throw new Error("Department name and faculty are required");
  }

  const exists = await Department.findOne({ name });
  if (exists) {
    res.status(400);
    throw new Error("This department already exists");
  }

  const department = await Department.create({ name, faculty, levels });
  res.status(201).json({ success: true, data: department });
});

// @desc    List all departments
// @route   GET /api/admin/departments
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json({ success: true, data: departments });
});

/* ------------------------------ TIMETABLE ------------------------------ */

// @desc    Create a timetable entry. This is the single most important
//          write in the whole system — the moment this is saved, it shows
//          up on the matching students' dashboard and weekly timetable.
// @route   POST /api/admin/timetable
const createTimetableEntry = asyncHandler(async (req, res) => {
  const {
    courseCode,
    courseTitle,
    lecturer,
    venue,
    day,
    startTime,
    endTime,
    department, // Department _id
    level,
    semester,
    eventType,
  } = req.body;

  if (
    !courseCode ||
    !courseTitle ||
    !lecturer ||
    !venue ||
    !day ||
    !startTime ||
    !endTime ||
    !department ||
    !level ||
    !semester
  ) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const entry = await Timetable.create({
    courseCode,
    courseTitle,
    lecturer,
    venue,
    day,
    startTime,
    endTime,
    department,
    level,
    semester,
    eventType,
  });

  res.status(201).json({ success: true, data: entry });
});

// @desc    List all timetable entries (optionally filtered by department/level/semester)
// @route   GET /api/admin/timetable
const getAllTimetableEntries = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.semester) filter.semester = req.query.semester;
  if (req.query.day) filter.day = req.query.day;

  const entries = await Timetable.find(filter)
    .populate("department", "name")
    .sort({ day: 1, startTime: 1 });

  res.json({ success: true, count: entries.length, data: entries });
});

// @desc    Edit a timetable entry
// @route   PUT /api/admin/timetable/:id
const updateTimetableEntry = asyncHandler(async (req, res) => {
  const entry = await Timetable.findById(req.params.id);

  if (!entry) {
    res.status(404);
    throw new Error("Timetable entry not found");
  }

  const editableFields = [
    "courseCode",
    "courseTitle",
    "lecturer",
    "venue",
    "day",
    "startTime",
    "endTime",
    "department",
    "level",
    "semester",
    "eventType",
  ];

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) entry[field] = req.body[field];
  });

  const updated = await entry.save();
  res.json({ success: true, data: updated });
});

// @desc    Delete a timetable entry
// @route   DELETE /api/admin/timetable/:id
const deleteTimetableEntry = asyncHandler(async (req, res) => {
  const entry = await Timetable.findById(req.params.id);

  if (!entry) {
    res.status(404);
    throw new Error("Timetable entry not found");
  }

  await entry.deleteOne();
  res.json({ success: true, message: "Timetable entry deleted" });
});

// @desc    Quickly flip a class's live status — this is what makes the
//          student dashboard show "Ongoing" or "Cancelled" in real time.
// @route   PATCH /api/admin/timetable/:id/status
// @body    { "status": "Ongoing" | "Pending" | "Cancelled" }
const updateTimetableStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Pending", "Ongoing", "Cancelled"];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  const entry = await Timetable.findById(req.params.id);
  if (!entry) {
    res.status(404);
    throw new Error("Timetable entry not found");
  }

  entry.status = status;
  await entry.save();

  res.json({ success: true, data: entry });
});

// @desc    Mark a class complete. This is a two-step effect:
//          1) Creates a History record for TODAY with the exact details,
//             optionally with a PDF/image attachment.
//          2) Resets the timetable entry back to "Pending" so it's ready
//             for its next weekly occurrence, rather than staying stuck
//             as "Completed" forever.
// @route   POST /api/admin/timetable/:id/complete
// @body    multipart/form-data — optional "file" field (pdf/jpg/png),
//          optional "date" field (defaults to now)
const markTimetableComplete = asyncHandler(async (req, res) => {
  const entry = await Timetable.findById(req.params.id);

  if (!entry) {
    res.status(404);
    throw new Error("Timetable entry not found");
  }

  let attachment = { url: null, fileType: null, fileName: null };

  if (req.file) {
    attachment = {
      url: `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${req.file.filename}`,
      fileType: getFileTypeLabel(req.file.mimetype),
      fileName: req.file.originalname,
    };
  }

  const historyRecord = await History.create({
    timetableEntry: entry._id,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    courseCode: entry.courseCode,
    courseTitle: entry.courseTitle,
    lecturer: entry.lecturer,
    venue: entry.venue,
    time: `${entry.startTime} - ${entry.endTime}`,
    department: entry.department,
    level: entry.level,
    semester: entry.semester,
    attachment,
  });

  // Reset for next week's occurrence of this same slot
  entry.status = "Pending";
  await entry.save();

  res.status(201).json({ success: true, data: historyRecord });
});

/* ------------------------------ TESTS & EXAMS ------------------------------ */

// @desc    Create a test/exam entry
// @route   POST /api/admin/tests-exams
const createTestExam = asyncHandler(async (req, res) => {
  const {
    type,
    courseCode,
    courseTitle,
    date,
    startTime,
    endTime,
    venue,
    department,
    level,
    semester,
    instructions,
  } = req.body;

  if (
    !type ||
    !courseCode ||
    !courseTitle ||
    !date ||
    !startTime ||
    !endTime ||
    !venue ||
    !department ||
    !level ||
    !semester
  ) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const item = await TestExam.create({
    type,
    courseCode,
    courseTitle,
    date,
    startTime,
    endTime,
    venue,
    department,
    level,
    semester,
    instructions,
  });

  res.status(201).json({ success: true, data: item });
});

// @desc    List all tests/exams (optionally filtered)
// @route   GET /api/admin/tests-exams
const getAllTestsExams = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.semester) filter.semester = req.query.semester;

  const items = await TestExam.find(filter)
    .populate("department", "name")
    .sort({ date: 1 });

  res.json({ success: true, count: items.length, data: items });
});

// @desc    Edit a test/exam entry
// @route   PUT /api/admin/tests-exams/:id
const updateTestExam = asyncHandler(async (req, res) => {
  const item = await TestExam.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Test/Exam entry not found");
  }

  const editableFields = [
    "type",
    "courseCode",
    "courseTitle",
    "date",
    "startTime",
    "endTime",
    "venue",
    "department",
    "level",
    "semester",
    "instructions",
  ];

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });

  const updated = await item.save();
  res.json({ success: true, data: updated });
});

// @desc    Delete a test/exam entry
// @route   DELETE /api/admin/tests-exams/:id
const deleteTestExam = asyncHandler(async (req, res) => {
  const item = await TestExam.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error("Test/Exam entry not found");
  }

  await item.deleteOne();
  res.json({ success: true, message: "Test/Exam entry deleted" });
});

/* ------------------------------ HISTORY (read-only for admin) ------------------------------ */

// @desc    View all history records (e.g. to audit what's been marked complete)
// @route   GET /api/admin/history
const getAllHistory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.semester) filter.semester = req.query.semester;

  const history = await History.find(filter)
    .populate("department", "name")
    .sort({ date: -1 });

  res.json({ success: true, count: history.length, data: history });
});

module.exports = {
  createDepartment,
  getDepartments,
  createTimetableEntry,
  getAllTimetableEntries,
  updateTimetableEntry,
  deleteTimetableEntry,
  updateTimetableStatus,
  markTimetableComplete,
  createTestExam,
  getAllTestsExams,
  updateTestExam,
  deleteTestExam,
  getAllHistory,
};
