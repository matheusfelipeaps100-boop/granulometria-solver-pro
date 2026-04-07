import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRuptureSchedules } from "@/hooks/api/useRuptureSchedules";
import { Plus, X, CalendarDays, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RuptureDaysTab() {
  const { schedules, isLoading, upsertSchedule, deleteSchedule, isProcessing } = useRuptureSchedules();
  const [newDay, setNewDay] = useState("");

  const ruptureDays = schedules
    .filter(s => s.ativo)
    .map(s => s.dias_rompimento)
    .sort((a, b) => a - b);

  const handleAdd = async () => {
    const val = parseInt(newDay);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um número de dias válido (maior que 0).");
      return;
    }
    if (ruptureDays.includes(val)) {
      toast.error("Essa idade já está configurada.");
      return;
    }

    try {
      await upsertSchedule({
        tipo_produto: "bloco", // Usando bloco como padrão por enquanto
        dias_rompimento: val,
        meta_resistencia_pct: null,
        ativo: true
      });
      setNewDay("");
      toast.success(`Idade de ${val} dia(s) adicionada.`);
    } catch (error) {
      toast.error("Erro ao adicionar idade de rompimento.");
    }
  };

  const handleRemove = async (day: number) => {
    const schedule = schedules.find(s => s.dias_rompimento === day);
    if (!schedule) return;

    if (ruptureDays.length <= 1) {
      toast.error("É necessário manter ao menos 1 idade de rompimento.");
      return;
    }

    try {
      await deleteSchedule(schedule.id);
      toast.success(`Idade de ${day} dia(s) removida.`);
    } catch (error) {
      toast.error("Erro ao remover idade.");
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm mt-4">
        <CardContent className="py-12 flex flex-col items-center justify-center text-primary gap-3">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Carregando cronograma...</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-sm mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Idades de Rompimento (dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure as idades (em dias) em que os rompimentos serão agendados automaticamente ao registrar uma produção.
        </p>

        <div className="flex flex-wrap gap-2">
          {ruptureDays.map((day) => (
            <Badge
              key={day}
              variant="secondary"
              className="text-sm px-3 py-1.5 gap-1.5"
            >
              {day} {day === 1 ? "dia" : "dias"}
              <button
                onClick={() => handleRemove(day)}
                className="ml-1 rounded-full hover:bg-muted p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 max-w-xs">
          <Input
            type="number"
            min={1}
            placeholder="Ex: 14"
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="gap-1" disabled={isProcessing}>
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Alterações afetam apenas novas produções. Cronogramas existentes não são modificados.
        </p>
      </CardContent>
    </Card>
  );
}
