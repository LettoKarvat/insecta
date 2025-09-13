import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  ServiceOrder,
  CreateServiceOrderRequest,
  PaginatedResponse,
} from "@/types/api";
import { generateIdempotencyKey } from "@/lib/idempotency";
import toast from "react-hot-toast";
import { downloadServiceOrderPdf } from "@/pdf/downloadServiceOrderPdf";

/* ───────── tipos usados pelos PDFs ───────── */
export type PrintableData = {
  order: {
    id?: number;
    public_code?: string;
    status?: string;
    status_text?: string;
    notes?: string | null;
    created_at?: string | null;
    scheduled_at?: string | null;
  };
  client: {
    id?: number;
    name: string;
    doc?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null; // opcional (certificado)
    zip?: string | null; // opcional (certificado)
  };
  company?: {
    name?: string;
    cnpj?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    logo_url?: string | null;
    website?: string | null;
  };
  technicians?: Array<{
    name?: string;
    registry?: string | null;
    signature_url?: string | null;
  }>;
  client_signature?: { name?: string | null; cpf?: string | null };
  items?: Array<{
    pest?: string | null;
    product?: string | null;
    application?: string | null;
    dilution?: string | null;
    quantity?: number | string | null;
    registration_ms?: string | null;
    group_chemical?: string | null;
    composition?: string | null;
    recommended_dilution?: string | null;
    toxicity_action?: string | null;
    antidote?: string | null;
    emergency_phone?: string | null; // ⬅️ NOVO
    garantia?: string | null;
  }>;
  /** Preferências enviadas pelo back (mantido) */
  defaults?: {
    include_certificate?: boolean | null;
    copies?: string[] | null;
    template?: string | null;
  };
  /** ⬇️ NOVO: bloco do certificado */
  certificate?: {
    service_type?: string; // ex: "DESCUPINIZAÇÃO"
    issue_city?: string; // ex: "Campo Alegre"
    execution_days?: number; // ex: 5
    execution_note?: string | null;
    validity_months?: number; // ex: 24
    valid_until?: string | null; // ISO
    methods?: string[]; // ["Pulverização", "Injeção em madeira", ...]
    inspections?: string[]; // 4 datas ISO (6, 12, 18, 24 meses)
  };
  validation_url?: string | null;
  generated_at?: string | null;
  evaluation?: any;
};

/* ───────── helpers ───────── */
const stripEnum = (s?: string) => {
  if (!s) return "";
  const str = String(s);
  const i = str.lastIndexOf(".");
  return i >= 0 ? str.slice(i + 1) : str;
};
const normalizeText = (s?: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const ptToCode = (s?: string) => {
  const up = normalizeText(s);
  const map: Record<string, string> = {
    ABERTA: "OPEN",
    "EM ANDAMENTO": "IN_PROGRESS",
    AGENDADA: "IN_PROGRESS",
    CONCLUIDA: "COMPLETED",
    CANCELADA: "CANCELLED",
  };
  return map[up] || up;
};

const codeToLabelPT = (code?: string) => {
  switch ((code || "").toUpperCase()) {
    case "OPEN":
      return "Aberta";
    case "IN_PROGRESS":
      return "Em Andamento";
    case "COMPLETED":
    case "DONE":
      return "Concluída";
    case "CANCELLED":
      return "Cancelada";
    case "SCHEDULED":
      return "Agendada";
    default:
      return code || "";
  }
};

const normalizeStatus = (raw?: string) => {
  const after = stripEnum(raw);
  const code = ptToCode(after);
  const canonical =
    code === "DONE" ? "COMPLETED" : code === "SCHEDULED" ? "IN_PROGRESS" : code;
  return canonical || "OPEN";
};

const normalizeId = (it: any, idx: number) =>
  it?.id ??
  it?.service_order_id ??
  it?.so_id ??
  it?.code ??
  it?.public_code ??
  `tmp-${idx}`;

/** date helpers para certificado (sem libs externas) */
const addMonths = (iso?: string | null, months = 0) => {
  const d = iso ? new Date(iso) : new Date();
  const day = d.getDate();
  const target = new Date(d.getTime());
  target.setMonth(d.getMonth() + months);
  // Ajuste simples para meses com menos dias
  if (target.getDate() < day) target.setDate(0);
  return target.toISOString();
};

/** Infere tipo de serviço pelo conjunto de pragas */
const inferServiceType = (
  items: PrintableData["items"]
): string | undefined => {
  const txt = (items || [])
    .map((i) => i?.pest || "")
    .join(" ")
    .toLowerCase();
  if (txt.includes("cupin")) return "DESCUPINIZAÇÃO";
  if (txt.includes("broca")) return "DESCUPINIZAÇÃO";
  return "DEDETIZAÇÃO";
};

/** Mapeia possíveis shapes do /printable para o shape esperado pelos componentes PDF */
const mapPrintable = (raw: any): PrintableData => {
  const code = normalizeStatus(raw?.order?.status);
  const label = raw?.order?.status_text
    ? codeToLabelPT(normalizeStatus(raw?.order?.status_text))
    : codeToLabelPT(code);

  const lines = Array.isArray(raw?.lines) ? raw.lines : [];
  const items =
    Array.isArray(raw?.items) && raw.items.length
      ? raw.items
      : lines.map((ln: any) => ({
          pest: ln?.praga ?? ln?.pest ?? null,
          product:
            ln?.product?.name ??
            ln?.produto?.name ??
            ln?.produto ??
            ln?.product ??
            null,
          application: ln?.aplicacao ?? ln?.application ?? null,
          dilution: ln?.diluicao ?? ln?.dilution ?? null,
          quantity: ln?.quantidade ?? ln?.quantity ?? null,
          registration_ms:
            ln?.product?.registration_ms ??
            ln?.produto?.registration_ms ??
            ln?.registration_ms ??
            null,
          group_chemical:
            ln?.product?.group_chemical ??
            ln?.produto?.group_chemical ??
            ln?.group_chemical ??
            null,
          composition:
            ln?.product?.composition ??
            ln?.produto?.composition ??
            ln?.composition ??
            null,
          recommended_dilution:
            ln?.product?.recommended_dilution ??
            ln?.produto?.recommended_dilution ??
            ln?.recommended_dilution ??
            null,
          toxicity_action:
            ln?.product?.toxicity_action ??
            ln?.produto?.toxicity_action ??
            ln?.toxicity_action ??
            null,
          antidote:
            ln?.product?.antidote ??
            ln?.produto?.antidote ??
            ln?.antidote ??
            null,
          emergency_phone:
            ln?.product?.emergency_phone ??
            ln?.produto?.emergency_phone ??
            ln?.emergency_phone ??
            null,
          garantia: ln?.garantia ?? null,
        }));

  // Completa/normaliza bloco certificate se o back não enviar
  const baseISO: string | null =
    raw?.order?.scheduled_at || raw?.order?.created_at || null;

  const methods =
    raw?.certificate?.methods && Array.isArray(raw.certificate.methods)
      ? raw.certificate.methods
      : Array.from(
          new Set(
            (items || [])
              .map((i) => (i?.application || "")?.trim())
              .filter(Boolean)
          )
        );

  const validityMonths =
    raw?.certificate?.validity_months != null
      ? Number(raw.certificate.validity_months)
      : 24;

  const certificate = {
    service_type:
      raw?.certificate?.service_type ??
      inferServiceType(items) ??
      "DEDETIZAÇÃO",
    issue_city:
      raw?.certificate?.issue_city ?? raw?.company?.city ?? "Campo Alegre",
    execution_days: raw?.certificate?.execution_days ?? 5,
    execution_note: raw?.certificate?.execution_note ?? null,
    validity_months: validityMonths,
    valid_until:
      raw?.certificate?.valid_until ??
      (baseISO ? addMonths(baseISO, validityMonths) : null),
    methods,
    inspections:
      raw?.certificate?.inspections ??
      (baseISO ? [6, 12, 18, 24].map((m) => addMonths(baseISO, m)) : []),
  };

  return {
    ...raw,
    order: {
      ...raw?.order,
      status: code,
      status_text: label,
    },
    client: {
      ...raw?.client,
      city: raw?.client?.city ?? null,
      zip: raw?.client?.zip ?? null,
    },
    items,
    certificate,
  };
};

const shouldRetry = (failureCount: number, error: unknown) => {
  const status =
    (error as any)?.response?.status ??
    (error as any)?.status ??
    (error as any)?.code;
  if (status === 429) return false;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 2;
};

// filtro canônico p/ listagem
const mapFilterStatus = (s?: string) =>
  s === "DONE" ? "COMPLETED" : s === "SCHEDULED" ? "IN_PROGRESS" : s;

/* ───────── LISTAGEM / DETALHE ───────── */
export function useServiceOrders(
  clientId?: number,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  cursor: string = "",
  limit: number = 20
) {
  return useQuery({
    queryKey: [
      "service-orders",
      clientId,
      status,
      dateFrom,
      dateTo,
      cursor,
      limit,
    ],
    queryFn: async ({
      signal,
    }): Promise<
      PaginatedResponse<
        ServiceOrder & { client_name?: string; status_code?: string }
      >
    > => {
      const params: any = { cursor, limit };
      if (clientId) params.client_id = clientId;
      if (status) params.status = mapFilterStatus(status);
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await apiClient.get("/service-orders", { params, signal });
      const body = res.data || {};
      const items = (body.items || []).map((it: any, idx: number) => ({
        ...it,
        id: normalizeId(it, idx),
        client_name: it?.client?.name ?? it?.client_name ?? null,
        status: normalizeStatus(it?.status),
      }));
      return { ...body, items };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetry,
  });
}

export function useServiceOrder(id?: number | string) {
  return useQuery({
    queryKey: ["service-order", id],
    enabled: !!id && String(id).length > 0,
    queryFn: async ({ signal }): Promise<ServiceOrder> => {
      const res = await apiClient.get(`/service-orders/${id}`, { signal });
      return res.data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: shouldRetry,
  });
}

/* ───────── CREATE ───────── */
export function useCreateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: CreateServiceOrderRequest
    ): Promise<ServiceOrder> => {
      const res = await apiClient.post("/service-orders", data, {
        headers: { "Idempotency-Key": generateIdempotencyKey() },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("OS criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });
}

/* ───────── PDF (front-render) ───────── */
export function useServiceOrderPdf() {
  return useMutation({
    mutationFn: async (opts: {
      id: number;
      tpl?: string;
      copies?: Array<"cliente" | "empresa">;
      include_certificate?: boolean;
    }) => {
      const {
        id,
        tpl = "os_moderno",
        copies = ["cliente", "empresa"],
        include_certificate = true,
      } = opts;

      const params = {
        template: tpl,
        tpl,
        copies: copies.join(","),
        include_certificate,
      };

      const raw = await apiClient
        .get(`/service-orders/${id}/printable`, { params })
        .then((r) => r.data);

      const printable: PrintableData = mapPrintable(raw);

      await downloadServiceOrderPdf(printable, {
        copies: copies.length,
        includeCertificate: !!include_certificate,
      });

      return true;
    },
    retry: false,
    onError: () => toast.error("Erro ao gerar PDF"),
  });
}

/* ───────── EDIT / DELETE ───────── */
export type ServiceOrderLineUpdate = {
  id?: number; // linha existente
  product_id?: number | null;
  praga?: string | null;
  aplicacao?: string | null;
  diluicao?: string | null;
  quantidade?: number | null;
  garantia?: string | number | null; // aceita string ou number; enviaremos como string
};

export type UpdateServiceOrderRequest = {
  client_id?: number;
  status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; // canônico
  scheduled_at?: string | null; // "YYYY-MM-DDTHH:mm[:ss]" sem timezone
  notes?: string | null;
  lines?: ServiceOrderLineUpdate[];
  technician_ids?: number[];
};

// helpers de normalização para update
const stripEnumPrefix = (s?: string) => {
  if (!s) return undefined;
  return s.includes(".") ? s.split(".").pop() : s;
};
const toNaiveLocalIso = (dtLocal?: string | null) => {
  if (!dtLocal) return undefined;
  const hasSeconds = /\d{2}:\d{2}:\d{2}$/.test(dtLocal);
  return hasSeconds ? dtLocal : `${dtLocal}:00`;
};
const sanitizeUpdate = (data: UpdateServiceOrderRequest) => {
  const out: any = {};

  if (data.client_id != null) out.client_id = Number(data.client_id);

  if (data.status) {
    const raw = String(stripEnumPrefix(data.status)).toUpperCase();
    out.status =
      raw === "DONE" ? "COMPLETED" : raw === "SCHEDULED" ? "IN_PROGRESS" : raw;
  }

  const sched = toNaiveLocalIso(data.scheduled_at ?? undefined);
  if (sched) out.scheduled_at = sched;

  if (typeof data.notes === "string") out.notes = data.notes;

  if (Array.isArray(data.lines)) {
    out.lines = data.lines
      .map((ln) => {
        const obj: any = {};
        if (ln.id != null) obj.id = Number(ln.id);
        if (ln.product_id != null) obj.product_id = Number(ln.product_id);
        if (ln.praga != null) obj.praga = ln.praga || null;
        if (ln.aplicacao != null) obj.aplicacao = ln.aplicacao || null;
        if (ln.diluicao != null) obj.diluicao = ln.diluicao || null;
        if (ln.quantidade != null) obj.quantidade = Number(ln.quantidade);
        if (ln.garantia != null) obj.garantia = String(ln.garantia);
        return obj;
      })
      .filter(
        (o) =>
          o.product_id ||
          o.praga ||
          o.aplicacao ||
          o.diluicao ||
          typeof o.quantidade === "number" ||
          o.garantia != null
      );
  }

  if (Array.isArray(data.technician_ids)) {
    out.technician_ids = data.technician_ids.map(Number);
  }

  return out;
};

export function useUpdateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateServiceOrderRequest;
    }) => {
      const payload = sanitizeUpdate(data);
      const r = await apiClient.patch(`/service-orders/${id}`, payload);
      return r.data as ServiceOrder;
    },
    onSuccess: (_, vars) => {
      toast.success("OS atualizada!");
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      qc.invalidateQueries({ queryKey: ["service-order", String(vars.id)] });
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Não foi possível salvar a OS.";
      toast.error(msg);
    },
  });
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/service-orders/${id}`);
      return id;
    },
    onSuccess: () => {
      toast.success("OS excluída!");
      qc.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });
}
