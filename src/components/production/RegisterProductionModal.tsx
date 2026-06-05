import { useState, useMemo, useEffect } from "react";
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
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useProduction } from "@/hooks/api/useProduction";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

function generateBatchCode() {
  return `L-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const { createBatch, isCreating } = useProduction();
  const { settings } = useTechnicalSettings();

  const [batchCode, setBatchCode] = useState(generateBatchCode);
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const [volume] = useState(() => {
    if (analysis?.formData.volume_m3) return (analysis.formData.volume_m3 * 1000).toString();
    if (settings?.volume_batelada_padrao) return settings.volume_batelada_padrao.toString();
    return "550";
  });
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().slice(0, 16));
  const [observacoes, setObservacoes] = useState("");
  const [aguaKg, setAguaKg] = useState<string>("");
  const [aditivoMl, setAditivoMl] = useState<string>("");

  // Sincroniza data/hora com o momento de liberação da análise quando o modal abre
  useEffect(() => {
    if (analysis?.liberado_em) {
      setDataProducao(new Date(analysis.liberado_em).toISOString().slice(0, 16));
    } else {
      setDataProducao(new Date().toISOString().slice(0, 16));
    }
  }, [analysis?.id]);

  // Receita calculada diretamente dos dados da análise
  const recipe = useMemo(() => {
    if (!analysis) return null;
    const volProdL = Number(volume);
    if (volProdL <= 0) return null;
    const fd = analysis.formData;
    const volOrigL = (fd.volume_m3 || 0.55) * 1000;
    const scale = volOrigL > 0 ? volProdL / volOrigL : 1;

    const cimento_kg = (fd.consumo_alvo_m3 || 0) * scale;
    const agua_l = cimento_kg * (fd.relacao_ac || 0);
    const materiais = (fd.materiais_selecionados ?? []).map((m: any) => ({
      nome: m.nome,
      kg: Math.round((m.proporcao_kg ?? 0) * scale * 10) / 10,
    }));
    const aditivos_ml = Math.round((fd.aditivos_ml || 0) * scale * 10) / 10;
    const totalKg = Math.round((cimento_kg + materiais.reduce((s: number, m: any) => s + m.kg, 0) + agua_l + aditivos_ml / 1000) * 10) / 10;

    return {
      consumo_cimento_batelada: Math.round(cimento_kg * 100) / 100,
      agua_batelada: Math.round(agua_l * 100) / 100,
      materiais_batelada: materiais,
      aditivos_batelada_ml: aditivos_ml,
      massa_total_batelada: totalKg,
    };
  }, [analysis, volume]);

  useEffect(() => {
    if (recipe) {
      setAguaKg(recipe.agua_batelada.toFixed(2));
      setAditivoMl(recipe.aditivos_batelada_ml.toFixed(1));
    }
  }, [recipe]);

  const totalBatelada = useMemo(() => {
    if (!recipe) return 0;
    const agua = Number(aguaKg) || 0;
    const aditivo = Number(aditivoMl) || 0;
    const materiaisTotal = recipe.materiais_batelada.reduce((s: number, m: any) => s + m.kg, 0);
    return Math.round((recipe.consumo_cimento_batelada + materiaisTotal + agua + aditivo / 1000) * 10) / 10;
  }, [recipe, aguaKg, aditivoMl]);

  if (!analysis) return null;

  const handleRegister = async () => {
    if (!batchCode.trim()) {
      toast.error("Informe o código do lote");
      return;
    }
    if (!operador.trim()) {
      toast.error("Informe o operador");
      return;
    }
    if (!maquina.trim()) {
      toast.error("Informe a máquina");
      return;
    }

    try {
      await createBatch({
        analysis_id: analysis.id,
        batch_code: batchCode.trim(),
        operador_nome: operador.trim(),
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
    setBatchCode(generateBatchCode());
    setOperador("");
    setMaquina("");
    setObservacoes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="batch-code">Código do Lote *</Label>
            <Input
              id="batch-code"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              placeholder="Ex: L-2026-0001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Input
              id="operador"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Nome do operador"
            />
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
              <Label htmlFor="volume">Volume Produzido (L)</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
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

          {recipe && (
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
                        {recipe.consumo_cimento_batelada.toFixed(2)} kg
                      </td>
                    </tr>
                    {recipe.materiais_batelada.map((m) => (
                      <tr key={m.nome}>
                        <td className="py-1.5 px-3 text-muted-foreground">{m.nome}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                      </tr>
                    ))}
                    {recipe.aditivos_batelada_ml > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 text-muted-foreground">Aditivo</td>
                        <td className="py-1 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={aditivoMl}
                              onChange={(e) => setAditivoMl(e.target.value)}
                              className="w-16 h-6 text-xs text-right font-bold border-muted-foreground/30 pr-0"
                              step="0.1"
                            />
                            <span className="inline-block w-5 text-left text-xs font-bold text-muted-foreground">mL</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                      <td className="py-1.5 px-3 font-bold text-blue-600 dark:text-blue-400">Água</td>
                      <td className="py-1 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={aguaKg}
                            onChange={(e) => setAguaKg(e.target.value)}
                            className="w-16 h-6 text-xs text-right font-black text-blue-600 dark:text-blue-400 border-blue-300 pr-0"
                            step="0.01"
                          />
                          <span className="inline-block w-5 text-left text-xs font-black text-blue-600 dark:text-blue-400">L</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-muted/30 font-black">
                      <td className="py-2 px-3 uppercase">Total Batelada</td>
                      <td className="py-2 px-3 text-right text-sm">
                        {totalBatelada.toFixed(1)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {totalBatelada > (settings?.volume_batelada_padrao || 550) && (
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
