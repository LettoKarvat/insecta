import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { DashboardStats, ServiceOrder } from "@/types/api";

/**
 * Coleta KPIs do dashboard usando os endpoints existentes do backend:
 * - /service-orders?date_from=ISO-30d&limit=200  -> conta por status
 * - /products?only_critical=true&limit=200       -> total de críticos
 * OBS: Para bases grandes, ideal ter endpoints agregados no backend.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const params = {
        date_from: d30.toISOString().slice(0, 19) + "Z", // ISO sem timezone local
        limit: 200,
      };

      const [ordersRes, criticalRes] = await Promise.all([
        apiClient.get("/service-orders", { params }),
        apiClient.get("/products", {
          params: { only_critical: true, limit: 200 },
        }),
      ]);

      const orders: ServiceOrder[] =
        ordersRes.data.items || ordersRes.data || [];
      const open = orders.filter((o) => o.status === "Aberta").length;
      const inProgress = orders.filter(
        (o) => o.status === "Em Andamento"
      ).length;
      const completed = orders.filter((o) => o.status === "Concluída").length;

      const criticalCount = criticalRes.data.items
        ? criticalRes.data.items.length
        : criticalRes.data.length || 0;

      return {
        open_orders: open,
        in_progress_orders: inProgress,
        completed_orders: completed,
        critical_products: criticalCount,
      };
    },
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Próximas OS agendadas a partir de agora (limit default=5).
 */
export function useUpcomingOrders(limit = 5) {
  return useQuery({
    queryKey: ["dashboard", "upcoming-orders", limit],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const nowIso = new Date().toISOString().slice(0, 19) + "Z";
      const params = { date_from: nowIso, limit };
      const response = await apiClient.get("/service-orders", { params });
      const items: ServiceOrder[] = response.data.items || response.data || [];
      // Ordena client-side por scheduled_at asc e limita
      return items
        .filter((o) => !!o.scheduled_at)
        .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))
        .slice(0, limit);
    },
    staleTime: 60000,
  });
}
