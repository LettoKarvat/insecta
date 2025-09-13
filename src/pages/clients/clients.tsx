import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/client-form";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/api/hooks/useClients";
import { CreateClientRequest } from "@/types/api";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";

function parseAddress(address?: string) {
  const a = address || "";
  const m = a.match(/^(.*?),\s*([^,-]+)\s*-\s*([A-Za-z]{2}),\s*(\d{5}-?\d{3})$/);
  if (m) {
    return { streetLine: m[1].trim(), cityUF: `${m[2].trim()} - ${m[3].toUpperCase()}`, cep: m[4] };
  }
  const cep = (a.match(/(\d{5}-?\d{3})/) || [])[0] || "";
  const parts = a.replace(cep, "").split(",").map(s => s.trim()).filter(Boolean);
  const cityUF = parts[parts.length - 1] || "";
  const streetLine = parts.slice(0, -1).join(", ");
  return { streetLine, cityUF, cep };
}

export function Clients() {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editClient, setEditClient] = useState<any | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useClients(search, cursor);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const handleCreateClient = (clientData: CreateClientRequest) => {
    createClient.mutate(clientData, { onSuccess: () => setIsCreateModalOpen(false) });
  };

  const handleEditClient = (clientData: CreateClientRequest) => {
    if (!editClient) return;
    updateClient.mutate({ id: editClient.id, payload: clientData }, { onSuccess: () => setEditOpen(false) });
  };

  const columns = useMemo(() => ([
    { 
      key: "name", 
      title: "Nome", 
      sortable: true,
      render: (value: string, item: any) => (
        <Link to={`/clientes/${item.id}`} className="text-primary underline">
          {value}
        </Link>
      ),
    },
    { key: "doc", title: "CPF/CNPJ" },
    { key: "email", title: "Email" },
    { key: "phone", title: "Telefone" },
    {
      key: "address",
      title: "Endereço",
      render: (value: string) => parseAddress(value).streetLine || value || "-",
    },
    {
      key: "city_uf",
      title: "Cidade/UF",
      render: (_: any, item: any) => parseAddress(item.address).cityUF || "-",
    },
    {
      key: "cep",
      title: "CEP",
      render: (_: any, item: any) => parseAddress(item.address).cep || "-",
    },
    {
      key: "created_at",
      title: "Cadastrado em",
      render: (v: string) => formatDate(v),
    },
    {
      key: "actions",
      title: "Ações",
      render: (_: any, item: any) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditClient(item); setEditOpen(true); }}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
        </div>
      ),
    },
  ]), []);

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12">
      <Users className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
      <p className="text-muted-foreground mb-4">
        Cadastre seu primeiro cliente para começar
      </p>
      <Button onClick={() => setIsCreateModalOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Cadastrar Cliente
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Clientes"
      description="Gerencie sua base de clientes"
      action={
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <ClientForm onSubmit={handleCreateClient} loading={createClient.isPending} />
          </DialogContent>
        </Dialog>
      }
    >
      <DataTable
        data={data?.items || []}
        columns={columns as any}
        loading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        hasMore={!!data?.next_cursor}
        onLoadMore={() => setCursor(data?.next_cursor || "")}
        emptyState={emptyState}
      />

      {/* Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSubmit={handleEditClient}
            initialValues={editClient || {}}
            loading={updateClient.isPending}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteId && deleteClient.mutate(deleteId)} disabled={deleteClient.isPending}>
                {deleteClient.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
