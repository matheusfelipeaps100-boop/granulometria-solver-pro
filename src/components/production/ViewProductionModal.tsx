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

interface ViewProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis;
  batch: ProductionBatch | null;
}

export function ViewProductionModal({ open, onOpenChange, analysis, batch }: ViewProductionModalProps) {
  if (!analysis) return null;
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo_analise)?.label ?? "—";

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

              <h4 className="font-semibold text-foreground pt-2">Cronograma de Rompimentos</h4>
              <div className="grid grid-cols-4 gap-2">
                {batch.rupture_schedules.map((s) => (
                  <div key={s.id} className="rounded-md border p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{s.idade_dias}d</p>
                    <p className="text-xs text-muted-foreground">{s.data_prevista}</p>
                    <StatusBadge status={s.status} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhum lote registrado ainda. Clique em "Registrar Produção" para criar.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}