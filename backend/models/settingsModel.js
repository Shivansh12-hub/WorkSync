import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "max_daily_updates",
        "min_update_hours",
        "max_update_hours",
        "feedback_required",
        "auto_archive_days",
      ],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ["number", "boolean", "string"],
      default: "string",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
