import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["MISSED_UPDATE", "BLOCKED_TASK", "FEEDBACK_RECEIVED"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedUpdateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Update",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
