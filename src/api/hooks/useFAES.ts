// src/api/hooks/useFaes.ts
// Observação: o apiClient já tem baseURL apontando para "/api/v1"
// (ou http://127.0.0.1:5000/api/v1). Então use apenas rotas relativas como "/faes".

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

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

export type FaesListParams = {
  q?: string;
  clientId?: number;
  finalized?: boolean;
  limit?: number;
};

export type FaesListResponse = {
  items: FaesForm[];
  total: number;
};

/* ===== API (REST) ===== */
export async function listFAES(
  params: FaesListParams = {}
): Promise<FaesListResponse> {
  const { q, clientId, finalized, limit } = params;
  const searchParams: Record<string, any> = {};
  if (q) searchParams.q = q;
  if (clientId) searchParams.client_id = clientId; // backend espera client_id
  if (typeof finalized === "boolean")
    searchParams.finalized = finalized ? "true" : "false";
  if (limit) searchParams.limit = limit;

  const { data } = await apiClient.get("/faes", { params: searchParams });
  return data as FaesListResponse;
}

export async function createFAES(payload: FaesFormPayload): Promise<FaesForm> {
  const { data } = await apiClient.post("/faes", payload);
  return data as FaesForm;
}

export async function updateFAES(
  id: number,
  patch: Partial<FaesFormPayload>
): Promise<FaesForm> {
  const { data } = await apiClient.patch(`/faes/${id}`, patch);
  return data as FaesForm;
}

export async function getFAES(id: number): Promise<FaesForm> {
  const { data } = await apiClient.get(`/faes/${id}`);
  return data as FaesForm;
}

export async function getFAESPrintable(id: number): Promise<FaesPrintable> {
  const { data } = await apiClient.get(`/faes/${id}/printable`);
  return data as FaesPrintable;
}

/* ===== Hooks (React Query) ===== */
export function useFaesList(params: FaesListParams = {}) {
  return useQuery<FaesListResponse>({
    queryKey: ["faes-list", params],
    queryFn: () => listFAES(params),
    keepPreviousData: true,
    staleTime: 30_000,
  });
}

export function useFaes(id?: number, enabled: boolean = true) {
  return useQuery<FaesForm>({
    queryKey: ["faes", id],
    queryFn: () => getFAES(id as number),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

export function useFaesPrintable(id?: number, enabled: boolean = true) {
  return useQuery<FaesPrintable>({
    queryKey: ["faes-printable", id],
    queryFn: () => getFAESPrintable(id as number),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

export function useCreateFaes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FaesFormPayload) => createFAES(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faes-list"] });
    },
  });
}

export function useUpdateFaes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; patch: Partial<FaesFormPayload> }) =>
      updateFAES(args.id, args.patch),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["faes-list"] });
      qc.invalidateQueries({ queryKey: ["faes", updated.id] });
      qc.invalidateQueries({ queryKey: ["faes-printable", updated.id] });
    },
  });
}
