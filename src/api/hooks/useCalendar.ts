import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../client"
import { CalendarEvent } from "@/types/api"

export function useCalendar(start: string, end: string) {
  return useQuery({
    queryKey: ["calendar", start, end],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const res = await apiClient.get("/calendar", { params: { start, end } })
      return res.data
    },
    enabled: !!(start && end),
    staleTime: 30_000,
  })
}
