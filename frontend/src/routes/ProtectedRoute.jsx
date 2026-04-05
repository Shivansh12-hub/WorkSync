import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (!token) {
    return <Navigate to="/" />;
  }

  if (requiredRole && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== requiredRole) {
        // Redirect to appropriate dashboard based on user role
        const roleRoutes = {
          EMPLOYEE: "/employee",
          MANAGER: "/manager",
          ADMIN: "/admin",
        };
        return <Navigate to={roleRoutes[user.role] || "/"} />;
      }
    } catch (error) {
      console.error("Error parsing user:", error);
      return <Navigate to="/" />;
    }
  }

  return children;
}