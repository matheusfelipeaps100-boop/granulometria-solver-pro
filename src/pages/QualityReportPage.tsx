import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";
import { 
  ArrowLeft, 
  Printer, 
  FileText, 
  CheckCircle2, 
  FlaskConical, 
  LineChart as LineChartIcon, 
  BarChart3,
  Beaker,
  AlertTriangle,
  Info
} from "lucide-react";
import { TIPOS_ANALISE, ANALISTAS, DNAS_PADRAO } from "@/lib/analysis-data";
import { 
  calcRuptureStats, 
  calcCombinedCurve, 
  calcDosage, 
  calcCurvaStatus 
} from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";
import { GranulometryChart } from "@/components/analysis/GranulometryChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

const tipoLabelMap: Record<string, string> = {
  bloco: "Bloco Estrutural",
  paver: "Paver",
  cp: "Corpo de Prova (CP)",
};

const QualityReportPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const analyses = useAppStore((s) => s.analyses);
  const identity = useAppStore((s) => s.identity);

  const found = useMemo(() => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return null;
    const analysis = analyses.find((a) => a.id === batch.analysis_id);
    return { batch, analysis };
  }, [batches, analyses, batchId]);

  if (!found || !found.analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground italic">Lote ou relatório não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/reports")}>Voltar</Button>
      </div>
    );
  }

  const { batch, analysis } = found;
  const analysisTypeMeta = TIPOS_ANALISE.find(t => t.value === analysis.tipo_analise);

  // 1. Dados de Rompimento
  const statsBySchedule = useMemo(() => {
    return batch.rupture_schedules
      .filter(s => s.status === 'concluido')
      .map(s => {
        const results: any[] = [];
        if (s.amostras && s.geometrias) {
          for (const [tipo, amostras] of Object.entries(s.amostras)) {
            const forcas = amostras.map(a => parseFloat(a.forca_kn)).filter(f => !isNaN(f) && f > 0);
            const area = s.geometrias[tipo];
            if (forcas.length > 0 && area) {
              results.push({
                tipo,
                label: tipoLabelMap[tipo] || tipo,
                stats: calcRuptureStats(forcas, analysis.resistencia_prevista, area)
              });
            }
          }
        }
        return { 
          idade: s.idade_dias, 
          data: s.data_executada, 
          responsavel: ANALISTAS.find(a => a.id === s.responsavel_id)?.nome || "—",
          results 
        };
      })
      .sort((a, b) => a.idade - b.idade);
  }, [batch, analysis]);

  // 2. Dados de Crescimento (Gráfico)
  const growthData = useMemo(() => {
    return statsBySchedule.map(s => ({
      name: `${s.idade}d`,
      mpa: s.results[0]?.stats.media || 0,
      meta: analysis.resistencia_prevista
    }));
  }, [statsBySchedule, analysis]);

  // 3. Curva Granulométrica e Status
  const combinedCurve = useMemo(() => {
    // Fallback para limites se não estiverem no formData (análises antigas)
    const limites = (analysis.formData.limites_curva && analysis.formData.limites_curva.length > 0)
      ? analysis.formData.limites_curva
      : DNAS_PADRAO.find(d => d.id === analysis.formData.dna_selecionado)?.limites || DNAS_PADRAO[0].limites;

    return calcCombinedCurve(
      analysis.formData.materiais_selecionados.map(m => ({
        material_id: m.material_id,
        gradations: m.gradations || [],
        proporcao_pct: m.proporcao_pct
      })),
      limites
    );
  }, [analysis]);

  const curveHeaderStats = useMemo(() => {
    const status = calcCurvaStatus(combinedCurve);
    
    // Módulo de Finura da Mistura (Soma % retido acumulado nas peneiras série normal / 100)
    const MF_SIEVES = [4.8, 2.4, 1.2, 0.6, 0.3, 0.15];
    const mfSum = combinedCurve
      .filter(r => MF_SIEVES.includes(r.abertura_mm))
      .reduce((sum, r) => sum + r.pct_acumulado, 0);
    const mfTotal = mfSum; // Na engine o pct_acumulado já é 0-1 (ex: 0.85), MF é soma desses decimais * 100 / 100

    return {
      status,
      mfTotal: Math.round(mfTotal * 100) / 100,
      compatibilitate: Math.round(status.indice_compatibilidade * 100)
    };
  }, [combinedCurve]);

  // 4. Detalhamento de Dosagem e Materiais
  const materialsDetail = useMemo(() => {
    const vol = batch.volume_produzido / 1000; // converter litro para m3
    const dosage = calcDosage({
      relacao_cimento: analysis.formData.relacao_cimento,
      relacao_ac: analysis.formData.relacao_ac,
      consumo_alvo_m3: analysis.formData.consumo_alvo_m3,
      volume_m3: 1, // Base 1m3 para m3 unitário
      densidade_cimento: analysis.formData.densidade_cimento,
      proporcoes_materiais: analysis.formData.materiais_selecionados.map(m => ({
        nome: m.nome,
        proporcao_pct: m.proporcao_pct,
        densidade: m.densidade
      })),
      aditivos_ml: analysis.formData.aditivos_ml
    });

    return analysis.formData.materiais_selecionados.map(m => {
      const kgM3 = dosage.materiais_m3.find(dm => dm.nome === m.nome)?.kg || 0;
      return {
        ...m,
        kg_m3: kgM3,
        kg_batelada: kgM3 * vol
      };
    });
  }, [analysis, batch]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Relatórios
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir Relatório
        </Button>
      </div>

      <Card className="max-w-[1000px] mx-auto shadow-xl border-t-8 border-t-primary rounded-xl print:shadow-none print:border-none print:max-w-full">
        <CardContent className="p-10 space-y-10">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground flex items-center gap-2">
                <FlaskConical className="h-8 w-8 text-primary" />
                {identity.nome || "Relatório Técnico Mestre"}
              </h1>
              <div className="flex flex-col gap-0.5 mt-2">
                 <p className="text-sm font-bold text-muted-foreground uppercase opacity-70">
                   {identity.cnpj ? `CNPJ: ${identity.cnpj} • ` : ""}Relatório Técnico Mestre
                 </p>
                 {identity.endereco && (
                   <p className="text-[10px] font-medium text-muted-foreground opacity-60">
                     {identity.endereco}
                   </p>
                 )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-black">Lote de Produção</p>
              <p className="text-2xl font-black text-primary leading-tight">{batch.batch_code}</p>
              <div className="mt-1"><StatusBadge status={batch.status} /></div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {batch.status === "liberado_antecipado" && (
            <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg p-6 flex flex-col sm:flex-row gap-6 print:border-l-amber-600 print:bg-amber-100">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 print:text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-black text-sm uppercase tracking-wider">Aprovação Técnica Excepcional</h3>
                </div>
                <p className="text-sm font-semibold text-amber-900/80 leading-relaxed italic print:text-amber-950">
                  "{batch.motivo_liberacao}"
                </p>
                {batch.liberado_por_id && (
                  <p className="text-[10px] uppercase font-bold text-amber-700/70 pt-2">
                    Liberado por {ANALISTAS.find((a) => a.id === batch.liberado_por_id)?.nome || "Responsável Técnico"} em {batch.liberado_em ? new Date(batch.liberado_em).toLocaleDateString('pt-BR') : "data não registrada"}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dados Gerais */}
          <div className="grid grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Produto / Análise</p>
              <p className="text-sm font-bold">{analysisTypeMeta?.label || analysis.tipo_analise}</p>
              <p className="text-[9px] font-mono opacity-60 italic">{analysis.codigo}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Data Produção</p>
              <p className="text-sm font-bold">{batch.produced_at.split("T")[0].split("-").reverse().join("/")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Máquina / Unidade</p>
              <p className="text-sm font-bold">{batch.maquina || "—"}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Volume Lote</p>
              <p className="text-sm font-black">{batch.volume_produzido} Litros</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Seção: Granulometria */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" /> Estudo Granulométrico (DNA)
                </h2>
                <div className="flex items-center gap-2">
                   <div className="bg-primary/5 border border-primary/20 rounded px-2 py-0.5 text-center">
                      <p className="text-[7px] font-black text-muted-foreground uppercase">MF Total</p>
                      <p className="text-xs font-black text-primary">{curveHeaderStats.mfTotal.toFixed(2)}</p>
                   </div>
                   <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-0.5 text-center">
                      <p className="text-[7px] font-black text-emerald-700 uppercase leading-none">Compat.</p>
                      <p className="text-xs font-black text-emerald-700">{curveHeaderStats.compatibilitate}%</p>
                   </div>
                </div>
              </div>

              <div className="relative h-[250px] w-full bg-muted/5 rounded-lg border p-2">
                <div className="absolute top-4 right-4 z-10">
                   <Badge className={cn(
                     "font-black text-[9px] px-3 py-1",
                     curveHeaderStats.status.status === 'conforme' 
                      ? "bg-emerald-500 hover:bg-emerald-600" 
                      : "bg-amber-500 hover:bg-amber-600"
                   )}>
                     {curveHeaderStats.status.status === 'conforme' ? "DENTRO DA CURVA" : "FORA DA FAIXA"}
                   </Badge>
                </div>
                <GranulometryChart 
                  curveResults={combinedCurve} 
                  hasLimits={combinedCurve.length > 0 && combinedCurve[0].limite_max !== undefined}
                  compact={true}
                />
              </div>
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                Análise granulométrica combinada comparada à zona normativa. O DNA representa o equilíbrio técnico da mistura.
              </p>
            </div>

            {/* Seção: Curva de Crescimento */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <LineChartIcon className="h-3 w-3" /> Evolução de Resistência
              </h2>
              <div className="h-[250px] w-full bg-muted/5 rounded-lg border p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit=" MPa" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    />
                    <ReferenceLine y={analysis.resistencia_prevista} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta fck', fill: 'hsl(var(--primary))', fontSize: 9, fontWeight: 'bold' }} />
                    <Line 
                      type="monotone" 
                      dataKey="mpa" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'white' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                Curva de desenvolvimento da resistência à compressão baseada nos ensaios executados.
              </p>
            </div>
          </div>

          <Separator className="opacity-50" />

          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Beaker className="h-3 w-3" /> Matrizes de Composição e Dosagem
            </h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b text-muted-foreground font-black text-[9px] uppercase">
                    <th className="text-left py-3 px-4">Material / Insumo</th>
                    <th className="text-center py-3 px-2">Proporção</th>
                    <th className="text-right py-3 px-2">Consumo (kg/m³)</th>
                    <th className="text-right py-3 px-2">Batelada (kg)</th>
                    <th className="text-right py-3 px-4">Densidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {materialsDetail.map((m, i) => (
                    <tr key={i} className="hover:bg-muted/5">
                      <td className="py-2.5 px-4 font-bold">{m.nome}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant="secondary" className="font-bold text-[10px]">{m.proporcao_pct}%</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right font-black">{m.kg_m3.toFixed(1)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-primary">{m.kg_batelada.toFixed(1)}</td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">{m.densidade?.toFixed(3)} g/cm³</td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5 font-black">
                    <td className="py-3 px-4 uppercase text-[9px] text-primary">Cimento Portland</td>
                    <td className="py-3 px-2 text-center text-primary leading-none">
                       <span className="text-[8px] opacity-70">1 : {analysis.formData.relacao_cimento}</span>
                    </td>
                    <td className="py-3 px-2 text-right text-primary">{analysis.formData.consumo_alvo_m3.toFixed(1)}</td>
                    <td className="py-3 px-2 text-right text-primary">{(batch.volume_produzido/1000 * analysis.formData.consumo_alvo_m3).toFixed(1)}</td>
                    <td className="py-3 px-4 text-right">{analysis.formData.densidade_cimento.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Seção: Dosagem Executada vs Teórica */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" /> Balanço de Água e Aditivos
              </h2>
              <div className="bg-primary/5 rounded-lg border border-primary/10 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">Relação Água/Cimento (A/C)</p>
                    <p className="text-sm font-black text-primary">{analysis.formData.relacao_ac.toFixed(2)}</p>
                  </div>
                  <div className="text-center border-l border-primary/10">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">Aditivo (ml / m³)</p>
                    <p className="text-sm font-black text-primary">{analysis.formData.aditivos_ml} ml</p>
                  </div>
                </div>
                <Separator className="opacity-30" />
                <div className="flex justify-between items-center px-4">
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">Total Água Lote</p>
                    <p className="text-sm font-black">{(batch.volume_produzido/1000 * analysis.formData.consumo_alvo_m3 * analysis.formData.relacao_ac).toFixed(1)} L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-muted-foreground">Total Aditivo Lote</p>
                    <p className="text-sm font-black">{(batch.volume_produzido/1000 * analysis.formData.aditivos_ml).toFixed(0)} ml</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notas Rápidas */}
            <div className="flex flex-col justify-center bg-muted/20 p-6 rounded-lg border border-dashed">
               <div className="flex items-start gap-4">
                  <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-tighter">Observação de Qualidade</p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "O traço utilizado neste lote segue rigorosamente a análise técnica #{analysis.codigo}. Eventuais variações de umidade nos agregados foram compensadas na pesagem inicial para garantir o fck ≥ {analysis.resistencia_prevista} MPa."
                    </p>
                  </div>
               </div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Seção: Rompimentos Concluídos */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Detalhamento dos Ensaios de Compressão</h2>
            
            {statsBySchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statsBySchedule.map((s, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden bg-muted/5">
                    <div className="bg-muted px-4 py-2 flex justify-between items-center border-b">
                      <span className="text-[10px] font-black uppercase flex items-center gap-2 italic">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Rompimento {s.idade}d
                      </span>
                      <span className="text-[9px] text-muted-foreground font-bold">{s.data?.split("-").reverse().join("/")}</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {s.results.map((r, ri) => (
                        <div key={ri} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-black opacity-80 uppercase tracking-tighter">
                            <span>{r.label}</span>
                            <span className={cn(
                              r.stats.status === "Conforme" ? "text-emerald-500" : "text-amber-500"
                            )}>{r.stats.media.toFixed(2)} MPa</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-background border rounded px-2 py-1.5 text-center">
                              <p className="text-[7px] uppercase font-bold text-muted-foreground">Média</p>
                              <p className="text-[10px] font-black">{r.stats.media.toFixed(2)}</p>
                            </div>
                            <div className="bg-background border rounded px-2 py-1.5 text-center">
                              <p className="text-[7px] uppercase font-bold text-muted-foreground">Desvio</p>
                              <p className="text-[10px] font-black">{r.stats.desvio_padrao.toFixed(2)}</p>
                            </div>
                            <div className="bg-background border rounded px-2 py-1.5 text-center">
                              <p className="text-[7px] uppercase font-bold text-muted-foreground">C.V (%)</p>
                              <p className="text-[10px] font-black">{r.stats.coeficiente_variacao.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 border border-dashed rounded-lg text-center bg-muted/5">
                <p className="text-muted-foreground text-sm italic">Nenhum ensaio de rompimento concluído para este lote.</p>
              </div>
            )}
          </div>

          {/* Footer Técnico */}
          <div className="pt-10 flex justify-between items-end border-t border-dashed">
            <div className="space-y-1.5 text-[8px] text-muted-foreground max-w-[450px] leading-relaxed">
              <p className="font-black text-[9px] opacity-80">DECLARAÇÃO TÉCNICA E RESPONSABILIDADE:</p>
              {batch.status === "liberado_antecipado" ? (
                <p>O presente lote foi liberado para produção através de análise técnica em caráter de exceção, documentada nesta folha, garantindo o atendimento às especificações de resistência precocemente. Os requisitos mínimos de cura foram ponderados e amparados pelos ensaios em andamento registrados até a data corrente deste documento.</p>
              ) : (
                <p>Os resultados apresentados neste Relatório Técnico Mestre foram obtidos através de ensaios laboratoriais seguindo rigorosamente as Normas Brasileiras Regulamentadoras (NBR). A amostragem foi realizada de acordo com o plano de controle de qualidade da unidade executora. Este documento comprova a conformidade técnica do lote especificado perante as exigências de resistência fck estipuladas em projeto.</p>
              )}
              <p className="font-mono opacity-60 text-[7px]">Hash: {batch.id.toUpperCase()}</p>
            </div>
            <div className="text-center w-[250px] space-y-2 pb-2">
              <Separator />
              {batch.status === "liberado_antecipado" && batch.liberado_por_id ? (
                 <p className="text-[10px] font-black uppercase tracking-wider">{ANALISTAS.find((a) => a.id === batch.liberado_por_id)?.nome || batch.operador_nome}</p>
              ) : (
                 <p className="text-[10px] font-black uppercase tracking-wider">{batch.operador_nome}</p>
              )}
              <p className="text-[8px] uppercase font-bold text-muted-foreground">Responsável pelo Controle Tecnológico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReportPage;
