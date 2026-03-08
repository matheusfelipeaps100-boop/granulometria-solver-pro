import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Factory, Bookmark, CheckCircle2, Loader2 } from "lucide-react";
import { calcCombinedCurve, calcDosage } from "@/lib/granulometry-engine";
import { generateAnalysisPDF } from "@/lib/pdf-generator";
import { ReleaseProductionModal } from "./ReleaseProductionModal";
import { SaveStandardTraceModal } from "./SaveStandardTraceModal";
import {
  TIPOS_ANALISE,
  ANALISTAS,
  DNAS_PADRAO,
  PENEIRAS_PADRAO,
  type AnalysisFormData,
} from "@/lib/analysis-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface StepResultProps {
  data: AnalysisFormData;
}

export function StepResult({ data }: StepResultProps) {
  const navigate = useNavigate();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showTraceModal, setShowTraceModal] = useState(false);

  const dna = DNAS_PADRAO.find((d) => d.id === data.dna_selecionado);
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const analistaLabel = ANALISTAS.find((a) => a.id === data.analista)?.nome ?? "—";

  const curveResults = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return [];
    return calcCombinedCurve(data.materiais_selecionados, dna?.limites);
  }, [data.materiais_selecionados, dna]);

  const dosageResult = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return null;
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      volume_batelada: data.volume_batelada,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: data.materiais_selecionados.map((m) => ({
        nome: m.nome,
        proporcao_pct: m.proporcao_pct,
      })),
      aditivos_ml: data.aditivos_ml,
    });
  }, [data]);

  const chartData = curveResults.map((r) => ({
    label: PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "",
    acumulado: Math.round(r.pct_acumulado * 10000) / 100,
    limiteMin: r.limite_min ? Math.round(r.limite_min * 10000) / 100 : undefined,
    limiteMax: r.limite_max ? Math.round(r.limite_max * 10000) / 100 : undefined,
  }));

  const handleExportPDF = () => {
    setGeneratingPdf(true);
    try {
      generateAnalysisPDF(data);
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
    <div className="space-y-4">
      {/* Approved banner */}
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-foreground mb-1">Análise Aprovada</h2>
          <p className="text-muted-foreground">
            {data.codigo} — {data.nome}
          </p>
          <Badge variant="outline" className="mt-2 bg-success/15 text-success border-success/30">
            Aprovado
          </Badge>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Curva Granulométrica Final</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis domain={[0, 100]} fontSize={10} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} name="Combinada" />
              {dna && (
                <>
                  <Line type="monotone" dataKey="limiteMin" stroke="hsl(var(--warning))" strokeDasharray="6 3" dot={false} name="Lim. Inferior" />
                  <Line type="monotone" dataKey="limiteMax" stroke="hsl(var(--warning))" strokeDasharray="6 3" dot={false} name="Lim. Superior" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Materials per batch */}
      {dosageResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Materiais por Batelada</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell>Cimento</TableCell>
                  <TableCell className="text-right">{dosageResult.consumo_cimento_kg} kg</TableCell>
                </TableRow>
                {dosageResult.materiais_batelada.map((m) => (
                  <TableRow key={m.nome}>
                    <TableCell>{m.nome}</TableCell>
                    <TableCell className="text-right">{m.kg} kg</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Água</TableCell>
                  <TableCell className="text-right">{dosageResult.agua_litros} L</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Technical summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{tipoLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Resistência</p>
              <p className="font-medium">{data.resistencia_prevista} MPa</p>
            </div>
            <div>
              <p className="text-muted-foreground">Traço</p>
              <p className="font-medium">{dosageResult?.traco_final ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Analista</p>
              <p className="font-medium">{analistaLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Button variant="outline" className="gap-2" onClick={handleExportPDF} disabled={generatingPdf}>
          {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Exportar PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowReleaseModal(true)}>
          <Factory className="h-4 w-4" />
          Liberar para Produção
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowTraceModal(true)}>
          <Bookmark className="h-4 w-4" />
          Salvar como Traço Padrão
        </Button>
        <Button onClick={() => navigate("/analyses")}>
          Voltar para Análises
        </Button>
      </div>

      {/* Modals */}
      <ReleaseProductionModal open={showReleaseModal} onOpenChange={setShowReleaseModal} data={data} />
      <SaveStandardTraceModal open={showTraceModal} onOpenChange={setShowTraceModal} data={data} />
    </div>
  );
}
