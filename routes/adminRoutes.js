const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
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
} = require("../controllers/adminController");

// Every route below requires a valid admin JWT
router.use(protect, adminOnly);

// Departments
router.route("/departments").post(createDepartment).get(getDepartments);

// Timetable
router
  .route("/timetable")
  .post(createTimetableEntry)
  .get(getAllTimetableEntries);

router
  .route("/timetable/:id")
  .put(updateTimetableEntry)
  .delete(deleteTimetableEntry);

router.patch("/timetable/:id/status", updateTimetableStatus);

// "file" is the form-data field name the admin app should send the PDF/image under
router.post(
  "/timetable/:id/complete",
  upload.single("file"),
  markTimetableComplete
);

// Tests & Exams
router.route("/tests-exams").post(createTestExam).get(getAllTestsExams);

router
  .route("/tests-exams/:id")
  .put(updateTestExam)
  .delete(deleteTestExam);

// History (read-only audit view)
router.get("/history", getAllHistory);

module.exports = router;
