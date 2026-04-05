import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import UpdateTable from "../components/dashboard/UpdateTable";
import { toast } from "sonner";

export default function ManagerDashboard() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
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

    fetchTeam();
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <UpdateTable updates={updates} />
      )}
    </DashboardLayout>
  );
}