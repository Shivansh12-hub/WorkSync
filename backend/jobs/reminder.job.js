import cron from "node-cron";
import User from "../models/userModel.js";
import { createNotificationsForUsers, resolveInAppDelivery } from "../utils/notificationService.js";

const startReminderJob = () => {
  cron.schedule("0 18 * * *", async () => {
    try {
      const employees = await User.find({ role: "EMPLOYEE" }).select("_id").lean();
      const userIds = employees.map((employee) => employee._id);
      const todayKey = new Date().toISOString().slice(0, 10);

      const created = await createNotificationsForUsers({
        userIds,
        type: "REMINDER",
        message: "Reminder: submit your daily work update before the day ends.",
        channels: {
          inApp: true,
          email: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
          push: process.env.ENABLE_PUSH_NOTIFICATIONS === "true",
        },
        metadata: {
          source: "daily-reminder",
        },
        dedupeKeyBase: `daily-reminder:${todayKey}`,
      });

      await resolveInAppDelivery(created.map((row) => row._id));
      console.log(`Reminder job queued ${created.length} notifications`);
    } catch (error) {
      console.error("Reminder job failed:", error.message);
    }
  });
};

export default startReminderJob;