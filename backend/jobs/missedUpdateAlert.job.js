import cron from "node-cron";
import User from "../models/userModel.js";
import Update from "../models/updateModel.js";
import Notification from "../models/notificationModel.js";

export const startMissedUpdateAlertJob = () => {
  // Run daily at 8 PM (20:00)
  cron.schedule("0 20 * * *", async () => {
    try {
      console.log("Running missed update alert job...");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all employees
      const employees = await User.find({ role: "EMPLOYEE" }).lean();

      for (const employee of employees) {
        // Check if employee submitted an update today
        const todayUpdate = await Update.findOne({
          userId: employee._id,
          date: { $gte: today, $lt: tomorrow },
          archived: false,
        }).lean();

        // If no update submitted today, create a missed update notification
        if (!todayUpdate) {
          const existingNotification = await Notification.findOne({
            userId: employee._id,
            type: "MISSED_UPDATE",
            createdAt: { $gte: today, $lt: tomorrow },
          }).lean();

          // Only create if notification doesn't exist for today
          if (!existingNotification) {
            await Notification.create({
              userId: employee._id,
              type: "MISSED_UPDATE",
              message: "You haven't submitted your daily update yet. Please submit your work update.",
              read: false,
            });
          }
        }
      }

      console.log("Missed update alert job completed successfully");
    } catch (error) {
      console.error("Error in missed update alert job:", error);
    }
  });
};
