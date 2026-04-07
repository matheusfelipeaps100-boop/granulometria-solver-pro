import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType =
  | "rascunho"
  | "em_analise"
  | "aprovado"
  | "liberado_producao"
  | "arquivado"
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "atrasado"
  | "conforme"
  | "nao_conforme"
  | "reprovado"
  | "aprovado_com_ressalva"
  | "liberado_antecipado"
  | "ignorado"
  | "aguardando_rompimentos";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  em_analise: { label: "Em Análise", className: "bg-info/15 text-info border-info/30" },
  aprovado: { label: "Aprovado", className: "bg-success/15 text-success border-success/30" },
  liberado_producao: { label: "Liberado", className: "bg-primary/15 text-primary border-primary/30" },
  arquivado: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  em_andamento: { label: "Em Andamento", className: "bg-info/15 text-info border-info/30" },
  concluido: { label: "Concluído", className: "bg-success/15 text-success border-success/30" },
  atrasado: { label: "Atrasado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  conforme: { label: "Conforme", className: "bg-success/15 text-success border-success/30" },
  nao_conforme: { label: "Não Conforme", className: "bg-destructive/15 text-destructive border-destructive/30" },
  reprovado: { label: "Reprovado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  aprovado_com_ressalva: { label: "Com Ressalva", className: "bg-warning/15 text-warning border-warning/30" },
  liberado_antecipado: { label: "Aprovado Antecipado", className: "bg-amber-100 text-amber-700 border-amber-300" },
  ignorado: { label: "Ignorado", className: "bg-muted text-muted-foreground" },
  aguardando_rompimentos: { label: "Aguardando Rompimentos", className: "bg-info/15 text-info border-info/30" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
