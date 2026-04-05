import mongoose from "mongoose";

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