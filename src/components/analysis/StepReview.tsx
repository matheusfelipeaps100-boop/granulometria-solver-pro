import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Info } from "lucide-react";
import { calcCombinedCurve, calcCurvaStatus, calcDosage, calcVolumeBateladaAbsoluto } from "@/lib/granulometry-engine";
import {
  TIPOS_ANALISE,
  ANALISTAS,
  PENEIRAS_PADRAO,
  getLimitesPadrao,
  type AnalysisFormData,
} from "@/lib/analysis-data";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StepReviewProps {
  data: AnalysisFormData;
  onApprove: () => void;
  onChange?: (updates: Partial<AnalysisFormData>) => void;
  readOnly?: boolean;
}

function ProportionBar({ label, kg, totalKg }: { label: string; kg: number; totalKg: number }) {
  const pct = totalKg > 0 ? (kg / totalKg) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground/80">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-muted-foreground">{kg.toFixed(0)} kg</span>
          <span className="font-black">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StepReview({ data, onApprove, onChange, readOnly = false }: StepReviewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { curves: dbCurves } = useStandardCurves();

  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const dna = useMemo(() => {
    const curve =
      dbCurves.find((c) => c.id === data.dna_selecionado) ??
      dbCurves.find((c) => c.tipo_produto === data.tipo_analise && c.standard_curve_items?.length) ??
      dbCurves[0];
    if (!curve) return undefined;
    return {
      id: curve.id,
      nome: curve.nome,
      limites: (curve.standard_curve_items ?? []).map((item) => ({
        sieve_id: item.sieve_id,
        limite_min: item.limite_min,
        limite_max: item.limite_max,
      })),
    };
  }, [dbCurves, data.dna_selecionado, data.tipo_analise]);

  const limites = dna?.limites?.length ? dna.limites : getLimitesPadrao(data.tipo_analise);

  const curveResults = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return [];
    return calcCombinedCurve(data.materiais_selecionados, limites);
  }, [data.materiais_selecionados, limites]);

  const curvaStatus = useMemo(() => calcCurvaStatus(curveResults), [curveResults]);

  const totalKgMateriais = useMemo(
    () => data.materiais_selecionados.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0),
    [data.materiais_selecionados]
  );

  const dosageResult = useMemo(() => {
    if (data.materiais_selecionados.length === 0) return null;
    const proporcoes = data.materiais_selecionados.map((m) => ({
      nome: m.nome,
      proporcao_kg: m.proporcao_kg ?? 0,
      proporcao_pct: totalKgMateriais > 0 ? (m.proporcao_kg ?? 0) / totalKgMateriais : 0,
      densidade: m.densidade,
    }));
    const { volume_batelada_m3, consumo_equiv_m3 } = calcVolumeBateladaAbsoluto(
      data.consumo_alvo_m3,
      data.relacao_ac,
      data.densidade_cimento,
      proporcoes
    );
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      consumo_alvo_m3: consumo_equiv_m3,
      volume_m3: volume_batelada_m3,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: proporcoes,
      aditivos_ml: data.aditivos_ml,
    });
  }, [data, totalKgMateriais]);

  const chartData = curveResults.map((r) => ({
    label: PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "",
    acumulado: Math.round(r.pct_acumulado * 10000) / 100,
  }));

  const statusConfig = {
    conforme: { label: "CONFORME", className: "bg-success/15 text-success border-success/30" },
    atencao: { label: "ATENÇÃO", className: "bg-warning/15 text-warning border-warning/30" },
    nao_conforme: { label: "FORA DA FAIXA", className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const statusInfo = statusConfig[curvaStatus.status];

  const handleApprove = () => {
    setDialogOpen(false);
    toast.success("Análise aprovada com sucesso!", {
      description: `${data.codigo} — ${data.nome}`,
    });
    onApprove();
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Cabeçalho da etapa */}
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-xl font-black text-foreground tracking-tight">REVISÃO FINAL</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Etapa 4 de 5 — Complete todos os campos obrigatórios
        </p>
      </div>

      {/* Cabeçalho do resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-lg bg-muted/30 border px-4 py-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tipo de Análise</p>
          <p className="text-base font-black mt-0.5">{tipoLabel.toUpperCase()} {data.produto_nome ? `— ${data.produto_nome}` : "(TODOS LAYFS)"}</p>
        </div>
        <div className="rounded-lg bg-muted/30 border px-4 py-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Analista</p>
          <p className="text-sm font-bold mt-0.5">{data.analista || "Operador Industrial"}</p>
          <p className="text-[10px] text-muted-foreground">{data.codigo}</p>
        </div>
      </div>

      {/* Grid principal: Granulometria + Dosagem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Retorno Granulométrico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              RETORNO GRANULOMÉTRICO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.materiais_selecionados.length > 0 ? (
              <>
                <div className="space-y-3">
                  {data.materiais_selecionados.map((m) => (
                    <ProportionBar
                      key={m.material_id}
                      label={m.nome}
                      kg={m.proporcao_kg ?? 0}
                      totalKg={totalKgMateriais}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status na Curva</span>
                  <Badge variant="outline" className={cn("text-[10px] font-bold", statusInfo.className)}>
                    {curvaStatus.status === "conforme" ? "OTIMIZADO" : curvaStatus.status === "atencao" ? "OTIMIZANDO" : "FORA DA FAIXA"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Compatibilidade</span>
                  <span className="font-bold">{(curvaStatus.indice_compatibilidade * 100).toFixed(0)}%</span>
                </div>

                {dna && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">DNA Selecionado</span>
                    <span className="font-medium truncate max-w-[140px]">{dna.nome}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum material adicionado na Etapa 2
              </p>
            )}
          </CardContent>
        </Card>

        {/* Parâmetros de Dosagem */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              PARÂMETROS DE DOSAGEM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Traço</p>
                <p className="text-xl font-black mt-1">{dosageResult?.traco_final ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Rel. A/C</p>
                <p className="text-xl font-black mt-1">{data.relacao_ac.toFixed(2)}</p>
              </div>
            </div>

            <div className={cn(
              "rounded-lg border-2 p-3 text-center",
              "border-primary/30 bg-primary/5"
            )}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                CIMENTO POR BATELADA
              </p>
              <p className="text-2xl font-black text-primary mt-0.5">
                {data.consumo_alvo_m3.toFixed(0)}
                <span className="text-sm font-medium text-muted-foreground ml-1">kg</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ≈ {dosageResult?.consumo_cimento_m3.toFixed(0) ?? "—"} kg/m³ (equiv.)
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Massa Total (Bat.)</span>
                <span className="font-bold">{dosageResult?.massa_total_batelada.toFixed(1) ?? "—"} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Água (Bat.)</span>
                <span className="font-bold">{dosageResult?.agua_batelada.toFixed(1) ?? "—"} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vol. Batelada</span>
                <span className="font-bold">{dosageResult ? (dosageResult.massa_total_batelada / (dosageResult.densidade_efetiva * 1000)).toFixed(3) : "—"} m³</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mini gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              CURVA RESUMO
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={8} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} fontSize={8} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Observações finais */}
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-warning" />
            <CardTitle className="text-xs font-black uppercase tracking-wider text-warning">
              REVISÃO FINAL
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Ao avançar, todos os dados acima serão confirmados, as proporções e os cálculos ficarão vinculados a essa análise.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Observações Finais
            </Label>
            <Textarea
              value={data.observacoes || ""}
              onChange={(e) => onChange?.({ observacoes: e.target.value })}
              placeholder="Notas finais, ressalvas ou observações sobre a análise..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão de aprovação */}
      {!readOnly && (
        <div className="flex justify-center pt-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 px-8 font-bold text-base">
                <CheckCircle2 className="h-5 w-5" />
                APROVAR ANÁLISE
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
      )}
    </div>
  );
}




