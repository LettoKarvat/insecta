import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "@/lib/api-base";

/** Sempre transforma payload de erro em string legível */
export function formatApiError(err: any): string {
  try {
    const resp = err?.response;
    const data = resp?.data;

    if (typeof data === "string") return data;
    if (data?.detail && typeof data.detail === "string") return data.detail;
    if (data?.title && typeof data.title === "string") return data.title;
    if (data?.message && typeof data.message === "string") return data.message;

    if (data?.detail && typeof data.detail === "object") {
      // detail pode ser um bag { errors: {...} }
      const d = data.detail as any;
      if (d?.errors && typeof d.errors === "object") {
        const parts = Object.entries(d.errors).map(([k, v]) => {
          const text = Array.isArray(v) ? v.join(", ") : String(v);
          return `${k}: ${text}`;
        });
        return parts.join(" • ");
      }
    }

    if (data?.errors && typeof data.errors === "object") {
      const parts = Object.entries(data.errors).map(([k, v]) => {
        const text = Array.isArray(v) ? v.join(", ") : String(v);
        return `${k}: ${text}`;
      });
      return parts.join(" • ");
    }

    if (resp?.status) {
      return `${resp.status} ${resp.statusText || "Erro"}`;
    }

    return err?.message || "Falha na requisição";
  } catch {
    return "Erro inesperado";
  }
}

const RAW = getApiBaseUrl();
export const BASE_URL = (RAW || "/api/v1").replace(/\/+$/, "");

// Detecta host do ngrok p/ setar header
const IS_NGROK = (() => {
  try {
    const host = new URL(BASE_URL, window.location.href).hostname;
    return /(^|\.)ngrok(-free)?\.app$/i.test(host);
  } catch {
    return false;
  }
})();

const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === "true";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
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
    let message = formatApiError(error);

    if (error.code === "ERR_NETWORK") {
      message =
        "Falha de rede/CORS. Verifique o ngrok e os domínios liberados no CORS do backend.";
    }

    toast.error(String(message));
    return Promise.reject(error);
  }
);

export default apiClient;
