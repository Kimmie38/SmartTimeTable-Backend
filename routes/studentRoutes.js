const express = require("express");
const router = express.Router();
const { protect, studentOnly } = require("../middleware/auth");
const {
  getDashboard,
  getWeekTimetable,
  getHistory,
  getTestsExams,
  getProfile,
  updateProfile,
} = require("../controllers/studentController");

// Every route below requires a valid student JWT
router.use(protect, studentOnly);

router.get("/dashboard", getDashboard);
router.get("/timetable", getWeekTimetable);
router.get("/history", getHistory);
router.get("/tests-exams", getTestsExams);
router.route("/profile").get(getProfile).put(updateProfile);

module.exports = router;
