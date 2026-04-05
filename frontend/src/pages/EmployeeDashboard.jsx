import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import StatsCard from "../components/dashboard/StatsCard";
import UpdateTable from "../components/dashboard/UpdateTable";
import UpdateForm from "../components/forms/UpdateForm";
import { toast } from "sonner";
import { X, MessageCircle } from "lucide-react";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState({});
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await api.get("/dashboard/stats");
      const updatesRes = await api.get("/updates/me");

      setStats(statsRes.data);
      setUpdates(updatesRes.data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewFeedback = async (update) => {
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

  const handleCloseModal = () => {
    setSelectedUpdate(null);
    setFeedbackList([]);
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Employee Dashboard</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatsCard title="Total" value={stats.total || 0} />
            <StatsCard title="Completed" value={stats.completed || 0} />
            <StatsCard title="Blocked" value={stats.blocked || 0} />
          </div>

          <UpdateForm refreshUpdates={fetchData} />
          <UpdateTable
            updates={updates}
            onSelectUpdate={handleViewFeedback}
            showFeedbackButton={true}
          />
        </>
      )}

      {/* Feedback View Modal */}
      {selectedUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start sticky top-0 bg-white pb-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedUpdate.description}
                </h3>
                <p className="text-sm text-gray-600">Your Update</p>
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
              <div className="text-center py-4 text-gray-500">
                Loading feedback...
              </div>
            ) : feedbackList && feedbackList.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Manager Feedback ({feedbackList.length})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {feedbackList.map((fb) => (
                    <div
                      key={fb._id}
                      className="bg-green-50 border-l-4 border-green-500 p-3 rounded"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-sm text-green-900">
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
              <p className="text-sm text-gray-500 italic">
                No feedback yet. Check back soon!
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}