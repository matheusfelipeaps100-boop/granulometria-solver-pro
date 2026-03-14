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
import { useAppStore, type StoredAnalysis } from "@/store/useAppStore";
import { ANALISTAS } from "@/lib/analysis-data";
import { useMemo } from "react";
import { calcDosage } from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const registerBatch = useAppStore((s) => s.registerBatch);
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const [volume, setVolume] = useState((analysis?.formData.volume_m3 ? analysis.formData.volume_m3 * 1000 : 550).toString());
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().slice(0, 16));
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  const dosageResult = useMemo(() => {
    if (!analysis) return null;
    const volM3 = Number(volume) / 1000;
    if (volM3 <= 0) return null;

    return calcDosage({
      relacao_cimento: analysis.formData.relacao_cimento,
      relacao_ac: analysis.formData.relacao_ac,
      consumo_alvo_m3: analysis.formData.consumo_alvo_m3,
      volume_m3: volM3,
      densidade_cimento: analysis.formData.densidade_cimento,
      proporcoes_materiais: analysis.formData.materiais_selecionados.map((m) => ({
        nome: m.nome,
        proporcao_pct: m.proporcao_pct,
        densidade: m.densidade,
      })),
      aditivos_ml: analysis.formData.aditivos_ml * (volM3 / analysis.formData.volume_m3),
    });
  }, [analysis, volume]);

  if (!analysis) return null;

  const handleRegister = () => {
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

    setLoading(true);
    setTimeout(() => {
      const batch = registerBatch(analysis.id, {
        operador_nome: ANALISTAS.find((a) => a.id === operador)?.nome ?? operador,
        maquina,
        volume_produzido: Number(volume),
        notas: observacoes,
        produced_at: dataProducao,
      });

      setLoading(false);
      onOpenChange(false);
      resetForm();

      toast.success("Lote de produção criado!", {
        description: `${batch.batch_code} — 4 rompimentos agendados`,
      });
    }, 600);
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
            <p><span className="text-muted-foreground">Tipo:</span> {analysis.tipo_analise}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Select value={operador} onValueChange={setOperador}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o operador" />
              </SelectTrigger>
              <SelectContent>
                {ANALISTAS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
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
              {dosageResult.massa_total_batelada > 550 && (
                <p className="text-[10px] text-destructive font-bold animate-pulse">
                  ⚠️ ATENÇÃO: Massa total excede a capacidade de 550kg do misturador!
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={loading} className="gap-2">
            {loading ? "Registrando..." : "Confirmar Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
