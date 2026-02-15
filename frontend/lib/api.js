import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000/api" : null);

if (!baseURL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
}

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
