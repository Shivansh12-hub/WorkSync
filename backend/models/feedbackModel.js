import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    updateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Update",
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);