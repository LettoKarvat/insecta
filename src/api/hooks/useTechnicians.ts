import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../client"
import { Technician, CreateTechnicianRequest, PaginatedResponse } from "@/types/api"

export function useTechnicians(cursor: string = "", limit: number = 50) {
  return useQuery({
    queryKey: ["technicians", cursor, limit],
    queryFn: async (): Promise<PaginatedResponse<Technician>> => {
      const res = await apiClient.get("/technicians", { params: { cursor, limit } })
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useCreateTechnician() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTechnicianRequest): Promise<Technician> => {
      const res = await apiClient.post("/technicians", payload)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] })
    },
  })
}
