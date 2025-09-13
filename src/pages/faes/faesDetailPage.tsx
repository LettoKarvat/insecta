// src/pages/faes/FAESDetailPage.tsx
import React, { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useFaesPrintable } from "@/api/hooks/useFaes";

function Row({ label, value }: { label: string; value?: any }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="col-span-2 text-sm">{value ?? "—"}</div>
    </div>
  );
}

export default function FAESDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numId = Number(id);

  const {
    data: printable,
    isLoading,
    isError,
    refetch,
  } = useFaesPrintable(Number.isFinite(numId) ? numId : undefined);

  const faes = printable?.faes;
  const client = printable?.client;
  const d = printable?.data || {};

  const produtos = useMemo(
    () => (Array.isArray(d?.produtos_planejados) ? d.produtos_planejados : []),
    [d]
  );
  const pragasAlvo = useMemo(
    () => (Array.isArray(d?.pragas_alvo) ? d.pragas_alvo : []),
    [d]
  );
  const metodos = useMemo(
    () => (Array.isArray(d?.metodos_utilizados) ? d.metodos_utilizados : []),
    [d]
  );

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
              <h1 className="text-2xl font-semibold">
                {faes?.public_code || "FAES"}
              </h1>
              <p className="text-sm text-gray-600">
                {faes?.schema_title} •{" "}
                {faes?.created_at
                  ? dayjs(faes.created_at).format("DD/MM/YYYY HH:mm")
                  : "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                onClick={() => navigate(-1)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                onClick={() => refetch()}
              >
                Recarregar
              </button>
              {/* Atalho: reabrir a tela de novo formulário para criar outra */}
              <Link
                to="/faes/nova"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                + Nova FAES
              </Link>
            </div>
          </header>

          {isLoading ? (
            <div className="rounded-2xl border bg-white p-6">Carregando…</div>
          ) : isError || !printable ? (
            <div className="rounded-2xl border bg-white p-6 text-red-600">
              Erro ao carregar.
            </div>
          ) : (
            <>
              {/* Status + Cliente */}
              <section className="rounded-2xl border bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        faes?.finalized
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {faes?.finalized ? "Finalizada" : "Rascunho"}
                    </span>
                    <span className="text-sm text-zinc-500">
                      ID #{faes?.id}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* Se quiser implementar PDF aqui, você pode reutilizar o
                       componente de PDF da FAESFormPage e chamar download */}
                    <Link
                      to={`/faes/${faes?.id}`}
                      className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                      onClick={async (e) => {
                        e.preventDefault();
                        // Abre o JSON “printable” numa nova aba (debug rápido)
                        const blob = new Blob(
                          [JSON.stringify(printable, null, 2)],
                          { type: "application/json" }
                        );
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                        setTimeout(() => URL.revokeObjectURL(url), 10_000);
                      }}
                    >
                      Ver dados (JSON)
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-base font-semibold mb-2">Cliente</h3>
                    <div className="rounded-xl border p-3">
                      <Row label="Nome" value={client?.name} />
                      <Row label="Documento" value={client?.doc} />
                      <Row label="Email" value={client?.email} />
                      <Row label="Telefone" value={client?.phone} />
                      <Row label="Endereço" value={client?.address} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-2">Metadados</h3>
                    <div className="rounded-xl border p-3">
                      <Row
                        label="Versão do schema"
                        value={faes?.schema_version}
                      />
                      <Row
                        label="Título do schema"
                        value={faes?.schema_title}
                      />
                      <Row
                        label="Enviado em"
                        value={
                          faes?.submitted_at
                            ? dayjs(faes.submitted_at).format(
                                "DD/MM/YYYY HH:mm"
                              )
                            : "—"
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Produtos planejados */}
              <section className="rounded-2xl border bg-white p-4 sm:p-6">
                <h3 className="text-base font-semibold mb-3">
                  Produtos Planejados
                </h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-700">
                      <tr>
                        <th className="text-left px-3 py-2">Produto</th>
                        <th className="text-left px-3 py-2">Grupo químico</th>
                        <th className="text-left px-3 py-2">Registro MS</th>
                        <th className="text-left px-3 py-2">Diluente</th>
                        <th className="text-left px-3 py-2">Qtd</th>
                        <th className="text-left px-3 py-2">Praga alvo</th>
                        <th className="text-left px-3 py-2">Equipamento</th>
                        <th className="text-left px-3 py-2">Antídoto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center">
                            Nenhum item informado.
                          </td>
                        </tr>
                      ) : (
                        produtos.map((p: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{p.produto || "—"}</td>
                            <td className="px-3 py-2">
                              {p.grupo_quimico || "—"}
                            </td>
                            <td className="px-3 py-2">
                              {p.registro_ms || "—"}
                            </td>
                            <td className="px-3 py-2">{p.diluente || "—"}</td>
                            <td className="px-3 py-2">{p.quantidade || "—"}</td>
                            <td className="px-3 py-2">{p.praga_alvo || "—"}</td>
                            <td className="px-3 py-2">
                              {p.equipamento || "—"}
                            </td>
                            <td className="px-3 py-2">{p.antidoto || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Pragas & Métodos */}
              <section className="rounded-2xl border bg-white p-4 sm:p-6">
                <h3 className="text-base font-semibold mb-3">
                  Pragas e Métodos
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-3">
                    <div className="text-sm text-zinc-500 mb-1">
                      Pragas alvo
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pragasAlvo.length ? (
                        pragasAlvo.map((t: string) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-sm text-zinc-500 mb-1">
                      Métodos utilizados
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metodos.length ? (
                        metodos.map((t: string) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
