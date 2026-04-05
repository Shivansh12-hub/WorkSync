import { useState } from "react";
import api from "../../api/axios";
import { toast } from "sonner";

export default function UpdateForm({ refreshUpdates }) {
  const [form, setForm] = useState({
    description: "",
    hours: "",
    status: "IN_PROGRESS",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/updates", form);

      setForm({
        description: "",
        hours: "",
        status: "IN_PROGRESS",
      });

      toast.success("Update submitted successfully!");
      refreshUpdates();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to submit update";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow rounded-xl p-5 mt-6"
    >
      <h2 className="text-xl font-semibold mb-4">Submit Update</h2>

      <textarea
        value={form.description}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
        className="w-full border rounded p-3 mb-4"
        placeholder="What did you work on today?"
        required
      />

      <input
        type="number"
        value={form.hours}
        onChange={(e) =>
          setForm({ ...form, hours: e.target.value })
        }
        className="w-full border rounded p-3 mb-4"
        placeholder="Hours worked"
        required
      />

      <select
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: e.target.value })
        }
        className="w-full border rounded p-3 mb-4"
      >
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="BLOCKED">Blocked</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}