import cron from "node-cron";
import Notification from "../models/notificationModel.js";

const EMAIL_ENABLED = process.env.ENABLE_EMAIL_NOTIFICATIONS === "true";
const PUSH_ENABLED = process.env.ENABLE_PUSH_NOTIFICATIONS === "true";

const markDelivered = async (notificationId, channel) => {
  const now = new Date();
  await Notification.updateOne(
    { _id: notificationId, [`delivery.${channel}.status`]: "QUEUED" },
    {
      $set: {
        [`delivery.${channel}.status`]: "DELIVERED",
        [`delivery.${channel}.deliveredAt`]: now,
        [`delivery.${channel}.lastAttemptAt`]: now,
        [`delivery.${channel}.error`]: null,
      },
    }
  );
};

const markFailed = async (notificationId, channel, reason) => {
  const now = new Date();
  await Notification.updateOne(
    { _id: notificationId, [`delivery.${channel}.status`]: "QUEUED" },
    {
      $set: {
        [`delivery.${channel}.status`]: "FAILED",
        [`delivery.${channel}.lastAttemptAt`]: now,
        [`delivery.${channel}.error`]: reason,
      },
    }
  );
};

export const startNotificationDeliveryJob = () => {
  // Run every minute
  cron.schedule("*/1 * * * *", async () => {
    try {
      const queued = await Notification.find({
        $or: [
          { "delivery.email.status": "QUEUED" },
          { "delivery.push.status": "QUEUED" },
        ],
      })
        .select("_id channels delivery")
        .limit(200)
        .lean();

      for (const row of queued) {
        if (row.channels?.email && row.delivery?.email?.status === "QUEUED") {
          if (EMAIL_ENABLED) {
            // Placeholder integration point for SMTP/provider call.
            await markDelivered(row._id, "email");
          } else {
            await markFailed(row._id, "email", "Email delivery provider not configured");
          }
        }

        if (row.channels?.push && row.delivery?.push?.status === "QUEUED") {
          if (PUSH_ENABLED) {
            // Placeholder integration point for push provider call.
            await markDelivered(row._id, "push");
          } else {
            await markFailed(row._id, "push", "Push delivery provider not configured");
          }
        }
      }
    } catch (error) {
      console.error("Notification delivery job failed:", error.message);
    }
  });
};
