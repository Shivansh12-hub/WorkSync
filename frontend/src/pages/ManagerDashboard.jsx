import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import UpdateTable from "../components/dashboard/UpdateTable";
import StatsCard from "../components/dashboard/StatsCard";
import FeedbackForm from "../components/forms/FeedbackForm";
import { toast } from "sonner";
import { X, MessageCircle, Filter } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ManagerDashboard() {
  const defaultFilters = {
    status: "",
    employeeId: "",
    dateFrom: "",
    dateTo: "",
  };

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [teamMetrics, setTeamMetrics] = useState({ summary: {}, trends: [] });
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    fetchTeamUpdates();
    fetchEmployees();
    fetchTeamMetrics();
  }, []);

  const fetchTeamMetrics = async (activeFilters = appliedFilters) => {
    try {
      setMetricsLoading(true);
      const params = new URLSearchParams();

      if (activeFilters.employeeId) params.append("employeeId", activeFilters.employeeId);
      if (activeFilters.dateFrom) params.append("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.append("dateTo", activeFilters.dateTo);

      const queryString = params.toString();
      const res = await api.get(`/dashboard/team-metrics${queryString ? `?${queryString}` : ""}`);
      const summary = res.data?.summary || {};
      const trends = Array.isArray(res.data?.trends) ? res.data.trends : [];

      setTeamMetrics({ summary, trends });
    } catch (error) {
      console.error("Error fetching team metrics:", error);
      toast.error(error.response?.data?.message || "Failed to fetch team metrics");
      setTeamMetrics({ summary: {}, trends: [] });
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/updates/employees");
      const emps = Array.isArray(res.data?.users) ? res.data.users : [];
      setEmployees(emps);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchTeamUpdates = async (activeFilters = appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeFilters.status) params.append("status", activeFilters.status);
      if (activeFilters.employeeId) params.append("employeeId", activeFilters.employeeId);
      if (activeFilters.dateFrom) params.append("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.append("dateTo", activeFilters.dateTo);

      const queryString = params.toString();
      console.log("Sending filters to backend:", { activeFilters, queryString });

      const res = await api.get(`/updates/team?${queryString}`);
      const serverUpdates = Array.isArray(res.data?.updates)
        ? res.data.updates
        : Array.isArray(res.data)
        ? res.data
        : [];

      // Defensive client-side filtering to keep UI consistent even if backend ignores a query param.
      const filteredUpdates = serverUpdates.filter((update) => {
        if (activeFilters.status && update.status !== activeFilters.status) {
          return false;
        }
        if (activeFilters.employeeId && update.userId?._id !== activeFilters.employeeId) {
          return false;
        }
        if (activeFilters.dateFrom) {
          const from = new Date(activeFilters.dateFrom);
          const updateDate = new Date(update.createdAt || update.date);
          if (updateDate < from) {
            return false;
          }
        }
        if (activeFilters.dateTo) {
          const to = new Date(activeFilters.dateTo);
          to.setHours(23, 59, 59, 999);
          const updateDate = new Date(update.createdAt || update.date);
          if (updateDate > to) {
            return false;
          }
        }
        return true;
      });

      console.log("Received updates from backend:", serverUpdates);
      console.log("Updates after client-side filter:", filteredUpdates);
      setUpdates(filteredUpdates);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch team updates";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const nextFilters = {
      ...filters,
      [name]: value,
    };

    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    fetchTeamUpdates(nextFilters);
    fetchTeamMetrics(nextFilters);
  };

  const handleApplyFilters = () => {
    fetchTeamUpdates(filters);
    setAppliedFilters(filters);
    fetchTeamMetrics(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = { ...defaultFilters };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    fetchTeamUpdates(clearedFilters);
    fetchTeamMetrics(clearedFilters);
    setShowFilters(false);
  };

  const hasActiveFilters =
    appliedFilters.status ||
    appliedFilters.employeeId ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo;

  const handleSelectUpdate = async (update) => {
    setSelectedUpdate(update);
    fetchFeedback(update._id);
  };

  const fetchFeedback = async (updateId) => {
    try {
      setFeedbackLoading(true);
      const res = await api.get(`/feedback/${updateId}`);
      setFeedbackList(res.data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      setFeedbackList([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFeedbackSubmitted = () => {
    // Refresh feedback list after submission
    if (selectedUpdate) {
      fetchFeedback(selectedUpdate._id);
      toast.success("Feedback submitted successfully");
    }
  };

  const handleCloseModal = () => {
    setSelectedUpdate(null);
    setFeedbackList([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
              <StatsCard title="Team Size" value={teamMetrics.summary.teamSize || 0} />
              <StatsCard title="Total Updates" value={teamMetrics.summary.totalUpdates || 0} />
              <StatsCard title="Completed" value={teamMetrics.summary.completedUpdates || 0} />
              <StatsCard title="Blocked" value={teamMetrics.summary.blockedUpdates || 0} />
              <StatsCard
                title="Unresolved Blockers"
                value={teamMetrics.summary.unresolvedBlockers || 0}
              />
              <StatsCard
                title="Completion Rate"
                value={`${teamMetrics.summary.completionRate || 0}%`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Daily Submission %"
                value={`${teamMetrics.kpis?.dailySubmissionPercentage || 0}%`}
              />
              <StatsCard
                title="Engagement Rate"
                value={`${teamMetrics.kpis?.userEngagementRate || 0}%`}
              />
              <StatsCard
                title="Blocker Reduction %"
                value={`${teamMetrics.kpis?.unresolvedBlockerReductionPercentage || 0}%`}
              />
              <StatsCard
                title="Manager Interactions/Day"
                value={teamMetrics.kpis?.managerInteractionFrequencyPerDay || 0}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Time-Based Completion Trend
                </h3>
                <div className="h-64">
                  {metricsLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                      Loading metrics...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={teamMetrics.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="completed"
                          stroke="#16a34a"
                          strokeWidth={2}
                          name="Completed"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="completionRate"
                          stroke="#2563eb"
                          strokeWidth={2}
                          name="Completion %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Blocked vs Unresolved Trend
                </h3>
                <div className="h-64">
                  {metricsLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                      Loading metrics...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamMetrics.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="blocked" fill="#f97316" name="Blocked" />
                        <Bar
                          dataKey="unresolvedBlocked"
                          fill="#dc2626"
                          name="Unresolved"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Team Updates
                {hasActiveFilters && (
                  <span className="ml-3 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Filters Active
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    hasActiveFilters
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-600 text-white hover:bg-gray-700"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <button
                  onClick={() => {
                    fetchTeamUpdates(appliedFilters);
                    fetchTeamMetrics(appliedFilters);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee
                    </label>
                    <select
                      name="employeeId"
                      value={filters.employeeId}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      name="dateFrom"
                      value={filters.dateFrom}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      name="dateTo"
                      value={filters.dateTo}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            <UpdateTable
              updates={updates}
              onSelectUpdate={handleSelectUpdate}
              showActions={true}
            />
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {selectedUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start sticky top-0 bg-white pb-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedUpdate.description}
                </h3>
                <p className="text-sm text-gray-600">
                  By: {selectedUpdate.userId?.name || "Unknown"}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
              <p>
                <strong>Hours:</strong> {selectedUpdate.hours}h
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    selectedUpdate.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : selectedUpdate.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedUpdate.status}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Submitted: {new Date(selectedUpdate.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Feedback List */}
            {feedbackLoading ? (
              <div className="text-center py-4 text-gray-500">Loading feedback...</div>
            ) : feedbackList && feedbackList.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Feedback ({feedbackList.length})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {feedbackList.map((fb) => (
                    <div
                      key={fb._id}
                      className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-sm text-blue-900">
                          {fb.managerId?.name || "Manager"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(fb.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700">{fb.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No feedback yet</p>
            )}

            {/* Feedback Form - Always at bottom */}
            <div className="border-t pt-4 mt-4">
              <FeedbackForm
                updateId={selectedUpdate._id}
                onFeedbackSubmitted={handleFeedbackSubmitted}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}