import Notification from "../models/notificationModel.js";
import redisClient from "../utils/redisClient.js";
import { cacheKeys } from "../utils/cacheKeys.js";
import { invalidateCacheByPrefix } from "../utils/cacheInvalidation.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly } = req.query;
    const unreadOnlyFlag = unreadOnly === "true";
    const cacheKey = cacheKeys.notifications({
      userId,
      unreadOnly: unreadOnlyFlag,
    });

    if (redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    let filter = { userId };

    if (unreadOnlyFlag) {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate("relatedUpdateId", "description hours status")
      .sort({ createdAt: -1 })
      .limit(50);

    if (redisClient.isOpen) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(notifications));
    }

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    notification.read = true;
    await notification.save();

    await invalidateCacheByPrefix(`notifications:${userId}:`);

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany({ userId }, { read: true });
    await invalidateCacheByPrefix(`notifications:${userId}:`);

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
