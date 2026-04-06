export const cacheKeys = {
  dashboardStats: (scope) => `dashboard:stats:${scope}`,
  teamMetrics: ({ requesterId, employeeId = "all", dateFrom = "na", dateTo = "na" }) =>
    `dashboard:team-metrics:${requesterId}:${employeeId}:${dateFrom}:${dateTo}`,
  notifications: ({ userId, unreadOnly }) =>
    `notifications:${userId}:unread:${unreadOnly ? "1" : "0"}`,
};
