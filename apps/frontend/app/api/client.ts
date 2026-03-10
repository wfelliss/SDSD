import axios from "axios";
import { redirect } from "react-router";

export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/api",
})

// Attach the stored auth token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {

    const isBackendDown = 
      error.code === "ERR_NETWORK" || 
      error.code === "ECONNREFUSED" ||
      error instanceof AggregateError ||
      error.response?.status === 503 ||
      error.response?.status === 500;

    if (isBackendDown) {
      throw redirect("/maintenance")
    }
    return Promise.reject(error);
  }
);