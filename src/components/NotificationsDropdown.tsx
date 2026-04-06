import { useMemo } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "atrasado" | "hoje" | "proximo";
  title: string;
  description: string;
  scheduleId: string;
}

export function NotificationsDropdown() {
  const batches = useAppStore((s) => (s as any).batches) ?? [];
  const analyses = useAppStore((s) => (s as any).analyses) ?? [];
  const navigate = useNavigate();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const futureLimit = threeDaysFromNow.toISOString().split("T")[0];

    for (const batch of batches) {
      const analysis = analyses.find((a) => a.id === batch.analysis_id);
      const produtoNome = analysis?.nome ?? batch.batch_code;

      for (const s of batch.rupture_schedules) {
        if (s.status === "concluido") continue;

        if (s.data_prevista < today) {
          items.push({
            id: s.id,
            type: "atrasado",
            title: `Rompimento atrasado — ${s.idade_dias}d`,
            description: `${produtoNome} (${batch.batch_code}) — previsto ${formatDate(s.data_prevista)}`,
            scheduleId: s.id,
          });
        } else if (s.data_prevista === today) {
          items.push({
            id: s.id,
            type: "hoje",
            title: `Rompimento HOJE — ${s.idade_dias}d`,
            description: `${produtoNome} (${batch.batch_code})`,
            scheduleId: s.id,
          });
        } else if (s.data_prevista <= futureLimit) {
          items.push({
            id: s.id,
            type: "proximo",
            title: `Rompimento em breve — ${s.idade_dias}d`,
            description: `${produtoNome} (${batch.batch_code}) — ${formatDate(s.data_prevista)}`,
            scheduleId: s.id,
          });
        }
      }
    }

    // Sort: atrasado first, then hoje, then proximo
    const order = { atrasado: 0, hoje: 1, proximo: 2 };
    items.sort((a, b) => order[a.type] - order[b.type]);
    return items;
  }, [batches, analyses, today]);

  const urgentCount = notifications.filter((n) => n.type === "atrasado" || n.type === "hoje").length;

  const iconMap = {
    atrasado: <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />,
    hoje: <Clock className="h-4 w-4 text-yellow-600 shrink-0" />,
    proximo: <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />,
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground ${urgentCount > 0 ? "bg-destructive" : "bg-primary"}`}>
              {notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
          <p className="text-xs text-muted-foreground">Rompimentos pendentes</p>
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum rompimento pendente 🎉
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate(`/ruptures/${n.scheduleId}`)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  {iconMap[n.type]}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
