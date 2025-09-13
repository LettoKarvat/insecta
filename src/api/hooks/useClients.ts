import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Client, CreateClientRequest, PaginatedResponse } from "@/types/api";

export function useClients(search = "", cursor = "", limit = 20) {
  return useQuery({
    queryKey: ["clients", search, cursor, limit],
    queryFn: async (): Promise<PaginatedResponse<Client>> => {
      const res = await apiClient.get("/clients", {
        params: { search, cursor, limit },
      });
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClientRequest): Promise<Client> => {
      const res = await apiClient.post("/clients", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// buscar UM cliente por ID
export function useClientById(id?: number) {
  return useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async (): Promise<Client> => {
      const res = await apiClient.get(`/clients/${id}`);
      return res.data;
    },
    staleTime: 30000,
  });
}

// ⬇️ NOVOS
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<Client>;
    }): Promise<Client> => {
      const res = await apiClient.put(`/clients/${id}`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
