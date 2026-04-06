import Feedback from "../models/feedbackModel.js";
import Update from "../models/updateModel.js";
import {
  createNotificationsForUsers,
  resolveInAppDelivery,
} from "../utils/notificationService.js";
import { invalidateCacheByPrefix } from "../utils/cacheInvalidation.js";

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

    const update = await Update.findById(updateId).select("userId description").lean();
    if (update?.userId) {
      const created = await createNotificationsForUsers({
        userIds: [update.userId],
        type: "FEEDBACK_RECEIVED",
        message: `Your update received feedback: ${update.description}`,
        relatedUpdateId: updateId,
        channels: {
          inApp: true,
          email: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
          push: process.env.ENABLE_PUSH_NOTIFICATIONS === "true",
        },
        metadata: {
          source: "feedback",
        },
      });
      await resolveInAppDelivery(created.map((row) => row._id));
    }

    await invalidateCacheByPrefix("dashboard:team-metrics:");

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