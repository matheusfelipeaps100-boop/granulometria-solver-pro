import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { calcDosage } from "@/lib/granulometry-engine";
import type { AnalysisFormData } from "@/lib/analysis-data";
import { Beaker, Droplets, Weight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDosageProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Gera 9 pontos para a curva de consumo (ratio ± 4, step 0.5)
function gerarCurvaConsumo(
  baseRatio: number,
  relacaoAC: number,
  volumeBatelada: number,
  densidadeCimento: number,
  proporcoes: Array<{ nome: string; proporcao_pct: number }>
) {
  const pontos: { ratio: string; cimento: number; isCurrent: boolean }[] = [];
  for (let delta = -4; delta <= 4; delta++) {
    const ratio = Math.max(1, baseRatio + delta * 0.5);
    const result = calcDosage({
      relacao_cimento: ratio,
      relacao_ac: relacaoAC,
      volume_batelada: volumeBatelada,
      densidade_cimento: densidadeCimento,
      proporcoes_materiais: proporcoes,
      aditivos_ml: 0,
    });
    pontos.push({
      ratio: `1:${ratio.toFixed(1)}`,
      cimento: result.consumo_cimento_kg,
      isCurrent: Math.abs(ratio - baseRatio) < 0.01,
    });
  }
  return pontos;
}

const CustomConsumoCurveTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-card p-2 shadow-lg text-xs">
      <p className="font-bold">{label}</p>
      <p className="text-primary">{payload[0]?.value?.toFixed(1)} kg/batelada</p>
    </div>
  );
};

export function StepDosage({ data, onChange }: StepDosageProps) {
  const proporcoes = useMemo(
    () => data.materiais_selecionados.map((m) => ({ nome: m.nome, proporcao_pct: m.proporcao_pct })),
    [data.materiais_selecionados]
  );

  const dosageResult = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return null;
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      volume_batelada: data.volume_batelada,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: proporcoes,
      aditivos_ml: data.aditivos_ml,
    });
  }, [data, proporcoes]);

  const curvaConsumo = useMemo(
    () =>
      gerarCurvaConsumo(
        data.relacao_cimento,
        data.relacao_ac,
        data.volume_batelada,
        data.densidade_cimento,
        proporcoes.length > 0 ? proporcoes : [{ nome: "Agregado", proporcao_pct: 1 }]
      ),
    [data.relacao_cimento, data.relacao_ac, data.volume_batelada, data.densidade_cimento, proporcoes]
  );

  const currentPoint = curvaConsumo.find((p) => p.isCurrent);

  const handleAcChange = useCallback(
    ([v]: number[]) => onChange({ relacao_ac: v / 100 }),
    [onChange]
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Cabeçalho da etapa */}
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-xl font-black text-foreground tracking-tight">DOSAGEM</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Etapa 3 de 5 — Complete todos os campos obrigatórios
        </p>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Coluna esquerda: Configuração do Traço */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Configuração do Traço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Relação Cimento:Batelada */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Relação Cimento : Batelada
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">1 :</span>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="12"
                  className="w-28 font-bold text-lg text-center [appearance:textfield]"
                  value={data.relacao_cimento}
                  onChange={(e) => onChange({ relacao_cimento: parseFloat(e.target.value) || 1 })}
                />
                <span className="text-xs text-muted-foreground">(em massa)</span>
              </div>
            </div>

            {/* Relação A/C com Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Relação A/C
                </Label>
                <span className="text-lg font-black text-primary">
                  {data.relacao_ac.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[Math.round(data.relacao_ac * 100)]}
                min={20}
                max={80}
                step={1}
                onValueChange={handleAcChange}
                className="accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.20 (seco)</span>
                <span>0.80 (molhado)</span>
              </div>
            </div>

            {/* Separador com resultado principal */}
            <div className={cn(
              "rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center space-y-1"
            )}>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Consumo de Cimento Alvo
              </p>
              <p className="text-4xl font-black text-primary leading-none">
                {dosageResult?.consumo_cimento_kg.toFixed(0) ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground font-medium">kg / batelada</p>

              {currentPoint && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Traço: <span className="font-bold text-foreground">1:{data.relacao_cimento.toFixed(1)}</span>
                </p>
              )}
            </div>

            {/* Volume Batelada + Densidade Cimento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Vol. Batelada (L)
                </Label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  className="text-sm font-bold"
                  value={data.volume_batelada}
                  onChange={(e) => onChange({ volume_batelada: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Dens. Cimento (g/cm³)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-sm font-bold"
                  value={data.densidade_cimento}
                  onChange={(e) => onChange({ densidade_cimento: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Aditivos */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Aditivos (mL)
              </Label>
              <Input
                type="number"
                step="1"
                min="0"
                className="text-sm font-bold"
                value={data.aditivos_ml}
                onChange={(e) => onChange({ aditivos_ml: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Resumo de massas */}
            {dosageResult && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <Weight className="h-4 w-4 text-success shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Massa Total</p>
                    <p className="text-sm font-black">{dosageResult.massa_total_kg.toFixed(1)} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                  <Droplets className="h-4 w-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Água</p>
                    <p className="text-sm font-black">{dosageResult.agua_litros.toFixed(1)} L</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna direita: Curva de Consumo */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider">
                Curva de Consumo
              </CardTitle>
              <span className="text-[11px] text-muted-foreground font-medium">
                Cimento vs Traço
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={curvaConsumo} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="ratio"
                  fontSize={9}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  fontSize={9}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  unit=" kg"
                />
                <Tooltip content={<CustomConsumoCurveTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cimento"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--muted-foreground))", stroke: "none" }}
                  activeDot={{ r: 5 }}
                  name="Consumo"
                />
                {/* Ponto atual em vermelho */}
                {currentPoint && (
                  <ReferenceDot
                    x={currentPoint.ratio}
                    y={currentPoint.cimento}
                    r={7}
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>

            {/* Legenda do gráfico */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-6 bg-muted-foreground/50 rounded" />
                Curva de consumo
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-primary" />
                Traço atual
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de materiais por batelada */}
      {dosageResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              Materiais por Batelada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Linha Cimento */}
              <div className="flex items-center justify-between rounded-md bg-primary/10 border border-primary/20 px-4 py-2">
                <span className="text-sm font-bold">Cimento</span>
                <span className="text-sm font-black text-primary">{dosageResult.consumo_cimento_kg.toFixed(2)} kg</span>
              </div>

              {/* Agregados */}
              {dosageResult.materiais_batelada.map((m) => (
                <div key={m.nome} className="flex items-center justify-between rounded-md bg-muted/30 border px-4 py-2">
                  <span className="text-sm font-medium">{m.nome}</span>
                  <span className="text-sm font-bold">{m.kg.toFixed(2)} kg</span>
                </div>
              ))}

              {/* Água */}
              <div className="flex items-center justify-between rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 px-4 py-2">
                <span className="text-sm font-medium">Água</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{dosageResult.agua_litros.toFixed(2)} L</span>
              </div>

              {data.aditivos_ml > 0 && (
                <div className="flex items-center justify-between rounded-md bg-muted/20 border px-4 py-2">
                  <span className="text-sm font-medium">Aditivos</span>
                  <span className="text-sm font-bold text-warning">{data.aditivos_ml} mL</span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between rounded-md bg-foreground/5 border-2 border-foreground/20 px-4 py-3 mt-1">
                <span className="text-sm font-black uppercase tracking-wider">TOTAL</span>
                <span className="text-base font-black">{dosageResult.massa_total_kg.toFixed(2)} kg</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
