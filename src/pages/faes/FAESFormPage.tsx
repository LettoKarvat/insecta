import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useServiceOrder } from "@/api/hooks/useServiceOrders";
import { useClients, useClientById } from "@/api/hooks/useClients";
import { useAllProducts } from "@/api/hooks/useProducts";
import { apiClient } from "@/api/client";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* =========================
   Helpers / consts
========================= */
type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "file"
  | "signature"
  | "repeater";

interface FieldBase {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  columns?: number;
}
interface FieldRepeater extends FieldBase {
  type: "repeater";
  minItems?: number;
  maxItems?: number;
  children: Field[];
}
type Field = FieldBase | FieldRepeater;

interface Section {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
}
interface FAESchema {
  version: string;
  title: string;
  sections: Section[];
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | File
  | (string | number | boolean | null | File)[]
  | Record<string, any>;

const cls = (...c: (string | undefined | false)[]) =>
  c.filter(Boolean).join(" ");
const iso = (s?: string | null) => (s ? String(s).slice(0, 10) : "");
const safe = (v: any) => (typeof v === "string" ? v : v ?? "");

const COMPANY = {
  nome: "Insecta Dedetizadora LTDA",
  cnpj: "53.921.773/0001-77",
  endereco: "Rua das hortênsias, Bairro Cascata, 25",
  telefone: "47 99755-5271 / 47 9907-7520",
  email: "ocbm@outlook.com.br",
  cit: "0800 643 5252",
};

const PEST_OPTIONS = [
  "Cupim de madeira seca",
  "Broca",
  "Barata",
  "Formiga",
  "Rato",
  "Mosquito",
  "Carrapato",
  "Aranha",
  "Outros",
];

const METHOD_OPTIONS = [
  "Pulverização residual",
  "Injeção em madeiras",
  "Barreira química",
  "Nebulização",
  "Pincelamento",
  "Outros",
];

const parseAddressForFAES = (address?: string) => {
  const a = address || "";
  const m = a.match(/^(.*?),\s*([^,-]+)\s*-\s*([A-Z]{2}),\s*(\d{5}-?\d{3})$/i);
  if (m) {
    return {
      end: m[1].trim(),
      cidadeUF: `${m[2].trim()}-${m[3].toUpperCase()}`,
      cep: m[4],
    };
  }
  const cep = (a.match(/(\d{5}-?\d{3})/) || [])[0] || "";
  const parts = a
    .replace(cep, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const [city, uf] = last.split("-").map((s) => s?.trim());
  const cidadeUF = city && uf ? `${city}-${(uf || "").toUpperCase()}` : last;
  const end = parts.slice(0, -1).join(", ");
  return { end, cidadeUF, cep };
};

const mapClientToFields = (c: any) => {
  const parsed = parseAddressForFAES(c?.address);
  return {
    cliente_nome: safe(c?.name),
    cliente_cnpj: safe(c?.doc),
    cliente_endereco: parsed.end || safe(c?.address),
    cliente_cidade_uf: parsed.cidadeUF || "",
    cliente_cep: parsed.cep || "",
  };
};

function toInitialValues(schema: FAESchema) {
  const values: Record<string, JsonValue> = {};
  for (const s of schema.sections) {
    for (const f of s.fields) {
      if (f.type === "repeater") values[f.id] = [];
      else if (f.type === "checkbox" || f.type === "multiselect")
        values[f.id] = [];
      else values[f.id] = "";
    }
  }
  return values;
}
function setDeep(obj: any, path: string, value: any) {
  obj[path] = value;
}

/** Constrói um mapa id->label (inclui filhos de repeater) */
function buildLabelMap(schema: FAESchema) {
  const map: Record<string, string> = {};
  for (const s of schema.sections) {
    for (const f of s.fields) {
      if (f.type === "repeater") {
        map[f.id] = f.label;
        const rep = f as FieldRepeater;
        for (const ch of rep.children) {
          map[`${f.id}.${ch.id}`] = `${f.label} • ${ch.label}`;
        }
      } else {
        map[f.id] = f.label;
      }
    }
  }
  return map;
}

/* =========================
   API FAES + upload (usa /faes e /uploads)
========================= */
const FAES_ENDPOINTS = {
  create: "/faes",
  printable: (id: number) => `/faes/${id}/printable`,
  upload: "/uploads", // troque para "/upload" se seu backend for singular
};

async function apiCreateFAES(payload: {
  schemaVersion: string;
  schemaTitle: string;
  clientId: number;
  osId?: number;
  data: Record<string, any>;
  finalizar?: boolean;
  submittedAt?: string;
}) {
  const { data } = await apiClient.post(FAES_ENDPOINTS.create, payload);
  return data as { id: number; public_code: string };
}
async function apiGetFAESPrintable(id: number) {
  const { data } = await apiClient.get(FAES_ENDPOINTS.printable(id));
  return data;
}
function isFileLike(v: any) {
  return typeof File !== "undefined" && v instanceof File;
}
async function uploadOne(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(FAES_ENDPOINTS.upload, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.url || "";
}
async function deepReplaceFiles(obj: any): Promise<any> {
  if (obj == null) return obj;
  if (Array.isArray(obj)) {
    const out = [];
    for (const item of obj) out.push(await deepReplaceFiles(item));
    return out;
  }
  if (typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (isFileLike(v)) out[k] = await uploadOne(v as File);
      else out[k] = await deepReplaceFiles(v);
    }
    return out;
  }
  return obj;
}

/* =========================
   Produtos: normalização e SELECT
========================= */
type ProductLite = {
  id: number;
  name: string;
  registration_ms?: string | null;
  group_chemical?: string | null;
  default_diluent?: string | null;
  target_pests?: string | null;
  default_equipment?: string | null;
  antidote?: string | null;
  active_ingredient?: string | null; // se existir no seu Product
};

function normalizeProduct(p: any): ProductLite {
  return {
    id: p.id,
    name: p.name || p.nome || "",
    registration_ms:
      p.registration_ms ?? p.registro_ms ?? p.registro_anvisa ?? null,
    group_chemical: p.group_chemical ?? p.grupo_quimico ?? null,
    default_diluent: p.default_diluent ?? p.diluente_padrao ?? null,
    target_pests: p.target_pests ?? p.pragas_alvo ?? null,
    default_equipment: p.default_equipment ?? p.equipamento_padrao ?? null,
    antidote: p.antidote ?? p.antidoto ?? null,
    active_ingredient: p.active_ingredient ?? p.principio_ativo ?? null,
  };
}

function ProductSelect({
  value,
  onPickProduct,
  label,
}: {
  value?: string;
  onPickProduct: (p: ProductLite | null) => void;
  label?: string;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useAllProducts(500);
  const list: ProductLite[] = useMemo(
    () => (data ?? []).map(normalizeProduct),
    [data]
  );

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = list.find((p) => p.name === value) || null;

  return (
    <div className="relative" ref={boxRef}>
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 inline-flex items-center justify-between rounded-xl border bg-white px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <span className="truncate">
            {selected ? selected.name : "Selecionar produto"}
          </span>
          <svg
            viewBox="0 0 20 20"
            className={cls(
              "ml-2 h-4 w-4 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden="true"
          >
            <path d="M5 7l5 5 5-5H5z" />
          </svg>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onPickProduct(null)}
            className="rounded-xl border px-3 py-2 hover:bg-gray-50"
            title="Limpar"
          >
            Limpar
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-xl max-h-72 overflow-auto">
          {isLoading || isFetching ? (
            <div className="px-3 py-3 text-sm text-zinc-600">Carregando…</div>
          ) : isError ? (
            <div className="px-3 py-3 text-sm text-red-600 flex items-center gap-3">
              Falha ao carregar produtos.
              <button
                type="button"
                className="rounded-lg border px-2 py-1 text-xs"
                onClick={() => refetch()}
              >
                Tentar novamente
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="px-3 py-3 text-sm text-zinc-600">
              Nenhum produto cadastrado.
            </div>
          ) : (
            list.map((it) => (
              <button
                key={it.id}
                type="button"
                className={cls(
                  "w-full text-left px-3 py-2 hover:bg-zinc-50",
                  value === it.name && "bg-zinc-100"
                )}
                onClick={() => {
                  onPickProduct(it);
                  setOpen(false);
                }}
              >
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {[it.group_chemical, it.registration_ms, it.default_diluent]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   PDF (3 páginas)
========================= */
const P = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 14, marginBottom: 6, fontWeight: 700 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4, fontWeight: 700 },
  row: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },
  box: {
    border: 1,
    borderColor: "#222",
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  label: { fontSize: 9, color: "#555" },
  text: { fontSize: 10 },
  table: {
    border: 1,
    borderColor: "#222",
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  tr: { flexDirection: "row" },
  th: {
    flex: 1,
    padding: 6,
    backgroundColor: "#eee",
    borderRight: 1,
    borderColor: "#222",
    fontWeight: 700,
  },
  td: {
    flex: 1,
    padding: 6,
    borderTop: 1,
    borderRight: 1,
    borderColor: "#222",
  },
  center: { textAlign: "center" as const },
  mt8: { marginTop: 8 },
});
const KV = ({ label, value }: { label: string; value?: any }) => (
  <View style={{ marginBottom: 4 }}>
    <Text style={P.label}>{label}</Text>
    <Text style={P.text}>{value ?? "—"}</Text>
  </View>
);

function addYears(dateISO?: string, years: number = 2) {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  d.setFullYear(d.getFullYear() + years);
  return d.toLocaleDateString("pt-BR");
}

function FAESPdfDoc({ printable }: { printable: any }) {
  const d = printable?.data || {};
  const produtos = Array.isArray(d.produtos_planejados)
    ? d.produtos_planejados
    : [];
  const produtosResumo = Array.isArray(d.produtos_resumo)
    ? d.produtos_resumo
    : [];
  const etapas = Array.isArray(d.procedimentos) ? d.procedimentos : [];
  const cron = Array.isArray(d.cronograma_previsto)
    ? d.cronograma_previsto
    : [];
  const insp = Array.isArray(d.inspecoes_programadas)
    ? d.inspecoes_programadas
    : [];
  const validadeAnos = Number(d.validade_certificado_anos || 2);

  /* Página 1 – POP + planejamento */
  const Page1 = (
    <Page size="A4" style={P.page}>
      <View style={P.box}>
        <Text style={P.h1}>CASARÃO / {COMPANY.nome.toUpperCase()}</Text>
        <Text style={P.text}>
          Nome da Empresa: {COMPANY.nome} • CNPJ: {COMPANY.cnpj}
        </Text>
      </View>

      <View style={P.box}>
        <View style={P.row}>
          <View style={P.col}>
            <KV
              label="Cliente"
              value={d.cliente_nome || printable.client?.name}
            />
          </View>
          <View style={P.col}>
            <KV
              label="CNPJ/CPF"
              value={d.cliente_cnpj || printable.client?.doc}
            />
          </View>
        </View>
        <View style={P.row}>
          <View style={P.col}>
            <KV label="Área de Aplicação" value={d.area_aplicacao} />
          </View>
          <View style={P.col}>
            <KV label="Área Tratada (m²)" value={d.area_tratada_m2} />
          </View>
          <View style={P.col}>
            <KV label="Data de Emissão" value={d.data_emissao} />
          </View>
        </View>
        <View style={P.row}>
          <View style={P.col}>
            <KV label="Responsável Técnico" value={d.responsavel_tecnico} />
          </View>
          <View style={P.col}>
            <KV label="CREA/Registro" value={d.crea} />
          </View>
          <View style={P.col}>
            <KV label="Tempo previsto (dias)" value={d.tempo_previsto_dias} />
          </View>
        </View>
        <View style={P.row}>
          <View style={P.col}>
            <KV label="Aplicador" value={d.aplicador} />
          </View>
          <View style={P.col}>
            <KV label="Licença Sanitária" value={d.licenca_sanitaria} />
          </View>
          <View style={P.col}>
            <KV
              label="Validade Certificado (anos)"
              value={d.validade_certificado_anos || 2}
            />
          </View>
        </View>
      </View>

      <Text style={P.h2}>Objetivo</Text>
      <View style={P.box}>
        <Text style={P.text}>
          {d.objetivo ||
            "Estabelecer diretrizes para a execução do serviço, garantindo segurança e eficácia."}
        </Text>
      </View>

      <Text style={P.h2}>Responsabilidades</Text>
      <View style={P.box}>
        <Text style={P.text}>
          {d.responsabilidades ||
            "A equipe técnica deve realizar a aplicação conforme o POP; o responsável técnico supervisiona e assegura conformidade sanitária e legal."}
        </Text>
      </View>

      <Text style={P.h2}>Materiais e Equipamentos</Text>
      <View style={P.box}>
        <Text style={P.text}>
          {d.materiais_equipamentos ||
            "Produtos domissanitários com registro ANVISA/MS; Pulverizadores manuais/costais; Equipamentos de perfuração/injeção; EPIs (luvas, máscara, óculos, avental, botas)."}{" "}
        </Text>
      </View>

      <Text style={P.h2}>POP – Procedimento Operacional Padrão</Text>
      <View style={P.box}>
        {etapas.length === 0 ? (
          <Text style={P.text}>
            Avaliação prévia do local; Preparo dos produtos; Aplicação (injeção,
            barreira química, pulverização); Finalização
            (sinalização/armazenamento); Registro (datas, lotes); Segurança
            (EPIs, reentrada).
          </Text>
        ) : (
          etapas.map((e: any, i: number) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={[P.text, { fontWeight: 700 }]}>{e.titulo}</Text>
              <Text style={P.text}>{e.descricao}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={P.h2}>Produtos Planejados</Text>
      <View style={P.table}>
        <View style={P.tr}>
          {[
            "Produto",
            "Grupo químico",
            "Registro MS",
            "Diluente",
            "Qtd",
            "Praga alvo",
            "Equipamento",
            "Antídoto",
          ].map((h, i) => (
            <Text key={i} style={[P.th, i === 7 && { borderRight: 0 }]}>
              {h}
            </Text>
          ))}
        </View>
        {produtos.map((p: any, idx: number) => (
          <View key={idx} style={P.tr}>
            <Text style={P.td}>{p.produto}</Text>
            <Text style={P.td}>{p.grupo_quimico}</Text>
            <Text style={P.td}>{p.registro_ms}</Text>
            <Text style={P.td}>{p.diluente}</Text>
            <Text style={P.td}>{p.quantidade}</Text>
            <Text style={P.td}>{p.praga_alvo}</Text>
            <Text style={P.td}>{p.equipamento}</Text>
            <Text style={[P.td, { borderRight: 0 }]}>{p.antidoto}</Text>
          </View>
        ))}
      </View>

      <Text style={P.h2}>
        Resumo (Produto / Princípio ativo / Registro / Forma de aplicação)
      </Text>
      <View style={P.table}>
        <View style={P.tr}>
          {[
            "Produto",
            "Princípio Ativo",
            "Registro ANVISA",
            "Forma de Aplicação",
          ].map((h, i) => (
            <Text key={i} style={[P.th, i === 3 && { borderRight: 0 }]}>
              {h}
            </Text>
          ))}
        </View>
        {produtosResumo.map((r: any, idx: number) => (
          <View key={idx} style={P.tr}>
            <Text style={P.td}>{r.produto}</Text>
            <Text style={P.td}>{r.principio_ativo}</Text>
            <Text style={P.td}>{r.registro_ms}</Text>
            <Text style={[P.td, { borderRight: 0 }]}>{r.forma_aplicacao}</Text>
          </View>
        ))}
      </View>

      <View style={P.box}>
        <KV
          label="Pragas alvo"
          value={
            (Array.isArray(d.pragas_alvo) ? d.pragas_alvo : []).join(", ") ||
            "—"
          }
        />
        <KV
          label="Métodos Utilizados"
          value={
            (Array.isArray(d.metodos_utilizados)
              ? d.metodos_utilizados
              : []
            ).join(", ") || "—"
          }
        />
      </View>
    </Page>
  );

  /* Página 2 – Cronograma + Recomendações + Inspeções */
  const Page2 = (
    <Page size="A4" style={P.page}>
      <View style={P.box}>
        <Text style={P.h1}>RELATÓRIO TÉCNICO (PLANEJAMENTO)</Text>
        <Text style={P.text}>
          {COMPANY.nome} • CNPJ: {COMPANY.cnpj} • {COMPANY.endereco} •{" "}
          {COMPANY.telefone} • {COMPANY.email}
        </Text>
      </View>

      <Text style={P.h2}>Cronograma Previsto</Text>
      {d.cronograma_previsto_texto ? (
        <View style={P.box}>
          <Text style={P.text}>{d.cronograma_previsto_texto}</Text>
        </View>
      ) : null}
      <View style={P.table}>
        <View style={P.tr}>
          {["Data", "Atividade/Etapa", "Observações"].map((h, i) => (
            <Text key={i} style={[P.th, i === 2 && { borderRight: 0 }]}>
              {h}
            </Text>
          ))}
        </View>
        {cron.map((e: any, idx: number) => (
          <View key={idx} style={P.tr}>
            <Text style={P.td}>{e.data}</Text>
            <Text style={P.td}>{e.atividade}</Text>
            <Text style={[P.td, { borderRight: 0 }]}>{e.observacoes}</Text>
          </View>
        ))}
      </View>

      <Text style={P.h2}>Recomendações Pós-Aplicação</Text>
      <View style={P.box}>
        <Text style={P.text}>
          {d.recomendacoes_pos ||
            "Evitar contato com superfícies tratadas por 6 horas; reentrada conforme orientação técnica; evitar limpeza úmida por 24 horas; monitorar sinais de reinfestação."}
        </Text>
        <Text style={[P.text, P.mt8]}>
          CIT (Centro de Informações Toxicológicas): {COMPANY.cit}
        </Text>
      </View>

      <Text style={P.h2}>Inspeções / Reinspeções Programadas</Text>
      {d.data_retorno ? (
        <View style={P.box}>
          <KV label="Data de retorno" value={d.data_retorno} />
        </View>
      ) : null}
      <View style={P.table}>
        <View style={P.tr}>
          {["Data", "Tipo", "Assinatura"].map((h, i) => (
            <Text key={i} style={[P.th, i === 2 && { borderRight: 0 }]}>
              {h}
            </Text>
          ))}
        </View>
        {insp.map((r: any, idx: number) => (
          <View key={idx} style={P.tr}>
            <Text style={P.td}>{r.data}</Text>
            <Text style={P.td}>{r.tipo}</Text>
            <Text style={[P.td, { borderRight: 0 }]}>
              {r.assinatura ? "Anexo" : "—"}
            </Text>
          </View>
        ))}
      </View>

      <View style={[P.row, P.mt8]}>
        <View style={P.col}>
          <Text style={P.text}>Responsável Técnico</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
          <Text style={[P.text, P.center]}>{d.responsavel_tecnico || " "}</Text>
          <Text style={[P.text, P.center]}>CREA: {d.crea || " "}</Text>
        </View>
        <View style={P.col}>
          <Text style={P.text}>Aplicador</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
        </View>
        <View style={P.col}>
          <Text style={P.text}>Cliente</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
        </View>
      </View>
    </Page>
  );

  /* Página 3 – Certificado */
  const validadeStr = addYears(d.data_emissao, validadeAnos);
  const Page3 = (
    <Page size="A4" style={P.page}>
      <View style={P.box}>
        <Text style={P.h1}>CERTIFICADO</Text>
        <Text style={P.text}>
          {COMPANY.nome} • CNPJ: {COMPANY.cnpj} • Licença Sanitária:{" "}
          {d.licenca_sanitaria || "—"}
        </Text>
      </View>

      <View style={P.box}>
        <Text style={P.text}>
          A empresa {COMPANY.nome}, devidamente licenciada e legalmente
          habilitada, certifica que realizará o serviço de controle de cupins no
          endereço indicado, conforme POP descrito e produtos com registro no
          Ministério da Saúde/ANVISA. Validade prevista do certificado:{" "}
          {validadeAnos} ano(s){d.data_emissao ? ` (até ${validadeStr})` : ""}.
        </Text>
        <View style={[P.row, P.mt8]}>
          <View style={P.col}>
            <KV
              label="Cliente"
              value={d.cliente_nome || printable.client?.name}
            />
          </View>
          <View style={P.col}>
            <KV
              label="CNPJ/CPF"
              value={d.cliente_cnpj || printable.client?.doc}
            />
          </View>
        </View>
        <KV
          label="Endereço"
          value={d.cliente_endereco || printable.client?.address}
        />
        <View style={P.row}>
          <View style={P.col}>
            <KV label="Cidade/UF" value={d.cliente_cidade_uf} />
          </View>
          <View style={P.col}>
            <KV label="CEP" value={d.cliente_cep} />
          </View>
        </View>
        <KV
          label="Pragas controladas"
          value={
            (Array.isArray(d.pragas_alvo) ? d.pragas_alvo : []).join(", ") ||
            "—"
          }
        />
        <KV
          label="Método de aplicação"
          value={
            (Array.isArray(d.metodos_utilizados)
              ? d.metodos_utilizados
              : []
            ).join(", ") || "—"
          }
        />
        {d.data_retorno ? (
          <KV label="Data de retorno" value={d.data_retorno} />
        ) : null}
      </View>

      <View style={[P.row, P.mt8]}>
        <View style={P.col}>
          <Text style={P.text}>Responsável Técnico</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
          <Text style={[P.text, P.center]}>{d.responsavel_tecnico || " "}</Text>
          <Text style={[P.text, P.center]}>CREA: {d.crea || " "}</Text>
        </View>
        <View style={P.col}>
          <Text style={P.text}>INSECTA DEDETIZADORA</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
        </View>
        <View style={P.col}>
          <Text style={P.text}>Cliente</Text>
          <Text style={[P.text, P.center]}>__________________________</Text>
        </View>
      </View>
    </Page>
  );

  return (
    <Document>
      {Page1}
      {Page2}
      {Page3}
    </Document>
  );
}
async function downloadFAESPdf(printable: any) {
  const blob = await pdf(<FAESPdfDoc printable={printable} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const code =
    printable?.faes?.public_code || `FAES-${printable?.faes?.id ?? ""}`;
  a.download = `${code}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* =========================
   SCHEMA (pré-serviço)
========================= */
const DEFAULT_SCHEMA: FAESchema = {
  version: "2.1",
  title: "Ficha Avaliativa de Execução de Serviço (Pré-Execução)",
  sections: [
    {
      id: "identificacao",
      title: "Identificação",
      fields: [
        {
          id: "cliente_nome",
          label: "Cliente",
          type: "text",
          required: true,
          columns: 2,
        },
        { id: "cliente_cnpj", label: "CNPJ/CPF", type: "text", columns: 1 },
        { id: "cliente_endereco", label: "Endereço", type: "text", columns: 2 },
        {
          id: "cliente_cidade_uf",
          label: "Cidade/UF",
          type: "text",
          columns: 1,
        },
        { id: "cliente_cep", label: "CEP", type: "text", columns: 1 },

        {
          id: "area_aplicacao",
          label: "Área de Aplicação",
          type: "select",
          options: ["Residencial", "Comercial", "Industrial", "Outros"],
          columns: 1,
        },
        {
          id: "area_tratada_m2",
          label: "Área Tratada (m²)",
          type: "number",
          columns: 1,
        },
        {
          id: "data_emissao",
          label: "Data de Emissão",
          type: "date",
          required: true,
          columns: 1,
        },

        {
          id: "responsavel_tecnico",
          label: "Responsável Técnico",
          type: "text",
          required: true,
          columns: 2,
        },
        {
          id: "crea",
          label: "CREA/Registro",
          type: "text",
          required: true,
          columns: 1,
        },
        {
          id: "aplicador",
          label: "Aplicador",
          type: "text",
          required: true,
          columns: 1,
        },
        {
          id: "licenca_sanitaria",
          label: "Licença Sanitária",
          type: "text",
          required: true,
          columns: 1,
        },

        {
          id: "tempo_previsto_dias",
          label: "Tempo Previsto (dias)",
          type: "number",
          columns: 1,
        },
        {
          id: "validade_certificado_anos",
          label: "Validade do Certificado (anos)",
          type: "number",
          columns: 1,
        },
      ],
    },

    {
      id: "objetivo",
      title: "Objetivo",
      fields: [
        {
          id: "objetivo",
          label: "Objetivo do serviço",
          type: "textarea",
          required: true,
        },
      ],
    },

    {
      id: "materiais",
      title: "Materiais e Equipamentos",
      fields: [
        {
          id: "materiais_equipamentos",
          label: "Materiais/Equipamentos",
          type: "textarea",
          placeholder: "Pulverizadores, perfuradores, EPIs...",
        },
        {
          id: "epis_utilizados",
          label: "EPIs",
          type: "checkbox",
          options: ["Luvas", "Máscara", "Óculos", "Avental", "Botas"],
        },
      ],
    },

    {
      id: "produtos",
      title: "Produtos Planejados",
      description: "Conforme rótulo/FISPQ e registro ANVISA/MS.",
      fields: [
        {
          id: "produtos_planejados",
          label: "Produtos (tabela principal)",
          type: "repeater",
          minItems: 1,
          children: [
            {
              id: "produto",
              label: "Produto",
              type: "text",
              required: true,
            },
            { id: "grupo_quimico", label: "Grupo químico", type: "text" },
            {
              id: "registro_ms",
              label: "Registro MS/ANVISA",
              type: "text",
              required: true,
            },
            { id: "diluente", label: "Diluente", type: "text" },
            { id: "quantidade", label: "Quantidade", type: "text" },
            { id: "praga_alvo", label: "Praga alvo", type: "text" },
            { id: "equipamento", label: "Equipamento", type: "text" },
            { id: "antidoto", label: "Antídoto/Tratamento", type: "text" },
            // Dica: você pode adicionar "productId" no schema se quiser exibir no formulário,
            // mas não é obrigatório — a gente injeta no objeto ao selecionar.
          ],
        },
        {
          id: "produtos_resumo",
          label:
            "Resumo (produto / princípio ativo / registro / forma de aplicação)",
          type: "repeater",
          children: [
            { id: "produto", label: "Produto", type: "text" },
            { id: "principio_ativo", label: "Princípio ativo", type: "text" },
            { id: "registro_ms", label: "Registro ANVISA", type: "text" },
            {
              id: "forma_aplicacao",
              label: "Forma de aplicação",
              type: "text",
            },
          ],
        },
      ],
    },

    {
      id: "pragas_metodos",
      title: "Pragas e Métodos",
      fields: [
        {
          id: "pragas_alvo",
          label: "Pragas alvo",
          type: "multiselect",
          options: PEST_OPTIONS,
          required: true,
          description: "Selecione pelo menos 1.",
        },
        {
          id: "metodos_utilizados",
          label: "Métodos Utilizados",
          type: "multiselect",
          options: METHOD_OPTIONS,
          required: true,
          description: "Selecione pelo menos 1.",
        },
        {
          id: "metodos_outros",
          label: "Outros (descrever)",
          type: "text",
          placeholder: "Se houver",
          columns: 2,
        },
      ],
    },

    {
      id: "pop",
      title: "POP – Procedimento Operacional Padrão",
      fields: [
        {
          id: "procedimentos",
          label: "Etapas (título + descrição)",
          type: "repeater",
          children: [
            { id: "titulo", label: "Título", type: "text" },
            { id: "descricao", label: "Descrição", type: "textarea" },
          ],
        },
      ],
    },

    {
      id: "cronograma",
      title: "Cronograma Previsto",
      fields: [
        {
          id: "cronograma_previsto_texto",
          label: "Descrição geral",
          type: "textarea",
          placeholder: "Semana 1: ..., Semana 2: ...",
        },
        {
          id: "cronograma_previsto",
          label: "Execuções previstas",
          type: "repeater",
          children: [
            { id: "data", label: "Data", type: "date" },
            { id: "atividade", label: "Atividade/Etapa", type: "text" },
            { id: "observacoes", label: "Observações", type: "text" },
          ],
        },
      ],
    },

    {
      id: "inspecoes",
      title: "Inspeções / Reinspeções Programadas",
      fields: [
        { id: "data_retorno", label: "Data de retorno", type: "date" },
        {
          id: "inspecoes_programadas",
          label: "Inspeções",
          type: "repeater",
          children: [
            { id: "data", label: "Data", type: "date" },
            {
              id: "tipo",
              label: "Tipo",
              type: "select",
              options: ["Inspeção", "Reinspeção"],
              placeholder: "Inspeção",
            },
            { id: "assinatura", label: "Assinatura (upload)", type: "file" },
          ],
        },
      ],
    },

    {
      id: "assinaturas",
      title: "Assinaturas e Anexos",
      fields: [
        {
          id: "assinatura_cliente",
          label: "Assinatura do Cliente (upload)",
          type: "file",
        },
        {
          id: "assinatura_aplicador",
          label: "Assinatura do Aplicador (upload)",
          type: "file",
        },
        { id: "fotos", label: "Fotos (antes/depois)", type: "file" },
      ],
    },
  ],
};

/* =========================
   Inputs básicos
========================= */
type RendererProps = {
  field: Field;
  value: any;
  onChange: (id: string, value: any) => void;
};

function MultiChipInput({
  value,
  onChange,
  options = [],
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options?: string[];
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add(tag: string) {
    const t = tag.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setInput("");
  }
  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-zinc-500 hover:text-zinc-800"
              aria-label={`Remover ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        placeholder={placeholder || "Digite e pressione Enter"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        list="multichips-options"
      />
      <datalist id="multichips-options">
        {options.map((op) => (
          <option value={op} key={op} />
        ))}
      </datalist>
    </div>
  );
}

function SimpleInput({ field, value, onChange }: RendererProps) {
  const base =
    "w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400";
  switch (field.type) {
    case "text":
    case "number":
    case "date":
    case "file":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-600"> *</span>}
          </label>
          <input
            className={base}
            type={field.type === "text" ? "text" : field.type}
            placeholder={field.placeholder}
            required={field.required}
            value={field.type === "file" ? undefined : (value as any)}
            onChange={(e) => {
              if (field.type === "file") {
                const files = (e.target as HTMLInputElement).files;
                onChange(field.id, files && files[0] ? files[0] : null);
              } else if (field.type === "number") {
                onChange(
                  field.id,
                  (e.target as HTMLInputElement).value === ""
                    ? ""
                    : Number((e.target as HTMLInputElement).value)
                );
              } else {
                onChange(field.id, (e.target as HTMLInputElement).value);
              }
            }}
          />
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    case "textarea":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-600"> *</span>}
          </label>
          <textarea
            className={cls(base, "min-h-[96px]")}
            placeholder={field.placeholder}
            value={value as any}
            onChange={(e) =>
              onChange(field.id, (e.target as HTMLTextAreaElement).value)
            }
          />
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    case "select":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-600"> *</span>}
          </label>
          <select
            className={base}
            value={(value as any) || ""}
            onChange={(e) =>
              onChange(field.id, (e.target as HTMLSelectElement).value)
            }
          >
            <option value="">Selecione...</option>
            {(field.options || []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    case "multiselect":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">{field.label}</label>
          <MultiChipInput
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(arr) => onChange(field.id, arr)}
            options={field.options || []}
            placeholder="Digite para adicionar (Enter)"
          />
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">{field.label}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((op) => {
              const checked = Array.isArray(value)
                ? (value as any[]).includes(op)
                : false;
              return (
                <label
                  key={op}
                  className="flex items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const isChecked = (e.target as HTMLInputElement).checked;
                      const arr = Array.isArray(value)
                        ? [...(value as any[])]
                        : [];
                      if (isChecked) {
                        if (!arr.includes(op)) arr.push(op);
                      } else {
                        const idx = arr.indexOf(op);
                        if (idx !== -1) arr.splice(idx, 1);
                      }
                      onChange(field.id, arr);
                    }}
                  />
                  <span className="text-sm">{op}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    case "radio":
    case "signature":
      return null;
    default:
      return null;
  }
}

/* =========================
   Página
========================= */
function FieldRenderer({ field, value, onChange }: RendererProps) {
  if (field.type === "repeater") {
    const rep = field as FieldRepeater;
    const items: any[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-medium">
            {field.label}
            {(rep.minItems && rep.minItems > 0) || field.required ? (
              <span className="text-red-600"> *</span>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => onChange(field.id, [...items, {}])}
            className="px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            + Adicionar
          </button>
        </div>
        {items.length === 0 && (
          <p className="text-sm text-gray-500">Nenhum item adicionado.</p>
        )}
        <div className="space-y-4">
          {items.map((row, idx) => (
            <div key={idx} className="rounded-2xl border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Item {idx + 1}</div>
                <div className="space-x-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                    onClick={() => {
                      const next = [...items];
                      next.splice(idx + 1, 0, JSON.parse(JSON.stringify(row)));
                      onChange(field.id, next);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                    onClick={() => {
                      const next = items.filter((_, i) => i !== idx);
                      onChange(field.id, next);
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rep.children.map((child) => {
                  // SELECT bonitinho de produtos
                  if (
                    field.id === "produtos_planejados" &&
                    child.id === "produto"
                  ) {
                    return (
                      <div key={child.id}>
                        <ProductSelect
                          label={`${child.label}${child.required ? " *" : ""}`}
                          value={row[child.id] ?? ""}
                          onPickProduct={(p) => {
                            const next = [...items];
                            if (!p) {
                              // limpar
                              next[idx] = {
                                ...row,
                                produto: "",
                                productId: null,
                              };
                            } else {
                              next[idx] = {
                                ...row,
                                productId: p.id, // <- grava ID para o _enrich_products do back
                                produto: p.name,
                                grupo_quimico:
                                  row.grupo_quimico || p.group_chemical || "",
                                registro_ms:
                                  row.registro_ms || p.registration_ms || "",
                                diluente:
                                  row.diluente || p.default_diluent || "",
                                praga_alvo:
                                  row.praga_alvo || p.target_pests || "",
                                equipamento:
                                  row.equipamento || p.default_equipment || "",
                                antidoto: row.antidoto || p.antidote || "",
                              };
                            }
                            onChange(field.id, next);
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <SimpleInput
                      key={child.id}
                      field={child}
                      value={row[child.id] ?? ""}
                      onChange={(fid, v) => {
                        const next = [...items];
                        next[idx] = { ...row, [fid]: v };
                        onChange(field.id, next);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <SimpleInput field={field} value={value} onChange={onChange} />;
}

export default function FAESFormPage() {
  const [sp] = useSearchParams();
  const osId = sp.get("os_id") || undefined;
  const clientIdFromQuery = sp.get("client_id") || "";

  const [schema, setSchema] = useState<FAESchema | null>(null);
  const [values, setValues] = useState<Record<string, JsonValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [submissionCode, setSubmissionCode] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] =
    useState<string>(clientIdFromQuery);

  const { data: order, isLoading: osLoading } = useServiceOrder(
    osId ? Number(osId) : 0
  );
  const { data: selectedClient } = useClientById(
    selectedClientId ? Number(selectedClientId) : 0
  );
  const { data: clientsList } = useClients("", "", 100);

  useEffect(() => {
    const sc = DEFAULT_SCHEMA;
    setSchema(sc);
    const init = toInitialValues(sc);
    init["data_emissao"] = iso(new Date().toISOString());
    init["validade_certificado_anos"] = 2;

    // Pré-preenchimento com seus dados
    init["responsavel_tecnico"] = "Filipe Antônio Kroll";
    init["crea"] = "181022-2";
    init["aplicador"] = "Darlan Antonio Rempalski";
    init["licenca_sanitaria"] = "11/2025";

    setValues(init);
  }, []);

  useEffect(() => {
    if (!order) return;
    const c = order?.client ?? {};
    setValues((prev) => ({
      ...prev,
      ...mapClientToFields(c),
      os_numero: safe(order?.public_code) || String(order?.id ?? ""),
      data_emissao: iso(order?.created_at) || (prev["data_emissao"] as string),
    }));
    if (c?.id) setSelectedClientId(String(c.id));
  }, [order]);

  useEffect(() => {
    if (!selectedClient) return;
    setValues((prev) => ({ ...prev, ...mapClientToFields(selectedClient) }));
  }, [selectedClient]);

  const handleChange = (id: string, v: any) => {
    setValues((prev) => {
      const next = { ...prev };
      setDeep(next, id, v);
      return next;
    });
  };

  function validateBeforeFinalize(
    schema: FAESchema,
    values: Record<string, any>
  ) {
    const missing: string[] = [];

    for (const s of schema.sections) {
      for (const f of s.fields) {
        const v = values[f.id];

        if (f.type !== "repeater") {
          if (f.required) {
            const empty =
              v == null ||
              v === "" ||
              (Array.isArray(v) && (v as any[]).length === 0);
            if (empty) missing.push(f.id);
          }
          continue;
        }

        const rep = f as FieldRepeater;
        const arr = Array.isArray(v) ? v : [];
        if (rep.minItems && arr.length < rep.minItems) {
          missing.push(f.id);
        }
        for (let i = 0; i < arr.length; i++) {
          const row = arr[i] || {};
          for (const ch of rep.children) {
            const cb = ch as FieldBase;
            if (cb.required) {
              const cv = row[cb.id];
              const empty =
                cv == null ||
                cv === "" ||
                (Array.isArray(cv) && cv.length === 0);
              if (empty) missing.push(`${f.id}.${cb.id}`);
            }
          }
        }
      }
    }

    if (Array.isArray(values.pragas_alvo) && values.pragas_alvo.length === 0) {
      if (!missing.includes("pragas_alvo")) missing.push("pragas_alvo");
    }
    if (
      Array.isArray(values.metodos_utilizados) &&
      values.metodos_utilizados.length === 0
    ) {
      if (!missing.includes("metodos_utilizados"))
        missing.push("metodos_utilizados");
    }

    return missing;
  }

  const handleSubmit = async (finalizar: boolean) => {
    if (!schema) return;
    if (!selectedClientId) {
      alert("Selecione um cliente antes de salvar.");
      return;
    }
    if (finalizar) {
      const missing = validateBeforeFinalize(schema, values as any);
      if (missing.length) {
        const labels = buildLabelMap(schema);
        const nice = missing
          .map((k) => labels[k] || k)
          .filter((v, i, a) => a.indexOf(v) === i);
        alert(
          "Preencha os campos obrigatórios antes de finalizar:\n- " +
            nice.join("\n- ")
        );
        return;
      }
    }
    setSubmitting(true);
    try {
      const dataReady = await deepReplaceFiles(values);
      const payload = {
        schemaVersion: schema.version,
        schemaTitle: schema.title,
        clientId: Number(selectedClientId),
        osId: osId ? Number(osId) : undefined,
        data: dataReady,
        finalizar,
        submittedAt: new Date().toISOString(),
      };
      const created = await apiCreateFAES(payload);
      setSubmissionId(created.id);
      setSubmissionCode(created.public_code);
      alert(
        `Ficha ${finalizar ? "finalizada" : "salva"}! Código: ${
          created.public_code
        }`
      );
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar/salvar a ficha");
    } finally {
      setSubmitting(false);
    }
  };

  const clients = clientsList?.items ?? [];
  const canGeneratePdf = Number.isFinite(submissionId) && !!submissionId;
  if (!schema) return <div className="p-6">Carregando…</div>;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!osId && (
            <div className="mb-4 rounded-2xl border bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">
                  Selecionar cliente
                </label>
                <select
                  className="w-full rounded-xl border px-3 py-2"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">— Escolha um cliente —</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.doc ? `• ${c.doc}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Ao selecionar, a identificação é preenchida automaticamente.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/clientes"
                  className="px-3 py-2 rounded-xl border hover:bg-gray-50"
                >
                  Gerenciar clientes
                </a>
              </div>
            </div>
          )}

          {/* Checklist de obrigatórios */}
          <div className="mb-4 rounded-xl border bg-amber-50 p-3 text-sm text-amber-900">
            <strong>Campos obrigatórios para finalizar:</strong>
            <ul className="list-disc pl-5">
              <li>Cliente e Data de Emissão</li>
              <li>Objetivo do serviço</li>
              <li>
                Responsável Técnico, CREA/Registro, Aplicador, Licença Sanitária
              </li>
              <li>Produtos (mínimo 1 com Produto e Registro MS/ANVISA)</li>
              <li>Pragas alvo (mínimo 1) e Métodos Utilizados (mínimo 1)</li>
            </ul>
          </div>

          {/* Header */}
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">{schema.title}</h1>
              <p className="text-sm text-gray-600">
                {osLoading
                  ? "Carregando OS..."
                  : osId
                  ? `OS: ${(values as any).os_numero || osId}`
                  : submissionCode
                  ? `FAES: ${submissionCode}`
                  : "Pré-execução"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                Salvar rascunho
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                Finalizar
              </button>
              <button
                type="button"
                className={cls(
                  "px-4 py-2 rounded-xl text-white",
                  canGeneratePdf
                    ? "bg-zinc-900 hover:bg-zinc-800"
                    : "bg-gray-400 cursor-not-allowed"
                )}
                onClick={async () => {
                  if (!submissionId) return;
                  const printable = await apiGetFAESPrintable(
                    Number(submissionId)
                  );
                  await downloadFAESPdf(printable);
                }}
                disabled={!canGeneratePdf}
              >
                Gerar PDF
              </button>
            </div>
          </header>

          {/* Form */}
          <form className="space-y-8">
            {schema.sections.map((section) => (
              <section
                key={section.id}
                className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      className={[
                        field.type === "repeater"
                          ? "md:col-span-2 lg:col-span-3"
                          : "",
                        field.columns === 2 ? "md:col-span-2" : "",
                        field.columns === 3
                          ? "md:col-span-2 lg:col-span-3"
                          : "",
                      ].join(" ")}
                    >
                      <FieldRenderer
                        field={field}
                        value={(values as any)[field.id]}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </form>

          {/* Footer */}
          <footer className="flex flex-wrap gap-2 justify-end mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
            >
              Finalizar
            </button>
            <button
              type="button"
              className={cls(
                "px-4 py-2 rounded-xl text-white",
                canGeneratePdf
                  ? "bg-zinc-900 hover:bg-zinc-800"
                  : "bg-gray-400 cursor-not-allowed"
              )}
              onClick={async () => {
                if (!submissionId) return;
                const printable = await apiGetFAESPrintable(
                  Number(submissionId)
                );
                await downloadFAESPdf(printable);
              }}
              disabled={!canGeneratePdf}
            >
              Gerar PDF
            </button>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
