// src/api/faes.ts
// OBS: o apiClient já tem baseURL => NÃO prefixe com /api/v1 aqui.

import { apiClient } from "@/api/client"; // <- ou use "./client" se preferir caminho relativo

/* ===== Tipos ===== */
export type FaesFormPayload = {
  schemaVersion: string;
  schemaTitle: string;
  clientId: number;
  osId?: number;
  data: Record<string, any>;
  finalizar?: boolean;
  submittedAt?: string;
};

export type FaesForm = {
  id: number;
  public_code: string;
  client_id: number;
  service_order_id?: number | null;
  schema_version: string;
  schema_title: string;
  data: Record<string, any>;
  finalized: boolean;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CompanyInfo = {
  name: string;
  cnpj: string;
  address: string;
  phones?: string[];
  email?: string;
  license_sanitaria?: string;
  cit?: string;
  responsible?: {
    name?: string;
    role?: string;
    crea?: string;
    uf?: string;
  };
  applicator?: {
    name?: string;
    cnpj?: string;
  };
};

export type FaesPrintable = {
  faes: {
    id: number;
    public_code: string;
    schema_version: string;
    schema_title: string;
    finalized: boolean;
    submitted_at?: string | null;
    created_at?: string | null;
  };
  client: {
    id: number | null;
    name: string;
    doc?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  company?: CompanyInfo;
  data: Record<string, any>;
};

/* ===== API ===== */
export async function listFAES(params?: {
  q?: string;
  clientId?: number;
  finalized?: boolean;
  limit?: number;
}): Promise<{ items: FaesForm[]; total: number }> {
  const { q, clientId, finalized, limit } = params || {};
  const searchParams: Record<string, any> = {};
  if (q) searchParams.q = q;
  if (clientId) searchParams.client_id = clientId;
  if (typeof finalized === "boolean")
    searchParams.finalized = finalized ? "true" : "false";
  if (limit) searchParams.limit = limit;

  const { data } = await apiClient.get("/faes", { params: searchParams });
  return data as { items: FaesForm[]; total: number };
}

export async function createFAES(payload: FaesFormPayload): Promise<FaesForm> {
  const { data } = await apiClient.post("/faes", payload);
  return data as FaesForm;
}

export async function updateFAES(id: number, patch: Partial<FaesFormPayload>) {
  const { data } = await apiClient.patch(`/faes/${id}`, patch);
  return data as FaesForm;
}

export async function getFAES(id: number) {
  const { data } = await apiClient.get(`/faes/${id}`);
  return data as FaesForm;
}

export async function getFAESPrintable(id: number) {
  const { data } = await apiClient.get(`/faes/${id}/printable`);
  return data as FaesPrintable;
}
