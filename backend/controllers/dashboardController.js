import Update from "../models/updateModel.js";
import redisClient from "../utils/redisClient.js";

export const getDashboardStats = async (req, res) => {
  try {
    const cached = redisClient.isOpen
      ? await redisClient.get("dashboard_stats")
      : null;

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const total = await Update.countDocuments();
    const completed = await Update.countDocuments({
      status: "COMPLETED",
    });
    const blocked = await Update.countDocuments({
      status: "BLOCKED",
    });

    const data = {
      total,
      completed,
      blocked,
    };

    if (redisClient.isOpen) {
      await redisClient.setEx("dashboard_stats", 300, JSON.stringify(data));
    }

    return res.json(data);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};