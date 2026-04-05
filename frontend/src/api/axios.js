import axios from "axios";

const api = axios.create({
  baseURL: "https://worksync-t4n2.onrender.com/api",
  timeout: 15000, // 15 second timeout
});

// Request interceptor - add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      error.message = "Request timeout - server is not responding";
    } else if (!error.response) {
      error.message = "Network error - unable to reach server";
    }
    return Promise.reject(error);
  }
);

export default api;