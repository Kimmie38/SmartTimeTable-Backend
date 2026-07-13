const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Register a new admin
// @route   POST /api/admin/auth/register
// @access  Public, but locked behind ADMIN_REGISTRATION_KEY
// Admins don't need matricNumber, department, level, or semester —
// those are student-only fields (see User model).
const registerAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, password, registrationKey } = req.body;

  if (registrationKey !== process.env.ADMIN_REGISTRATION_KEY) {
    res.status(403);
    throw new Error("Invalid admin registration key");
  }

  // Only one admin account is allowed on the system. Once it exists,
  // this route is permanently locked — even with the correct key.
  const adminAlreadyExists = await User.findOne({ role: "admin" });
  if (adminAlreadyExists) {
    res.status(403);
    throw new Error(
      "An admin account already exists. Only one admin account is allowed."
    );
  }

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const emailExists = await User.findOne({ email: email.toLowerCase() });
  if (emailExists) {
    res.status(400);
    throw new Error("This email is already registered");
  }

  // Admins still need a unique matricNumber value in the DB since the field
  // is unique-indexed; we generate a placeholder since it's meaningless for admins.
  const placeholderMatric = `ADMIN-${Date.now()}`;

  const admin = await User.create({
    fullName,
    email,
    password,
    role: "admin",
    matricNumber: placeholderMatric,
  });

  res.status(201).json({
    success: true,
    data: {
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
    },
  });
});

// @desc    Log in an admin
// @route   POST /api/admin/auth/login
// @access  Public
// Admins log in with email + password (unlike students, who use matricNumber)
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const admin = await User.findOne({
    email: email.toLowerCase(),
    role: "admin",
  }).select("+password");

  if (!admin || !(await admin.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    success: true,
    data: {
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
    },
  });
});

module.exports = { registerAdmin, loginAdmin };
