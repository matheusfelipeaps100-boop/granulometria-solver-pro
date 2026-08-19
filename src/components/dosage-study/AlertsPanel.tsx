import { AlertTriangle } from "lucide-react";
import type { WetCastExperiment } from "@/lib/wet-cast-optimizer";

/**
 * Lista os alertas de composição (WET_CAST_ALERT_THRESHOLDS) e a
 * extrapolação de um experimento/candidato. Não são exigência normativa —
 * parâmetros internos de controle, rotulados como tal.
 */
export function AlertsPanel({ experimento }: { experimento: WetCastExperiment }) {
  const alertas = experimento.alertas ?? [];
  if (alertas.length === 0 && !experimento.extrapolacao) return null;

  return (
    <div className="space-y-1.5">
      {experimento.extrapolacao && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            <strong>Extrapolação:</strong> fora da faixa dos experimentos reais
            {experimento.extrapolacao_motivo ? ` — ${experimento.extrapolacao_motivo}` : ""}.
          </span>
        </div>
      )}
      {alertas.map((msg, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md border border-muted-foreground/20 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{msg}</span>
        </div>
      ))}
    </div>
  );
}
