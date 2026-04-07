import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ANALISTAS } from "@/lib/analysis-data";
import { useMemo } from "react";
import { calcDosage } from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";
import { useProduction } from "@/hooks/api/useProduction";
import { useProfiles } from "@/hooks/api/useProfiles";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const { createBatch, isCreating } = useProduction();
  const { settings } = useTechnicalSettings();
  const { profiles } = useProfiles();
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const [volume, setVolume] = useState(() => {
    if (analysis?.formData.volume_m3) return (analysis.formData.volume_m3 * 1000).toString();
    if (settings?.volume_batelada_padrao) return settings.volume_batelada_padrao.toString();
    return "550";
  });
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().slice(0, 16));
  const [observacoes, setObservacoes] = useState("");

  const dosageResult = useMemo(() => {
    if (!analysis) return null;
    const volM3 = Number(volume) / 1000;
    if (volM3 <= 0) return null;

    return calcDosage({
      relacao_cimento: analysis.formData.relacao_cimento,
      relacao_ac: analysis.formData.relacao_ac,
      consumo_alvo_m3: analysis.formData.consumo_alvo_m3,
      volume_m3: volM3,
      densidade_cimento: settings?.densidade_cimento_padrao || analysis.formData.densidade_cimento,
      proporcoes_materiais: analysis.formData.materiais_selecionados.map((m: any) => ({
        nome: m.nome,
        proporcao_pct: m.proporcao_pct,
        densidade: m.densidade,
      })),
      aditivos_ml: analysis.formData.aditivos_ml * (volM3 / (analysis.formData.volume_m3 || (Number(settings?.volume_batelada_padrao) / 1000) || 0.55)),
    });
  }, [analysis, volume, settings]);

  if (!analysis) return null;

  const handleRegister = async () => {
    if (!operador.trim()) {
      toast.error("Selecione o operador");
      return;
    }
    if (!maquina.trim()) {
      toast.error("Informe a máquina");
      return;
    }
    if (!volume.trim() || Number(volume) <= 0) {
      toast.error("Informe o volume produzido");
      return;
    }

    try {
      const batchCode = `L-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      const selectedOperator = profiles.find((p) => p.id === operador);
      
      await createBatch({
        analysis_id: analysis.id,
        batch_code: batchCode,
        operador_nome: selectedOperator?.nome ?? operador,
        maquina,
        volume_produzido: Number(volume),
        notas: observacoes,
        produced_at: dataProducao,
      });

      onOpenChange(false);
      resetForm();

      toast.success("Lote de produção criado!", {
        description: `${batchCode} — 4 rompimentos agendados automaticamente.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar o lote de produção");
    }
  };

  const resetForm = () => {
    setOperador("");
    setMaquina("");
    setVolume("");
    setObservacoes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registrar Produção
          </DialogTitle>
          <DialogDescription>
            Crie um lote de produção para <strong>{analysis.codigo}</strong>. Os 4 agendamentos de rompimento (1, 3, 7 e 28 dias) serão criados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
            <p><span className="text-muted-foreground">Análise:</span> <strong>{analysis.codigo}</strong> — {analysis.nome}</p>
            <p><span className="text-muted-foreground">Tipo:</span> {analysis.tipo}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Select value={operador} onValueChange={setOperador}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o operador" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maquina">Máquina *</Label>
            <Input
              id="maquina"
              value={maquina}
              onChange={(e) => setMaquina(e.target.value)}
              placeholder="Ex: Vibro-prensa VP-3000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="volume">Volume Produzido (L) *</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="Ex: 550"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-producao">Data/Hora Produção</Label>
              <Input
                id="data-producao"
                type="datetime-local"
                value={dataProducao}
                onChange={(e) => setDataProducao(e.target.value)}
              />
            </div>
          </div>

          {dosageResult && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Receita de Pesagem (Misturador)
              </Label>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left py-1.5 px-3 font-black uppercase">Material</th>
                      <th className="text-right py-1.5 px-3 font-black uppercase text-primary">Peso (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-1.5 px-3 font-bold">Cimento</td>
                      <td className="py-1.5 px-3 text-right font-black text-primary">
                        {dosageResult.consumo_cimento_batelada.toFixed(2)} kg
                      </td>
                    </tr>
                    {dosageResult.materiais_batelada.map((m) => (
                      <tr key={m.nome}>
                        <td className="py-1.5 px-3 text-muted-foreground">{m.nome}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                      <td className="py-1.5 px-3 font-bold text-blue-600 dark:text-blue-400">Água</td>
                      <td className="py-1.5 px-3 text-right font-black text-blue-600 dark:text-blue-400">
                        {dosageResult.agua_batelada.toFixed(2)} L
                      </td>
                    </tr>
                    <tr className="bg-muted/30 font-black">
                      <td className="py-2 px-3 uppercase">Total Batelada</td>
                      <td className="py-2 px-3 text-right text-sm">
                        {dosageResult.massa_total_batelada.toFixed(1)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {dosageResult.massa_total_batelada > (settings?.volume_batelada_padrao || 550) && (
                <p className="text-[10px] text-destructive font-bold animate-pulse">
                  ⚠️ ATENÇÃO: Massa total excede a capacidade de {settings?.volume_batelada_padrao || 550}kg do misturador!
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs-producao">Observações (opcional)</Label>
            <Textarea
              id="obs-producao"
              placeholder="Registre observações sobre a produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={isCreating} className="gap-2">
            {isCreating ? "Registrando..." : "Confirmar Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
