import cron from "node-cron";
import User from "../models/userModel.js";
import Update from "../models/updateModel.js";
import Feedback from "../models/feedbackModel.js";
import {
  createNotificationsForUsers,
  resolveInAppDelivery,
} from "../utils/notificationService.js";

const BLOCKED_REMINDER_HOURS = Number(process.env.BLOCKED_REMINDER_HOURS) || 6;

export const startBlockedTaskReminderJob = () => {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - BLOCKED_REMINDER_HOURS * 60 * 60 * 1000);
      const dayKey = now.toISOString().slice(0, 10);

      const unresolvedBlockedUpdates = await Update.find({
        status: "BLOCKED",
        archived: false,
        createdAt: { $lte: threshold },
      })
        .select("_id userId description")
        .lean();

      if (!unresolvedBlockedUpdates.length) {
        return;
      }

      const feedbackRows = await Feedback.find({
        updateId: { $in: unresolvedBlockedUpdates.map((update) => update._id) },
      })
        .select("updateId")
        .lean();

      const resolvedSet = new Set(feedbackRows.map((row) => String(row.updateId)));
      const managersAndAdmins = await User.find({ role: { $in: ["MANAGER", "ADMIN"] } })
        .select("_id")
        .lean();
      const managerAdminIds = managersAndAdmins.map((row) => row._id);

      for (const update of unresolvedBlockedUpdates) {
        if (resolvedSet.has(String(update._id))) {
          continue;
        }

        const message = `Blocked task unresolved for over ${BLOCKED_REMINDER_HOURS}h: ${update.description}`;

        const createdForManagers = await createNotificationsForUsers({
          userIds: managerAdminIds,
          type: "BLOCKED_TASK",
          message,
          relatedUpdateId: update._id,
          channels: {
            inApp: true,
            email: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
            push: process.env.ENABLE_PUSH_NOTIFICATIONS === "true",
          },
          metadata: {
            source: "blocked-unresolved-reminder",
            thresholdHours: BLOCKED_REMINDER_HOURS,
          },
          dedupeKeyBase: `blocked-unresolved:manager:${update._id}:${dayKey}`,
        });

        const createdForOwner = await createNotificationsForUsers({
          userIds: [update.userId],
          type: "BLOCKED_TASK",
          message: `Your blocked task is still unresolved: ${update.description}`,
          relatedUpdateId: update._id,
          channels: {
            inApp: true,
            email: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
            push: process.env.ENABLE_PUSH_NOTIFICATIONS === "true",
          },
          metadata: {
            source: "blocked-unresolved-owner-reminder",
            thresholdHours: BLOCKED_REMINDER_HOURS,
          },
          dedupeKeyBase: `blocked-unresolved:owner:${update._id}:${dayKey}`,
        });

        await resolveInAppDelivery([
          ...createdForManagers.map((row) => row._id),
          ...createdForOwner.map((row) => row._id),
        ]);
      }

      console.log("Blocked task reminder job completed");
    } catch (error) {
      console.error("Blocked task reminder job failed:", error.message);
    }
  });
};
