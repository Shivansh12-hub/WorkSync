import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Invalid email format";
    if (!form.password || form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      const toastId = toast.loading("Creating account...");
      const res = await api.post("/auth/register", form);
      
      toast.dismiss(toastId);
      toast.success("Registration successful!");
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setTimeout(() => {
        if (res.data.user.role === "MANAGER") {
          navigate("/manager");
        } else {
          navigate("/employee");
        }
      }, 1000);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again.";
      toast.error(msg);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-2xl rounded-xl p-8 w-96"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">WorkSync</h1>
          <p className="text-gray-600 text-sm">Create your account</p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className={`w-full border-2 p-3 rounded-lg transition ${
                errors.name ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:border-blue-500`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className={`w-full border-2 p-3 rounded-lg transition ${
                errors.email ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:border-blue-500`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password (min. 6 characters)"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              className={`w-full border-2 p-3 rounded-lg transition ${
                errors.password ? "border-red-500" : "border-gray-300"
              } focus:outline-none focus:border-blue-500`}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
              className="w-full border-2 border-gray-300 p-3 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-6 font-semibold transition"
        >
          {loading ? "Creating Account..." : "Register"}
        </button>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600 hover:underline font-semibold">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
