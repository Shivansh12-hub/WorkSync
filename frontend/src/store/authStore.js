import { create } from "zustand";
import api from "../api/axios";

let persistedUser = null;
try {
  persistedUser = JSON.parse(localStorage.getItem("user"));
} catch {
  persistedUser = null;
}

const useAuthStore = create((set) => ({
  user: persistedUser,
  token: persistedUser ? localStorage.getItem("token") || null : null,
  isLoading: false,

  login: async (email, password, navigate) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      set({
        token: res.data.token,
        user: res.data.user,
        isLoading: false,
      });

      if (res.data.user.role === "ADMIN") {
        navigate("/admin");
      } else if (res.data.user.role === "MANAGER") {
        navigate("/manager");
      } else {
        navigate("/employee");
      }

      return res.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password, role, navigate) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/auth/register", { name, email, password, role });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      set({
        token: res.data.token,
        user: res.data.user,
        isLoading: false,
      });

      if (res.data.user.role === "ADMIN") {
        navigate("/admin");
      } else if (res.data.user.role === "MANAGER") {
        navigate("/manager");
      } else {
        navigate("/employee");
      }

      return res.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, token: null });
  },
}));

export default useAuthStore;