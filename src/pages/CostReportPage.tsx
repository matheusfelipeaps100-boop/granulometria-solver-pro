import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, TrendingDown, TrendingUp, ArrowLeft, RefreshCw, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useCostMetrics } from "@/hooks/api/useCostMetrics";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useProduction } from "@/hooks/api/useProduction";
import { useMaterials } from "@/hooks/api/useMaterials";
import { StatusBadge } from "@/components/StatusBadge";
import { calcularCustoTracoCompleto } from "@/lib/utils";

const BRAND_RED = "hsl(0, 80%, 38%)";
const BRAND_RED_MED = "hsl(0, 68%, 56%)";
const BRAND_RED_LIGHT = "hsl(0, 65%, 76%)";
const PIE_COLORS = [BRAND_RED, BRAND_RED_MED, BRAND_RED_LIGHT, "hsl(0, 50%, 85%)", "hsl(0, 40%, 90%)"];

const CostReportPage = () => {
  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { batches, isLoadingBatches } = useProduction();
  const { materials: dbMaterials } = useMaterials();
  const costMetrics = useCostMetrics();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [showDetailedCosts, setShowDetailedCosts] = useState(false); // Toggle para R$/m³ e R$/Bat.

  // Anos disponíveis para filtro
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const a of analyses) {
      const y = (a.data_analise || a.created_at)?.slice(0, 4);
      if (y) years.add(y);
    }
    if (years.size === 0) years.add(String(currentYear));
    return Array.from(years).sort().reverse();
  }, [analyses, currentYear]);

  // Análises com custo, filtradas por ano e mês
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      const date = a.data_analise || a.created_at;
      if (!date?.startsWith(filterYear)) return false;
      if (filterMonth !== "00" && !date?.startsWith(`${filterYear}-${filterMonth}`)) return false;
      return true;
    });
  }, [analyses, filterYear, filterMonth]);

  // Breakdown por categoria (cimento vs agregados vs aditivo)
  const breakdown = useMemo(() => {
    let cimento = 0;
    let agregados = 0;
    let aditivo = 0;

    for (const a of filteredAnalyses) {
      const fd = a.formData;
      if (!fd) continue;
      // consumo_alvo_m3 já é a quantidade em kg para a batelada de referência
      const cimentoBat = fd.consumo_alvo_m3 || 0;

      cimento += cimentoBat * ((fd.custo_cimento_ton || 0) / 1000);
      aditivo += (fd.aditivos_ml || 0) * ((fd.custo_aditivo_lt || 0) / 1000);

      for (const m of fd.materiais_selecionados || []) {
        const kg = m.proporcao_kg ?? 0;
        const custoTon = m.custo_tonelada ?? 0;
        agregados += (kg * custoTon) / 1000;
      }
    }

    const total = cimento + agregados + aditivo;
    return [
      { name: "Cimento", value: Math.round(cimento * 100) / 100, pct: total > 0 ? (cimento / total * 100) : 0 },
      { name: "Agregados", value: Math.round(agregados * 100) / 100, pct: total > 0 ? (agregados / total * 100) : 0 },
      { name: "Aditivo", value: Math.round(aditivo * 100) / 100, pct: total > 0 ? (aditivo / total * 100) : 0 },
    ];
  }, [filteredAnalyses]);

  // Tabela detalhada por análise
  // Tabela detalhada por análise
  const detailedRows = useMemo(() => {
    return filteredAnalyses.map((a) => {
      const batchesForAnalysis = batches.filter((b) => b.analysis_id === a.id);
      const nBatches = batchesForAnalysis.length;
      const loteCodes = batchesForAnalysis.map((b) => b.batch_code).join(", ") || "—";

      // Recalcula custo total usando a mesma lógica do StepResult com preços atuais
      const custos = calcularCustoTracoCompleto({
        formData: a.formData,
        dbMaterials: dbMaterials || [],
      });

      return {
        codigo: a.codigo,
        nome: a.nome,
        status: a.status,
        data: new Date((a.data_analise ? a.data_analise + "T12:00:00" : a.created_at)).toLocaleDateString("pt-BR"),
        lote: loteCodes,
        custoM3: custos.totalM3,
        custoBatelada: custos.totalBatelada,
        lotes: nBatches,
        custoTotal: custos.totalBatelada,
      };
    }).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [filteredAnalyses, batches, dbMaterials]);

  const totalGeral = detailedRows.reduce((s, r) => s + r.custoTotal, 0);

  if (loadingAnalyses || isLoadingBatches) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Relatório de Custos
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamento financeiro dos traços e produção
            </p>
          </div>
        </div>
      </div>

      {/* KPI Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custo Médio / m³</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {costMetrics.mediaCustoM3 > 0 ? `R$ ${costMetrics.mediaCustoM3.toFixed(2)}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês Atual</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {costMetrics.custoMesAtual > 0
                ? `R$ ${costMetrics.custoMesAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "—"}
            </p>
            {costMetrics.variacaoMensal !== 0 && (
              <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${costMetrics.variacaoMensal <= 0 ? "text-success" : "text-destructive"}`}>
                {costMetrics.variacaoMensal <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {costMetrics.variacaoMensal > 0 ? "+" : ""}{costMetrics.variacaoMensal.toFixed(1)}% vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Acumulado {filterYear}</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {totalGeral > 0
                ? `R$ ${totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Traços Analisados</p>
            <p className="text-2xl font-black text-foreground mt-1">{filteredAnalyses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{detailedRows.reduce((s, r) => s + r.lotes, 0)} lotes produzidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Evolução Mensal */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-foreground">Evolução Mensal de Custos</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costMetrics.mensais} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,10%,93%)" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v) => v > 0 ? `R$${v}` : "0"} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border bg-white shadow-lg px-4 py-3 text-sm">
                        <p className="font-bold mb-1">{label}</p>
                        <p>Total: <strong>R$ {Number(d?.totalBatelada || 0).toFixed(2)}</strong></p>
                        <p className="text-muted-foreground">{d?.batchCount || 0} lote(s) • {d?.analysisCount || 0} traço(s)</p>
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(0,10%,96%)" }}
                />
                <Bar dataKey="totalBatelada" fill={BRAND_RED} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breakdown Cimento vs Agregados vs Aditivo */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-foreground">Composição dos Custos — {filterYear}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={breakdown.filter((b) => b.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {breakdown.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{b.name}</span>
                        <span className="font-bold">R$ {b.value.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: PIE_COLORS[i] }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-10 text-right">{b.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Traços */}
      {costMetrics.topTracos.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground">Top 5 Traços — Maior Custo por m³</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {costMetrics.topTracos.map((t, idx) => (
                <div key={t.codigo} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{t.nome}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Lote</span>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{t.lote}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-foreground">R$ {t.custoTotal.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground ml-1 block">Total</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">R$ {t.custoM3.toFixed(2)}/m³</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela Detalhada */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-foreground">Detalhamento por Análise</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="00">Todos os meses</SelectItem>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedCosts(!showDetailedCosts)}
              className="text-xs h-8"
            >
              {showDetailedCosts ? "Ocultar" : "Mostrar"} Detalhes de Custo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-hidden overflow-x-auto overflow-y-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9">Código</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9">Nome</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9">Lote</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9">Data</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9">Status</TableHead>
                  {showDetailedCosts && (
                    <>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9 text-right">R$/m³</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9 text-right">R$/Bat.</TableHead>
                    </>
                  )}
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9 text-right">Qtd</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wide h-9 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedRows.length > 0 ? (
                  detailedRows.map((r) => (
                    <TableRow key={r.codigo} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold">{r.codigo}</TableCell>
                      <TableCell className="text-sm">{r.nome}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          {r.lote}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.data}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      {showDetailedCosts && (
                        <>
                          <TableCell className="text-right font-bold">R$ {r.custoM3.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {r.custoBatelada.toFixed(2)}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">{r.lotes}</TableCell>
                      <TableCell className="text-right font-black">R$ {r.custoTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={showDetailedCosts ? 9 : 7} className="text-center py-10 text-muted-foreground italic">
                      Nenhuma análise com custos registrados em {filterMonth !== "00" ? `${filterMonth}/${filterYear}` : filterYear}. Preencha os custos na etapa de Dosagem para visualizar aqui.
                    </TableCell>
                  </TableRow>
                )}
                {detailedRows.length > 0 && (
                  <TableRow className="bg-muted/30 font-black">
                    <TableCell colSpan={showDetailedCosts ? 8 : 6} className="text-right uppercase text-xs">Total Geral</TableCell>
                    <TableCell className="text-right text-primary">
                      R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostReportPage;
