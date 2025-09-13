import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Product,
  CreateProductRequest,
  QuantityUpdateRequest,
  PaginatedResponse,
} from "@/types/api";

/** Normaliza respostas do backend para lista de produtos */
function normalizeListResponse(data: any): {
  items: Product[];
  nextCursor: string;
} {
  // Pode vir { items, next_cursor }, { data, nextCursor }, ou um array puro
  const items: Product[] =
    (Array.isArray(data) ? data : data?.items) ?? data?.data ?? [];
  const nextCursor =
    data?.next_cursor ?? data?.nextCursor ?? data?.cursor?.next ?? "";
  return { items, nextCursor };
}

/** Lista/paginação por cursor + filtro de críticos */
export function useProducts(
  onlyCritical: boolean = false,
  cursor: string = "",
  limit: number = 50
) {
  return useQuery({
    queryKey: [
      "products",
      { onlyCritical: !!onlyCritical, cursor: cursor || null, limit },
    ],
    queryFn: async (): Promise<PaginatedResponse<Product>> => {
      const params: Record<string, any> = { limit };
      if (onlyCritical) params.only_critical = 1;
      if (cursor) params.cursor = cursor;

      // IMPORTANTE: se apiClient já tem baseURL '/api/v1', NÃO repita aqui
      const res = await apiClient.get("/products", { params });
      // Se o seu backend já devolve exatamente PaginatedResponse<Product>, pode retornar direto:
      // return res.data as PaginatedResponse<Product>;

      // Caso contrário, normalizamos para manter compatibilidade:
      const { items, nextCursor } = normalizeListResponse(res.data);
      return {
        items,
        next_cursor: nextCursor,
      } as PaginatedResponse<Product>;
    },
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

/** Carrega um produto por ID */
export function useProduct(id?: number) {
  return useQuery({
    queryKey: ["product", id],
    enabled: typeof id === "number" && Number.isFinite(id),
    queryFn: async (): Promise<Product> => {
      const res = await apiClient.get(`/products/${id}`);
      return res.data as Product;
    },
    staleTime: 30_000,
  });
}

/** Busca por texto (para autocomplete e pesquisas pontuais) */
export function useSearchProducts(q: string, limit: number = 10) {
  return useQuery({
    queryKey: ["products", "search", { q, limit }],
    enabled: !!q && q.length >= 2,
    queryFn: async (): Promise<Product[]> => {
      const res = await apiClient.get("/products", { params: { q, limit } });
      const { items } = normalizeListResponse(res.data);
      return items;
    },
    staleTime: 15_000,
  });
}

/** Carrega TODOS os produtos (paginando até acabar) — ideal para popular selects */
export function useAllProducts(pageLimit = 500) {
  return useQuery({
    queryKey: ["products", "all", pageLimit],
    queryFn: async (): Promise<Product[]> => {
      let cursor = "";
      const all: Product[] = [];

      // loop defensivo
      for (let i = 0; i < 50; i++) {
        const params: Record<string, any> = { limit: pageLimit };
        if (cursor) params.cursor = cursor;

        const res = await apiClient.get("/products", { params });
        const { items, nextCursor } = normalizeListResponse(res.data);

        all.push(...items);
        cursor = nextCursor;

        if (!cursor) break;
      }

      // Ordena por nome para UX melhor no select
      all.sort((a: any, b: any) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      );

      return all;
    },
    staleTime: 60_000,
  });
}

/** Criação de produto */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductRequest): Promise<Product> => {
      const res = await apiClient.post("/products", payload);
      return res.data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Atualização parcial (PATCH) de produto */
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateProductRequest>;
    }): Promise<Product> => {
      const res = await apiClient.patch(`/products/${id}`, data, {
        headers: { "Content-Type": "application/json" },
      });
      return res.data as Product;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Atualização de quantidade (delta OU absolute) */
export function useUpdateProductQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: QuantityUpdateRequest;
    }): Promise<Product> => {
      let payload: QuantityUpdateRequest | null = null;

      if (
        typeof data?.absolute === "number" &&
        Number.isFinite(data.absolute)
      ) {
        payload = { absolute: data.absolute };
      } else if (
        typeof data?.delta === "number" &&
        Number.isFinite(data.delta)
      ) {
        payload = { delta: data.delta };
      } else {
        throw new Error("Informe delta OU absolute (número).");
      }

      const res = await apiClient.patch(`/products/${id}/quantity`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return res.data as Product;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Exclusão de produto */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
