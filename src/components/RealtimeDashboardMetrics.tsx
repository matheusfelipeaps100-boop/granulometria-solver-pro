import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardMetrics {
  totalAnalyses: number;
  totalBatches: number;
  approvedAnalyses: number;
  pendingRuptures: number;
  overdueRuptures: number;
  analysesStatus: Array<{ name: string; value: number }>;
  batchesStatus: Array<{ name: string; value: number }>;
  recentActivity: Array<{
    id: string;
    type: "analysis" | "batch" | "rupture";
    title: string;
    timestamp: string;
  }>;
  lastUpdate: string;
}

const COLORS = {
  approved: "#10b981",
  pending: "#f59e0b",
  overdue: "#ef4444",
  draft: "#8b5cf6",
  production: "#3b82f6",
  completed: "#06b6d4",
};

export function RealtimeDashboardMetrics() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Função para carregar métricas
  const loadMetrics = async () => {
    if (!profile?.organization_id) return;

    try {
      // 1. Total de análises
      const { data: analyses, count: analysesCount } = await supabase
        .from("analyses")
        .select("status", { count: "exact" })
        .eq("organization_id", profile.organization_id);

      // 2. Total de lotes
      const { data: batches, count: batchesCount } = await supabase
        .from("production_batches")
        .select("status", { count: "exact" })
        .eq("organization_id", profile.organization_id);

      // 3. Análises aprovadas
      const { count: approvedCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact" })
        .eq("organization_id", profile.organization_id)
        .eq("status", "aprovada");

      // 4. Rompimentos agendados (próximos 7 dias)
      const { count: pendingCount } = await supabase
        .from("rupture_schedules")
        .select("*", { count: "exact" })
        .eq("status", "agendada")
        .gte("scheduled_date", new Date().toISOString().split("T")[0]);

      // 5. Rompimentos atrasados
      const { count: overdueCount } = await supabase
        .from("rupture_schedules")
        .select("*", { count: "exact" })
        .eq("status", "atrasada");

      // 6. Status distribution análises
      const analysesStatus = [
        { name: "Aprovadas", value: approvedCount || 0 },
        {
          name: "Em Progresso",
          value: (analyses || []).filter((a) => a.status === "em_progresso").length,
        },
        {
          name: "Rascunho",
          value: (analyses || []).filter((a) => a.status === "nao_iniciada").length,
        },
      ];

      // 7. Status distribution batches
      const batchesStatus = [
        {
          name: "Aprovados",
          value: (batches || []).filter((b) => b.status === "aprovada").length,
        },
        {
          name: "Em Produção",
          value: (batches || []).filter((b) => b.status === "em_producao").length,
        },
        {
          name: "Com Ressalva",
          value: (batches || []).filter((b) => b.status === "com_ressalva").length,
        },
      ];

      // 8. Atividade recente
      const { data: recentAnalyses } = await supabase
        .from("analyses")
        .select("id, analysis_name, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(3);

      const recentActivity = (recentAnalyses || []).map((a) => ({
        id: a.id,
        type: "analysis" as const,
        title: a.analysis_name || "Análise sem nome",
        timestamp: new Date(a.created_at).toLocaleString("pt-BR"),
      }));

      setMetrics({
        totalAnalyses: analysesCount || 0,
        totalBatches: batchesCount || 0,
        approvedAnalyses: approvedCount || 0,
        pendingRuptures: pendingCount || 0,
        overdueRuptures: overdueCount || 0,
        analysesStatus,
        batchesStatus,
        recentActivity,
        lastUpdate: new Date().toLocaleTimeString("pt-BR"),
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar métricas inicialmente
  useEffect(() => {
    loadMetrics();

    // Subscrever a mudanças para realtime updates
    const subscriptions = [
      supabase
        .from("analyses")
        .on("*", () => loadMetrics())
        .subscribe(),

      supabase
        .from("production_batches")
        .on("*", () => loadMetrics())
        .subscribe(),

      supabase
        .from("rupture_schedules")
        .on("*", () => loadMetrics())
        .subscribe(),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [profile?.organization_id]);

  if (isLoading) {
    return (
      <div className="grid gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Análises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.approvedAnalyses} aprovadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Lotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalBatches}</div>
            <p className="text-xs text-muted-foreground mt-1">em produção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-500" />
              Rompimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.pendingRuptures}</div>
            <p className="text-xs text-muted-foreground mt-1">próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertIcon className="h-4 w-4 text-red-500" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{metrics.overdueRuptures}</div>
            <p className="text-xs text-muted-foreground mt-1">precisam atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Análises Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status Análises</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.analysesStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill={COLORS.approved} />
                  <Cell fill={COLORS.pending} />
                  <Cell fill={COLORS.draft} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              {metrics.analysesStatus.map((item) => (
                <div key={item.name} className="flex justify-between">
                  <span className="text-muted-foreground">{item.name}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Batches Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status Lotes</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.batchesStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.production} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas ações no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentActivity.length > 0 ? (
              metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge variant="secondary">{activity.type}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      <div className="text-xs text-muted-foreground text-right">
        Atualizado em tempo real: {metrics.lastUpdate}
      </div>
    </div>
  );
}

function AlertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2v2m0-4h-2V7h2v6z" />
    </svg>
  );
}
