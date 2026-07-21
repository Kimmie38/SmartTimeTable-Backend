const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Register the admin
// @route   POST /api/admin/auth/register
// @access  Public, but locked behind ADMIN_REGISTRATION_KEY
// Only one account on the whole system may hold admin access. If the email
// used here already belongs to an existing (student) account, admin access
// is added to that same account — the person logs in exactly the same way
// as before (matric number for student screens, this same email+password
// combo for admin screens) instead of getting a second, separate identity.
const registerAdmin = asyncHandler(async (req, res) => {
  const { fullName, email, password, registrationKey } = req.body;

  if (registrationKey !== process.env.ADMIN_REGISTRATION_KEY) {
    res.status(403);
    throw new Error("Invalid admin registration key");
  }

  // Only one admin account is allowed on the system. Once one exists,
  // this route is permanently locked — even with the correct key.
  const adminAlreadyExists = await User.findOne({ isAdmin: true });
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

  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  let admin;

  if (existingUser) {
    // Same email as an existing (student) account — this is a promotion,
    // not a brand new identity. Require the correct existing password to
    // prove it's actually the account owner making this request.
    if (!(await existingUser.matchPassword(password))) {
      res.status(401);
      throw new Error(
        "An account with this email already exists. Enter its correct password to add admin access to it."
      );
    }

    existingUser.isAdmin = true;
    existingUser.fullName = fullName || existingUser.fullName;
    admin = await existingUser.save();
  } else {
    // Brand new account, admin-only. Still needs a unique matricNumber
    // value since that field is unique-indexed — this placeholder is
    // never used for anything since this account has no student access.
    const placeholderMatric = `ADMIN-${Date.now()}`;

    admin = await User.create({
      fullName,
      email,
      password,
      isAdmin: true,
      matricNumber: placeholderMatric,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      isStudent: admin.isStudent,
      isAdmin: admin.isAdmin,
      token: generateToken(admin._id),
    },
  });
});

// @desc    Log in as admin
// @route   POST /api/admin/auth/login
// @access  Public
// Admin login is by matricNumber + password (students use matricNumber instead) —
// this works the same whether the account is admin-only or also a student.
const loginAdmin = asyncHandler(async (req, res) => {
  const { matricNumber, password } = req.body;
  const normalizedMatricNumber =
    typeof matricNumber === "string" ? matricNumber.trim().toUpperCase() : "";

  if (!normalizedMatricNumber || !password) {
    res.status(400);
    throw new Error("Please provide matric number and password");
  }

  if (normalizedMatricNumber.includes("@")) {
    res.status(400);
    throw new Error("Please use your matric number, not your email address");
  }

  const admin = await User.findOne({
    matricNumber: normalizedMatricNumber,
    isAdmin: true,
  }).select("+password");

  if (!admin || !(await admin.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid matric number or password");
  }

  res.json({
    success: true,
    data: {
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      isStudent: admin.isStudent,
      isAdmin: admin.isAdmin,
      token: generateToken(admin._id),
    },
  });
});

module.exports = { registerAdmin, loginAdmin };