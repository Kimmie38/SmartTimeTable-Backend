const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never returned by default in queries
    },
    // A single account can be a student, the admin, or both at once.
    // These are independent flags rather than one exclusive "role" —
    // that's what makes it possible for one login to hold both roles.
    isStudent: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Which level (100/200/300/400) this admin manages. Only relevant when
    // isAdmin is true — each level allows a max of 2 admin accounts, and
    // everything that admin creates (timetable entries, tests/exams) is
    // automatically scoped to this level.
    adminLevel: {
      type: Number,
      enum: [100, 200, 300, 400],
      required: function () {
        return this.isAdmin === true;
      },
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: function () {
        return this.isStudent === true;
      },
    },
    level: {
      type: Number, // e.g. 100, 200, 300, 400
      required: function () {
        return this.isStudent === true;
      },
    },
    matricNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, "Matric number is required"],
      unique: true, // students log in with this, so it must be unique.
      // Admin-only accounts get an auto-generated placeholder value —
      // see adminAuthController — so this stays satisfied either way.
    },
    semester: {
      type: String,
      enum: ["First", "Second"],
      required: function () {
        return this.isStudent === true;
      },
    },
    fcmToken: {
      type: String, // used to target this device for push notifications
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);