// src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "@/lib/api-base";

const BASE_URL = getApiBaseUrl().replace(/\/+$/, ""); // garante sem barra final

// Detecta host do ngrok p/ setar header
const IS_NGROK = (() => {
  try {
    const host = new URL(BASE_URL).hostname;
    return /(^|\.)ngrok(-free)?\.app$/i.test(host);
  } catch {
    return false;
  }
})();

const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === "true";

export const apiClient = axios.create({
  baseURL: BASE_URL, // <-- sempre ngrok
  withCredentials: false, // usamos Bearer, não cookies
  timeout: 30000,
  headers: IS_NGROK ? { "ngrok-skip-browser-warning": "true" } : undefined,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Garante caminho relativo
  if (config.url && !config.url.startsWith("/")) config.url = `/${config.url}`;

  // Headers base
  config.headers = config.headers ?? {};
  if (IS_NGROK) {
    (config.headers as any)["ngrok-skip-browser-warning"] = "true";
  }

  // Auth opcional via Bearer
  if (ENABLE_AUTH) {
    const token = localStorage.getItem("auth_token");
    if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  }

  // Content-Type: não force para FormData
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData) {
    delete (config.headers as any)["Content-Type"];
  } else if (!(config.headers as any)["Content-Type"]) {
    (config.headers as any)["Content-Type"] = "application/json";
  }

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    let message = "Erro de conexão";
    if (error.response) {
      const data = error.response.data as any;
      message =
        data?.detail ||
        data?.title ||
        data?.message ||
        `${error.response.status} ${error.response.statusText}`;
    } else if (error.message) {
      message = error.message;
    }

    if (error.code === "ERR_NETWORK") {
      message =
        "Falha de rede/CORS. Verifique o ngrok e os domínios liberados no CORS do backend.";
    }

    toast.error(String(message));
    return Promise.reject(error);
  }
);

export default apiClient;
