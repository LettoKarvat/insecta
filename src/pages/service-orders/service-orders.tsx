// src/pages/ServiceOrdersPage.tsx
import { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { PageShell } from "@/components/layout/page-shell";
import { formatDateTime } from "@/lib/utils";

import type { ServiceOrder } from "@/types/api";
import {
  useServiceOrders,
  useDeleteServiceOrder,
  useServiceOrderPdf,
} from "@/api/hooks/useServiceOrders";

/* status → label/badge */
function mapStatus(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  const up = (status || "").toUpperCase();
  const map: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    OPEN: { label: "Aberta", variant: "default" },
    IN_PROGRESS: { label: "Em Andamento", variant: "secondary" },
    SCHEDULED: { label: "Agendada", variant: "secondary" }, // legado
    DONE: { label: "Concluída", variant: "default" }, // legado
    COMPLETED: { label: "Concluída", variant: "default" },
    CANCELLED: { label: "Cancelada", variant: "destructive" },
  };
  return map[up] ?? { label: status, variant: "secondary" };
}

export default function ServiceOrdersPage() {
  const { data, isLoading } = useServiceOrders();
  const delMutation = useDeleteServiceOrder();
  const pdfMutation = useServiceOrderPdf();
  const navigate = useNavigate();

  // estados por linha (vias/certificado)
  const [copiesByRow, setCopiesByRow] = useState<Record<string, number>>({});
  const [certByRow, setCertByRow] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () =>
      ((data?.items as any[]) ?? []).map((r, i) => ({
        ...r,
        __rid: String(r.id ?? r.public_code ?? `i-${i}`),
      })),
    [data]
  );

  const setCopies = useCallback((rid: string, n: number) => {
    setCopiesByRow((prev) => ({ ...prev, [rid]: n }));
  }, []);
  const setCert = useCallback((rid: string, checked: boolean) => {
    setCertByRow((prev) => ({ ...prev, [rid]: checked }));
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "public_code",
        title: "Código",
        render: (_: any, r: any) => (
          <Link
            to={`/ordens-servico/${r.id}`}
            className="underline underline-offset-2"
          >
            {r.public_code}
          </Link>
        ),
      },
      {
        key: "client_name",
        title: "Cliente",
        render: (_: any, r: any) => r?.client?.name ?? r?.client_name ?? "—",
      },
      {
        key: "created_at",
        title: "Aberta em",
        render: (_: any, r: any) => formatDateTime(r.created_at),
      },
      {
        key: "scheduled_at",
        title: "Agendada",
        render: (_: any, r: any) =>
          r?.scheduled_at ? formatDateTime(r.scheduled_at) : "—",
      },
      {
        key: "status",
        title: "Status",
        render: (_: any, r: any) => {
          const m = mapStatus(r.status);
          return <Badge variant={m.variant}>{m.label}</Badge>;
        },
      },
      {
        key: "__actions__",
        title: "Ações",
        render: (_: any, r: ServiceOrder) => {
          const rid = String((r as any).__rid ?? r.id);
          const copies = copiesByRow[rid] ?? 2;
          const includeCertificate = certByRow[rid] ?? true;

          const idNum = Number((r as any).id);
          const idIsValid = Number.isFinite(idNum) && idNum > 0;

          return (
            <div className="flex items-center gap-2">
              {/* vias + certificado */}
              <div className="flex items-center gap-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor={`vias-${rid}`}
                >
                  Vias
                </label>
                <select
                  id={`vias-${rid}`}
                  className="border rounded px-1 py-0.5 text-sm"
                  value={copies}
                  onChange={(e) => setCopies(rid, Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <label
                className="flex items-center gap-1 text-xs cursor-pointer"
                htmlFor={`cert-${rid}`}
              >
                <input
                  id={`cert-${rid}`}
                  type="checkbox"
                  checked={includeCertificate}
                  onChange={(e) => setCert(rid, e.target.checked)}
                />
                Certificado
              </label>

              {/* PDF (gera no CLIENTE usando @react-pdf) */}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  idIsValid &&
                  pdfMutation.mutate({
                    id: idNum,
                    tpl: "os_moderno",
                    copies: copies === 2 ? ["cliente", "empresa"] : ["cliente"],
                    include_certificate: includeCertificate,
                  })
                }
                disabled={pdfMutation.isPending || !idIsValid}
                title="Gerar PDF"
                aria-label="Gerar PDF"
              >
                <FileText className="w-4 h-4 mr-1" />
                {pdfMutation.isPending ? "Gerando..." : "PDF"}
              </Button>

              {/* Editar */}
              <Link
                to={`/ordens-servico/${(r as any).id}/editar`}
                title="Editar"
              >
                <Button size="sm" variant="ghost" aria-label="Editar OS">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>

              {/* Excluir */}
              <Button
                size="sm"
                variant="destructive"
                title="Excluir"
                aria-label="Excluir OS"
                onClick={() => {
                  if (confirm("Tem certeza que deseja excluir esta OS?")) {
                    delMutation.mutate(idNum);
                  }
                }}
                disabled={delMutation.isPending || !idIsValid}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [
      copiesByRow,
      certByRow,
      pdfMutation.isPending,
      delMutation.isPending,
      setCopies,
      setCert,
    ]
  );

  return (
    <PageShell
      title="Ordens de Serviço"
      right={
        <Link to="/ordens-servico/nova">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova OS
          </Button>
        </Link>
      }
    >
      {/* Botão visível na página (além do topo) */}
      <div className="mb-4 flex justify-end">
        <Button onClick={() => navigate("/ordens-servico/nova")}>
          <Plus className="w-4 h-4 mr-2" />
          Nova OS
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns as any}
        loading={isLoading}
        emptyState="Nenhuma OS encontrada."
      />
    </PageShell>
  );
}
