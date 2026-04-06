import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Save, Flag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRuptures, useScheduleDetail } from "@/hooks/api/useRuptures";
import { useProfiles } from "@/hooks/api/useProfiles";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import { calcTensao, calcRuptureStats, AREAS_PADRAO } from "@/lib/granulometry-engine";
import { cn } from "@/lib/utils";

interface SampleInput {
  forca_kn: string;
}

const TIPOS_AMOSTRA = ["bloco", "paver", "cp"] as const;
type TipoAmostra = typeof TIPOS_AMOSTRA[number];

const tipoLabel: Record<TipoAmostra, string> = {
  bloco: "Bloco Estrutural",
  paver: "Paver",
  cp: "Corpo de Prova (CP)",
};

const RuptureDetailPage = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { profiles } = useProfiles();
  const { completeRupture, isCompleting, finalizeWithCurrentTest, isFinalizing } = useRuptures();
  const { data: scheduleData, isLoading } = useScheduleDetail(scheduleId);

  const found = useMemo(() => {
    if (!scheduleData) return null;
    return {
      batch: scheduleData.batch,
      schedule: scheduleData,
      analysis: (scheduleData.batch as any)?.analyses
    };
  }, [scheduleData]);

  const [dataReal, setDataReal] = useState(new Date().toISOString().split("T")[0]);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeMotivo, setFinalizeMotivo] = useState("");

  // 3 samples per test type
  const [samples, setSamples] = useState<Record<TipoAmostra, SampleInput[]>>({
    bloco: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
    paver: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
    cp: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
  });

  const [areas, setAreas] = useState<Record<TipoAmostra, number>>({
    bloco: AREAS_PADRAO.bloco_14,
    paver: AREAS_PADRAO.paver,
    cp: AREAS_PADRAO.cp_10x20,
  });

  // Pre-load data if available
  useEffect(() => {
    if (found?.schedule?.status === "concluido") {
      const s = found.schedule;
      if (s.data_executada) setDataReal(s.data_executada);
      if (s.responsavel_id) setResponsavel(s.responsavel_id);
      if (s.observacoes) setObservacoes(s.observacoes);
      if (s.amostras) setSamples(s.amostras as any);
      if (s.geometrias) setAreas(s.geometrias as any);
    }
  }, [found?.schedule]);

  const updateSample = useCallback((tipo: TipoAmostra, index: number, value: string) => {
    setSamples((prev) => ({
      ...prev,
      [tipo]: prev[tipo].map((s, i) => (i === index ? { forca_kn: value } : s)),
    }));
  }, []);

  const { settings } = useTechnicalSettings();

  // Calculate stats per test type in real-time
  const statsPerTipo = useMemo(() => {
    const meta = found?.analysis?.resistencia_prevista ?? 0;
    const result: Record<TipoAmostra, ReturnType<typeof calcRuptureStats> | null> = {
      bloco: null,
      paver: null,
      cp: null,
    };

    // Usar parâmetros técnicos do banco ou fallbacks do motor
    const divisorA = settings?.formula_tensao_a;
    const divisorB = settings?.formula_tensao_b;

    for (const tipo of TIPOS_AMOSTRA) {
      const forcas = samples[tipo]
        .map((s) => parseFloat(s.forca_kn))
        .filter((f) => !isNaN(f) && f > 0);
      if (forcas.length > 0) {
        result[tipo] = calcRuptureStats(
          forcas, 
          meta, 
          areas[tipo] || divisorA, // Usa área específica ou fallback do divisor A
          divisorB
        );
      }
    }
    return result;
  }, [samples, found, areas, settings]);

  if (!found) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/ruptures")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Rompimento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { batch, schedule, analysis } = found;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleFinalize = async () => {
    if (!finalizeMotivo.trim()) {
      toast.error("Informe o motivo técnico da finalização");
      return;
    }
    if (!responsavel) {
      toast.error("Selecione o responsável pelo ensaio");
      return;
    }

    const tipoComAmostra = TIPOS_AMOSTRA.find((tipo) =>
      samples[tipo].some((s) => s.forca_kn && parseFloat(s.forca_kn) > 0)
    );
    if (!tipoComAmostra) {
      toast.error("Informe ao menos uma amostra com força (kN)");
      return;
    }

    const testStats = statsPerTipo[tipoComAmostra];
    if (!testStats) return;

    const batchId = (found?.batch as any)?.id;
    if (!batchId) { toast.error("Lote não identificado"); return; }

    try {
      await finalizeWithCurrentTest({
        scheduleId: scheduleId!,
        batchId,
        dataExecutada: dataReal,
        motivo: finalizeMotivo,
        testData: {
          tipo_amostra: tipoComAmostra,
          meta_mpa: found?.analysis?.resistencia_prevista ?? 0,
          media_mpa: testStats.media,
          min_mpa: testStats.minimo,
          max_mpa: testStats.maximo,
          desvio_padrao: testStats.desvio_padrao,
          status: testStats.status,
          notas: observacoes,
          samples: samples[tipoComAmostra].map((s, idx) => ({
            numero: idx + 1,
            forca_kn: parseFloat(s.forca_kn),
            tensao_mpa: calcTensao(parseFloat(s.forca_kn), areas[tipoComAmostra]),
            status: "concluido"
          }))
        }
      });

      toast.success("Análise finalizada com sucesso!", {
        description: `${found?.batch.batch_code} — ${found?.schedule.idade_dias} dias — Demais ensaios ignorados`,
      });
      setFinalizeModalOpen(false);
      navigate("/ruptures");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar análise");
    }
  };

  const handleSave = async () => {
    if (!responsavel) {
      toast.error("Selecione o responsável pelo ensaio");
      return;
    }

    const tipoComAmostra = TIPOS_AMOSTRA.find((tipo) =>
      samples[tipo].some((s) => s.forca_kn && parseFloat(s.forca_kn) > 0)
    );

    if (!tipoComAmostra) {
      toast.error("Informe ao menos uma amostra com força (kN)");
      return;
    }

    const testStats = statsPerTipo[tipoComAmostra];
    if (!testStats) return;

    try {
      await completeRupture({
        scheduleId: scheduleId!,
        dataExecutada: dataReal,
        testData: {
          tipo_amostra: tipoComAmostra,
          meta_mpa: found?.analysis?.resistencia_prevista ?? 0,
          media_mpa: testStats.media,
          min_mpa: testStats.minimo,
          max_mpa: testStats.maximo,
          desvio_padrao: testStats.desvio_padrao,
          status: testStats.status,
          notas: observacoes,
          samples: samples[tipoComAmostra].map((s, idx) => ({
            numero: idx + 1,
            forca_kn: parseFloat(s.forca_kn),
            tensao_mpa: calcTensao(parseFloat(s.forca_kn), areas[tipoComAmostra]),
            status: "concluido"
          }))
        }
      });

      toast.success("Ensaio de rompimento salvo!", {
        description: `${found?.batch.batch_code} — ${found?.schedule.idade_dias} dias`,
      });
      navigate("/ruptures");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar rompimento");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" onClick={() => navigate("/ruptures")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar aos Rompimentos
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Lançamento de Rompimento — {schedule.idade_dias} dias
          </h1>
          <p className="text-sm text-muted-foreground">
            {batch.batch_code} · {analysis?.nome ?? "—"}
          </p>
        </div>
      </div>

      {/* Cabeçalho read-only (PRD) */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Lote</p>
              <p className="font-mono font-medium">{batch.batch_code}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Análise</p>
              <p className="font-medium">{analysis?.codigo ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Produto</p>
              <p className="font-medium">{analysis?.nome ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data Produção</p>
              <p className="font-medium">{formatDate(batch.produced_at.split("T")[0])}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Idade</p>
              <Badge variant="outline">{schedule.idade_dias} dias</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Data Prevista</p>
              <p className="font-medium">{formatDate(schedule.data_prevista)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={schedule.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Meta</p>
              <p className="font-medium">≥ {analysis?.resistencia_prevista ?? "—"} MPa</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data real + Responsável */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data Real do Ensaio</Label>
          <Input type="date" value={dataReal} onChange={(e) => setDataReal(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Responsável *</Label>
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o responsável" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blocos de amostras por tipo (PRD: bloco, paver, cp) */}
      {TIPOS_AMOSTRA.map((tipo) => {
        const stats = statsPerTipo[tipo];
        return (
          <Card key={tipo} className="shadow-sm border-l-4 border-l-primary/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{tipoLabel[tipo]}</CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Ensaios Técnicos
                </p>
              </div>
              <div className="flex items-center gap-3">
                {tipo === "bloco" && (
                  <Select 
                    value={areas.bloco.toString()} 
                    onValueChange={(v) => setAreas(s => ({ ...s, bloco: parseFloat(v) }))}
                  >
                    <SelectTrigger className="h-8 text-xs w-[130px]">
                      <SelectValue placeholder="Geometria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AREAS_PADRAO.bloco_14.toString()}>Bloco de 14 cm</SelectItem>
                      <SelectItem value={AREAS_PADRAO.bloco_19.toString()}>Bloco de 19 cm</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {analysis && (
                  <Badge variant="secondary" className="font-bold">
                    Meta ≥ {analysis.resistencia_prevista} MPa
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {samples[tipo].map((sample, i) => {
                  const forca = parseFloat(sample.forca_kn);
                  const tensao = !isNaN(forca) && forca > 0 ? calcTensao(forca, areas[tipo]) : null;
                  return (
                    <div key={i} className="relative group">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase absolute -top-2 left-2 bg-background px-1 z-10">
                        Amostra {i + 1}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="h-10 font-bold focus-visible:ring-primary/30"
                          value={sample.forca_kn === "0" ? "" : sample.forca_kn}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateSample(tipo, i, e.target.value)}
                        />
                        <span className="text-[10px] font-black text-muted-foreground mr-2">kN</span>
                      </div>
                      {tensao !== null && (
                        <p className="text-[11px] mt-1 flex justify-between px-1">
                          <span className="text-muted-foreground">Resistência:</span>
                          <span className="font-bold text-primary">{tensao.toFixed(2)} MPa</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stats calculados em tempo real */}
              {stats && (
                <div className="pt-2">
                  <Separator className="mb-4 opacity-50" />
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Média (MPa)</p>
                      <p className="text-lg font-black text-primary leading-tight">{stats.media.toFixed(2)}</p>
                    </div>
                    
                    <div className="hidden sm:block">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Coef. Var. (CV)</p>
                      <p className={cn(
                        "text-sm font-bold leading-tight",
                        stats.coeficiente_variacao > 15 ? "text-destructive" : stats.coeficiente_variacao > 10 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {stats.coeficiente_variacao.toFixed(1)}%
                      </p>
                    </div>

                    <div className="text-center sm:text-left">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Mín / Máx</p>
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {stats.minimo.toFixed(1)} / {stats.maximo.toFixed(1)}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Desvio Padrão</p>
                      <p className="text-xs font-semibold text-foreground leading-tight">{stats.desvio_padrao.toFixed(2)}</p>
                    </div>

                    <div className="flex justify-end">
                      {stats.status === "conforme" ? (
                        <Badge className="bg-green-600/10 hover:bg-green-600/20 text-green-700 border-green-200/50 gap-1 px-3 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> CONFORME
                        </Badge>
                      ) : stats.status === "nao_conforme" ? (
                        <Badge className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 gap-1 px-3 py-1">
                          <XCircle className="h-3.5 w-3.5" /> AGUARDAR
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="px-3 py-1">Registro</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Observações */}
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Textarea
          placeholder="Registre observações sobre o ensaio..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/ruptures")} disabled={isCompleting || isFinalizing}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isCompleting || isFinalizing} className="gap-2">
          <Save className="h-4 w-4" />
          {isCompleting ? "Salvando..." : "Salvar Ensaio"}
        </Button>
        <Button
          onClick={() => setFinalizeModalOpen(true)}
          disabled={isCompleting || isFinalizing}
          variant="outline"
          className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"
        >
          <Flag className="h-4 w-4" />
          Finalizar Análise Aqui
        </Button>
      </div>

      {/* Modal Finalização Antecipada */}
      <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Flag className="h-5 w-5" /> Finalizar Análise com Este Ensaio
            </DialogTitle>
            <DialogDescription>
              Os ensaios futuros deste lote serão ignorados e o ciclo será encerrado com os resultados do {found?.schedule.idade_dias}º dia.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3 mt-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold">Ação irreversível</p>
              <p className="mt-1 leading-snug">
                Os ensaios seguintes serão marcados como <strong>ignorados</strong> e este lote constará como <strong>liberado antecipadamente</strong> em todos os relatórios.
              </p>
            </div>
          </div>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Lote</p>
                <p className="font-black">{found?.batch.batch_code}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ensaio Atual</p>
                <p className="font-bold">{found?.schedule.idade_dias} dias</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo Técnico da Finalização *</Label>
              <Textarea
                placeholder="Ex: Resultado do 3º dia ultrapassou 110% do fck previsto. Aprovado tecnicamente para finalizar o ciclo."
                value={finalizeMotivo}
                onChange={(e) => setFinalizeMotivo(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeModalOpen(false)} disabled={isFinalizing}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleFinalize}
              disabled={isFinalizing}
            >
              {isFinalizing ? "Finalizando..." : "Confirmar Finalização"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RuptureDetailPage;
