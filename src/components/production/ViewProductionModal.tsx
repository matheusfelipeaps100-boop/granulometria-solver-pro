import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import type { StoredAnalysis, ProductionBatch } from "@/store/useAppStore";
import { useMemo, useState } from "react";
import { calcDosage } from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";
import { ViewRuptureResultModal } from "../rupture/ViewRuptureResultModal";
import type { RuptureSchedule } from "@/store/useAppStore";

interface ViewProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis;
  batch: ProductionBatch | null;
}

export function ViewProductionModal({ open, onOpenChange, analysis, batch }: ViewProductionModalProps) {
  const [selectedRupture, setSelectedRupture] = useState<RuptureSchedule | null>(null);
  const [showRuptureResult, setShowRuptureResult] = useState(false);

  if (!analysis) return null;
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo_analise)?.label ?? "—";

  const dosageResult = useMemo(() => {
    if (!batch) return null;
    const volM3 = batch.volume_produzido / 1000;

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
  }, [analysis, batch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes — {analysis.codigo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-foreground">Análise</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Código:</span> <strong>{analysis.codigo}</strong></div>
              <div><span className="text-muted-foreground">Nome:</span> {analysis.nome}</div>
              <div><span className="text-muted-foreground">Tipo:</span> {tipoLabel}</div>
              <div><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</div>
              <div><span className="text-muted-foreground">Data:</span> {analysis.data}</div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={analysis.status} />
              </div>
            </div>
            {analysis.formData.materiais_selecionados.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Materiais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.formData.materiais_selecionados.map((m) => (
                    <Badge key={m.material_id} variant="outline" className="text-xs">
                      {m.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {batch ? (
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <h4 className="font-semibold text-foreground">Lote de Produção</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Lote:</span> <strong>{batch.batch_code}</strong></div>
                <div><span className="text-muted-foreground">Operador:</span> {batch.operador_nome}</div>
                <div><span className="text-muted-foreground">Máquina:</span> {batch.maquina}</div>
                <div><span className="text-muted-foreground">Volume:</span> {batch.volume_produzido} L</div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <StatusBadge status={batch.status} />
                </div>
              </div>

              {dosageResult && (
                <div className="pt-2">
                  <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Receita Utilizada</h4>
                  <div className="rounded-md border bg-muted/20 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left py-1 px-3 font-bold">Material</th>
                          <th className="text-right py-1 px-3 font-bold">Peso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-1 px-3">Cimento</td>
                          <td className="py-1 px-3 text-right font-black">{dosageResult.consumo_cimento_batelada.toFixed(2)} kg</td>
                        </tr>
                        {dosageResult.materiais_batelada.map((m) => (
                          <tr key={m.nome}>
                            <td className="py-1 px-3 text-muted-foreground">{m.nome}</td>
                            <td className="py-1 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                          </tr>
                        ))}
                        <tr className="text-blue-600 dark:text-blue-400">
                          <td className="py-1 px-3">Água</td>
                          <td className="py-1 px-3 text-right font-black">{dosageResult.agua_batelada.toFixed(2)} L</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h4 className="font-semibold text-foreground pt-2">Cronograma de Rompimentos</h4>
              <div className="grid grid-cols-4 gap-2">
                {batch.rupture_schedules.map((s) => {
                  const isConcluido = s.status === "concluido";
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isConcluido) {
                          setSelectedRupture(s);
                          setShowRuptureResult(true);
                        }
                      }}
                      disabled={!isConcluido}
                      className={cn(
                        "rounded-md border p-2 text-center transition-all",
                        isConcluido 
                          ? "hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-95 shadow-sm" 
                          : "opacity-80 cursor-default"
                      )}
                    >
                      <p className="text-lg font-bold text-foreground">{s.idade_dias}d</p>
                      <p className="text-[10px] text-muted-foreground">{s.data_prevista}</p>
                      <StatusBadge status={s.status} className="mt-1 h-4 text-[9px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhum lote registrado ainda. Clique em "Registrar Produção" para criar.
            </div>
          )}
        </div>
      </DialogContent>

      <ViewRuptureResultModal
        open={showRuptureResult}
        onOpenChange={setShowRuptureResult}
        schedule={selectedRupture}
        analysis={analysis}
      />
    </Dialog>
  );
}