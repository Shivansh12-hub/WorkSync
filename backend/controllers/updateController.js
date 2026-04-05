import Update from "../models/updateModel.js";
import Feedback from "../models/feedbackModel.js";
import Settings from "../models/settingsModel.js";

export const createUpdate = async (req, res) => {
  try {
    const { description, hours, status } = req.body;
    const userId = req.user.id;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const maxDailySetting = await Settings.findOne({ key: "max_daily_updates" }).lean();
    const maxDailyUpdates = Number(maxDailySetting?.value ?? 1);

    const todayCount = await Update.countDocuments({
      userId,
      date: { $gte: start, $lte: end },
    });

    if (todayCount >= maxDailyUpdates) {
      return res.status(400).json({
        message: `Daily limit reached. Maximum ${maxDailyUpdates} updates allowed per day.`,
      });
    }

    const feedbackRequiredSetting = await Settings.findOne({ key: "feedback_required" }).lean();
    const feedbackRequired = Boolean(feedbackRequiredSetting?.value);

    if (feedbackRequired) {
      const latestPreviousUpdate = await Update.findOne({
        userId,
        archived: false,
      })
        .sort({ createdAt: -1 })
        .lean();

      if (latestPreviousUpdate) {
        const hasFeedback = await Feedback.exists({ updateId: latestPreviousUpdate._id });
        if (!hasFeedback) {
          return res.status(400).json({
            message: "Manager feedback is required on your previous update before submitting a new one.",
          });
        }
      }
    }

    const update = await Update.create({
      userId,
      description,
      hours,
      status,
    });

    res.status(201).json(update);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyUpdates = async (req, res) => {
  try {
    const updates = await Update.find({
      userId: req.user.id,
      archived: false,
    }).sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamUpdates = async (req, res) => {
  try {
    const updates = await Update.find({ archived: false })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};