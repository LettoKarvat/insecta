import { useState, useCallback } from "react";
import { PageShell } from "@/components/layout/page-shell";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCalendar } from "@/api/hooks/useCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export function Calendar() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  });

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { data: events, isLoading } = useCalendar(dateRange.start, dateRange.end);

  const handleDatesSet = useCallback((arg: any) => {
    setDateRange({
      start: arg.start.toISOString().split("T")[0],
      end: arg.end.toISOString().split("T")[0],
    });
  }, []);

  const handleEventClick = useCallback(
    (clickInfo: any) => {
      const ev = events?.find((e) => e.id.toString() === clickInfo.event.id);
      if (ev) setSelectedEvent(ev);
    },
    [events]
  );

  const handleSelect = useCallback(
    (info: any) => {
      const start = info.startStr;
      navigate(`/ordens-servico/nova?start=${encodeURIComponent(start)}`);
    },
    [navigate]
  );

  return (
    <PageShell
      action={<Button onClick={() => navigate("/ordens-servico/nova")}>Nova OS</Button>}
      title="Agenda"
      description="Visualize todas as ordens de serviço agendadas"
    >
      <div className="bg-background rounded-lg border p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Carregando agenda...</p>
          </div>
        ) : (
          <FullCalendar
            selectable
            select={handleSelect}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            initialView="dayGridMonth"
            locale="pt-br"
            height="auto"
            events={
              events?.map((e) => ({
                id: e.id.toString(),
                title: e.title,
                start: e.start,
                end: e.end,
                allDay: e.all_day,
              })) || []
            }
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            eventColor="#2563eb"
            eventBackgroundColor="#2563eb"
            eventBorderColor="#2563eb"
            buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
            dayHeaderFormat={{ weekday: "short" }}
            dayMaxEvents={3}
            moreLinkText="mais"
          />
        )}
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Agendamento</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedEvent.title}</h3>
                <p className="text-sm text-muted-foreground">{formatDateTime(selectedEvent.start)}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/ordens-servico/${selectedEvent.service_order_id ?? selectedEvent.id}`}>
                  <Button size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
