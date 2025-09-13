import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useClientById,
  useUpdateClient,
  useDeleteClient,
} from "@/api/hooks/useClients";
import {
  useServiceOrders,
  useServiceOrderPdf,
} from "@/api/hooks/useServiceOrders";
import { useEvaluations, useEvaluationPdf } from "@/api/hooks/useEvaluations";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { formatDate, formatDateTime } from "@/lib/utils";
import { FileText, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/client-form";

function parseAddress(address?: string) {
  const a = address || "";
  const m = a.match(
    /^(.*?),\s*([^,-]+)\s*-\s*([A-Za-z]{2}),\s*(\d{5}-?\d{3})$/
  );
  if (m) {
    return {
      streetLine: m[1].trim(),
      cityUF: `${m[2].trim()} - ${m[3].toUpperCase()}`,
      cep: m[4],
    };
  }
  const cep = (a.match(/(\d{5}-?\d{3})/) || [])[0] || "";
  const parts = a
    .replace(cep, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cityUF = parts[parts.length - 1] || "";
  const streetLine = parts.slice(0, -1).join(", ");
  return { streetLine, cityUF, cep };
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const cid = Number(id);
  const validId = Number.isFinite(cid) && cid > 0;

  // Hooks SEMPRE no topo (ordem estável)
  const {
    data: client,
    isLoading,
    isError,
    error,
  } = useClientById(validId ? cid : undefined);
  const { data: osData, isLoading: osLoading } = useServiceOrders(
    validId ? cid : undefined,
    undefined,
    undefined,
    undefined,
    "",
    50
  );
  const { data: evalData, isLoading: evalLoading } = useEvaluations(
    validId ? cid : undefined,
    "",
    50
  );

  const pdfOS = useServiceOrderPdf();
  const pdfFAES = useEvaluationPdf();

  const [editOpen, setEditOpen] = useState(false);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  // Memo das colunas ANTES de qualquer return condicional
  const osColumns = useMemo(
    () => [
      {
        key: "public_code",
        title: "Código",
        render: (_: any, item: any) => (
          <Link
            to={`/ordens-servico/${item.id}`}
            className="text-primary underline"
          >
            {item.public_code}
          </Link>
        ),
      },
      {
        key: "scheduled_at",
        title: "Agendado para",
        render: (v: string) => (v ? formatDateTime(v) : "-"),
        sortable: true,
      },
      { key: "status", title: "Status" },
      {
        key: "lines",
        title: "Itens",
        render: (_: any, item: any) => item.lines?.length ?? 0,
      },
      {
        key: "actions",
        title: "Ações",
        render: (_: any, item: any) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfOS.mutate({ id: item.id, template: "os_verde" })}
          >
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        ),
      },
    ],
    [pdfOS]
  );

  const faesColumns = useMemo(
    () => [
      { key: "id", title: "ID" },
      {
        key: "created_at",
        title: "Criada em",
        render: (v: string) => formatDate(v),
      },
      {
        key: "actions",
        title: "Ações",
        render: (_: any, item: any) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfFAES.mutate({ id: item.id })}
          >
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        ),
      },
    ],
    [pdfFAES]
  );

  // Handlers (não são hooks)
  const onEdit = (payload: any) => {
    if (!validId) return;
    updateClient.mutate(
      { id: cid, payload },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const onDelete = () => {
    if (!validId) return;
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    deleteClient.mutate(cid, { onSuccess: () => navigate("/clientes") });
  };

  // A PARTIR DAQUI podem existir returns condicionais, pois todos os hooks já rodaram
  if (!validId) {
    return (
      <PageShell title="Cliente" description="">
        <div className="p-4 border rounded-md bg-background">
          ID inválido na URL. <br />
          <Link to="/clientes" className="underline text-primary">
            Voltar
          </Link>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell title="Carregando cliente..." description="">
        <div className="p-4 border rounded-md bg-background">Carregando…</div>
      </PageShell>
    );
  }

  if (isError) {
    const status = (error as any)?.response?.status;
    return (
      <PageShell title="Cliente não encontrado" description="">
        <div className="p-4 border rounded-md bg-background">
          {status === 404
            ? "Este cliente não existe ou foi removido."
            : "Falha ao carregar o cliente."}
          <div className="mt-3">
            <Link to="/clientes" className="underline text-primary">
              Voltar
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const addr = parseAddress(client?.address);

  return (
    <PageShell
      title={client?.name || "Cliente"}
      description={client?.doc ? `Doc: ${client.doc}` : ""}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      }
    >
      {/* Info do cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-md p-3">
          <div className="text-xs text-muted-foreground">Email</div>
          <div>{client?.email || "-"}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs text-muted-foreground">Telefone</div>
          <div>{client?.phone || "-"}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs text-muted-foreground">Endereço</div>
          <div>{addr.streetLine || client?.address || "-"}</div>
          <div className="text-sm text-muted-foreground">
            {[addr.cityUF, addr.cep].filter(Boolean).join(" • ")}
          </div>
        </div>
      </div>

      {/* OS vinculadas */}
      <h3 className="font-medium mb-2">Ordens de Serviço</h3>
      <DataTable
        data={osData?.items || []}
        columns={osColumns as any}
        loading={osLoading}
        hasMore={!!osData?.next_cursor}
      />

      {/* FAES vinculadas */}
      <h3 className="font-medium mt-8 mb-2">FAES</h3>
      <DataTable
        data={evalData?.items || []}
        columns={faesColumns as any}
        loading={evalLoading}
        hasMore={!!evalData?.next_cursor}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSubmit={onEdit}
            initialValues={(client as any) || {}}
            loading={updateClient.isPending}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
