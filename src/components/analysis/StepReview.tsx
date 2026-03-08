import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { calcCombinedCurve, calcCurvaStatus, calcDosage } from "@/lib/granulometry-engine";
import {
  TIPOS_ANALISE,
  ANALISTAS,
  DNAS_PADRAO,
  PENEIRAS_PADRAO,
  type AnalysisFormData,
} from "@/lib/analysis-data";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

interface StepReviewProps {
  data: AnalysisFormData;
  onApprove: () => void;
}

export function StepReview({ data, onApprove }: StepReviewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const analistaLabel = ANALISTAS.find((a) => a.id === data.analista)?.nome ?? "—";
  const dna = DNAS_PADRAO.find((d) => d.id === data.dna_selecionado);

  const curveResults = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return [];
    return calcCombinedCurve(data.materiais_selecionados, dna?.limites);
  }, [data.materiais_selecionados, dna]);

  const curvaStatus = useMemo(() => calcCurvaStatus(curveResults), [curveResults]);

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
  }));

  const handleApprove = () => {
    setDialogOpen(false);
    toast.success("Análise aprovada com sucesso!", {
      description: `${data.codigo} — ${data.nome}`,
    });
    onApprove();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identification Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Código" value={data.codigo} />
            <Row label="Nome" value={data.nome} />
            <Row label="Tipo" value={tipoLabel} />
            <Row label="Produto" value={data.produto || "—"} />
            <Row label="Analista" value={analistaLabel} />
            <Row label="Data" value={data.data} />
            <Row label="Resistência" value={`${data.resistencia_prevista} MPa`} />
          </CardContent>
        </Card>

        {/* Granulometry Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Granulometria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="DNA" value={dna?.nome ?? "Não selecionado"} />
            <Row label="Materiais" value={`${data.materiais_selecionados.length}`} />
            <Row
              label="Status"
              value={
                <Badge
                  variant="outline"
                  className={
                    curvaStatus.status === "conforme"
                      ? "bg-success/15 text-success border-success/30"
                      : curvaStatus.status === "atencao"
                      ? "bg-warning/15 text-warning border-warning/30"
                      : "bg-destructive/15 text-destructive border-destructive/30"
                  }
                >
                  {curvaStatus.status === "conforme" ? "Conforme" : curvaStatus.status === "atencao" ? "Atenção" : "Não Conforme"}
                </Badge>
              }
            />
            <Row label="Compatibilidade" value={`${(curvaStatus.indice_compatibilidade * 100).toFixed(0)}%`} />
            <Row label="Peneiras fora" value={`${curvaStatus.peneiras_fora}`} />
          </CardContent>
        </Card>

        {/* Dosage Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Dosagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Traço" value={dosageResult?.traco_final ?? "—"} />
            <Row label="Cimento" value={dosageResult ? `${dosageResult.consumo_cimento_kg} kg` : "—"} />
            <Row label="Água" value={dosageResult ? `${dosageResult.agua_litros} L` : "—"} />
            <Row label="Massa Total" value={dosageResult ? `${dosageResult.massa_total_kg} kg` : "—"} />
            <Row label="Relação A/C" value={`${data.relacao_ac}`} />
            <Row label="Vol. Batelada" value={`${data.volume_batelada} L`} />
          </CardContent>
        </Card>
      </div>

      {/* Mini chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Curva Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={9} />
                <YAxis domain={[0, 100]} fontSize={9} />
                <Line type="monotone" dataKey="acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Approve button */}
      <div className="flex justify-center pt-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Aprovar Análise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Aprovação</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja aprovar a análise <strong>{data.codigo}</strong> — {data.nome}?
                Essa ação irá gerar notificações e disparar webhooks configurados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleApprove}>Confirmar Aprovação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
