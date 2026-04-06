import Update from "../models/updateModel.js";
import User from "../models/userModel.js";
import Feedback from "../models/feedbackModel.js";
import Settings from "../models/settingsModel.js";
import redisClient from "../utils/redisClient.js";
import { cacheKeys } from "../utils/cacheKeys.js";
import mongoose from "mongoose";

const MAX_ANALYTICS_RANGE_DAYS = 90;

const pad2 = (value) => String(value).padStart(2, "0");

const toDayKey = (date) => {
  const parsed = new Date(date);
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
};

const createDateBuckets = (startDate, endDate) => {
  const buckets = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    buckets.push({
      date: toDayKey(cursor),
      total: 0,
      completed: 0,
      blocked: 0,
      unresolvedBlocked: 0,
      completionRate: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
};

const parseDateRange = (dateFrom, dateTo) => {
  const end = dateTo ? new Date(dateTo) : new Date();
  const start = dateFrom
    ? new Date(dateFrom)
    : new Date(new Date(end).setDate(end.getDate() - 13));

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

export const getDashboardStats = async (req, res) => {
  try {
    const isEmployee = req.user?.role === "EMPLOYEE";
    const userFilter = isEmployee ? { userId: req.user.id, archived: false } : { archived: false };
    const cacheKey = cacheKeys.dashboardStats(
      isEmployee ? `user:${req.user.id}` : `role:${req.user?.role || "GLOBAL"}`
    );

    const cached = redisClient.isOpen ? await redisClient.get(cacheKey) : null;

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const total = await Update.countDocuments(userFilter);
    const completed = await Update.countDocuments({
      ...userFilter,
      status: "COMPLETED",
    });
    const blocked = await Update.countDocuments({
      ...userFilter,
      status: "BLOCKED",
    });

    const data = {
      total,
      completed,
      blocked,
    };

    if (redisClient.isOpen) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
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

export const getTeamMetrics = async (req, res) => {
  try {
    const { employeeId, dateFrom, dateTo } = req.query;

    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Invalid employeeId" });
    }

    const teamMetricsCacheKey = cacheKeys.teamMetrics({
      requesterId: req.user.id,
      employeeId,
      dateFrom,
      dateTo,
    });

    if (redisClient.isOpen) {
      const cached = await redisClient.get(teamMetricsCacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const { start, end } = parseDateRange(dateFrom, dateTo);
    if (!isValidDate(start) || !isValidDate(end)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start > end) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const rangeDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (rangeDays > MAX_ANALYTICS_RANGE_DAYS) {
      return res.status(400).json({
        message: `Date range too large. Maximum supported range is ${MAX_ANALYTICS_RANGE_DAYS} days.`,
      });
    }

    const employeeFilter = employeeId
      ? { role: "EMPLOYEE", _id: employeeId }
      : { role: "EMPLOYEE" };

    const employees = await User.find(employeeFilter).select("_id name email").lean();
    const employeeIds = employees.map((employee) => employee._id);

    if (employeeId && employeeIds.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (!employeeIds.length) {
      const emptyPayload = {
        summary: {
          teamSize: 0,
          totalUpdates: 0,
          completedUpdates: 0,
          inProgressUpdates: 0,
          blockedUpdates: 0,
          unresolvedBlockers: 0,
          completionRate: 0,
          unresolvedBlockedRate: 0,
          avgHours: 0,
        },
        kpis: {
          dailySubmissionPercentage: 0,
          userEngagementRate: 0,
          unresolvedBlockerReductionPercentage: 0,
          managerInteractionFrequencyPerDay: 0,
          managerInteractionFrequencyPerUpdate: 0,
        },
        statusBreakdown: {
          COMPLETED: 0,
          IN_PROGRESS: 0,
          BLOCKED: 0,
        },
        perEmployee: [],
        trends: createDateBuckets(start, end),
        range: {
          from: start.toISOString(),
          to: end.toISOString(),
          days: rangeDays,
        },
      };

      if (redisClient.isOpen) {
        await redisClient.setEx(teamMetricsCacheKey, 120, JSON.stringify(emptyPayload));
      }

      return res.json(emptyPayload);
    }

    const updates = await Update.find({
      archived: false,
      userId: { $in: employeeIds },
      date: { $gte: start, $lte: end },
    })
      .select("_id status hours date userId")
      .lean();

    const maxDailyUpdatesSetting = await Settings.findOne({ key: "max_daily_updates" })
      .select("value")
      .lean();
    const configuredMaxDaily = Number(maxDailyUpdatesSetting?.value);
    const maxDailyUpdates = Number.isFinite(configuredMaxDaily)
      ? Math.max(1, Math.floor(configuredMaxDaily))
      : 5;

    const blockedIds = updates
      .filter((update) => update.status === "BLOCKED")
      .map((update) => update._id);

    const feedbackRows = blockedIds.length
      ? await Feedback.find({ updateId: { $in: blockedIds } }).select("updateId").lean()
      : [];

    const resolvedBlockedIdSet = new Set(feedbackRows.map((row) => String(row.updateId)));

    const updateIds = updates.map((update) => update._id);
    const managerFeedbackRowsInRange = updateIds.length
      ? await Feedback.find({
          updateId: { $in: updateIds },
          createdAt: { $gte: start, $lte: end },
        })
          .select("managerId")
          .lean()
      : [];

    const trends = createDateBuckets(start, end);
    const trendMap = Object.fromEntries(trends.map((item) => [item.date, item]));

    let totalUpdates = 0;
    let completedUpdates = 0;
    let inProgressUpdates = 0;
    let blockedUpdates = 0;
    let unresolvedBlockers = 0;
    let hoursTotal = 0;
    const activeEmployeeIds = new Set();
    const perEmployeeMap = new Map(
      employees.map((employee) => [String(employee._id), {
        employeeId: String(employee._id),
        name: employee.name,
        email: employee.email,
        totalUpdates: 0,
        completedUpdates: 0,
        inProgressUpdates: 0,
        blockedUpdates: 0,
        unresolvedBlockers: 0,
        completionRate: 0,
        avgHours: 0,
        hoursTotal: 0,
      }])
    );

    for (const update of updates) {
      const dayKey = toDayKey(update.date);
      const bucket = trendMap[dayKey];
      if (!bucket) {
        continue;
      }

      const employeeRow = perEmployeeMap.get(String(update.userId));

      totalUpdates += 1;
      activeEmployeeIds.add(String(update.userId));
      hoursTotal += Number(update.hours) || 0;
      bucket.total += 1;
      if (employeeRow) {
        employeeRow.totalUpdates += 1;
        employeeRow.hoursTotal += Number(update.hours) || 0;
      }

      if (update.status === "COMPLETED") {
        completedUpdates += 1;
        bucket.completed += 1;
        if (employeeRow) {
          employeeRow.completedUpdates += 1;
        }
      }

      if (update.status === "IN_PROGRESS") {
        inProgressUpdates += 1;
        if (employeeRow) {
          employeeRow.inProgressUpdates += 1;
        }
      }

      if (update.status === "BLOCKED") {
        blockedUpdates += 1;
        bucket.blocked += 1;
        if (employeeRow) {
          employeeRow.blockedUpdates += 1;
        }

        const unresolved = !resolvedBlockedIdSet.has(String(update._id));
        if (unresolved) {
          unresolvedBlockers += 1;
          bucket.unresolvedBlocked += 1;
          if (employeeRow) {
            employeeRow.unresolvedBlockers += 1;
          }
        }
      }
    }

    for (const bucket of trends) {
      bucket.completionRate = bucket.total
        ? Number(((bucket.completed / bucket.total) * 100).toFixed(1))
        : 0;
    }

    const completionRate = totalUpdates
      ? Number(((completedUpdates / totalUpdates) * 100).toFixed(1))
      : 0;
    const unresolvedBlockedRate = blockedUpdates
      ? Number(((unresolvedBlockers / blockedUpdates) * 100).toFixed(1))
      : 0;
    const avgHours = totalUpdates ? Number((hoursTotal / totalUpdates).toFixed(2)) : 0;

    const expectedSubmissions = employeeIds.length * rangeDays * maxDailyUpdates;
    const dailySubmissionPercentage = expectedSubmissions
      ? Number(((totalUpdates / expectedSubmissions) * 100).toFixed(1))
      : 0;
    const userEngagementRate = employeeIds.length
      ? Number(((activeEmployeeIds.size / employeeIds.length) * 100).toFixed(1))
      : 0;

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - rangeDays);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

    const prevBlockedUpdates = await Update.find({
      archived: false,
      userId: { $in: employeeIds },
      status: "BLOCKED",
      date: { $gte: prevStart, $lte: prevEnd },
    })
      .select("_id")
      .lean();

    const prevBlockedIds = prevBlockedUpdates.map((row) => row._id);
    const prevFeedbackRows = prevBlockedIds.length
      ? await Feedback.find({ updateId: { $in: prevBlockedIds } }).select("updateId").lean()
      : [];
    const prevResolvedSet = new Set(prevFeedbackRows.map((row) => String(row.updateId)));
    const prevUnresolvedCount = prevBlockedIds.filter(
      (id) => !prevResolvedSet.has(String(id))
    ).length;

    const unresolvedBlockerReductionPercentage = prevUnresolvedCount
      ? Number((((prevUnresolvedCount - unresolvedBlockers) / prevUnresolvedCount) * 100).toFixed(1))
      : 0;

    const managerInteractionFrequencyPerDay = Number(
      (managerFeedbackRowsInRange.length / rangeDays).toFixed(2)
    );
    const managerInteractionFrequencyPerUpdate = totalUpdates
      ? Number(((managerFeedbackRowsInRange.length / totalUpdates) * 100).toFixed(1))
      : 0;
    const perEmployee = Array.from(perEmployeeMap.values())
      .map((row) => ({
        ...row,
        completionRate: row.totalUpdates
          ? Number(((row.completedUpdates / row.totalUpdates) * 100).toFixed(1))
          : 0,
        avgHours: row.totalUpdates
          ? Number((row.hoursTotal / row.totalUpdates).toFixed(2))
          : 0,
      }))
      .map(({ hoursTotal: _hoursTotal, ...row }) => row)
      .sort((a, b) => b.totalUpdates - a.totalUpdates);

    const payload = {
      summary: {
        teamSize: employeeIds.length,
        totalUpdates,
        completedUpdates,
        inProgressUpdates,
        blockedUpdates,
        unresolvedBlockers,
        completionRate,
        unresolvedBlockedRate,
        avgHours,
      },
      kpis: {
        dailySubmissionPercentage,
        userEngagementRate,
        unresolvedBlockerReductionPercentage,
        managerInteractionFrequencyPerDay,
        managerInteractionFrequencyPerUpdate,
      },
      statusBreakdown: {
        COMPLETED: completedUpdates,
        IN_PROGRESS: inProgressUpdates,
        BLOCKED: blockedUpdates,
      },
      perEmployee,
      trends,
      range: {
        from: start.toISOString(),
        to: end.toISOString(),
        days: rangeDays,
      },
    };

    if (redisClient.isOpen) {
      await redisClient.setEx(teamMetricsCacheKey, 120, JSON.stringify(payload));
    }

    return res.json(payload);
  } catch (error) {
    console.error("Team metrics error:", error);
    return res.status(500).json({
      message: "Failed to fetch team metrics",
      error: error.message,
    });
  }
};