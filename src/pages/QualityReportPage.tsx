import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
  RefreshCw,
} from "lucide-react";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import {
  calcRuptureStats,
  calcCombinedCurve,
  calcDosage,
  calcCurvaStatus,
} from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";
import { GranulometryChart } from "@/components/analysis/GranulometryChart";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const tipoLabelMap: Record<string, string> = {
  bloco: "Bloco Estrutural",
  paver: "Paver",
  cp: "Corpo de Prova (CP)",
};

function useBatchReport(batchId?: string) {
  const { profile, loading: authLoading } = useAuth();
  const orgId = profile?.organization_id;

  const query = useQuery({
    queryKey: ["batch_report", batchId],
    enabled: !!batchId && !authLoading,
    queryFn: async () => {
      // 1. Buscar lote com análise (sem filtro por org — RLS do Supabase já protege)
      const { data: batch, error: bErr } = await supabase
        .from("production_batches")
        .select(`
          *,
          analyses (*)
        `)
        .eq("id", batchId!)
        .single();
      if (bErr) throw bErr;

      // 2. Buscar agendamentos de rompimento com testes e amostras
      const { data: schedules, error: sErr } = await supabase
        .from("rupture_schedules")
        .select(`
          *,
          rupture_tests (
            *,
            rupture_samples (*)
          )
        `)
        .eq("batch_id", batchId!);
      if (sErr) throw sErr;

      // 3. Buscar materiais da análise com gradações
      const analysisId = (batch as any).analysis_id;
      const { data: materials, error: mErr } = await supabase
        .from("analysis_materials")
        .select(`
          *,
          material:materials (nome, densidade),
          gradations:analysis_material_gradations (
            id,
            sieve_id,
            massa_retida,
            sieve:sieves (abertura_mm)
          )
        `)
        .eq("analysis_id", analysisId);
      if (mErr) throw mErr;

      // 4. Buscar dosagem
      const { data: dosagem } = await supabase
        .from("analysis_dosage")
        .select("*")
        .eq("analysis_id", analysisId)
        .single();

      return { batch, schedules: schedules || [], materials: materials || [], dosagem };
    },
  });

  return { ...query, authLoading };
}

const QualityReportPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const identity = useAppStore((s) => s.identity);
  const { data, isLoading, isError, authLoading } = useBatchReport(batchId);
  const { curves: dbCurves } = useStandardCurves();

  const batch = data?.batch as any;
  const analysis = batch?.analyses as any;
  const schedules = data?.schedules ?? [];
  const materials = data?.materials ?? [];
  const dosagem = data?.dosagem as any;

  // --- Rompimentos concluídos ---
  const statsBySchedule = useMemo(() => {
    return schedules
      .filter((s: any) => s.status === "concluido")
      .map((s: any) => {
        const tests: any[] = s.rupture_tests ?? [];
        const results = tests.map((t: any) => ({
          tipo: t.tipo_amostra,
          label: tipoLabelMap[t.tipo_amostra] || t.tipo_amostra,
          stats: {
            media: t.media_mpa ?? 0,
            minimo: t.min_mpa ?? 0,
            maximo: t.max_mpa ?? 0,
            desvio_padrao: t.desvio_padrao ?? 0,
            coeficiente_variacao:
              t.media_mpa && t.desvio_padrao
                ? (t.desvio_padrao / t.media_mpa) * 100
                : 0,
            status: t.status === "conforme" ? "conforme" : "nao_conforme",
          },
        }));
        return { idade: s.idade_dias, data: s.data_executada, results };
      })
      .sort((a: any, b: any) => a.idade - b.idade);
  }, [schedules]);

  // --- Gráfico de crescimento ---
  const growthData = useMemo(() => {
    return statsBySchedule.map((s: any) => ({
      name: `${s.idade}d`,
      mpa: s.results[0]?.stats.media || 0,
      meta: analysis?.resistencia_prevista ?? 0,
    }));
  }, [statsBySchedule, analysis]);

  // --- Curva granulométrica ---
  const materiaisParaCurva = useMemo(() => {
    return materials.map((m: any) => ({
      material_id: m.material_id,
      proporcao_pct: m.proporcao_pct,
      gradations: (m.gradations ?? []).map((g: any) => ({
        sieve_id: g.sieve_id,
        abertura_mm: g.sieve?.abertura_mm ?? 0,
        massa_retida: g.massa_retida ?? 0,
      })),
    }));
  }, [materials]);

  const limitesDNA = useMemo(() => {
    const dnaId = analysis?.dna_selecionado;
    // Buscar limites a partir das curvas carregadas do banco
    const curve = dbCurves.find((c) => c.id === dnaId) ?? dbCurves[0];
    if (!curve?.standard_curve_items?.length) return [];
    return curve.standard_curve_items.map((item) => ({
      sieve_id: item.sieve_id,
      limite_min: item.limite_min,
      limite_max: item.limite_max,
    }));
  }, [analysis, dbCurves]);

  const combinedCurve = useMemo(() => {
    if (materiaisParaCurva.length === 0) return [];
    return calcCombinedCurve(materiaisParaCurva, limitesDNA);
  }, [materiaisParaCurva, limitesDNA]);

  const curveStatus = useMemo(() => calcCurvaStatus(combinedCurve), [combinedCurve]);

  // --- Detalhamento de materiais ---
  const materialsDetail = useMemo(() => {
    if (!dosagem) return [];
    const volM3 = (batch?.volume_produzido ?? 0) / 1000;
    const consumoCimento = dosagem.consumo_cimento_kg ?? 0;
    const volBatelada = dosagem.volume_batelada_litros ? dosagem.volume_batelada_litros / 1000 : 0.55;

    return materials.map((m: any) => {
      const massaKg = m.massa_kg ?? 0;
      // kg/m³: massa absoluta dividida pelo volume da batelada original
      const kgM3 = volBatelada > 0 ? massaKg / volBatelada : 0;
      // Batelada para o lote: kg/m³ × volume do lote em m³
      const kgBatelada = kgM3 * volM3;
      return {
        nome: m.material?.nome ?? "—",
        densidade: m.material?.densidade,
        proporcao_pct: m.proporcao_pct,
        massa_kg: massaKg,
        kg_m3: kgM3,
        kg_batelada: kgBatelada,
      };
    });
  }, [materials, dosagem, batch]);

  // --- Loading / Error ---
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !batch || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground italic">Lote ou relatório não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/reports")}>Voltar</Button>
      </div>
    );
  }

  const analysisTypeMeta = TIPOS_ANALISE.find((t) => t.value === analysis.tipo);

  return (
    <div className="space-y-6 animate-fade-in pb-10 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Relatórios
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
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
                {identity.nome || "Laudo Técnico"}
              </h1>
              <div className="flex flex-col gap-0.5 mt-2">
                <p className="text-sm font-bold text-muted-foreground uppercase opacity-70">
                  {identity.cnpj ? `CNPJ: ${identity.cnpj} • ` : ""}Laudo Técnico
                </p>
                {identity.endereco && (
                  <p className="text-[10px] font-medium text-muted-foreground opacity-60">{identity.endereco}</p>
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
            <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg p-6 flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase tracking-wider text-amber-700">Aprovação Técnica Excepcional</h3>
                <p className="text-sm font-semibold text-amber-900/80 leading-relaxed italic">
                  {batch.notas ?? "Lote liberado antecipadamente por critério técnico."}
                </p>
              </div>
            </div>
          )}

          {/* Dados Gerais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Produto / Análise</p>
              <p className="text-sm font-bold">{analysisTypeMeta?.label || analysis.tipo}</p>
              <p className="text-[9px] font-mono opacity-60 italic">{analysis.codigo}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Data Produção</p>
              <p className="text-sm font-bold">{batch.produced_at.split("T")[0].split("-").reverse().join("/")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Máquina</p>
              <p className="text-sm font-bold">{batch.maquina || "—"}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase font-black text-muted-foreground">Volume Lote</p>
              <p className="text-sm font-black">{batch.volume_produzido ?? "—"} L</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            {/* Granulometria */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" /> Estudo Granulométrico (DNA)
                </h2>
                <div className="flex gap-2">
                  <Badge className={cn("font-black text-[9px] px-3 py-1", curveStatus.status === "conforme" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600")}>
                    {curveStatus.status === "conforme" ? "DENTRO DA CURVA" : "FORA DA FAIXA"}
                  </Badge>
                </div>
              </div>
              {combinedCurve.length > 0 ? (
                <div className="relative h-[250px] w-full bg-muted/5 rounded-lg border p-2">
                  <GranulometryChart curveResults={combinedCurve} hasLimits={combinedCurve[0]?.limite_max !== undefined} compact={true} />
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center bg-muted/10 rounded-lg border text-muted-foreground text-sm italic">
                  Dados granulométricos não disponíveis
                </div>
              )}
            </div>

            {/* Curva de Crescimento */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <LineChartIcon className="h-3 w-3" /> Evolução de Resistência
              </h2>
              <div className="h-[250px] w-full bg-muted/5 rounded-lg border p-4">
                {growthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} unit=" MPa" />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "11px" }} />
                      <ReferenceLine y={analysis.resistencia_prevista} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ position: "right", value: "Meta fck", fill: "hsl(var(--primary))", fontSize: 9, fontWeight: "bold" }} />
                      <Line type="monotone" dataKey="mpa" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    Nenhum ensaio concluído ainda
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Composição e Dosagem */}
          {materialsDetail.length > 0 && dosagem && (
            <div className="space-y-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Beaker className="h-3 w-3" /> Matrizes de Composição e Dosagem
              </h2>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted border-b text-muted-foreground font-black text-[9px] uppercase">
                      <th className="text-left py-3 px-4">Material</th>
                      <th className="text-center py-3 px-2">Proporção</th>
                      <th className="text-right py-3 px-2">kg/m³</th>
                      <th className="text-right py-3 px-2">Batelada (kg)</th>
                      <th className="text-right py-3 px-4">Densidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materialsDetail.map((m, i) => (
                      <tr key={i} className="hover:bg-muted/5">
                        <td className="py-2.5 px-4 font-bold">{m.nome}</td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge variant="secondary" className="font-bold text-[10px]">{(m.proporcao_pct * 100).toFixed(1)}%</Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right font-black">{m.kg_m3.toFixed(1)}</td>
                        <td className="py-2.5 px-2 text-right font-black text-primary">{m.kg_batelada.toFixed(1)}</td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">{m.densidade?.toFixed(3)} g/cm³</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-black">
                      <td className="py-3 px-4 uppercase text-[9px] text-primary">Cimento Portland</td>
                      <td className="py-3 px-2 text-center text-primary text-[8px]">1 : {dosagem.relacao_cimento}</td>
                      <td className="py-3 px-2 text-right text-primary">{(dosagem.consumo_cimento_kg ?? 0).toFixed(1)}</td>
                      <td className="py-3 px-2 text-right text-primary">
                        {(((batch.volume_produzido ?? 0) / 1000) * (dosagem.consumo_cimento_kg ?? 0)).toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right">{(dosagem.densidade_cimento ?? 3.15).toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Ensaios de Rompimento */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Detalhamento dos Ensaios de Compressão</h2>
            {statsBySchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statsBySchedule.map((s: any, idx: number) => (
                  <div key={idx} className="border rounded-lg overflow-hidden bg-muted/5">
                    <div className="bg-muted px-4 py-2 flex justify-between items-center border-b">
                      <span className="text-[10px] font-black uppercase flex items-center gap-2 italic">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Rompimento {s.idade}d
                      </span>
                      <span className="text-[9px] text-muted-foreground font-bold">
                        {s.data?.split("-").reverse().join("/")}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {s.results.map((r: any, ri: number) => (
                        <div key={ri} className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-black opacity-80 uppercase">
                            <span>{r.label}</span>
                            <span className={cn(r.stats.status === "conforme" ? "text-emerald-500" : "text-amber-500")}>
                              {r.stats.media.toFixed(2)} MPa
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[["Média", r.stats.media.toFixed(2)], ["Desvio", r.stats.desvio_padrao.toFixed(2)], ["C.V", `${r.stats.coeficiente_variacao.toFixed(1)}%`]].map(([label, val]) => (
                              <div key={label} className="bg-background border rounded px-2 py-1.5 text-center">
                                <p className="text-[7px] uppercase font-bold text-muted-foreground">{label}</p>
                                <p className="text-[10px] font-black">{val}</p>
                              </div>
                            ))}
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

          {/* Footer */}
          <div className="pt-10 flex justify-between items-end border-t border-dashed">
            <div className="space-y-1.5 text-[8px] text-muted-foreground max-w-[450px] leading-relaxed">
              <p className="font-black text-[9px] opacity-80">DECLARAÇÃO TÉCNICA E RESPONSABILIDADE:</p>
              <p>Os resultados apresentados neste Laudo Técnico foram obtidos através de ensaios laboratoriais seguindo rigorosamente as Normas Brasileiras Regulamentadoras (NBR). A amostragem foi realizada de acordo com o plano de controle de qualidade da unidade executora.</p>
              <p className="font-mono opacity-60 text-[7px]">Ref: {batch.id?.toUpperCase()}</p>
            </div>
            <div className="text-center w-[250px] space-y-2 pb-2">
              <Separator />
              <p className="text-[10px] font-black uppercase tracking-wider">{batch.operador_nome || "Responsável Técnico"}</p>
              <p className="text-[8px] uppercase font-bold text-muted-foreground">Responsável pelo Controle Tecnológico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReportPage;
