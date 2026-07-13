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
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: function () {
        return this.role === "student";
      },
    },
    level: {
      type: Number, // e.g. 100, 200, 300, 400
      required: function () {
        return this.role === "student";
      },
    },
    matricNumber: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, "Matric number is required"],
      unique: true, // students log in with this, so it must be unique
    },
    semester: {
      type: String,
      enum: ["First", "Second"],
      required: function () {
        return this.role === "student";
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
