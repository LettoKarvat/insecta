import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Evaluation,
  CreateEvaluationRequest,
  PaginatedResponse,
} from "@/types/api";

// agora aceita clientId opcional como 1º arg
export function useEvaluations(
  clientId?: number,
  cursor: string = "",
  limit: number = 20
) {
  return useQuery({
    queryKey: ["evaluations", clientId, cursor, limit],
    queryFn: async (): Promise<PaginatedResponse<Evaluation>> => {
      const params: any = { cursor, limit };
      if (clientId) params.client_id = clientId;
      const res = await apiClient.get("/evaluations", { params });
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateEvaluationRequest
    ): Promise<Evaluation> => {
      const res = await apiClient.post("/evaluations", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useEvaluationPdf() {
  return useMutation({
    mutationFn: async ({
      id,
      template = "faes_padrao",
    }: {
      id: number;
      template?: string;
    }) => {
      const res = await apiClient.get(`/evaluations/${id}/pdf`, {
        params: { template },
        responseType: "blob",
      });
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      URL.revokeObjectURL(url);
    },
  });
}
