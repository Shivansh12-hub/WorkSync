import Feedback from "../models/feedbackModel.js";

export const addFeedback = async (req, res) => {
  try {
    const { updateId, comment } = req.body;

    const feedback = await Feedback.create({
      updateId,
      comment,
      managerId: req.user.id,
    });

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};