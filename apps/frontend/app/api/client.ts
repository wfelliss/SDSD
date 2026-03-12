import axios from "axios";
import { redirect } from "react-router";

export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/api",
  withCredentials: true,
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