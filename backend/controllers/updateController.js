import Update from "../models/updateModel.js";
import Feedback from "../models/feedbackModel.js";
import Settings from "../models/settingsModel.js";
import User from "../models/userModel.js";
import {
  createNotificationsForUsers,
  resolveInAppDelivery,
} from "../utils/notificationService.js";
import { invalidateCacheByPrefix } from "../utils/cacheInvalidation.js";
import mongoose from "mongoose";

const ALLOWED_STATUSES = ["COMPLETED", "IN_PROGRESS", "BLOCKED"];

const sanitizeDescription = (value = "") =>
  value
    .toString()
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const validateDescription = (description) => {
  if (!description) {
    return "Description is required";
  }

  if (description.length < 12 || description.length > 500) {
    return "Description must be between 12 and 500 characters";
  }

  const words = description.split(" ").filter(Boolean);
  if (words.length < 3) {
    return "Description should contain at least 3 words";
  }

  if (!/[a-zA-Z]/.test(description)) {
    return "Description must contain alphabetic text";
  }

  return null;
};

const parseHours = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
};

const getRuntimeSettings = async () => {
  const settings = await Settings.find({
    key: { $in: ["max_daily_updates", "min_update_hours", "max_update_hours"] },
  })
    .select("key value")
    .lean();

  const getNumberSetting = (key, fallback) => {
    const found = settings.find((entry) => entry.key === key);
    const parsed = Number(found?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    minHours: getNumberSetting("min_update_hours", 0.5),
    maxHours: getNumberSetting("max_update_hours", 12),
    maxDailyUpdates: Math.max(1, Math.floor(getNumberSetting("max_daily_updates", 5))),
  };
};

const getActorSnapshot = async (userId) => {
  const user = await User.findById(userId).select("name email role").lean();

  if (!user) {
    return null;
  }

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const buildChangeList = (previousValues, nextValues, fields) =>
  fields
    .filter((field) => previousValues[field] !== nextValues[field])
    .map((field) => ({
      field,
      previousValue: previousValues[field],
      newValue: nextValues[field],
    }));

const buildHistoryEntry = ({
  version,
  action,
  actor,
  previousValues,
  newValues,
  changes,
  note = null,
}) => ({
  version,
  action,
  changedBy: actor,
  previousValues,
  newValues,
  changes,
  note,
});

const notifyManagersAndAdmins = async (message, relatedUpdateId) => {
  const recipients = await User.find({
    role: { $in: ["MANAGER", "ADMIN"] },
  })
    .select("_id")
    .lean();

  if (!recipients.length) {
    return;
  }

  const created = await createNotificationsForUsers({
    userIds: recipients.map((recipient) => recipient._id),
    type: "BLOCKED_TASK",
    message,
    relatedUpdateId,
    channels: {
      inApp: true,
      email: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
      push: process.env.ENABLE_PUSH_NOTIFICATIONS === "true",
    },
    metadata: {
      source: "blocked-submission",
    },
  });

  await resolveInAppDelivery(created.map((row) => row._id));
};

export const createUpdate = async (req, res) => {
  try {
    const { description, hours, status } = req.body;
    const userId = req.user.id;
    const normalizedDescription = sanitizeDescription(description);
    const descriptionError = validateDescription(normalizedDescription);

    if (descriptionError) {
      return res.status(400).json({ message: descriptionError });
    }

    const parsedHours = parseHours(hours);
    if (parsedHours === null) {
      return res.status(400).json({ message: "Hours must be a valid number" });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const runtime = await getRuntimeSettings();

    if (parsedHours < runtime.minHours || parsedHours > runtime.maxHours) {
      return res.status(400).json({
        message: `Hours must be between ${runtime.minHours} and ${runtime.maxHours}`,
      });
    }

    const actor = await getActorSnapshot(req.user.id);
    if (!actor) {
      return res.status(404).json({ message: "User not found" });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todayCount = await Update.countDocuments({
      userId,
      date: { $gte: start, $lte: end },
      archived: false,
    });

    if (todayCount >= runtime.maxDailyUpdates) {
      return res.status(400).json({
        message: `Daily limit reached. You can only submit ${runtime.maxDailyUpdates} update(s) per day.`,
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
      description: normalizedDescription,
      hours: parsedHours,
      status,
      version: 1,
      versionHistory: [
        buildHistoryEntry({
          version: 1,
          action: "CREATE",
          actor,
          previousValues: {
            description: null,
            hours: null,
            status: null,
            archived: null,
          },
          newValues: {
            description: normalizedDescription,
            hours: parsedHours,
            status,
            archived: false,
          },
          changes: buildChangeList(
            {
              description: null,
              hours: null,
              status: null,
              archived: null,
            },
            {
              description: normalizedDescription,
              hours: parsedHours,
              status,
              archived: false,
            },
            ["description", "hours", "status", "archived"]
          ),
          note: "Initial creation",
        }),
      ],
    });

    if (status === "BLOCKED") {
      await notifyManagersAndAdmins(
        `Blocked update submitted by ${req.user.name || "an employee"}: ${normalizedDescription}`,
        update._id
      );
    }

    await Promise.all([
      invalidateCacheByPrefix("dashboard:stats:"),
      invalidateCacheByPrefix("dashboard:team-metrics:"),
    ]);

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
    const { status, employeeId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page value" });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 200) {
      return res.status(400).json({ message: "Invalid limit value. Allowed range is 1-200." });
    }

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employeeId" });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    let filter = { archived: false };

    if (status) {
      filter.status = status;
    }

    if (employeeId) {
      const employeeExists = await User.exists({ _id: employeeId, role: "EMPLOYEE" });
      if (!employeeExists) {
        return res.status(404).json({ message: "Employee not found" });
      }
      filter.userId = employeeId;
    } else {
      const employeeUsers = await User.find({ role: "EMPLOYEE" }).select("_id").lean();
      filter.userId = { $in: employeeUsers.map((user) => user._id) };
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({ message: "Invalid dateFrom value" });
        }
        filter.date.$gte = from;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Invalid dateTo value" });
        }
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const total = await Update.countDocuments(filter);
    const updates = await Update.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.json({
      message: "Team updates retrieved successfully",
      updates,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamEmployees = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 50 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Invalid page value" });
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 200) {
      return res.status(400).json({ message: "Invalid limit value. Allowed range is 1-200." });
    }

    const safeSearch = String(search || "").trim();
    const filter = { role: "EMPLOYEE" };
    if (safeSearch) {
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(filter);
    const employees = await User.find(filter)
      .select("_id name email role")
      .sort({ name: 1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    res.json({
      message: "Employees retrieved successfully",
      users: employees,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, hours, status } = req.body;
    const userId = req.user.id;
    const runtime = await getRuntimeSettings();
    const actor = await getActorSnapshot(req.user.id);

    const update = await Update.findById(id);

    if (!update) {
      return res.status(404).json({ message: "Update not found" });
    }

    const previousStatus = update.status;

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

    if (!actor) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousValues = {
      description: update.description,
      hours: update.hours,
      status: update.status,
      archived: update.archived,
    };

    const nextValues = {
      description: update.description,
      hours: update.hours,
      status: update.status,
      archived: update.archived,
    };

    if (description !== undefined) {
      const normalizedDescription = sanitizeDescription(description);
      const descriptionError = validateDescription(normalizedDescription);
      if (descriptionError) {
        return res.status(400).json({ message: descriptionError });
      }
      nextValues.description = normalizedDescription;
    }

    if (hours !== undefined) {
      const parsedHours = parseHours(hours);
      if (parsedHours === null) {
        return res.status(400).json({ message: "Hours must be a valid number" });
      }

      if (parsedHours < runtime.minHours || parsedHours > runtime.maxHours) {
        return res.status(400).json({
          message: `Hours must be between ${runtime.minHours} and ${runtime.maxHours}`,
        });
      }

      nextValues.hours = parsedHours;
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      nextValues.status = status;
    }

    const changes = buildChangeList(previousValues, nextValues, ["description", "hours", "status", "archived"]);

    if (changes.length === 0) {
      return res.status(400).json({ message: "No changes detected" });
    }

    update.description = nextValues.description;
    update.hours = nextValues.hours;
    update.status = nextValues.status;

    const nextVersion = (update.version || 1) + 1;
    update.version = nextVersion;
    update.versionHistory = [
      ...(update.versionHistory || []),
      buildHistoryEntry({
        version: nextVersion,
        action: "UPDATE",
        actor,
        previousValues,
        newValues: nextValues,
        changes,
        note: "Manual edit",
      }),
    ];

    await update.save();

    if (previousStatus !== "BLOCKED" && update.status === "BLOCKED") {
      await notifyManagersAndAdmins(
        `Blocked update submitted by ${req.user.name || "an employee"}: ${update.description}`,
        update._id
      );
    }

    await Promise.all([
      invalidateCacheByPrefix("dashboard:stats:"),
      invalidateCacheByPrefix("dashboard:team-metrics:"),
    ]);

    res.json(update);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};