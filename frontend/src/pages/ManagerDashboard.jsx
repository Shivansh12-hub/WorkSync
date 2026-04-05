import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import UpdateTable from "../components/dashboard/UpdateTable";
import FeedbackForm from "../components/forms/FeedbackForm";
import { toast } from "sonner";
import { X, MessageCircle } from "lucide-react";

export default function ManagerDashboard() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetchTeamUpdates();
  }, []);

  const fetchTeamUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/updates/team");
      setUpdates(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch team updates";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Team Updates</h2>
              <button
                onClick={fetchTeamUpdates}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
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