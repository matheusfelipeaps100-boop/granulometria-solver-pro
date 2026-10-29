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
import { DollarSign, ArrowLeft, RefreshCw, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useProduction } from "@/hooks/api/useProduction";
import { useMaterials } from "@/hooks/api/useMaterials";
import { calcularCustoTracoCompleto, cn } from "@/lib/utils";
import { calcularCustosLotes, segmentoDoTipo, type SegmentoCusto } from "@/lib/cost-report";
import { generateCostReportExcel } from "@/lib/excel-generator";
import { getAnalysesListPath } from "@/lib/analysis-data";

const COR_REAL = "hsl(var(--primary))";
const COR_ESTIMADO = "hsl(var(--muted-foreground) / 0.35)";
const PIE_COLORS = [
  "hsl(0, 80%, 38%)",
  "hsl(0, 68%, 56%)",
  "hsl(0, 65%, 76%)",
  "hsl(215, 25%, 45%)",
  "hsl(215, 20%, 65%)",
  "hsl(35, 85%, 55%)",
  "hsl(195, 70%, 50%)",
];

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const SEGMENTOS: Array<{ value: SegmentoCusto; label: string }> = [
  { value: "laje", label: "Lajes" },
  { value: "bloco_paver", label: "Bloco/Paver" },
];

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v: number, casas = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Ano-mês local ("2026-10") de uma data ISO
const anoMes = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const CostReportPage = () => {
  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { batches, isLoadingBatches } = useProduction();
  const { materials: dbMaterials } = useMaterials();

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [filterYear, setFilterYear] = useState(String(hoje.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(hoje.getMonth() + 1).padStart(2, "0"));
  const [segmento, setSegmento] = useState<SegmentoCusto>("laje");

  const todosLotes = useMemo(
    () => calcularCustosLotes(batches, analyses, dbMaterials || []),
    [batches, analyses, dbMaterials]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>([String(hoje.getFullYear())]);
    for (const l of todosLotes) years.add(anoMes(l.data).slice(0, 4));
    return Array.from(years).sort().reverse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLotes]);

  const noPeriodo = (iso: string) => {
    const ym = anoMes(iso);
    if (!ym.startsWith(filterYear)) return false;
    return filterMonth === "00" || ym === `${filterYear}-${filterMonth}`;
  };

  const lotesSegmento = useMemo(() => todosLotes.filter((l) => l.segmento === segmento), [todosLotes, segmento]);
  const lotes = useMemo(
    () => lotesSegmento.filter((l) => noPeriodo(l.data)).sort((a, b) => b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotesSegmento, filterYear, filterMonth]
  );
  const contagemPorSegmento = useMemo(() => {
    const c: Record<SegmentoCusto, number> = { laje: 0, bloco_paver: 0 };
    for (const l of todosLotes) if (noPeriodo(l.data)) c[l.segmento] += 1;
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLotes, filterYear, filterMonth]);

  const periodoLabel = filterMonth === "00" ? filterYear : `${MESES[Number(filterMonth) - 1]}/${filterYear}`;
  const segmentoLabel = SEGMENTOS.find((s) => s.value === segmento)!.label;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const reais = lotes.filter((l) => l.origem === "real");
  const estimados = lotes.filter((l) => l.origem === "estimado");
  const custoReal = reais.reduce((s, l) => s + l.total, 0);
  const custoEstimado = estimados.reduce((s, l) => s + l.total, 0);

  const completos = reais.filter((l) => l.realCompleto && l.concretoM3 > 0);
  const m3Completos = completos.reduce((s, l) => s + l.concretoM3, 0);
  const mediaRealM3 = m3Completos > 0 ? completos.reduce((s, l) => s + l.total, 0) / m3Completos : null;

  // Custo previsto/m³ dos traços do segmento (média ponderada pelo concreto dos lotes do período)
  const analysesSegmento = useMemo(
    () => analyses.filter((a) => segmentoDoTipo(a.tipo) === segmento),
    [analyses, segmento]
  );
  const m3Periodo = lotes.reduce((s, l) => s + l.concretoM3, 0);
  const previstoM3 = useMemo(() => {
    if (m3Periodo > 0) return lotes.reduce((s, l) => s + l.previstoPorM3 * l.concretoM3, 0) / m3Periodo;
    const valores = analysesSegmento
      .map((a) => calcularCustoTracoCompleto({ formData: a.formData, dbMaterials: dbMaterials || [] }).totalM3)
      .filter((v) => v > 0);
    return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
  }, [lotes, m3Periodo, analysesSegmento, dbMaterials]);

  const realMesAtual = lotesSegmento
    .filter((l) => l.origem === "real" && anoMes(l.data) === mesAtual)
    .reduce((s, l) => s + l.total, 0);
  const lotesAno = lotesSegmento.filter((l) => anoMes(l.data).startsWith(filterYear));
  const realAno = lotesAno.filter((l) => l.origem === "real").reduce((s, l) => s + l.total, 0);
  const estimadoAno = lotesAno.filter((l) => l.origem === "estimado").reduce((s, l) => s + l.total, 0);

  // ── Evolução mensal (6 meses até o mês filtrado) ─────────────────────────
  const mensal = useMemo(() => {
    const fimAno = Number(filterYear);
    const fimMes = filterMonth === "00"
      ? (fimAno === hoje.getFullYear() ? hoje.getMonth() : 11)
      : Number(filterMonth) - 1;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(fimAno, fimMes - (5 - i), 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const doMes = lotesSegmento.filter((l) => anoMes(l.data) === ym);
      return {
        label: `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        real: doMes.filter((l) => l.origem === "real").reduce((s, l) => s + l.total, 0),
        estimado: doMes.filter((l) => l.origem === "estimado").reduce((s, l) => s + l.total, 0),
        lotes: doMes.length,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesSegmento, filterYear, filterMonth]);

  // ── Composição do custo real ──────────────────────────────────────────────
  const composicao = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const l of reais) for (const c of l.composicao) mapa.set(c.material, (mapa.get(c.material) ?? 0) + c.custo);
    const total = Array.from(mapa.values()).reduce((s, v) => s + v, 0);
    return Array.from(mapa.entries())
      .map(([name, value]) => ({ name, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [reais]);

  // ── Custo por produto ─────────────────────────────────────────────────────
  const porProduto = useMemo(() => {
    const mapa = new Map<string, { produto: string; lotes: number; concreto: number; total: number }>();
    for (const l of lotes) {
      const cur = mapa.get(l.produto) ?? { produto: l.produto, lotes: 0, concreto: 0, total: 0 };
      cur.lotes += 1;
      cur.concreto += l.concretoM3;
      cur.total += l.total;
      mapa.set(l.produto, cur);
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [lotes]);

  // ── Top 5 traços por custo previsto/m³ ───────────────────────────────────
  const topTracos = useMemo(() => {
    return analysesSegmento
      .map((a) => {
        const c = calcularCustoTracoCompleto({ formData: a.formData, dbMaterials: dbMaterials || [] });
        return { codigo: a.codigo, nome: a.nome, produto: a.produto || "Sem produto", porM3: c.totalM3, porTraco: c.totalBatelada };
      })
      .filter((t) => t.porM3 > 0)
      .sort((a, b) => b.porM3 - a.porM3)
      .slice(0, 5);
  }, [analysesSegmento, dbMaterials]);

  const handleExport = async () => {
    try {
      await generateCostReportExcel(
        segmentoLabel,
        periodoLabel,
        porProduto.map((p) => ({
          produto: p.produto,
          lotes: p.lotes,
          concreto_m3: Math.round(p.concreto * 1000) / 1000,
          total: Math.round(p.total * 100) / 100,
          por_m3: p.concreto > 0 ? Math.round((p.total / p.concreto) * 100) / 100 : null,
        })),
        lotes.map((l) => ({
          lote: l.lote,
          analise: `${l.analiseCodigo} — ${l.analiseNome}`,
          produto: l.produto,
          data: new Date(l.data).toLocaleDateString("pt-BR"),
          origem: l.origem === "real" ? "Real" : "Estimado",
          tracos: l.tracos,
          concreto_m3: Math.round(l.concretoM3 * 1000) / 1000,
          por_m3: l.porM3 != null ? Math.round(l.porM3 * 100) / 100 : null,
          por_metro: l.porMetro != null ? Math.round(l.porMetro * 100) / 100 : null,
          total: Math.round(l.total * 100) / 100,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar o Excel");
    }
  };

  if (loadingAnalyses || isLoadingBatches) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const kpiLabel = "text-[10px] font-bold text-muted-foreground uppercase tracking-wider";
  const kpiValor = "text-2xl font-black text-foreground mt-1";
  const kpiSub = "text-[11px] text-muted-foreground mt-1";
  const vazio = (texto: string) => (
    <p className="text-center py-10 text-sm text-muted-foreground italic">{texto}</p>
  );

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
              Custo real da produção por lote, separado por segmento
            </p>
          </div>
        </div>
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
              {MESES.map((m, i) => (
                <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segmentos */}
      <div className="inline-flex rounded-lg border bg-muted/40 p-1 gap-1">
        {SEGMENTOS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSegmento(s.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              segmento === s.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
            <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{contagemPorSegmento[s.value]}</span>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className={cn(kpiLabel, "text-primary")}>Custo Real</p>
            <p className={kpiValor}>{custoReal > 0 ? brl(custoReal) : "—"}</p>
            <p className={kpiSub}>{reais.length} de {lotes.length} lotes com receita real</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className={kpiLabel}>Custo Médio / m³ (Real)</p>
            <p className={kpiValor}>{mediaRealM3 != null ? brl(mediaRealM3) : "—"}</p>
            <p className={kpiSub}>
              {mediaRealM3 == null && <>Sem lotes reais completos<br /></>}
              Previsto: {previstoM3 > 0 ? `${brl(previstoM3)}/m³` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className={kpiLabel}>Mês Atual (Real)</p>
            <p className={kpiValor}>{realMesAtual > 0 ? brl(realMesAtual) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className={kpiLabel}>Acumulado {filterYear} (Real)</p>
            <p className={kpiValor}>{realAno > 0 ? brl(realAno) : "—"}</p>
            <p className={kpiSub}>
              Ano inteiro
              {estimadoAno > 0 && <><br />+ {brl(estimadoAno)} estimado</>}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-dashed">
          <CardContent className="pt-4 pb-3">
            <p className={kpiLabel}>Estimado (sem receita real)</p>
            <p className={kpiValor}>{custoEstimado > 0 ? brl(custoEstimado) : "—"}</p>
            <p className={kpiSub}>
              {estimados.length > 0
                ? `${estimados.length} lote(s) sem receita real`
                : "Todos os lotes têm receita real"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-foreground">Evolução Mensal — {segmentoLabel}</CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COR_REAL }} />Real</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COR_ESTIMADO }} />Estimado</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={70}
                  tickFormatter={(v) => (v > 0 ? `R$${Number(v).toLocaleString("pt-BR")}` : "0")} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm">
                        <p className="font-bold mb-1">{label}</p>
                        <p>Real: <strong>{brl(d?.real || 0)}</strong></p>
                        <p>Estimado: <strong>{brl(d?.estimado || 0)}</strong></p>
                        <p className="text-muted-foreground">{d?.lotes || 0} lote(s)</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="real" stackId="c" fill={COR_REAL} maxBarSize={40} />
                <Bar dataKey="estimado" stackId="c" fill={COR_ESTIMADO} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-foreground">Composição do Custo Real — {periodoLabel}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {composicao.length === 0 ? (
              vazio(`Nenhum lote com receita real em ${periodoLabel}. Informe a receita real no registro do lote.`)
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={composicao} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {composicao.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-2.5">
                  {composicao.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{c.name}</span>
                          <span className="font-bold">{brl(c.value)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-10 text-right">{c.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custo por produto */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold text-foreground">Custo por Produto — {segmentoLabel}</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport} disabled={lotes.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {porProduto.length === 0 ? (
            vazio(`Nenhum lote de ${segmentoLabel} em ${periodoLabel}.`)
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] font-bold uppercase h-9">Produto</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Lotes</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Concreto</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase h-9 text-right">R$/m³</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porProduto.map((p) => (
                    <TableRow key={p.produto}>
                      <TableCell className="text-sm font-medium">{p.produto}</TableCell>
                      <TableCell className="text-right">{p.lotes}</TableCell>
                      <TableCell className="text-right">{num(p.concreto, 3)} m³</TableCell>
                      <TableCell className="text-right">{p.concreto > 0 ? brl(p.total / p.concreto) : "—"}</TableCell>
                      <TableCell className="text-right font-black">{brl(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lotes de produção */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground">Lotes de Produção</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] font-bold uppercase h-9">Lote</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9">Análise</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9">Produto</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9">Data</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9">Origem</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Traços</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Concreto</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9 text-right">R$/m³</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9 text-right">R$/m</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase h-9 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground italic">
                      Nenhum lote de {segmentoLabel} em {periodoLabel}.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {lotes.map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-bold">{l.lote}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-mono text-muted-foreground">{l.analiseCodigo}</span>
                          <span className="block text-sm">{l.analiseNome}</span>
                        </TableCell>
                        <TableCell className="text-sm">{l.produto}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(l.data).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                            l.origem === "real"
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted text-muted-foreground border-dashed"
                          )}>
                            {l.origem === "real" ? "Real" : "Estimado"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{l.tracos}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{num(l.concretoM3, 3)} m³</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{l.porM3 != null ? brl(l.porM3) : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{l.porMetro != null ? brl(l.porMetro) : "—"}</TableCell>
                        <TableCell className="text-right font-black whitespace-nowrap">{brl(l.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-black">
                      <TableCell colSpan={9} className="text-right uppercase text-xs">Total Geral</TableCell>
                      <TableCell className="text-right text-primary whitespace-nowrap">{brl(custoReal + custoEstimado)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top 5 traços */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold text-foreground">Top 5 Traços — Maior Custo Previsto por m³</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link to={getAnalysesListPath(segmento === "laje" ? "laje" : null)}>Ver todos os traços</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {topTracos.length === 0 ? (
            vazio(`Nenhum traço de ${segmentoLabel} com custo calculado.`)
          ) : (
            <div className="space-y-2">
              {topTracos.map((t, idx) => (
                <div key={t.codigo} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{t.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.codigo} · {t.produto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-foreground">{brl(t.porM3)}/m³</p>
                    <p className="text-[11px] text-muted-foreground">{brl(t.porTraco)} por traço</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostReportPage;
