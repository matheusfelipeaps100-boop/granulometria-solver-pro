import { Badge } from "@/components/ui/badge";
import type { DosageExperimentStatus } from "@/lib/wet-cast-optimizer";
import { cn } from "@/lib/utils";

const CONFIG: Record<DosageExperimentStatus, { label: string; className: string }> = {
  SIMULACAO: { label: "Simulação", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
  CANDIDATO_PARA_ENSAIO: { label: "Candidato p/ Ensaio", className: "bg-blue-50 text-blue-700 border-blue-300" },
  EM_ENSAIO: { label: "Em Ensaio", className: "bg-amber-50 text-amber-700 border-amber-300" },
  VALIDADO_EXPERIMENTALMENTE: { label: "Validado Experimentalmente", className: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  REPROVADO: { label: "Reprovado", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function ExperimentStatusBadge({ status, className }: { status: DosageExperimentStatus; className?: string }) {
  const cfg = CONFIG[status];
  return (
    <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", cfg.className, className)}>
      {cfg.label}
    </Badge>
  );
}
