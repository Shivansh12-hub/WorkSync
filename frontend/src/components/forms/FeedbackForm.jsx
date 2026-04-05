import { useState } from "react";
import axios from "../../api/axios";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function FeedbackForm({ updateId, onFeedbackSubmitted }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/feedback", {
        updateId,
        comment: comment.trim(),
      });

      setComment("");
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Feedback
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your feedback..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows="3"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        <Send className="w-4 h-4" />
        {loading ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
}
