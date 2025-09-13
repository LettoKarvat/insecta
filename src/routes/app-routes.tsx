// src/app/routes.tsx
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import { Dashboard } from "@/pages/dashboard/dashboard";
import { Clients } from "@/pages/clients/clients";
import ClientDetails from "@/pages/clients/client-details";
import { Products } from "@/pages/products/products";
import { NewProduct } from "@/pages/products/new-product";
import ProductDetails from "@/pages/products/product-details";
import ServiceOrdersPage from "@/pages/service-orders/service-orders";
import ServiceOrderDetailPage from "@/pages/service-orders/service-order-detail";
import ServiceOrderEditPage from "@/pages/service-orders/service-order-edit";
import { NewServiceOrder } from "@/pages/service-orders/new-service-order";
import { Calendar } from "@/pages/calendar/calendar";
import { Settings } from "@/pages/settings/settings";

// ✅ IMPORTS FAES com casing consistente
import FAESFormPage from "@/pages/faes/FAESFormPage";
import FAESListPage from "@/pages/faes/FAESListPage";
import FAESDetailPage from "@/pages/faes/FAESDetailPage";

function RouteErrorBoundary() {
  const err = useRouteError();
  const isRR = isRouteErrorResponse(err as any);
  const status = isRR
    ? (err as any).status
    : (err as any)?.status || (err as any)?.response?.status;

  let title = "Ocorreu um erro";
  let desc = "Tente novamente ou volte para a página inicial.";

  if (status === 404) {
    title = "Página não encontrada";
    desc = "O recurso solicitado não existe.";
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">{title}</h1>
      <p className="text-muted-foreground mb-4">{desc}</p>
      <a href="/" className="underline text-primary">
        Ir para o início
      </a>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },

      // FAES
      { path: "faes", element: <FAESListPage /> }, // lista
      { path: "faes/nova", element: <FAESFormPage /> }, // novo formulário
      { path: "faes/:id", element: <FAESDetailPage /> }, // detalhe

      { path: "clientes", element: <Clients /> },
      { path: "clientes/:id", element: <ClientDetails /> },

      { path: "produtos", element: <Products /> },
      { path: "produtos/novo", element: <NewProduct /> },
      { path: "produtos/:id", element: <ProductDetails /> },
      { path: "produtos/:id/editar", element: <ProductDetails /> },

      { path: "ordens-servico", element: <ServiceOrdersPage /> },
      { path: "ordens-servico/nova", element: <NewServiceOrder /> },
      { path: "ordens-servico/:id", element: <ServiceOrderDetailPage /> },
      { path: "ordens-servico/:id/editar", element: <ServiceOrderEditPage /> },

      { path: "agenda", element: <Calendar /> },
      { path: "configuracoes", element: <Settings /> },

      { path: "*", element: <RouteErrorBoundary /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
export { router };
