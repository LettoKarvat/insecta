import { PageShell } from "@/components/layout/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, useUpcomingOrders } from "@/api/hooks/useDashboard";
import { formatDateTime } from "@/lib/utils";
import { ClipboardList, CheckCircle, AlertTriangle } from "lucide-react"; // ← removido Clock
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: upcomingOrders, isLoading: ordersLoading } =
    useUpcomingOrders();

  const kpis = [
    {
      title: "OS Abertas",
      value: stats?.open_orders || 0,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    // ← removido o card "Em Andamento"
    {
      title: "Concluídas",
      value: stats?.completed_orders || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Produtos Críticos",
      value: stats?.critical_products || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ];

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageShell title="Dashboard" description="Visão geral dos últimos 30 dias">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {kpi.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${kpi.bgColor}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Ordens de Serviço</CardTitle>
            <CardDescription>Os 5 próximos agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-md border animate-pulse"
                  >
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-24" />
                    </div>
                    <div className="h-6 bg-muted rounded w-16" />
                  </div>
                ))}
              </div>
            ) : upcomingOrders?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma ordem agendada
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingOrders?.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <Link
                      to={`/ordens-servico/${order.id}`}
                      className="flex justify-between items-center p-3 rounded-md border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{order.public_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.client?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.scheduled_at)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {order.status === "pending"
                          ? "Pendente"
                          : order.status === "in_progress"
                          ? "Em andamento"
                          : order.status === "completed"
                          ? "Concluída"
                          : "Cancelada"}
                      </Badge>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <Link
                to="/ordens-servico"
                className="text-sm text-primary hover:underline"
              >
                Ver todas as ordens →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos em Baixo Estoque</CardTitle>
            <CardDescription>Itens que precisam de reposição</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Carregando produtos críticos...</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/produtos?only_critical=true"
                className="text-sm text-primary hover:underline"
              >
                Ver estoque completo →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function DashboardSkeleton() {
  return (
    <PageShell title="Dashboard" description="Carregando...">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
