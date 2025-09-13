// src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { getApiBaseUrl } from "@/lib/api-base";

// Base da API (usa VITE_API_URL se existir; senão, detecta dev/prod)
const RAW = getApiBaseUrl(); // ex.:"http://127.0.0.1:5000/api/v1" ou "https://xxxx.ngrok-free.app/api/v1"
export const BASE_URL = (RAW || "/api/v1").replace(/\/+$/, ""); // sem barra no fim

// Detecta host do ngrok para pular o aviso
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
  baseURL: "https://995ea42fe982.ngrok-free.app" + "/api/v1",
  withCredentials: false, // usamos Bearer, não cookies
  timeout: 30000,
  headers: IS_NGROK ? { "ngrok-skip-browser-warning": "true" } : undefined,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Garante que a URL do request seja sempre relativa à base: "/foo"
  if (config.url && !config.url.startsWith("/")) config.url = `/${config.url}`;

  // Headers
  config.headers = config.headers ?? {};

  // Header do ngrok (garante mesmo se alguém sobrescrever em outro lugar)
  if (IS_NGROK) {
    (config.headers as any)["ngrok-skip-browser-warning"] = "true";
  }

  // Auth opcional via Bearer
  if (ENABLE_AUTH) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  // Content-Type: só define JSON se NÃO for FormData
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    // deixa o browser setar o boundary do multipart
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

    // Mensagem mais clara para falhas de rede/CORS/preflight
    if (error.code === "ERR_NETWORK") {
      message =
        "Falha de rede/CORS. Use proxy do Vite (server.proxy) ou habilite CORS no backend.";
    }

    toast.error(String(message));
    return Promise.reject(error);
  }
);

export default apiClient;
