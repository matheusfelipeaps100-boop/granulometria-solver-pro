import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/useAppStore";
import { Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export function RuptureDaysTab() {
  const { ruptureDays, setRuptureDays } = useAppStore();
  const [newDay, setNewDay] = useState("");

  const handleAdd = () => {
    const val = parseInt(newDay);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um número de dias válido (maior que 0).");
      return;
    }
    if (ruptureDays.includes(val)) {
      toast.error("Essa idade já está configurada.");
      return;
    }
    setRuptureDays([...ruptureDays, val]);
    setNewDay("");
    toast.success(`Idade de ${val} dia(s) adicionada.`);
  };

  const handleRemove = (day: number) => {
    if (ruptureDays.length <= 1) {
      toast.error("É necessário manter ao menos 1 idade de rompimento.");
      return;
    }
    setRuptureDays(ruptureDays.filter((d) => d !== day));
    toast.success(`Idade de ${day} dia(s) removida.`);
  };

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
          <Button onClick={handleAdd} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
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
