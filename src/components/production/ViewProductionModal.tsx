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
import type { DBProductionBatch } from "@/hooks/api/useProduction";
import { useMemo, useState } from "react";
import { useProduction } from "@/hooks/api/useProduction";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ViewRuptureResultModal } from "../rupture/ViewRuptureResultModal";

interface ViewProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis;
  batch: DBProductionBatch | null;
}

export function ViewProductionModal({ open, onOpenChange, analysis, batch }: ViewProductionModalProps) {
  const [selectedRupture, setSelectedRupture] = useState<any | null>(null);
  const [showRuptureResult, setShowRuptureResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { deleteBatch, isDeleting } = useProduction();

  if (!analysis) return null;
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo_analise)?.label ?? "—";

  // Receita calculada diretamente dos dados da análise, sem calcDosage
  const recipe = useMemo(() => {
    if (!batch) return null;
    const fd = analysis.formData;
    const volProdL = batch.volume_produzido; // Litros
    const volOrigL = (fd.volume_m3 || 0.55) * 1000; // Litros
    const scale = volOrigL > 0 ? volProdL / volOrigL : 1;

    const cimento_kg = (fd.consumo_alvo_m3 || 0) * scale;
    const agua_l = cimento_kg * (fd.relacao_ac || 0);
    const materiais = fd.materiais_selecionados.map((m: any) => ({
      nome: m.nome,
      kg: Math.round((m.proporcao_kg ?? 0) * scale * 10) / 10,
    }));
    const aditivos_ml = Math.round((fd.aditivos_ml || 0) * scale * 10) / 10;

    return {
      consumo_cimento_batelada: Math.round(cimento_kg * 100) / 100,
      agua_batelada: Math.round(agua_l * 100) / 100,
      materiais_batelada: materiais,
      aditivos_batelada_ml: aditivos_ml,
    };
  }, [analysis, batch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes  {analysis.codigo}</DialogTitle>
        </DialogHeader>

        {/* Botão de exclusão de lote */}
        {batch && (
          <div className="flex justify-end mb-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
            >
              Excluir Lote
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-foreground">Análise</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Código:</span> <strong>{analysis.codigo}</strong></div>
              <div><span className="text-muted-foreground">Nome:</span> {analysis.nome}</div>
              <div>
                <span className="text-muted-foreground">Produto:</span>{" "}
                <strong>{analysis.produto ?? "—"}</strong>
                {analysis.produto && (
                  <span className="text-xs text-muted-foreground ml-1">({tipoLabel})</span>
                )}
              </div>
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

              {recipe && (
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
                          <td className="py-1 px-3 text-right font-black">{recipe.consumo_cimento_batelada.toFixed(2)} kg</td>
                        </tr>
                        {recipe.materiais_batelada.map((m) => (
                          <tr key={m.nome}>
                            <td className="py-1 px-3 text-muted-foreground">{m.nome}</td>
                            <td className="py-1 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                          </tr>
                        ))}
                        {recipe.aditivos_batelada_ml > 0 && (
                          <tr>
                            <td className="py-1 px-3 text-muted-foreground">Aditivo</td>
                            <td className="py-1 px-3 text-right font-bold">{recipe.aditivos_batelada_ml.toFixed(1)} mL</td>
                          </tr>
                        )}
                        <tr className="text-blue-600 dark:text-blue-400">
                          <td className="py-1 px-3">Água</td>
                          <td className="py-1 px-3 text-right font-black">{recipe.agua_batelada.toFixed(2)} L</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h4 className="font-semibold text-foreground pt-2">Cronograma de Rompimentos</h4>
              <div className="grid grid-cols-4 gap-2">
                {batch.rupture_schedules?.map((s) => {
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

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Excluir Lote</DialogTitle>
            </DialogHeader>
            <div className="py-2">Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Cancelar</Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={async () => {
                  if (!batch) return;
                  try {
                    await deleteBatch(batch.id);
                    toast.success("Lote excluído com sucesso!");
                    setConfirmDelete(false);
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error("Erro ao excluir lote", { description: err?.message });
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ViewRuptureResultModal
        open={showRuptureResult}
        onOpenChange={setShowRuptureResult}
        schedule={selectedRupture}
        analysis={analysis}
      />
    </Dialog>
  );
}