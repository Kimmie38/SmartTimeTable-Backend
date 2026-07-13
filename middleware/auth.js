const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// Verifies the JWT sent in the Authorization header and attaches the user to req
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).populate("department");

      if (!req.user) {
        res.status(401);
        throw new Error("User no longer exists");
      }

      return next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token invalid or expired");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});

// Restricts a route to students only (kept here for clarity / future-proofing
// since the admin side will reuse the same User model with role "admin")
const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    return next();
  }
  res.status(403);
  throw new Error("Access denied: student accounts only");
};

// Restricts a route to admins only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.status(403);
  throw new Error("Access denied: admin accounts only");
};

module.exports = { protect, studentOnly, adminOnly };
