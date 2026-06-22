import { useMemo, useCallback, useEffect, useState } from "react";
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
import { Beaker, Droplets, Weight, BarChart3, Pill, AlertCircle } from "lucide-react";
import { cn, calcularCustoMaterial } from "@/lib/utils";

import { useMaterials } from "@/hooks/api/useMaterials";


interface StepDosageProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Removido export default duplicado. Usar apenas exportação nomeada abaixo.

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

const CustomConsumoCurveTooltip = ({ active, payload, label, dbMaterials, data, dosageResult }: any) => {
  if (!active || !payload?.length) return null;
  // Cálculo do custo dinâmico do cimento
  const cimentoDb = dbMaterials.find((m: any) => m.ativo && (m.tipo === 'cimento' || m.nome.toLowerCase().includes('cimento')));
  const cimento_valor = cimentoDb?.custo_valor ?? cimentoDb?.custo_tonelada ?? data.custo_cimento_ton ?? 0;
  const cimento_unidade = cimentoDb?.custo_unidade || (cimentoDb?.custo_tonelada != null ? 'tonelada' : 'tonelada');
  const cimento_densidade = cimentoDb?.densidade || 3.15;
  const custoCimento = calcularCustoMaterial({
    custo_valor: cimento_valor,
    custo_unidade: cimento_unidade,
    quantidade: dosageResult.consumo_cimento_batelada,
    densidade: cimento_densidade,
  });

  // Cálculo do custo dinâmico do aditivo
  const aditivoDb = dbMaterials.find((m: any) => m.ativo && (m.tipo === 'aditivo' || m.nome.toLowerCase().includes('aditivo')));
  const aditivo_valor = aditivoDb?.custo_valor ?? 0;
  const aditivo_unidade = aditivoDb?.custo_unidade || 'litro';
  let custoAditivo = 0;
  if (aditivo_valor && data.aditivos_ml) {
    if (aditivo_unidade === 'litro') {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000);
    } else if (aditivo_unidade === 'kg') {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000);
    } else {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000);
    }
  }

  return (
    <div className="rounded border bg-card p-2 shadow-lg text-xs">
      <p className="font-bold">{label}</p>
      <p className="text-primary">{payload[0]?.value?.toFixed(1)} kg/m³</p>
      <p className="text-xs mt-1">Cimento: R$ {custoCimento.toFixed(2)}<br/>Aditivo: R$ {custoAditivo.toFixed(2)}</p>
    </div>
  );
};

export function StepDosage({ data, onChange }: StepDosageProps) {
    const { materials: dbMaterials } = useMaterials();
  const [aditivoUnidade, setAditivoUnidade] = useState<'mL' | 'g'>('mL');

  // Auto-sincroniza custos de cimento e aditivo com o material ativo cadastrado.
  // Não depende de data.custo_cimento_ton/custo_aditivo_lt para não sobrescrever
  // o valor enquanto o usuário está digitando; só resincroniza quando a lista de
  // materiais muda (ex.: troca do cimento ativo no cadastro).
  useEffect(() => {
    const cimentoDb = dbMaterials.find((m) => m.ativo && (m.tipo === 'cimento' || m.nome.toLowerCase().includes('cimento')));
    const aditivoDb = dbMaterials.find((m) => m.ativo && (m.tipo === 'aditivo' || m.nome.toLowerCase().includes('aditivo')));

    const updates: Partial<AnalysisFormData> = {};

    // Sincroniza com o custo do cimento ativo, mesmo que já houvesse um valor (ex.: rascunho antigo com material arquivado)
    if (cimentoDb) {
      const cimentoValor = cimentoDb.custo_valor ?? cimentoDb.custo_tonelada ?? 0;
      if (cimentoValor > 0 && cimentoValor !== data.custo_cimento_ton) {
        updates.custo_cimento_ton = cimentoValor;
      }
    }

    // Sincroniza com o custo do aditivo ativo, mesmo que já houvesse um valor (ex.: rascunho antigo com material arquivado)
    if (aditivoDb) {
      const aditivoValor = aditivoDb.custo_valor ?? 0;
      if (aditivoValor > 0 && aditivoValor !== data.custo_aditivo_lt) {
        updates.custo_aditivo_lt = aditivoValor;
      }
    }

    if (Object.keys(updates).length > 0) {
      onChange(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMaterials, onChange]);

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

  // Cálculo do volume de batelada pelo método de volumes absolutos dos ingredientes
  const cimento_batelada = data.consumo_alvo_m3; // campo armazena kg direto por batelada
  const agua_batelada_prev = cimento_batelada * data.relacao_ac;
  const vol_cim  = data.densidade_cimento > 0 ? cimento_batelada / (data.densidade_cimento * 1000) : 0;
  const vol_agua = agua_batelada_prev / 1000;
  const vol_agg  = proporcoes.reduce(
    (s, m) => s + (m.proporcao_kg ?? 0) / ((m.densidade ?? 2.65) * 1000), 0
  );
  const volume_batelada_calc = vol_cim + vol_agua + vol_agg; // m³
  const consumo_equiv_m3 = volume_batelada_calc > 0 ? cimento_batelada / volume_batelada_calc : 0;

  // Sincroniza o volume calculado com o store para garantir que o INSERT salve o valor correto
  useEffect(() => {
    if (volume_batelada_calc > 0 && Math.abs(volume_batelada_calc - (data.volume_m3 ?? 0)) > 0.0001) {
      onChange({ volume_m3: volume_batelada_calc });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume_batelada_calc]);

  const dosageResult = useMemo(() => {
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      consumo_alvo_m3: consumo_equiv_m3,
      volume_m3: volume_batelada_calc,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: proporcoes,
      aditivos_ml: data.aditivos_ml,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.relacao_cimento, data.relacao_ac, data.consumo_alvo_m3, data.relacao_ac, data.densidade_cimento, proporcoes, data.aditivos_ml]);

  const curvaConsumo = useMemo(
    () =>
      gerarCurvaConsumo(
        data.relacao_ac,
        data.densidade_cimento,
        proporcoes.length > 0 ? proporcoes : [{ nome: "Agregado", proporcao_pct: 1, densidade: 2.65 }]
      ),
    [data.relacao_ac, data.densidade_cimento, proporcoes]
  );

  // Cálculo do custo dinâmico do cimento
  const cimentoDb = dbMaterials.find((m) => m.ativo && (m.tipo === 'cimento' || m.nome.toLowerCase().includes('cimento')));
  const cimento_valor = cimentoDb?.custo_valor ?? cimentoDb?.custo_tonelada ?? data.custo_cimento_ton ?? 0;
  const cimento_unidade = cimentoDb?.custo_unidade || (cimentoDb?.custo_tonelada != null ? 'tonelada' : 'tonelada');
  const cimento_densidade = cimentoDb?.densidade || 3.15;
  // Cálculo do custo do cimento APENAS pelo consumo_alvo_m3 (kg/m³), ignorando volume_m3
  const custoCimento = calcularCustoMaterial({
    custo_valor: cimento_valor,
    custo_unidade: cimento_unidade,
    quantidade: data.consumo_alvo_m3, // sempre por m³
    densidade: cimento_densidade,
  });

  // Cálculo do custo dinâmico do aditivo
  const aditivoDb = dbMaterials.find((m) => m.ativo && (m.tipo === 'aditivo' || m.nome.toLowerCase().includes('aditivo')));
  const aditivo_valor = aditivoDb?.custo_valor ?? 0;
  const aditivo_unidade = aditivoDb?.custo_unidade || 'litro';
  let custoAditivo = 0;
  if (aditivo_valor && data.aditivos_ml) {
    if (aditivo_unidade === 'litro') {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000);
    } else if (aditivo_unidade === 'kg') {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000); // aproximação: 1L ~ 1kg
    } else {
      custoAditivo = aditivo_valor * (data.aditivos_ml / 1000);
    }
  }

  // Relação calculada: Total Agregados (kg) ÷ Consumo Alvo (kg/m³)
  // Quando não há materiais com kg definido, usa o valor manual do store
  const relacaoCalculada = useMemo(() => {
    if (data.consumo_alvo_m3 > 0 && totalKgMateriais > 0) {
      return Math.round((totalKgMateriais / data.consumo_alvo_m3) * 10) / 10;
    }
    return data.relacao_cimento;
  }, [totalKgMateriais, data.consumo_alvo_m3, data.relacao_cimento]);

  // Sincroniza relacao_cimento no store quando consumo ou agregados mudarem
  useEffect(() => {
    if (data.consumo_alvo_m3 > 0 && totalKgMateriais > 0) {
      const rel = Math.round((totalKgMateriais / data.consumo_alvo_m3) * 10) / 10;
      if (Math.abs(rel - data.relacao_cimento) > 0.05) {
        onChange({ relacao_cimento: rel });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalKgMateriais, data.consumo_alvo_m3]);

  const handleAcChange = useCallback(
    ([v]: number[]) => onChange({ relacao_ac: v / 100 }),
    [onChange]
  );

  // Batelada: apenas ajusta volume (traço e consumo não mudam)
  const handleMassaBateladaChange = useCallback(
    (massa: number) => {
      if (dosageResult.massa_total_m3 > 0) {
        onChange({ volume_m3: massa / dosageResult.massa_total_m3 });
      }
    },
    [dosageResult.massa_total_m3, onChange]
  );

  const handleCimentoBateladaChange = useCallback(
    (cimento: number) => {
      if (dosageResult.consumo_cimento_m3 > 0) {
        onChange({ volume_m3: cimento / dosageResult.consumo_cimento_m3 });
      }
    },
    [dosageResult.consumo_cimento_m3, onChange]
  );

  const handleAguaBateladaChange = useCallback(
    (agua: number) => {
      if (dosageResult.consumo_cimento_batelada > 0 && agua > 0) {
        const novoAc = agua / dosageResult.consumo_cimento_batelada;
        onChange({ relacao_ac: Math.max(0.01, novoAc) });
      }
    },
    [dosageResult.consumo_cimento_batelada, onChange]
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
                    value={relacaoCalculada}
                    onChange={(e) => {
                      let rel = parseFloat(e.target.value);
                      if (isNaN(rel) || rel <= 0) rel = 1;
                      // Ao editar o traço → recalcula o Consumo Alvo
                      const cons = totalKgMateriais > 0 ? Math.round((totalKgMateriais / rel) * 10) / 10 : data.consumo_alvo_m3;
                      onChange({ relacao_cimento: rel, consumo_alvo_m3: cons });
                    }}
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
                    Cimento por Batelada (kg)
                  </Label>
                  <div className="flex items-baseline gap-2">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="w-28 text-5xl font-black text-foreground tracking-tighter h-14 bg-transparent border-none p-0 focus-visible:ring-0 shadow-none"
                      value={data.consumo_alvo_m3 || ""}
                      onChange={(e) => {
                        const cons = parseFloat(e.target.value) || 0;
                        const rel = cons > 0 && totalKgMateriais > 0
                          ? Math.round((totalKgMateriais / cons) * 10) / 10
                          : data.relacao_cimento;
                        onChange({ consumo_alvo_m3: cons, relacao_cimento: rel });
                      }}
                    />
                    <span className="text-sm font-bold text-muted-foreground">kg</span>
                  </div>
                  {consumo_equiv_m3 > 0 && (
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      ≈ {consumo_equiv_m3.toFixed(0)} kg/m³ (equivalente)
                    </span>
                  )}
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
                      value={volume_batelada_calc > 0 ? volume_batelada_calc.toFixed(3) : ""}
                      disabled
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
                        "h-10 font-black focus-visible:ring-primary shadow-none bg-muted/40 border-primary/20"
                      )}
                      value={dosageResult.massa_total_batelada.toFixed(dosageResult.massa_total_batelada % 1 === 0 ? 0 : 1)}
                      disabled
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-muted-foreground uppercase">kg</span>
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
                      disabled
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-primary uppercase">kg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Água / Batelada
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="h-10 font-black bg-blue-500/10 text-blue-600 border-blue-500/20 focus-visible:ring-blue-500 shadow-none dark:text-blue-400"
                      value={Math.round(dosageResult.agua_batelada * 10) / 10 || ""}
                      onChange={(e) => {
                        const agua = parseFloat(e.target.value) || 0;
                        // Atualiza a relação A/C automaticamente
                        const novoAc = dosageResult.consumo_cimento_batelada > 0 ? agua / dosageResult.consumo_cimento_batelada : data.relacao_ac;
                        onChange({ relacao_ac: Math.max(0.01, novoAc) });
                      }}
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-bold text-blue-500 uppercase">kg</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Aditivo / Batelada
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      className="h-10 font-black bg-background border border-border/50 focus-visible:ring-primary shadow-none"
                      value={data.aditivos_ml || ""}
                      onChange={(e) => onChange({ aditivos_ml: parseFloat(e.target.value) || 0 })}
                    />
                    <button
                      type="button"
                      onClick={() => setAditivoUnidade(u => u === 'mL' ? 'g' : 'mL')}
                      title="Clique para alternar entre mL e g"
                      className="h-10 px-2.5 shrink-0 rounded-md border border-border/50 bg-muted text-[10px] font-bold text-muted-foreground uppercase hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      {aditivoUnidade}
                    </button>
                  </div>
                </div>
              </div>

              {/* Custos Operacionais */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Custo do Cimento (R$ / ton)
                    </Label>
                    {cimentoDb && data.custo_cimento_ton === (cimentoDb.custo_valor ?? cimentoDb.custo_tonelada ?? 0) && (
                      <span className="text-[8px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Automático
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 font-bold bg-background border border-border/50 focus-visible:ring-primary shadow-none pl-8"
                      value={data.custo_cimento_ton || ""}
                      onChange={(e) => onChange({ custo_cimento_ton: parseFloat(e.target.value) || 0 })}
                      placeholder={cimentoDb ? `${(cimentoDb.custo_valor ?? cimentoDb.custo_tonelada ?? 0).toFixed(2)}` : "0.00"}
                    />
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Custo do Aditivo (R$ / Litro)
                    </Label>
                    {aditivoDb && data.custo_aditivo_lt === (aditivoDb.custo_valor ?? 0) && (
                      <span className="text-[8px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Automático
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 font-bold bg-background border border-border/50 focus-visible:ring-primary shadow-none pl-8"
                      value={data.custo_aditivo_lt || ""}
                      onChange={(e) => onChange({ custo_aditivo_lt: parseFloat(e.target.value) || 0 })}
                      placeholder={aditivoDb ? `${(aditivoDb.custo_valor ?? 0).toFixed(2)}` : "0.00"}
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
                  <Tooltip content={<CustomConsumoCurveTooltip dbMaterials={dbMaterials} data={data} dosageResult={dosageResult} />} />
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

      {/* FOOTER SUMMARY: CUSTOS */}
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Custos automáticos:</strong> Os valores são sincronizados do cadastro de materiais. Altere o "<strong>Cimento por Batelada (kg)</strong>" para recalcular os custos automaticamente.
          </p>
        </div>
        <Card className="bg-foreground text-card border-none shadow-xl overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <div className="p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Cimento</span>
              <span className="text-xl font-black">R$ {custoCimento.toFixed(2)}</span>
            </div>
            <div className="p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Aditivo</span>
              <span className="text-xl font-black">R$ {custoAditivo.toFixed(2)}</span>
            </div>
            <div className="p-4 flex flex-col items-center bg-primary text-primary-foreground">
              <span className="text-[10px] font-black uppercase tracking-widest mb-1">Total</span>
              <span className="text-2xl font-black">R$ {(custoCimento + custoAditivo).toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
