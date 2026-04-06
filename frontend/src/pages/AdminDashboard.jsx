import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import StatsCard from "../components/dashboard/StatsCard";
import axios from "../api/axios";
import { toast } from "sonner";
import { Users, Settings, Plus, Trash2, Edit } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilters.search) params.append("search", activeFilters.search);
      if (activeFilters.role) params.append("role", activeFilters.role);

      const queryString = params.toString();
      const [usersRes, settingsRes, statsRes] = await Promise.all([
        axios.get(`/admin/users${queryString ? `?${queryString}` : ""}`),
        axios.get("/admin/settings"),
        axios.get("/admin/stats"),
      ]);

      setUsers(usersRes.data.users || []);
      setSettings(settingsRes.data.settings || []);
      setStats(statsRes.data);
      toast.success("Data loaded successfully");
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error(error.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    fetchAdminData(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = { search: "", role: "" };
    setFilters(clearedFilters);
    fetchAdminData(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.role;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/admin/users", formData);
      setUsers([response.data.user, ...users]);
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE" });
      setShowUserForm(false);
      toast.success("User created successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const response = await axios.put(`/admin/users/${userId}`, {
        role: newRole,
      });
      setUsers(users.map((u) => (u._id === userId ? response.data.user : u)));
      setEditingUserId(null);
      toast.success("User role updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId));
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleUpdateSetting = async (key, newValue) => {
    try {
      const response = await axios.put(`/admin/settings/${key}`, {
        key,
        value: newValue,
      });
      setSettings(
        settings.map((s) => (s.key === key ? response.data.setting : s))
      );
      toast.success("Setting updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update setting");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">System administration and management</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard title="Total Users" value={stats.totalUsers} />
            <StatsCard title="Employees" value={stats.employeeCount} />
            <StatsCard title="Managers" value={stats.managerCount} />
            <StatsCard title="Admins" value={stats.adminCount} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 px-4 font-medium transition ${
              activeTab === "users"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="inline-block w-5 h-5 mr-2" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 px-4 font-medium transition ${
              activeTab === "settings"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Settings className="inline-block w-5 h-5 mr-2" />
            System Settings
          </button>
        </div>

        {loading && <p className="text-center text-gray-500">Loading...</p>}

        {/* User Management Tab */}
        {activeTab === "users" && !loading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search by name or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={filters.role}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleClearFilters}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
                >
                  Clear Filters
                </button>
                {hasActiveFilters && (
                  <span className="self-center text-sm text-blue-700 font-medium">
                    Filters Active
                  </span>
                )}
              </div>
            </div>

            {/* Create User Form */}
            {showUserForm && (
              <form
                onSubmit={handleCreateUser}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {editingUserId === user._id ? (
                            <select
                              value={editingRole}
                              onChange={(e) =>
                                handleUpdateUserRole(user._id, e.target.value)
                              }
                              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="EMPLOYEE">Employee</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.role === "ADMIN"
                                  ? "bg-red-100 text-red-800"
                                  : user.role === "MANAGER"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button
                            onClick={() => {
                              setEditingUserId(
                                editingUserId === user._id ? null : user._id
                              );
                              setEditingRole(user.role);
                            }}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          {user.role !== "ADMIN" && (
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && !loading && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {settings.length > 0 ? (
                settings
                  .filter((setting) => setting.key !== "max_daily_updates")
                  .map((setting) => (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {setting.description || setting.key}
                      </h3>
                      <p className="text-sm text-gray-600">{setting.key}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {setting.type === "boolean" ? (
                        <button
                          onClick={() =>
                            handleUpdateSetting(setting.key, !setting.value)
                          }
                          className={`px-4 py-2 rounded-lg text-white transition ${
                            setting.value
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-400 hover:bg-gray-500"
                          }`}
                        >
                          {setting.value ? "Enabled" : "Disabled"}
                        </button>
                      ) : (
                        <input
                          type={setting.type === "number" ? "number" : "text"}
                          value={setting.value}
                          onChange={(e) => {
                            const newValue =
                              setting.type === "number"
                                ? parseFloat(e.target.value)
                                : e.target.value;
                            handleUpdateSetting(setting.key, newValue);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                        />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No settings found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
