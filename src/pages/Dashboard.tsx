import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FlaskConical,
  Factory,
  Hammer,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const kpis = [
  {
    title: "Análises este mês",
    value: "12",
    change: "+3",
    up: true,
    icon: FlaskConical,
  },
  {
    title: "Traços em Produção",
    value: "4",
    change: "+1",
    up: true,
    icon: Factory,
  },
  {
    title: "Rompimentos Pendentes",
    value: "7",
    change: "2 atrasados",
    up: false,
    icon: Hammer,
  },
  {
    title: "Conformidade 28d",
    value: "92%",
    change: "+5%",
    up: true,
    icon: TrendingUp,
  },
];

const barData = [
  { name: "ANL-001", previsto: 4.0, real: 4.2 },
  { name: "ANL-002", previsto: 35, real: 33.5 },
  { name: "ANL-003", previsto: 4.0, real: 4.5 },
  { name: "ANL-004", previsto: 35, real: 36.1 },
  { name: "ANL-005", previsto: 3.0, real: 3.2 },
];

const pieData = [
  { name: "Conforme", value: 18, color: "hsl(152, 60%, 42%)" },
  { name: "Não Conforme", value: 2, color: "hsl(0, 84%, 60%)" },
  { name: "Pendente", value: 5, color: "hsl(38, 92%, 50%)" },
];

const urgentRuptures = [
  { lote: "LOTE-2026-001", produto: "Bloco Estrutural", idade: "7d", data: "10/03/2026", status: "pendente" as const },
  { lote: "LOTE-2026-002", produto: "Paver H8", idade: "3d", data: "08/03/2026", status: "atrasado" as const },
  { lote: "LOTE-2026-003", produto: "Bloco Vedação", idade: "1d", data: "09/03/2026", status: "pendente" as const },
];

const recentAnalyses = [
  { codigo: "ANL-2026-012", produto: "Paver H8 35MPa", analista: "Carlos", data: "07/03/2026", status: "aprovado" as const },
  { codigo: "ANL-2026-011", produto: "Bloco Estrutural 4MPa", analista: "Maria", data: "05/03/2026", status: "liberado_producao" as const },
  { codigo: "ANL-2026-010", produto: "Bloco Vedação 3MPa", analista: "João", data: "03/03/2026", status: "em_analise" as const },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do controle tecnológico</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {kpi.title}
                </span>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">{kpi.value}</span>
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 mb-1 ${kpi.up ? "text-success" : "text-destructive"
                    }`}
                >
                  {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Resistência Prevista vs Real</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="previsto" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Conformidade por Idade (28d)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rompimentos Urgentes (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentRuptures.map((r) => (
                  <TableRow key={r.lote}>
                    <TableCell className="font-medium">{r.lote}</TableCell>
                    <TableCell>{r.produto}</TableCell>
                    <TableCell>{r.idade}</TableCell>
                    <TableCell>{r.data}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Últimas Análises</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAnalyses.map((a) => (
                  <TableRow key={a.codigo}>
                    <TableCell className="font-medium">{a.codigo}</TableCell>
                    <TableCell>{a.produto}</TableCell>
                    <TableCell>{a.data}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/analyses">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
