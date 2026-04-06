import mongoose from "mongoose";

const versionHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE"],
      required: true,
    },
    changedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
    },
    previousValues: {
      description: {
        type: String,
        default: null,
      },
      hours: {
        type: Number,
        default: null,
      },
      status: {
        type: String,
        default: null,
      },
      archived: {
        type: Boolean,
        default: null,
      },
    },
    newValues: {
      description: {
        type: String,
        default: null,
      },
      hours: {
        type: Number,
        default: null,
      },
      status: {
        type: String,
        default: null,
      },
      archived: {
        type: Boolean,
        default: null,
      },
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        previousValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        newValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
    note: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const updateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["COMPLETED", "IN_PROGRESS", "BLOCKED"],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },
    versionHistory: {
      type: [versionHistorySchema],
      default: [],
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

updateSchema.index({ userId: 1, date: 1 });

export default mongoose.model("Update", updateSchema);