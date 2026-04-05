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

    // Strict single update per day enforcement
    const MAX_DAILY_UPDATES = 1;

    const todayCount = await Update.countDocuments({
      userId,
      date: { $gte: start, $lte: end },
      archived: false,
    });

    if (todayCount >= MAX_DAILY_UPDATES) {
      return res.status(400).json({
        message: `Daily limit reached. You can only submit 1 update per day.`,
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
    const { status, employeeId, dateFrom, dateTo } = req.query;
    
    // Log for debugging
    console.log("getTeamUpdates filters received:", { status, employeeId, dateFrom, dateTo });
    
    let filter = { archived: false };

    if (status) {
      filter.status = status;
      console.log("Applied status filter:", filter.status);
    }

    if (employeeId) {
      filter.userId = employeeId;
      console.log("Applied employeeId filter:", filter.userId);
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        filter.date.$gte = new Date(dateFrom);
        console.log("Applied dateFrom filter:", filter.date.$gte);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
        console.log("Applied dateTo filter:", filter.date.$lte);
      }
    }

    console.log("Final filter object:", JSON.stringify(filter, null, 2));

    const updates = await Update.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    console.log(`Found ${updates.length} updates matching filters`);
    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, hours, status } = req.body;
    const userId = req.user.id;

    const update = await Update.findById(id);

    if (!update) {
      return res.status(404).json({ message: "Update not found" });
    }

    if (update.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to edit this update" });
    }

    if (update.archived) {
      return res.status(400).json({ message: "Cannot edit archived updates" });
    }

    // Check if update is from today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (update.date < start || update.date > end) {
      return res.status(400).json({ message: "Can only edit updates from today" });
    }

    // Update fields and increment version
    update.description = description || update.description;
    update.hours = hours !== undefined ? hours : update.hours;
    update.status = status || update.status;
    update.version = (update.version || 1) + 1;

    await update.save();
    res.json(update);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};