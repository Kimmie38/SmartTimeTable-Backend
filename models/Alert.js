const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
    },
    notifyAt: {
      type: Date,
      required: true, // exact datetime this alert should fire
    },
    offsetLabel: {
      type: String,
      enum: ["24h", "1h", "15m"],
      required: true,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

alertSchema.index({ notifyAt: 1, delivered: 1 });

module.exports = mongoose.model("Alert", alertSchema);
