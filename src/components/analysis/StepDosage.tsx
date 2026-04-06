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
import { calcDosage, calcRelacaoFromConsumo } from "@/lib/granulometry-engine";
import type { AnalysisFormData } from "@/lib/analysis-data";
import { Beaker, Droplets, Weight, BarChart3, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDosageProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Gera pontos fixos para a curva (1:4 a 1:12)
function gerarCurvaConsumo(
  relacaoAC: number,
  densidadeCimento: number,
  proporcoes: Array<{ nome: string; proporcao_pct: number; densidade?: number }>
) {
  const pontos: { ratioLabel: string; ratioValue: number; cimento: number }[] = [];
  const densA = proporcoes.reduce((acc, m) => acc + (m.densidade ?? 2.65) * m.proporcao_pct, 0) || 2.65;
  
  // Escala teórica clássica absoluta de 1:4 a 1:12 para desenhar a curva
  for (let r = 4; r <= 12; r += 0.5) {
    const divisor = 1 / densidadeCimento + r / densA + relacaoAC;
    const consumo_teorico = divisor > 0 ? 1000 / divisor : 0;
    
    pontos.push({
      ratioLabel: `1:${r.toFixed(1)}`,
      ratioValue: r,
      cimento: consumo_teorico,
    });
  }
  return pontos;
}

const CustomConsumoCurveTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-card p-2 shadow-lg text-xs">
      <p className="font-bold">{label}</p>
      <p className="text-primary">{payload[0]?.value?.toFixed(1)} kg/m³</p>
    </div>
  );
};

export function StepDosage({ data, onChange }: StepDosageProps) {
  const totalKgMateriais = useMemo(
    () => data.materiais_selecionados.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0),
    [data.materiais_selecionados]
  );

  const proporcoes = useMemo(
    () => data.materiais_selecionados.map((m) => ({
      nome: m.nome,
      proporcao_kg: m.proporcao_kg ?? 0,
      proporcao_pct: totalKgMateriais > 0 ? (m.proporcao_kg ?? 0) / totalKgMateriais : 0,
      densidade: m.densidade
    })),
    [data.materiais_selecionados, totalKgMateriais]
  );

  const dosageResult = useMemo(() => {
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      consumo_alvo_m3: data.consumo_alvo_m3,
      volume_m3: data.volume_m3,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: proporcoes,
      aditivos_ml: data.aditivos_ml,
    });
  }, [data, proporcoes]);

  const curvaConsumo = useMemo(
    () =>
      gerarCurvaConsumo(
        data.relacao_ac,
        data.densidade_cimento,
        proporcoes.length > 0 ? proporcoes : [{ nome: "Agregado", proporcao_pct: 1, densidade: 2.65 }]
      ),
    [data.relacao_ac, data.densidade_cimento, proporcoes]
  );

  // Os agregados são definidos em kg absoluto na granulometria —
  // não há clamp automático de volume; o aviso de capacidade é apenas visual.

  const handleAcChange = useCallback(
    ([v]: number[]) => onChange({ relacao_ac: v / 100 }),
    [onChange]
  );

  const handleMassaBateladaChange = useCallback(
    (massa: number) => {
      // Volume = Massa / (kg/m3)
      if (dosageResult.massa_total_m3 > 0) {
        onChange({ volume_m3: massa / dosageResult.massa_total_m3 });
      }
    },
    [dosageResult.massa_total_m3, onChange]
  );

  const handleCimentoBateladaChange = useCallback(
    (cimento: number) => {
      // Volume = Cimento / (kg/m3)
      if (dosageResult.consumo_cimento_m3 > 0) {
        onChange({ volume_m3: cimento / dosageResult.consumo_cimento_m3 });
      }
    },
    [dosageResult.consumo_cimento_m3, onChange]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Cabeçalho Pro */}
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">DOSAGEM</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Etapa 3 de 5 • Complete todos os campos obrigatórios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Configuração */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-foreground/80">
                <BarChart3 className="h-4 w-4 text-primary" />
                Configuração do Traço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Relação Cimento : Agregado */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Relação Cimento : Agregado
                </Label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-foreground">1 :</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    className="w-32 h-12 text-2xl font-black text-center border-2 focus-visible:ring-primary"
                    value={data.relacao_cimento}
                    onChange={(e) => onChange({ relacao_cimento: parseFloat(e.target.value) || 1 })}
                  />
                  <span className="text-sm font-medium text-muted-foreground">(em massa)</span>
                </div>
              </div>

              {/* Relação A/C */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Relação Água / Cimento (A/C)
                  </Label>
                  <span className="text-xl font-black text-primary">
                    {data.relacao_ac.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[Math.round(data.relacao_ac * 100)]}
                  min={20}
                  max={90}
                  step={1}
                  onValueChange={handleAcChange}
                  className="accent-primary"
                />
              </div>

              {/* BOX DE DESTAQUE: CONSUMO E DENSIDADE */}
              <div className="flex gap-4">
                <div className="flex-1 bg-white dark:bg-card border-2 border-primary rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Weight className="h-12 w-12" />
                  </div>
                  <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block">
                    Consumo de Cimento Alvo (kg/m³)
                  </Label>
                  <div className="flex items-baseline gap-2">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="w-28 text-5xl font-black text-foreground tracking-tighter h-14 bg-transparent border-none p-0 focus-visible:ring-0 shadow-none"
                      value={data.consumo_alvo_m3 || ""}
                      onChange={(e) => onChange({ consumo_alvo_m3: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-sm font-bold text-muted-foreground">kg/m³</span>
                  </div>
                </div>

                <div className="w-1/3 bg-muted/50 rounded-xl p-4 flex flex-col justify-center border border-border/50">
                  <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Densidade Efetiva
                  </Label>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-foreground">
                      {dosageResult.densidade_efetiva.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-primary uppercase mt-0.5">
                      (Automático)
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume e Massas por Batelada */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Volume Batelada (m³)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 font-black bg-background border-2 border-border/50 focus-visible:ring-primary shadow-none"
                      value={data.volume_m3 || ""}
                      onChange={(e) => onChange({ volume_m3: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-muted-foreground uppercase">m³</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Massa / Batelada
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className={cn(
                        "h-10 font-black focus-visible:ring-primary shadow-none",
                        dosageResult.massa_total_batelada > 550 
                          ? "bg-red-500/10 border-red-500/50 text-red-600" 
                          : "bg-muted/40 border-primary/20"
                      )}
                      value={dosageResult.massa_total_batelada.toFixed(dosageResult.massa_total_batelada % 1 === 0 ? 0 : 1)}
                      onChange={(e) => handleMassaBateladaChange(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-muted-foreground uppercase">kg</span>
                    {dosageResult.massa_total_batelada > 550 && (
                      <span className="absolute -bottom-4 right-0 text-[8px] font-black text-red-500 uppercase">Capacidade Excedida (Max 550kg)</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Cimento / Batelada
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="h-10 font-black bg-primary/10 text-primary border-primary/20 focus-visible:ring-primary shadow-none"
                      value={dosageResult.consumo_cimento_batelada.toFixed(dosageResult.consumo_cimento_batelada % 1 === 0 ? 0 : 1)}
                      onChange={(e) => handleCimentoBateladaChange(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-primary uppercase">kg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Água / Batelada
                  </Label>
                  <div className="h-10 flex items-center px-3 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md font-black text-sm">
                    {dosageResult.agua_batelada.toFixed(1)} kg
                  </div>
                </div>
              </div>

              {/* Custos Operacionais */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Custo do Cimento (R$ / ton)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 font-bold bg-background border border-border/50 focus-visible:ring-primary shadow-none pl-8"
                      value={data.custo_cimento_ton || ""}
                      onChange={(e) => onChange({ custo_cimento_ton: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Custo do Aditivo (R$ / Litro)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 font-bold bg-background border border-border/50 focus-visible:ring-primary shadow-none pl-8"
                      value={data.custo_aditivo_lt || ""}
                      onChange={(e) => onChange({ custo_aditivo_lt: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Gráfico */}
        <div className="space-y-6">
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Curva de Consumo
                </CardTitle>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  kg/m³ vs Traço
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curvaConsumo} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="ratioLabel" 
                    fontSize={11} 
                    fontFamily="monospace"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                  />
                  <YAxis 
                    fontSize={11} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                    width={40}
                  />
                  <Tooltip content={<CustomConsumoCurveTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="cimento"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "white", strokeWidth: 2 }}
                  />
                  {/* Ponto de destaque industrial */}
                  <ReferenceDot
                    x={`1:${data.relacao_cimento.toFixed(1)}`}
                    y={dosageResult.consumo_cimento_m3}
                    r={8}
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth={3}
                    className="animate-pulse"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 h-auto pb-4 px-4">
                 <div className="flex items-center gap-2 justify-center py-2 bg-muted/30 rounded-lg">
                    <div className="w-8 h-1 bg-foreground rounded-full"></div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Curva Teórica</span>
                 </div>
                 <div className="flex items-center gap-2 justify-center py-2 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Ponto Selecionado</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FOOTER SUMMARY: 5 COLUNAS */}
      <Card className="bg-foreground text-card border-none shadow-xl overflow-hidden">
        <div className="grid grid-cols-5 divide-x divide-white/10">
          <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Cimento</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{dosageResult.consumo_cimento_m3.toFixed(0)}</span>
              <span className="text-[10px] opacity-70">kg/m³</span>
            </div>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Massa Total</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{dosageResult.massa_total_batelada.toFixed(1)}</span>
              <span className="text-[10px] opacity-70">kg</span>
            </div>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Água</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{dosageResult.agua_m3.toFixed(0)}</span>
              <span className="text-[10px] opacity-70">kg/m³</span>
            </div>
          </div>
          <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Agregado</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{(dosageResult.consumo_cimento_m3 * data.relacao_cimento).toFixed(0)}</span>
              <span className="text-[10px] opacity-70">kg/m³</span>
            </div>
          </div>
          <div className="p-4 flex flex-col items-center bg-primary text-primary-foreground">
            <span className="text-[10px] font-black uppercase tracking-widest mb-1">Traço</span>
            <span className="text-xl font-black">1 : {data.relacao_cimento.toFixed(1)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
