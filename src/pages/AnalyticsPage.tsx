import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { generateDashboardExcel } from "@/lib/excel-generator";
import { RealtimeDashboardMetrics } from "@/components/RealtimeDashboardMetrics";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HistoryData {
  date: string;
  analyses: number;
  batches: number;
  ruptures: number;
}

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertStatus, setAlertStatus] = useState<{
    high: number;
    medium: number;
    low: number;
  }>({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadHistoryData = async () => {
      try {
        // Simular dados históricos dos últimos 7 dias
        const data: HistoryData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString("pt-BR").split("/").reverse().join("-");

          const { count: analyses } = await supabase
            .from("analyses")
            .select("*", { count: "exact" })
            .eq("organization_id", profile.organization_id)
            .lte("created_at", date.toISOString());

          const { count: batches } = await supabase
            .from("production_batches")
            .select("*", { count: "exact" })
            .eq("organization_id", profile.organization_id)
            .lte("created_at", date.toISOString());

          const { count: ruptures } = await supabase
            .from("rupture_schedules")
            .select("*", { count: "exact" })
            .lte("created_at", date.toISOString());

          data.push({
            date: dateStr,
            analyses: analyses || 0,
            batches: batches || 0,
            ruptures: ruptures || 0,
          });
        }

        setHistory(data);

        // Carregar alertas
        const { count: overdue } = await supabase
          .from("rupture_schedules")
          .select("*", { count: "exact" })
          .eq("status", "atrasada");

        const { count: pending } = await supabase
          .from("rupture_schedules")
          .select("*", { count: "exact" })
          .eq("status", "agendada");

        setAlertStatus({
          high: overdue || 0,
          medium: Math.ceil((pending || 0) / 3),
          low: 0,
        });
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoryData();
  }, [profile?.organization_id]);

  const handleExportReport = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 16;
      let y = margin;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Dashboard em Tempo Real — Relatório", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.text("Alertas", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Rompimentos atrasados: ${alertStatus.high}`, margin, y);
      y += 6;
      doc.text(`Rompimentos pendentes (estimativa): ${alertStatus.medium}`, margin, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.text("Histórico (últimos 7 dias)", margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Data", margin, y);
      doc.text("Análises", margin + 40, y);
      doc.text("Lotes", margin + 80, y);
      doc.text("Rompimentos", margin + 110, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      history.forEach((h) => {
        doc.text(h.date, margin, y);
        doc.text(String(h.analyses), margin + 40, y);
        doc.text(String(h.batches), margin + 80, y);
        doc.text(String(h.ruptures), margin + 110, y);
        y += 6;
      });

      doc.save(`dashboard_${new Date().toISOString().split("T")[0]}.pdf`);
      await generateDashboardExcel(history, alertStatus);
      toast.success("Relatório exportado com sucesso!", {
        description: "Arquivos .pdf e .xlsx baixados",
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar relatório.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard em Tempo Real</h1>
          <p className="text-muted-foreground mt-1">
            Visualize métricas atualizadas em tempo real do seu processo de granulometria
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportReport}>
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Alertas */}
      {alertStatus.high > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⚠️ Ação Necessária</AlertTitle>
          <AlertDescription>
            Você tem {alertStatus.high} rompimento(s) atrasado(s) que precisa(m) de atenção imediata
            <a href="/ruptures" className="ml-2 font-semibold underline">
              Ir para Rompimentos →
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Realtime Metrics */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Métricas em Tempo Real</h2>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <span className="inline-block h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Conectado
          </Badge>
        </div>
        {isLoading ? (
          <div className="grid gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        ) : (
          <RealtimeDashboardMetrics />
        )}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Análises Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Trend de Análises</CardTitle>
            <CardDescription>Crescimento nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="analyses"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorAnalyses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Carregando dados...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lotes & Rompimentos Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Trend de Lotes & Rompimentos</CardTitle>
            <CardDescription>Comparativo nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="batches"
                    stroke="#10b981"
                    name="Lotes"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="ruptures"
                    stroke="#f59e0b"
                    name="Rompimentos"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Carregando dados...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Status</CardTitle>
          <CardDescription>Alertas e notificações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{alertStatus.high}</div>
              <p className="text-sm text-red-700">Crítico - Rompimentos Atrasados</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{alertStatus.medium}</div>
              <p className="text-sm text-yellow-700">Aviso - Próximos Rompimentos</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">OK</div>
              <p className="text-sm text-green-700">Processamento Normal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
