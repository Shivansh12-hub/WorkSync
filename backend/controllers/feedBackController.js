import Feedback from "../models/feedbackModel.js";

export const addFeedback = async (req, res) => {
  try {
    const { updateId, comment } = req.body;

    const feedback = await Feedback.create({
      updateId,
      comment,
      managerId: req.user.id,
    });

    // Populate manager info before returning
    await feedback.populate("managerId", "name email");

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeedbackByUpdateId = async (req, res) => {
  try {
    const { updateId } = req.params;

    const feedback = await Feedback.find({ updateId })
      .populate("managerId", "name email")
      .sort("-createdAt");

    res.json({
      message: "Feedback retrieved successfully",
      feedback,
      count: feedback.length,
    });
  } catch (error) {
    console.error("[FEEDBACK] Get feedback error:", error);
    res.status(500).json({ message: error.message });
  }
};