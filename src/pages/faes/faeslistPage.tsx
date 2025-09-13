import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFaesList } from "@/api/hooks/useFaes";
import { useClients } from "@/api/hooks/useClients";
import { getFAESPrintable } from "@/api/faes";
import { downloadFAESPdf } from "@/pdf/faespdf";
import dayjs from "dayjs";

function cls(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export default function FAESListPage() {
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState<"" | "true" | "false">("");

  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      client_id: clientId ? Number(clientId) : undefined,
      finalized: status || undefined,
      limit: 200,
    }),
    [q, clientId, status]
  );

  const { data, isLoading, isFetching, refetch } = useFaesList(params);
  const faes = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: clientsResp } = useClients("", "", 500);
  const clients = clientsResp?.items ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Minhas Fichas (FAES)</h1>
              <p className="text-sm text-gray-600">
                {isFetching ? "Atualizando…" : `${total} registro(s)`}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/faes/nova"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                + Nova FAES
              </a>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                onClick={() => refetch()}
              >
                Recarregar
              </button>
            </div>
          </header>

          {/* Filtros */}
          <section className="rounded-2xl border bg-white p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Buscar</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="Código público ou título do schema…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cliente</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Todos</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.doc ? `• ${c.doc}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "" | "true" | "false")
                  }
                >
                  <option value="">Todas</option>
                  <option value="true">Finalizadas</option>
                  <option value="false">Rascunhos</option>
                </select>
              </div>
            </div>
          </section>

          {/* Tabela */}
          <section className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Código</th>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Título</th>
                    <th className="text-left px-4 py-3 font-medium">Criada</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        Carregando…
                      </td>
                    </tr>
                  ) : faes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    faes.map((f) => {
                      const created = f.created_at
                        ? dayjs(f.created_at).format("DD/MM/YYYY HH:mm")
                        : "—";
                      const statusBadge = f.finalized
                        ? "Finalizada"
                        : "Rascunho";
                      return (
                        <tr key={f.id} className="border-t">
                          <td className="px-4 py-3 whitespace-nowrap font-medium">
                            {f.public_code}
                          </td>
                          <td className="px-4 py-3">
                            {f.client_id ? `#${f.client_id}` : "—"}
                          </td>
                          <td className="px-4 py-3">{f.schema_title}</td>
                          <td className="px-4 py-3">{created}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cls(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                                f.finalized
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              )}
                            >
                              {statusBadge}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                                onClick={async () => {
                                  const printable = await getFAESPrintable(
                                    f.id
                                  );
                                  await downloadFAESPdf(printable);
                                }}
                              >
                                Baixar PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
