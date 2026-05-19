import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Factory,
  Hammer,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  DollarSign,
} from "lucide-react";
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
import { Link } from "react-router-dom";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useProduction } from "@/hooks/api/useProduction";
import { useRuptures } from "@/hooks/api/useRuptures";
import { useCostMetrics } from "@/hooks/api/useCostMetrics";
import { useAuth } from "@/hooks/useAuth";

// ── Helpers ──────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Paleta da logo ────────────────────────────────────────────
const BRAND_RED        = "hsl(0, 80%, 38%)";  // escuro — cor principal da logo
const BRAND_RED_MED    = "hsl(0, 68%, 56%)";  // médio
const BRAND_RED_LIGHT  = "hsl(0, 65%, 76%)";  // claro

// ── Dados ─────────────────────────────────────────────────────
// Mocks removidos para uso de dados reais via hooks dentro do componente Dashboard

// ── Tooltip customizado ────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white shadow-lg px-4 py-3 text-sm min-w-[140px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.fill }} />
            {p.name === "previsto" ? "Previsto" : "Real"}
          </span>
          <span className="font-semibold text-foreground">{p.value} MPa</span>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { batches, isLoadingBatches: loadingBatches } = useProduction();
  const { schedules, isLoadingSchedules } = useRuptures();
  const costMetrics = useCostMetrics();

  const greeting = useMemo(() => getGreeting(), []);
  const dateStr = useMemo(() => getFormattedDate(), []);

  // ── Processamento de Dados REAIS ─────────────────────────────

  const today = new Date().toISOString().split("T")[0];

  const complianceRate = useMemo(() => {
    const completedCount = schedules.filter(s => s.status === 'concluido').length;
    const overdueCount = schedules.filter(s => (s.status === 'pendente' || s.status === 'atrasado') && s.data_prevista < today).length;
    const totalConclusive = completedCount + overdueCount;
    return totalConclusive > 0 ? (completedCount / totalConclusive) * 100 : 100;
  }, [schedules, today]);

  // 1. KPIs
  const realKpis = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const analysesThisMonth = analyses.filter(a => new Date(a.created_at).getMonth() === thisMonth).length;
    const productionTraces = batches.filter(b => b.status === 'aguardando_rompimentos' || b.status === 'aprovado' || b.status === 'em_andamento').length;
    const pendingRuptures = schedules.filter(s => s.status === 'pendente' || s.status === 'atrasado');
    const overdueCount = pendingRuptures.filter(s => s.data_prevista < today).length;

    return [
      {
        title: "Análises este mês",
        value: analysesThisMonth.toString(),
        change: `Total: ${analyses.length}`,
        up: true,
        icon: FlaskConical,
        progress: Math.min(100, (analysesThisMonth / 10) * 100),
        color: "text-primary",
        iconBg: "bg-primary/10",
      },
      {
        title: "Traços em Produção",
        value: productionTraces.toString(),
        change: "Ativos",
        up: true,
        icon: Factory,
        progress: 100,
        color: "text-primary",
        iconBg: "bg-primary/10",
      },
      {
        title: "Rompimentos Pendentes",
        value: pendingRuptures.length.toString(),
        change: `${overdueCount} atrasados`,
        up: overdueCount === 0,
        icon: Hammer,
        progress: Math.max(0, 100 - (overdueCount * 20)),
        color: "text-primary",
        iconBg: "bg-primary/10",
      },
      {
        title: "Conformidade Geral",
        value: `${Math.round(complianceRate)}%`,
        change: overdueCount > 0 ? "Atenção" : "Em dia",
        up: overdueCount === 0,
        icon: TrendingUp,
        progress: complianceRate,
        color: "text-primary",
        iconBg: "bg-primary/10",
      },
      {
        title: "Custo Médio / m³",
        value: costMetrics.mediaCustoM3 > 0 ? `R$${costMetrics.mediaCustoM3.toFixed(0)}` : "—",
        change: costMetrics.variacaoMensal !== 0 ? `${costMetrics.variacaoMensal > 0 ? "+" : ""}${costMetrics.variacaoMensal.toFixed(0)}% vs mês ant.` : "Sem dados",
        up: costMetrics.variacaoMensal <= 0,
        icon: DollarSign,
        progress: Math.min(100, costMetrics.mediaCustoM3 > 0 ? 75 : 0),
        color: "text-primary",
        iconBg: "bg-primary/10",
      }
    ];
  }, [analyses, batches, schedules, today]);

  // 2. Gráfico de Barras (Últimas 5 análises com meta — apenas previsto, sem simulação)
  const realBarData = useMemo(() => {
    return analyses.slice(0, 5).reverse().map(a => ({
      name: a.codigo,
      previsto: a.resistencia_prevista || 0,
    }));
  }, [analyses]);

  // 3. Gráfico de Pizza (Status dos agendamentos)
  const realPieData = useMemo(() => {
    const counts = {
      concluido: schedules.filter(s => s.status === 'concluido').length,
      pendente: schedules.filter(s => s.status === 'pendente' || s.status === 'atrasado').length,
      ignorado: schedules.filter(s => s.status === 'ignorado').length,
    };
    return [
      { name: "Concluído", value: counts.concluido, color: BRAND_RED },
      { name: "Pendente", value: counts.pendente, color: BRAND_RED_MED },
      { name: "Ignorado", value: counts.ignorado, color: BRAND_RED_LIGHT },
    ];
  }, [schedules]);

  // 4. Tabelas
  const realUrgentRuptures = useMemo(() => {
    return schedules
      .filter(s => s.status === 'pendente' || s.status === 'atrasado')
      .slice(0, 3)
      .map(s => ({
        lote: s.batch?.batch_code || "—",
        produto: s.batch?.analyses?.nome || "—",
        idade: `${s.idade_dias}d`,
        data: new Date(s.data_prevista).toLocaleDateString('pt-BR'),
        status: s.status as any
      }));
  }, [schedules]);

  const realRecentAnalyses = useMemo(() => {
    return analyses.slice(0, 3).map(a => ({
      codigo: a.codigo,
      produto: a.nome,
      data: new Date(a.created_at).toLocaleDateString('pt-BR'),
      status: a.status as any
    }));
  }, [analyses]);

  const KPI_ACCENT_COLORS = [BRAND_RED, BRAND_RED_MED, BRAND_RED_LIGHT, BRAND_RED, BRAND_RED_MED];

  if (loadingAnalyses || loadingBatches || isLoadingSchedules) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  // ── Legenda do Donut ──────────────────────────────────────────
  const DonutLegend = () => (
    <div className="flex flex-col gap-2 justify-center">
      {realPieData.map((d) => (
        <div key={d.name} className="flex items-center gap-2.5 text-sm">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="text-muted-foreground">{d.name}</span>
          <span className="ml-auto font-semibold text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );

  // ── Componente central do donut ────────────────────────────────
  const DonutCenter = ({ cx, cy }: { cx?: number; cy?: number }) => (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize="26" fontWeight="800" fill={BRAND_RED}>{Math.round(complianceRate)}%</tspan>
      <tspan x={cx} dy="1.4em" fontSize="11" fill="hsl(0,0%,50%)">conformidade</tspan>
    </text>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header Premium ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Controle Tecnológico &mdash; Lajeforro Matriz
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground capitalize">{dateStr}</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {realKpis.map((kpi, index) => (
          <Card key={kpi.title} className="kpi-card animate-slide-up shadow-sm border-border hover:shadow-md transition-shadow overflow-hidden">
            {/* Barra de acento lateral */}
            <div
              className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
              style={{ background: KPI_ACCENT_COLORS[index] }}
            />
            <CardContent className="pl-5 pr-5 pt-5 pb-4 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
                  {kpi.title}
                </span>
                <div className={`h-8 w-8 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>

              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-black text-foreground leading-none">{kpi.value}</span>
                <span
                  className={`text-xs font-semibold flex items-center gap-0.5 mb-0.5 ${kpi.up ? "text-success" : "text-destructive"}`}
                >
                  {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${kpi.progress}%`,
                    background: KPI_ACCENT_COLORS[index],
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Barras */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">Resistência Prevista (MPa)</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BRAND_RED }} />
                Previsto
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={realBarData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,10%,93%)" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "hsl(0,0%,50%)" }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "hsl(0,0%,50%)" }} width={32} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(0,10%,96%)" }} />
                <Bar dataKey="previsto" fill={BRAND_RED} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-foreground">Status de Rompimentos (Todos)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={realPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {realPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <DonutCenter cx={110} cy={110} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                <DonutLegend />
                <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                  Status geral de todos os agendamentos de rompimento no sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Evolução de Custos (últimos 6 meses) ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Evolução de Custos (Últimos 6 Meses)
          </CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BRAND_RED }} />
                R$ Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BRAND_RED_LIGHT }} />
                Nº Lotes
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1" asChild>
              <Link to="/reports/costs">
                Relatório completo <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês Atual</p>
              <p className="text-xl font-black text-foreground mt-1">
                {costMetrics.custoMesAtual > 0 ? `R$ ${costMetrics.custoMesAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Acumulado Ano</p>
              <p className="text-xl font-black text-foreground mt-1">
                {costMetrics.custoAnoAtual > 0 ? `R$ ${costMetrics.custoAnoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Média R$/m³</p>
              <p className="text-xl font-black text-foreground mt-1">
                {costMetrics.mediaCustoM3 > 0 ? `R$ ${costMetrics.mediaCustoM3.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costMetrics.mensais} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,10%,93%)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "hsl(0,0%,50%)" }} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "hsl(0,0%,50%)" }} width={50}
                tickFormatter={(v) => v > 0 ? `R$${v}` : "0"} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-white shadow-lg px-4 py-3 text-sm min-w-[160px]">
                      <p className="font-bold text-foreground mb-2">{label}</p>
                      {payload.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.fill || p.color }} />
                            {p.name === "totalBatelada" ? "R$ Total" : "Lotes"}
                          </span>
                          <span className="font-semibold text-foreground">
                            {p.name === "totalBatelada" ? `R$ ${Number(p.value).toFixed(2)}` : p.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
                cursor={{ fill: "hsl(0,10%,96%)" }}
              />
              <Bar dataKey="totalBatelada" fill={BRAND_RED} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="batchCount" fill={BRAND_RED_LIGHT} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Tabelas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Rompimentos Urgentes */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(28,90%,52%)]" />
              Rompimentos Urgentes (Próximos)
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1" asChild>
              <Link to="/ruptures">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Lote</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Produto</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Idade</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Data</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realUrgentRuptures.map((r, idx) => (
                    <TableRow key={idx} className="hover:bg-primary/[0.03] transition-colors">
                      <TableCell className="py-2.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {r.lote}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm font-medium">{r.produto}</TableCell>
                      <TableCell className="py-2.5 text-sm">{r.idade}</TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground">{r.data}</TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          {r.status === "atrasado" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                          )}
                          <StatusBadge status={r.status} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Últimas Análises */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Últimas Análises
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1" asChild>
              <Link to="/analyses">
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Código</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Produto</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Data</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground h-9">Status</TableHead>
                    <TableHead className="h-9" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realRecentAnalyses.map((a) => (
                    <TableRow key={a.codigo} className="hover:bg-primary/[0.03] transition-colors">
                      <TableCell className="py-2.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {a.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm font-medium">{a.produto}</TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground">{a.data}</TableCell>
                      <TableCell className="py-2.5">
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" asChild>
                          <Link to="/analyses">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
