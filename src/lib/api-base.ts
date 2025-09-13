// src/lib/api-base.ts
export function getApiBaseUrl() {
  const env = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (env && env.trim()) return env.replace(/\/+$/, "");

  const origin = window.location.origin;
  const host = window.location.host; // ex.: localhost:5173
  const isDevPort = /:(5173|5174|3000|8080|8000)$/.test(host);

  if (isDevPort) {
    const proto = window.location.protocol || "http:";
    // Em dev, chama direto o Flask em 5000:
    return `${proto}//127.0.0.1:5000/api/v1`;
  }

  // Produção (mesma origem com /api/v1 atrás de um reverse proxy)
  return `${origin}/api/v1`.replace(/\/+$/, "");
}
