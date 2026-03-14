import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { PENEIRAS_PADRAO } from "@/lib/analysis-data";
import type { GradationResult } from "@/lib/granulometry-engine";
import { AlertTriangle } from "lucide-react";

interface GranulometryChartProps {
  curveResults: GradationResult[];
  hasLimits: boolean;
  compact?: boolean;
}

export function GranulometryChart({ curveResults, hasLimits, compact = false }: GranulometryChartProps) {
  const chartData = useMemo(() => {
    return curveResults.map((r) => {
      const limiteMin = r.limite_min != null ? Math.round(r.limite_min * 10000) / 100 : undefined;
      const limiteMax = r.limite_max != null ? Math.round(r.limite_max * 10000) / 100 : undefined;
      const dnAlvo =
        limiteMin != null && limiteMax != null
          ? Math.round(((limiteMin + limiteMax) / 2) * 100) / 100
          : undefined;

      return {
        label:
          PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "",
        acumulado: Math.round(r.pct_acumulado * 10000) / 100,
        limiteMin,
        limiteMax,
        dnAlvo,
        fora: r.fora_da_faixa,
      };
    });
  }, [curveResults]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1.5">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {payload.map((entry: any) => {
          if (entry.dataKey === "limiteMin" || entry.dataKey === "limiteMax") return null;

          const nameMap: Record<string, string> = {
            acumulado: "Curva de Estudo",
            dnAlvo: "DNA Alvo",
          };
          const colorMap: Record<string, string> = {
            acumulado: "text-destructive",
            dnAlvo: "text-amber-500",
          };

          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className={`${colorMap[entry.dataKey] ?? "text-muted-foreground"}`}>
                {nameMap[entry.dataKey] ?? entry.name}:
              </span>
              <span className="font-semibold text-foreground">
                {entry.value?.toFixed(1)}%
              </span>
            </div>
          );
        })}
        {/* Show zone range */}
        {payload[0]?.payload?.limiteMin != null && (
          <div className="pt-1 border-t text-muted-foreground">
            Zona: {payload[0].payload.limiteMin.toFixed(1)}% – {payload[0].payload.limiteMax.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const chartHeight = compact ? 180 : 320;

  const chartContent = (
    <>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="label"
            fontSize={10}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            reversed
          />
          <YAxis
            domain={[0, 100]}
            fontSize={10}
            unit="%"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Layer 1 — Zona Normativa (Area between limits) */}
          {hasLimits && (
            <>
              <Area
                type="monotone"
                dataKey="limiteMax"
                stroke="none"
                fill="hsl(210 100% 60% / 0.12)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="limiteMin"
                stroke="none"
                fill="hsl(var(--card))"
                fillOpacity={1}
                isAnimationActive={false}
              />
              {/* Border lines for zone */}
              <Line
                type="monotone"
                dataKey="limiteMax"
                stroke="hsl(210 80% 65% / 0.5)"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                name="Limite Superior"
              />
              <Line
                type="monotone"
                dataKey="limiteMin"
                stroke="hsl(210 80% 65% / 0.5)"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                name="Limite Inferior"
              />
            </>
          )}

          {/* Layer 2 — DNA Alvo (dashed amber) */}
          {hasLimits && (
            <Line
              type="monotone"
              dataKey="dnAlvo"
              stroke="hsl(35 92% 50%)"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(35 92% 50%)" }}
              name="DNA Alvo"
            />
          )}

          {/* Layer 3 — Curva de Estudo (bold red) */}
          <Line
            type="monotone"
            dataKey="acumulado"
            stroke="hsl(var(--destructive))"
            strokeWidth={3}
            dot={{
              r: 4,
              fill: "hsl(var(--destructive))",
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "hsl(var(--destructive))",
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
            }}
            name="Curva de Estudo"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {!compact && hasLimits && (
        <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            O Solver ajusta as proporções para a curva ficar dentro da faixa
            (centro da zona normativa).
          </p>
        </div>
      )}
    </>
  );

  if (compact) return <div>{chartContent}</div>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">
            Curva Granulométrica Combinada
          </CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded-sm bg-blue-100 border border-blue-300" />
              Zona Normativa
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500" />
              DNA Alvo
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-destructive rounded-full" />
              Curva de Estudo
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
