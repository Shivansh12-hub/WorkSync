import Notification from "../models/notificationModel.js";
import { invalidateCacheByPrefix } from "./cacheInvalidation.js";

const buildChannelConfig = (channels = {}) => ({
  inApp: channels.inApp !== false,
  email: Boolean(channels.email),
  push: Boolean(channels.push),
});

const buildDeliveryState = (enabled) => {
  const now = new Date();
  return {
    inApp: {
      status: enabled.inApp ? "QUEUED" : "DISABLED",
      queuedAt: enabled.inApp ? now : null,
      deliveredAt: null,
      lastAttemptAt: null,
      error: null,
    },
    email: {
      status: enabled.email ? "QUEUED" : "DISABLED",
      queuedAt: enabled.email ? now : null,
      deliveredAt: null,
      lastAttemptAt: null,
      error: null,
    },
    push: {
      status: enabled.push ? "QUEUED" : "DISABLED",
      queuedAt: enabled.push ? now : null,
      deliveredAt: null,
      lastAttemptAt: null,
      error: null,
    },
  };
};

export const createNotificationsForUsers = async ({
  userIds,
  type,
  message,
  relatedUpdateId = null,
  channels = { inApp: true, email: false, push: false },
  metadata = {},
  dedupeKeyBase = null,
}) => {
  const uniqueUserIds = [...new Set((userIds || []).map((id) => String(id)))];

  if (!uniqueUserIds.length) {
    return [];
  }

  const enabledChannels = buildChannelConfig(channels);

  const docs = uniqueUserIds.map((userId) => ({
    userId,
    type,
    message,
    relatedUpdateId,
    read: false,
    channels: enabledChannels,
    delivery: buildDeliveryState(enabledChannels),
    metadata,
    dedupeKey: dedupeKeyBase ? `${dedupeKeyBase}:${userId}` : undefined,
  }));

  try {
    const inserted = await Notification.insertMany(docs, { ordered: false });
    await Promise.all(uniqueUserIds.map((userId) => invalidateCacheByPrefix(`notifications:${userId}:`)));
    return inserted;
  } catch (error) {
    if (error?.writeErrors?.length) {
      const duplicateOnly = error.writeErrors.every((w) => w.code === 11000);
      if (duplicateOnly) {
        return [];
      }
    }
    throw error;
  }
};

export const resolveInAppDelivery = async (notificationIds) => {
  if (!notificationIds?.length) {
    return;
  }

  const now = new Date();
  await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      "delivery.inApp.status": "QUEUED",
    },
    {
      $set: {
        "delivery.inApp.status": "DELIVERED",
        "delivery.inApp.deliveredAt": now,
        "delivery.inApp.lastAttemptAt": now,
      },
    }
  );
};
