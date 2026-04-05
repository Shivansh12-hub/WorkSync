import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="w-64 bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-lg min-h-screen p-5">
      <h1 className="text-2xl font-bold mb-8">WorkSync</h1>

      <div className="bg-blue-500 bg-opacity-50 rounded-lg p-4 mb-6">
        <p className="text-sm">Logged in as:</p>
        <p className="font-semibold text-lg">{user?.name || "User"}</p>
        <p className="text-xs text-blue-100">Role: {user?.role || "N/A"}</p>
      </div>

      <nav className="space-y-4">
        {user?.role === "MANAGER" ? (
          <Link
            to="/manager"
            className="block hover:bg-blue-700 px-3 py-2 rounded transition"
          >
            Team Dashboard
          </Link>
        ) : (
          <Link
            to="/employee"
            className="block hover:bg-blue-700 px-3 py-2 rounded transition"
          >
            My Dashboard
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-left text-red-300 hover:text-red-100 hover:bg-red-600 hover:bg-opacity-30 px-3 py-2 rounded transition"
        >
          Logout
        </button>
      </nav>
    </div>
  );
}