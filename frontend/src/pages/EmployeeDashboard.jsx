import { useEffect, useState } from "react";
import api from "../api/axios";
import DashboardLayout from "../components/layout/DashboardLayout";
import StatsCard from "../components/dashboard/StatsCard";
import UpdateTable from "../components/dashboard/UpdateTable";
import UpdateForm from "../components/forms/UpdateForm";
import { toast } from "sonner";

export default function EmployeeDashboard() {
  const [stats, setStats] = useState({});
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <UpdateTable updates={updates} />
        </>
      )}
    </DashboardLayout>
  );
}