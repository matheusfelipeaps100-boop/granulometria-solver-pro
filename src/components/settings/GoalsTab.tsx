import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { Target } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export function GoalsTab() {
  const { ruptureDays, ruptureGoals, updateRuptureGoals } = useAppStore();
  
  // Initialize local state prioritizing existing store goals, fallback to 0
  const [localGoals, setLocalGoals] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    ruptureDays.forEach(day => {
      init[day] = ruptureGoals[day] !== undefined ? String(ruptureGoals[day]) : "0";
    });
    return init;
  });

  // Sync state if ruptureDays change elsewhere
  useEffect(() => {
    setLocalGoals(prev => {
      const next: Record<number, string> = { ...prev };
      ruptureDays.forEach(day => {
        if (next[day] === undefined) {
          next[day] = ruptureGoals[day] !== undefined ? String(ruptureGoals[day]) : "0";
        }
      });
      return next;
    });
  }, [ruptureDays, ruptureGoals]);

  const handleGoalChange = (day: number, value: string) => {
    setLocalGoals(prev => ({ ...prev, [day]: value }));
  };

  const handleSave = () => {
    const newGoals: Record<number, number> = {};
    let hasError = false;

    ruptureDays.forEach(day => {
      const val = parseFloat(localGoals[day]);
      if (isNaN(val) || val < 0 || val > 200) {
        hasError = true;
      }
      newGoals[day] = val;
    });

    if (hasError) {
      toast.error("Preencha porcentagens válidas entre 0 e 200 para todos os dias.");
      return;
    }

    updateRuptureGoals(newGoals);
    toast.success("Metas de resistência atualizadas com sucesso.");
  };

  return (
    <Card className="shadow-sm mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas de Evolução da Resistência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Defina o percentual (%) mínimo de resistência à compressão esperado para cada idade de ensaio. A resistência alvo (fck) aos 28 dias normalmente equivale a 100%.
        </p>

        {ruptureDays.length === 0 ? (
          <div className="p-4 border border-dashed rounded bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma idade de rompimento cadastrada no sistema. Vá na aba "Rompimentos" para adicionar.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ruptureDays.map(day => (
                <div key={day} className="space-y-2 p-3 border rounded-lg bg-muted/10 relative">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold text-primary">{day} {day === 1 ? 'dia' : 'dias'}</Label>
                  </div>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="0"
                      max="200"
                      step="1"
                      placeholder="%"
                      className="pr-8 text-right font-black"
                      value={localGoals[day] || ""}
                      onChange={(e) => handleGoalChange(day, e.target.value)}
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">do fck alvo</p>
                </div>
              ))}
            </div>

            <Button onClick={handleSave} className="w-full sm:w-auto">
              Salvar Metas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
