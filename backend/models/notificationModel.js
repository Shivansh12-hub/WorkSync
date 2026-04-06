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
      enum: ["MISSED_UPDATE", "BLOCKED_TASK", "FEEDBACK_RECEIVED", "REMINDER"],
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
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
    delivery: {
      inApp: {
        status: {
          type: String,
          enum: ["QUEUED", "DELIVERED", "FAILED", "DISABLED"],
          default: "QUEUED",
        },
        queuedAt: {
          type: Date,
          default: Date.now,
        },
        deliveredAt: {
          type: Date,
          default: null,
        },
        lastAttemptAt: {
          type: Date,
          default: null,
        },
        error: {
          type: String,
          default: null,
        },
      },
      email: {
        status: {
          type: String,
          enum: ["QUEUED", "DELIVERED", "FAILED", "DISABLED"],
          default: "DISABLED",
        },
        queuedAt: {
          type: Date,
          default: null,
        },
        deliveredAt: {
          type: Date,
          default: null,
        },
        lastAttemptAt: {
          type: Date,
          default: null,
        },
        error: {
          type: String,
          default: null,
        },
      },
      push: {
        status: {
          type: String,
          enum: ["QUEUED", "DELIVERED", "FAILED", "DISABLED"],
          default: "DISABLED",
        },
        queuedAt: {
          type: Date,
          default: null,
        },
        deliveredAt: {
          type: Date,
          default: null,
        },
        lastAttemptAt: {
          type: Date,
          default: null,
        },
        error: {
          type: String,
          default: null,
        },
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dedupeKey: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.model("Notification", notificationSchema);
