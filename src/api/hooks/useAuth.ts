import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../client"
import { AuthLoginRequest, AuthLoginResponse } from "@/types/api"
import toast from "react-hot-toast"

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: AuthLoginRequest): Promise<AuthLoginResponse> => {
      const res = await apiClient.post("/auth/login", data)
      return res.data
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.access_token)
      toast.success("Login realizado com sucesso!")
      qc.invalidateQueries()
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem("auth_token")
      qc.clear()
    },
    onSuccess: () => {
      toast.success("Logout realizado com sucesso!")
    },
  })
}
