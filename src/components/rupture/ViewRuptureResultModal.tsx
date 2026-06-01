import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { calcTensao, calcRuptureStats, calcTensaoPaver, calcRuptureStatsPaver } from "@/lib/granulometry-engine";
import type { RuptureSchedule, StoredAnalysis } from "@/store/useAppStore";
import { useMemo } from "react";

interface ViewRuptureResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: RuptureSchedule | null;
  analysis: StoredAnalysis | null;
}

const tipoLabel: Record<string, string> = {
  bloco: "Bloco Estrutural",
  paver: "Paver",
  cp: "Corpo de Prova (CP)",
};

export function ViewRuptureResultModal({ open, onOpenChange, schedule, analysis }: ViewRuptureResultModalProps) {
  if (!schedule || !analysis) return null;

  const responsavel = (schedule as any).responsavel_nome ?? "—";

  const statsPerTipo = useMemo(() => {
    const s = schedule as any;
    const tests: any[] = s.tests ?? [];
    if (tests.length === 0) return null;
    const meta = analysis.resistencia_prevista;
    const result: Record<string, any> = {};
    for (const test of tests) {
      const tipo = test.tipo_amostra;
      const sorted = [...(test.samples ?? [])].sort((a: any, b: any) => a.numero - b.numero);
      const forcas = sorted.map((s: any) => Number(s.forca_kn)).filter((f: number) => f > 0);
      if (forcas.length === 0) continue;
      const isPaver = tipo === "paver";
      result[tipo] = {
        stats: isPaver ? calcRuptureStatsPaver(forcas, meta) : calcRuptureStats(forcas, meta),
        amostras: sorted.filter((s: any) => Number(s.forca_kn) > 0).map((s: any) => ({
          forca: Number(s.forca_kn),
          tensao: isPaver ? calcTensaoPaver(Number(s.forca_kn)) : calcTensao(Number(s.forca_kn)),
        }))
      };
    }
    return Object.keys(result).length > 0 ? result : null;
  }, [schedule, analysis]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Resultado do Ensaio — {schedule.idade_dias}d</span>
            <StatusBadge status={schedule.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadados */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground uppercase font-bold tracking-tighter">Responsável</p>
              <p className="font-semibold text-foreground">{responsavel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground uppercase font-bold tracking-tighter">Data Realizada</p>
              <p className="font-semibold text-foreground">
                {schedule.data_executada ? schedule.data_executada.split("-").reverse().join("/") : "—"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Resultados por Tipo */}
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {statsPerTipo && Object.entries(statsPerTipo).map(([tipo, data]: [string, any]) => (
              <div key={tipo} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm uppercase tracking-tight text-primary flex items-center gap-2">
                    {tipoLabel[tipo] || tipo}
                    {data.geometria && (
                      <Badge variant="outline" className="text-[9px] h-4 font-normal">
                        Geom: {data.geometria}
                      </Badge>
                    )}
                  </h4>
                  <Badge className={cn(
                    "font-black text-[10px]",
                    data.stats.status === "Conforme" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                  )}>
                    {data.stats.media.toFixed(2)} MPa
                  </Badge>
                </div>

                {/* Amostras Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {data.amostras.map((s: any, idx: number) => (
                    <div key={idx} className="bg-muted/30 rounded p-2 text-center border border-muted">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Amostra {idx + 1}</p>
                      <p className="font-black text-xs">{s.forca.toFixed(1)} <span className="text-[9px] font-normal">kN</span></p>
                      <p className="text-[9px] text-primary font-bold">{s.tensao.toFixed(2)} MPa</p>
                    </div>
                  ))}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-2 py-1 bg-primary/5 rounded-md border border-primary/10">
                  <div className="text-center border-r border-primary/10">
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Média</p>
                    <p className="text-xs font-black">{data.stats.media.toFixed(2)}</p>
                  </div>
                  <div className="text-center border-r border-primary/10">
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">DP</p>
                    <p className="text-xs font-bold">{data.stats.desvio_padrao.toFixed(3)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">CV (%)</p>
                    <p className={cn(
                      "text-xs font-bold",
                      data.stats.coeficiente_variacao > 10 ? "text-red-500" : "text-emerald-600"
                    )}>
                      {data.stats.coeficiente_variacao.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {schedule.observacoes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Observações</p>
                  <p className="text-xs text-foreground italic bg-muted/20 p-2 rounded border leading-relaxed">
                    "{schedule.observacoes}"
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
