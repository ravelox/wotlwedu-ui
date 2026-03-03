import axios from "axios";
import { getAuthToken } from "./session";

export function createApi(baseURL, onUnauthorized) {
  const api = axios.create({
    baseURL,
    timeout: 30000,
    validateStatus: () => true,
  });

  api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;
    if (!isFormData) {
      config.headers["Content-Type"] =
        config.headers["Content-Type"] || "application/json";
    }

    return config;
  });

  api.interceptors.response.use((response) => {
    if ((response.status === 401 || response.status === 403) && onUnauthorized) {
      onUnauthorized(response);
    }
    return response;
  });

  return api;
}

export function toApiError(response, fallback = "Request failed") {
  if (!response) return new Error(fallback);
  const message =
    response.data?.message ||
    response.data?.error ||
    response.statusText ||
    fallback;
  return new Error(`${message} (HTTP ${response.status})`);
}

export function extractCollection(response, key) {
  return response?.data?.data?.[key] || response?.data?.[key] || [];
}

export function extractEntity(response, key) {
  return response?.data?.data?.[key] || response?.data?.[key] || null;
}
