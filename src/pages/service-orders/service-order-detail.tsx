import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

import type { ServiceOrder } from "@/types/api";
import {
  useServiceOrder,
  useServiceOrderPdf,
  useDeleteServiceOrder,
} from "@/api/hooks/useServiceOrders";

/* helpers de status */
function normStatus(raw?: string) {
  if (!raw) return "OPEN";
  const s = String(raw);
  return s.includes(".") ? s.split(".").pop()! : s; // "ServiceOrderStatus.OPEN" -> "OPEN"
}
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
    SCHEDULED: { label: "Agendada", variant: "secondary" },
    DONE: { label: "Concluída", variant: "default" },
    COMPLETED: { label: "Concluída", variant: "default" },
    CANCELLED: { label: "Cancelada", variant: "destructive" },
  };
  return map[up] ?? { label: status, variant: "secondary" };
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useServiceOrder(id!);
  const pdfMutation = useServiceOrderPdf();
  const delMutation = useDeleteServiceOrder();

  // controles de PDF
  const [copies, setCopies] = useState<number>(2);
  const [includeCertificate, setIncludeCertificate] = useState<boolean>(true);

  // segurança nos dados
  const so = (data as unknown as ServiceOrder) || ({} as any);
  const client = (so as any)?.client ?? {};
  const lines: any[] = useMemo(() => {
    const raw = (so as any)?.lines ?? (so as any)?.items ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [so]);

  const statusBadge = mapStatus(normStatus((so as any)?.status));

  return (
    <PageShell
      title={
        <div className="flex items-center gap-3">
          <Link to="/ordens-servico">
            <Button variant="ghost" size="sm" className="-ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <span>
            OS{" "}
            <span className="font-semibold">
              {(so as any)?.public_code || (so as any)?.code || id}
            </span>
          </span>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          {/* PDF controls */}
          <div className="flex items-center gap-1">
            <label className="text-xs text-muted-foreground">Vias</label>
            <select
              className="border rounded px-1 py-1 text-sm"
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={includeCertificate}
              onChange={(e) => setIncludeCertificate(e.target.checked)}
            />
            Certificado
          </label>
          <Button
            variant="outline"
            onClick={() =>
              pdfMutation.mutate({
                id: Number(id),
                copies: copies === 2 ? ["cliente", "empresa"] : ["cliente"],
                include_certificate: includeCertificate,
              })
            }
            disabled={pdfMutation.isPending}
            title="Gerar PDF"
          >
            <FileText className="w-4 h-4 mr-1" />
            PDF
          </Button>

          {/* Ações CRUD */}
          <Button
            variant="secondary"
            onClick={() => navigate(`/ordens-servico/${id}/editar`)}
          >
            Editar
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir esta OS?")) {
                delMutation.mutate(Number(id), {
                  onSuccess: () => navigate("/ordens-servico"),
                });
              }
            }}
            disabled={delMutation.isPending}
          >
            Excluir
          </Button>
        </div>
      }
    >
      {/* estados */}
      {isLoading && (
        <div className="text-sm text-muted-foreground mt-4">Carregando…</div>
      )}
      {error && (
        <div className="text-sm text-red-600 mt-4">
          Erro ao carregar OS. Tente novamente.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6 mt-4">
          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="border rounded-md p-4">
              <div className="font-semibold mb-3">Cliente</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Nome:</span>{" "}
                  {client?.name ?? "—"}
                </div>
                {client?.doc && (
                  <div>
                    <span className="text-muted-foreground">Documento:</span>{" "}
                    {client.doc}
                  </div>
                )}
                {client?.email && (
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>{" "}
                    {client.email}
                  </div>
                )}
                {client?.phone && (
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>{" "}
                    {client.phone}
                  </div>
                )}
                {client?.address && (
                  <div>
                    <span className="text-muted-foreground">Endereço:</span>{" "}
                    {client.address}
                  </div>
                )}
              </div>
            </div>

            {/* OS */}
            <div className="border rounded-md p-4">
              <div className="font-semibold mb-3">Ordem de Serviço</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Criada em:</span>{" "}
                  {(so as any)?.created_at
                    ? formatDateTime((so as any).created_at)
                    : "—"}
                </div>
                {(so as any)?.scheduled_at && (
                  <div>
                    <span className="text-muted-foreground">Agendada:</span>{" "}
                    {formatDateTime((so as any).scheduled_at)}
                  </div>
                )}
                {(so as any)?.notes && (
                  <div>
                    <span className="text-muted-foreground">Observações:</span>{" "}
                    {(so as any).notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itens / Linhas */}
          <div className="border rounded-md">
            <div className="px-4 py-3 font-semibold border-b">
              Itens aplicados
            </div>
            <div className="p-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Praga</TableHead>
                    <TableHead className="whitespace-nowrap">Produto</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Aplicação
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Diluição
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-sm text-muted-foreground"
                      >
                        Nenhum item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((ln: any, i: number) => {
                      const prod =
                        ln?.product?.name ??
                        ln?.produto?.name ??
                        ln?.produto ??
                        ln?.product ??
                        "—";
                      return (
                        <TableRow key={i}>
                          <TableCell>{ln?.praga ?? ln?.pest ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {prod}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ln?.aplicacao ?? ln?.application ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ln?.diluicao ?? ln?.dilution ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ln?.quantidade ?? ln?.quantity ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Observações separadas */}
          {(so as any)?.notes && (
            <div className="border rounded-md p-4">
              <div className="font-semibold mb-2">Observações</div>
              <div className="text-sm">{(so as any).notes}</div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
