import { calcCombinedCurve, calcDosage } from "@/lib/granulometry-engine";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Factory, Bookmark, CheckCircle2, Loader2, Printer } from "lucide-react";
import { generateAnalysisPDF } from "@/lib/pdf-generator";
import { ReleaseProductionModal } from "./ReleaseProductionModal";
import { SaveStandardTraceModal } from "./SaveStandardTraceModal";
import {
  TIPOS_ANALISE,
  ANALISTAS,
  PENEIRAS_PADRAO,
  type AnalysisFormData,
} from "@/lib/analysis-data";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn, calcularCustoMaterial } from "@/lib/utils";
import { useAnalysisDraftStore } from "@/store/useAnalysisDraftStore";
import { useMaterials } from "@/hooks/api/useMaterials";

interface StepResultProps {
  data: AnalysisFormData;
}

export function StepResult({ data }: StepResultProps) {
  const navigate = useNavigate();
  const { clearDraft } = useAnalysisDraftStore();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);

  // Busca preços atuais do banco — evita depender do snapshot do store
  const { materials: dbMaterials } = useMaterials();
  const { curves: dbCurves } = useStandardCurves();
  // Busca preço, unidade e densidade dos materiais
  const precosAtuais = useMemo(() => {
    const map = new Map();
    dbMaterials.forEach((m) => {
      map.set(m.id, {
        custo_valor: m.custo_valor ?? m.custo_tonelada ?? 0,
        custo_unidade: m.custo_unidade || (m.custo_tonelada != null ? 'tonelada' : 'tonelada'),
        densidade: m.densidade ?? 2.65,
      });
    });
    return map;
  }, [dbMaterials]);

  const dna = useMemo(() => {
    const curve = dbCurves.find((c) => c.id === data.dna_selecionado) ?? dbCurves[0];
    if (!curve) return undefined;
    return {
      id: curve.id,
      nome: curve.nome,
      limites: (curve.standard_curve_items ?? []).map((item) => ({
        sieve_id: item.sieve_id,
        limite_min: item.limite_min,
        limite_max: item.limite_max,
      })),
    };
  }, [dbCurves, data.dna_selecionado]);
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const analistaLabel = (data.analista || ANALISTAS.find((a) => a.id === data.analista)?.nome) ?? "—";

  const now = new Date();
  const dataFormatada = now.toLocaleDateString("pt-BR");
  const horaFormatada = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Normaliza proporcao_pct baseado em proporcao_kg (similar ao StepGranulometry)
  const materiaisComProporcao = useMemo(() => {
    const totalKg = data.materiais_selecionados.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0);
    const total = totalKg || 1;
    return data.materiais_selecionados.map(m => ({
      ...m,
      proporcao_pct: (m.proporcao_kg ?? 0) / total,
    }));
  }, [data.materiais_selecionados]);

  // Calcula a curva combinada com materiais normalizados
  const curveResults = useMemo(() => {
    if (materiaisComProporcao.length === 0) return [];
    // Valida se há pelo menos um material com dados
    const temDados = materiaisComProporcao.some(m => 
      (m.proporcao_kg ?? 0) > 0 && 
      m.gradations?.some(g => g.massa_retida > 0)
    );
    if (!temDados) return [];
    return calcCombinedCurve(materiaisComProporcao, dna?.limites);
  }, [materiaisComProporcao, dna]);

  const totalKgMateriais = useMemo(
    () => data.materiais_selecionados.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0),
    [data.materiais_selecionados]
  );

  const dosageResult = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return null;
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      consumo_alvo_m3: data.consumo_alvo_m3,
      volume_m3: data.volume_m3,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: data.materiais_selecionados.map((m) => ({
        nome: m.nome,
        proporcao_kg: m.proporcao_kg ?? 0,
        proporcao_pct: totalKgMateriais > 0 ? (m.proporcao_kg ?? 0) / totalKgMateriais : 0,
        densidade: m.densidade
      })),
      aditivos_ml: data.aditivos_ml,
    });
  }, [data, totalKgMateriais]);

  const chartData = curveResults.map((r) => ({
    label: PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "",
    acumulado: Math.round(r.pct_acumulado * 10000) / 100,
    limiteMin: r.limite_min ? Math.round(r.limite_min * 10000) / 100 : undefined,
    limiteMax: r.limite_max ? Math.round(r.limite_max * 10000) / 100 : undefined,
    dnAlvo: r.limite_min && r.limite_max
      ? Math.round(((r.limite_min + r.limite_max) / 2) * 10000) / 100
      : undefined,
  }));

  // Calcula o "retorno" estimado para cada material (contribuição % na curva)

  // Calcula Custo Financeiro
  const financeiro = useMemo(() => {
    if (!dosageResult) return null;


    // Função para converter o custo para R$/kg
    function getCustoPorKg(materialId) {
      const info = precosAtuais.get(materialId);
      if (!info) return 0;
      const { custo_valor, custo_unidade, densidade } = info;
      if (!custo_valor || !custo_unidade) return 0;
      switch (custo_unidade) {
        case 'tonelada':
          return custo_valor / 1000;
        case 'kg':
          return custo_valor;
        case 'm3':
          // densidade em kg/m³
          return densidade > 0 ? custo_valor / densidade : 0;
        case 'saco':
          // Considera 50kg por saco (ajuste conforme necessário)
          return custo_valor / 50;
        case 'unidade':
          // Considera 1 unidade = 1kg (ajuste conforme necessário)
          return custo_valor / 1;
        default:
          return custo_valor / 1000;
      }
    }

    const agregadosBatelada = data.materiais_selecionados.reduce((sum, m, i) => {
      const kg = dosageResult.materiais_batelada[i]?.kg || 0;
      const priceKg = getCustoPorKg(m.material_id);
      return sum + (kg * priceKg);
    }, 0);

    const cimentoBatelada = dosageResult.consumo_cimento_batelada * ((data.custo_cimento_ton || 0) / 1000);
    const aditivoBatelada = (data.aditivos_ml || 0) * ((data.custo_aditivo_lt || 0) / 1000);

    const totalBatelada = agregadosBatelada + cimentoBatelada + aditivoBatelada;
    const vol = data.volume_m3 > 0 ? data.volume_m3 : 1;
    const totalM3 = totalBatelada / vol;

    // Valores por m³ (consumo real de projeto)
    const agregadosM3 = agregadosBatelada / vol;
    const cimentoM3 = cimentoBatelada / vol;
    const aditivoM3 = aditivoBatelada / vol;

    return {
      agregadosBatelada,
      cimentoBatelada,
      aditivoBatelada,
      totalBatelada,
      totalM3,
      agregadosM3,
      cimentoM3,
      aditivoM3,
    };
  }, [dosageResult, data, precosAtuais]);

  const handleExportPDF = () => {
    setGeneratingPdf(true);
    try {
      generateAnalysisPDF(data, { limitesDna: dna?.limites });
      toast.success("PDF gerado com sucesso!", {
        description: `Arquivo ${data.codigo}_relatorio.pdf baixado`,
      });
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Banner de aprovação */}
      <div className="rounded-xl border-2 border-success/30 bg-success/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="rounded-full bg-success/15 p-3">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-foreground mb-1">ANÁLISE PRONTA!</h2>
        <p className="text-sm text-muted-foreground">
          Envie para a produção ou finalize estas informações agora mesmo
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant="outline" className="bg-success/15 text-success border-success/30 font-bold">
            APROVADO
          </Badge>
          <Badge variant="outline" className="text-muted-foreground font-medium">
            {data.codigo}
          </Badge>
        </div>
      </div>

      {/* Resumo de Custos do Traço */}
      {financeiro && (
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="bg-success/10 p-0">
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Resumo de Custos do Traço</span>
              <span className="text-[9px] font-bold opacity-50 uppercase">— valor real do traço final</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">Material</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Qtd. (kg)</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Cimento - agora por Consumo de Cimento Alvo (kg/m³) */}
                  <TableRow className="font-medium">
                    <TableCell className="font-bold">Cimento</TableCell>
                    <TableCell className="text-right font-bold">
                      {data.consumo_alvo_m3.toFixed(1)} kg/m³
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {(() => {
                        const cimentoDb = dbMaterials.find((m) => m.tipo === 'cimento' || m.nome.toLowerCase().includes('cimento'));
                        const cimento_valor = cimentoDb?.custo_valor ?? cimentoDb?.custo_tonelada ?? data.custo_cimento_ton ?? 0;
                        const cimento_unidade = cimentoDb?.custo_unidade || (cimentoDb?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                        const cimento_densidade = cimentoDb?.densidade || 3.15;
                        const custoCimento = calcularCustoMaterial({
                          custo_valor: cimento_valor,
                          custo_unidade: cimento_unidade,
                          quantidade: data.consumo_alvo_m3,
                          densidade: cimento_densidade,
                        });
                        return `R$ ${custoCimento.toFixed(2)}`;
                      })()}
                    </TableCell>
                  </TableRow>
                  {/* Agregados */}
                  {dosageResult.materiais_batelada.map((m, i) => {
                    const material = data.materiais_selecionados[i];
                    const dbMat = dbMaterials.find((mat) => mat.id === material.material_id);
                    const custo_valor = dbMat?.custo_valor ?? dbMat?.custo_tonelada ?? 0;
                    const custo_unidade = dbMat?.custo_unidade || (dbMat?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                    const densidade = material.densidade || dbMat?.densidade || 2.65;
                    const quantidade = m.kg ?? 0;
                    const custo = calcularCustoMaterial({ custo_valor, custo_unidade, quantidade, densidade });
                    return (
                      <TableRow key={m.nome}>
                        <TableCell>{m.nome}</TableCell>
                        <TableCell className="text-right font-bold">{m.kg.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right font-bold">R$ {custo.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Aditivo */}
                  {data.aditivos_ml > 0 && (
                    <TableRow>
                      <TableCell className="text-warning">Aditivo</TableCell>
                      <TableCell className="text-right font-bold text-warning">{data.aditivos_ml} mL</TableCell>
                      <TableCell className="text-right font-bold text-warning">
                        {(() => {
                          const aditivoDb = dbMaterials.find((m) => m.tipo === 'aditivo' || m.nome.toLowerCase().includes('aditivo'));
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
                          return `R$ ${custoAditivo.toFixed(2)}`;
                        })()}
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Total */}
                  <TableRow className="bg-success/20 border-t-2 font-black">
                    <TableCell className="font-black uppercase text-sm">TOTAL</TableCell>
                    <TableCell className="text-right text-base font-black" colSpan={2}>
                      {(() => {
                        // Soma todos os custos
                        let total = 0;
                        // Cimento
                        const cimentoDb = dbMaterials.find((m) => m.tipo === 'cimento' || m.nome.toLowerCase().includes('cimento'));
                        const cimento_valor = cimentoDb?.custo_valor ?? cimentoDb?.custo_tonelada ?? data.custo_cimento_ton ?? 0;
                        const cimento_unidade = cimentoDb?.custo_unidade || (cimentoDb?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                        const cimento_densidade = cimentoDb?.densidade || 3.15;
                        total += calcularCustoMaterial({
                          custo_valor: cimento_valor,
                          custo_unidade: cimento_unidade,
                          quantidade: data.consumo_alvo_m3,
                          densidade: cimento_densidade,
                        });
                        // Agregados
                        dosageResult.materiais_batelada.forEach((m, i) => {
                          const material = data.materiais_selecionados[i];
                          const dbMat = dbMaterials.find((mat) => mat.id === material.material_id);
                          const custo_valor = dbMat?.custo_valor ?? dbMat?.custo_tonelada ?? 0;
                          const custo_unidade = dbMat?.custo_unidade || (dbMat?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                          const densidade = material.densidade || dbMat?.densidade || 2.65;
                          const quantidade = m.kg ?? 0;
                          total += calcularCustoMaterial({ custo_valor, custo_unidade, quantidade, densidade });
                        });
                        // Aditivo
                        if (data.aditivos_ml > 0) {
                          const aditivoDb = dbMaterials.find((m) => m.tipo === 'aditivo' || m.nome.toLowerCase().includes('aditivo'));
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
                          total += custoAditivo;
                        }
                        return `R$ ${total.toFixed(2)}`;
                      })()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      )}

      {/* RELATÓRIO DE TRAÇO - PRODUÇÃO */}
      <Card>
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider">
                RELATÓRIO DE TRAÇO — PRODUÇÃO
              </CardTitle>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span>{data.codigo} · {dataFormatada} · {horaFormatada}</span>
                <span>·</span>
                <span>{data.produto_nome || "Sem produto vinculado"}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase">Carga do Misturador</p>
              <p className="text-sm font-black">{data.volume_m3.toFixed(3)} m³</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {dosageResult ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-black uppercase">Material</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase">Qtd. (kg)</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase text-primary">Retorno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Cimento */}
                <TableRow className="font-medium">
                  <TableCell className="font-bold">Cimento</TableCell>
                  <TableCell className="text-right font-bold">
                    {data.consumo_alvo_m3.toFixed(0)} kg/m³
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      {dosageResult.consumo_cimento_batelada.toFixed(1)} kg/bat.
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px] font-bold bg-muted/40">
                      —
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Agregados */}
                {dosageResult.materiais_batelada.map((m, i) => {
                  const material = data.materiais_selecionados[i];
                  const pctRetorno = material && totalKgMateriais > 0
                    ? (((material.proporcao_kg ?? 0) / totalKgMateriais) * 100).toFixed(0)
                    : "—";
                  return (
                    <TableRow key={m.nome}>
                      <TableCell>{m.nome}</TableCell>
                      <TableCell className="text-right font-bold">{m.kg.toFixed(2)} kg</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            parseInt(pctRetorno) >= 50
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {pctRetorno}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Água */}
                <TableRow>
                  <TableCell className="text-blue-600 dark:text-blue-400 font-medium">Água</TableCell>
                  <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                    {dosageResult.agua_batelada.toFixed(2)} L
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200/50 dark:text-blue-400">
                      A/C {data.relacao_ac.toFixed(2)}
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Aditivos */}
                {data.aditivos_ml > 0 && (
                  <TableRow>
                    <TableCell className="text-warning">Aditivos</TableCell>
                    <TableCell className="text-right font-bold text-warning">{data.aditivos_ml} mL</TableCell>
                    <TableCell />
                  </TableRow>
                )}

                {/* Total */}
                <TableRow className="bg-foreground/5 border-t-2 font-black">
                  <TableCell className="font-black uppercase text-sm">TOTAL</TableCell>
                  <TableCell className="text-right text-base font-black">
                    {dosageResult.massa_total_batelada.toFixed(2)} kg
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                      {dosageResult.traco_final}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Dados de dosagem não disponíveis
            </p>
          )}
        </CardContent>
      </Card>

      {/* Análise Granulométrica */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-wider">
              ANÁLISE GRANULOMÉTRICA
            </CardTitle>
            {/* Mini legenda */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Atual
              </div>
              {dna && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Ideal
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1 w-4 bg-blue-400/40 rounded" />
                    Faixa
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Exibe o gráfico sempre que a soma das massas retidas for maior que zero */}
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="label" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} reversed />
              <YAxis domain={[0, 100]} fontSize={10} unit="%" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              {dna && (
                <>
                  <Area type="monotone" dataKey="limiteMax" stroke="none" fill="hsl(210 100% 60% / 0.12)" fillOpacity={1} isAnimationActive={false} />
                  <Area type="monotone" dataKey="limiteMin" stroke="none" fill="hsl(var(--card))" fillOpacity={1} isAnimationActive={false} />
                  <Line type="monotone" dataKey="dnAlvo" stroke="hsl(35 92% 50%)" strokeWidth={2} strokeDasharray="8 4" dot={false} name="Ideal" />
                </>
              )}
              <Line
                type="monotone"
                dataKey="acumulado"
                stroke="hsl(var(--destructive))"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(var(--destructive))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                name="Atual"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumo técnico compacto */}
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Tipo</p>
              <p className="font-bold mt-0.5">{tipoLabel}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Resistência</p>
              <p className="font-bold mt-0.5">{data.resistencia_prevista || "—"} MPa</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Traço Final</p>
              <p className="font-bold mt-0.5">{dosageResult?.traco_final ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Analista</p>
              <p className="font-bold mt-0.5">{analistaLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={generatingPdf}>
          {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          SALVAR PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowTraceModal(true)}>
          <Bookmark className="h-4 w-4" />
          TRAÇO PADRÃO
        </Button>
        <Button
          className="gap-2 font-black text-sm px-6"
          onClick={() => setShowReleaseModal(true)}
        >
          <Factory className="h-4 w-4" />
          INICIAR PRODUÇÃO
        </Button>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => {
          clearDraft();
          navigate("/analyses");
        }}>
          <Printer className="h-3 w-3" />
          Voltar para Análises
        </Button>
      </div>

      {/* Modals */}
      <ReleaseProductionModal open={showReleaseModal} onOpenChange={setShowReleaseModal} data={data} />
      <SaveStandardTraceModal open={showTraceModal} onOpenChange={setShowTraceModal} data={data} />
    </div>
  );
}
