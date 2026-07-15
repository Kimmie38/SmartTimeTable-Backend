const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Department = require("../models/Department");
const generateToken = require("../utils/generateToken");

// @desc    Register a new student
// @route   POST /api/auth/register
// @access  Public
// Required fields: fullName, email, matricNumber, level, semester, password
// Department is fixed to "Computer Science" for now since we're building
// for a single department first.
const registerStudent = asyncHandler(async (req, res) => {
  const { fullName, email, matricNumber, level, semester, password } =
    req.body;

  if (!fullName || !email || !matricNumber || !level || !semester || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  // Find (or lazily create) the Computer Science department.
  // Once the admin side is built, this department will already exist
  // in the DB and this will just find it.
  let department = await Department.findOne({ name: "Computer Science" });
  if (!department) {
    department = await Department.create({
      name: "Computer Science",
      faculty: "Faculty of Science",
      levels: [100, 200, 300, 400],
    });
  }

  const matricExists = await User.findOne({
    matricNumber: matricNumber.toUpperCase(),
  });
  if (matricExists) {
    res.status(400);
    throw new Error("This matric number is already registered");
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  let student;

  if (existingUser) {
    // This email already belongs to an account (most likely the admin
    // account). If it's already a student too, that's a real duplicate.
    if (existingUser.isStudent) {
      res.status(400);
      throw new Error("This email is already registered as a student");
    }

    // Otherwise, this is a promotion — same person adding the student role
    // to their existing (admin) account. Require the correct existing
    // password to prove it's actually them, not someone guessing an email.
    if (!(await existingUser.matchPassword(password))) {
      res.status(401);
      throw new Error(
        "An account with this email already exists. Enter its correct password to add student access to it."
      );
    }

    existingUser.isStudent = true;
    existingUser.matricNumber = matricNumber;
    existingUser.department = department._id;
    existingUser.level = level;
    existingUser.semester = semester;
    existingUser.fullName = fullName || existingUser.fullName;
    student = await existingUser.save();
  } else {
    student = await User.create({
      fullName,
      email,
      matricNumber,
      department: department._id,
      level,
      semester,
      password,
      isStudent: true,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      matricNumber: student.matricNumber,
      department: department.name,
      level: student.level,
      semester: student.semester,
      isStudent: student.isStudent,
      isAdmin: student.isAdmin,
      token: generateToken(student._id),
    },
  });
});

// @desc    Log in a student
// @route   POST /api/auth/login
// @access  Public
// Login is by matricNumber + password (not email)
const loginStudent = asyncHandler(async (req, res) => {
  const { matricNumber, password } = req.body;

  if (!matricNumber || !password) {
    res.status(400);
    throw new Error("Please provide matric number and password");
  }

  const student = await User.findOne({
    matricNumber: matricNumber.toUpperCase(),
    isStudent: true,
  })
    .select("+password")
    .populate("department");

  if (!student || !(await student.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid matric number or password");
  }

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
      token: generateToken(student._id),
    },
  });
});

module.exports = { registerStudent, loginStudent };