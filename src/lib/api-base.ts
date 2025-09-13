// src/lib/api-base.ts
function normalizeApiBase(raw: string): string {
  let url = raw.trim();

  // garante protocolo
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  // remove barras finais
  url = url.replace(/\/+$/, "");

  // assegura /api/v1 no path, se ainda não houver /api
  try {
    const u = new URL(url);
    const hasApi = /\/api(\/v\d+)?$/i.test(u.pathname);
    if (!hasApi) {
      const basePath = u.pathname.replace(/\/+$/, "");
      u.pathname = `${basePath}/api/v1`;
    }
    return u.toString().replace(/\/+$/, "");
  } catch {
    // fallback bruto (não deve ocorrer)
    return url;
  }
}

export function isNgrokUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)ngrok(-free)?\.app$/i.test(host);
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  const env = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (env && env.trim()) return normalizeApiBase(env);

  const origin = window.location.origin;
  const host = window.location.host; // ex.: localhost:5173
  const isDevPort = /:(5173|5174|3000|8080|8000)$/.test(host);

  if (isDevPort) {
    // Em dev, chama direto o Flask em 5000:
    return `https://995ea42fe982.ngrok-free.app/api/v1`;
  }

  // Produção (mesma origem com /api/v1 atrás de um reverse proxy)
  return `${origin}/api/v1`.replace(/\/+$/, "");
}
