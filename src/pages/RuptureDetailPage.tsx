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
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Save, Flag, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRuptures, useScheduleDetail } from "@/hooks/api/useRuptures";
import { useProfiles } from "@/hooks/api/useProfiles";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import { calcTensao, calcRuptureStats, AREAS_PADRAO, calcTensaoPaver, calcRuptureStatsPaver, calcTensaoLaje, calcRuptureStatsLaje, getMetaForAge } from "@/lib/granulometry-engine";

import { cn } from "@/lib/utils";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

interface SampleInput {
  forca_kn: string;
  peso_kg?: string;
}

const TIPOS_AMOSTRA = ["bloco", "paver", "cp", "laje"] as const;
type TipoAmostra = typeof TIPOS_AMOSTRA[number];

const tipoLabel: Record<TipoAmostra, string> = {
  bloco: "Bloco Estrutural",
  paver: "Paver",
  cp: "Corpo de Prova (CP)",
  laje: "Laje",
};

function normalizeTipoAmostra(tipo: string | null | undefined): TipoAmostra | null {
  if (tipo === "bloco_estrutural" || tipo === "bloco_vedacao") return "bloco";
  if (tipo === "paver") return "paver";
  // Ainda não fazemos ensaio de rompimento específico para Laje — tratar como Corpo de Prova (CP)
  if (tipo === "cp" || tipo === "laje") return "cp";
  return null;
}

const RuptureDetailPage = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { profiles } = useProfiles();
  const { completeRupture, isCompleting, finalizeWithCurrentTest, isFinalizing, updateRupture, isUpdating } = useRuptures();
  const { data: scheduleData, isLoading } = useScheduleDetail(scheduleId);

  const found = useMemo(() => {
    if (!scheduleData) return null;
    return {
      batch: scheduleData.batch,
      schedule: scheduleData,
      analysis: (scheduleData.batch as any)?.analyses
    };
  }, [scheduleData]);

  const tiposVisiveis = useMemo<TipoAmostra[]>(() => {
    const norm = normalizeTipoAmostra(found?.analysis?.tipo);
    return norm ? [norm] : [...TIPOS_AMOSTRA];
  }, [found]);

  const [dataReal, setDataReal] = useState(new Date().toISOString().split("T")[0]);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeMotivo, setFinalizeMotivo] = useState("");

  // 3 samples per test type
  const [samples, setSamples] = useState<Record<TipoAmostra, SampleInput[]>>({
    bloco: [
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" }
    ],
    paver: [
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" }
    ],
    cp: [
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" }
    ],
    laje: [
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" },
      { forca_kn: "", peso_kg: "" }
    ],
  });

  const [areas, setAreas] = useState<Record<TipoAmostra, number>>({
    bloco: AREAS_PADRAO.bloco_14,
    paver: AREAS_PADRAO.paver,
    cp: AREAS_PADRAO.cp_10x20,
    laje: AREAS_PADRAO.custom,
  });

  // Pre-load data if available
  useEffect(() => {
    if (found?.schedule?.status === "concluido") {
      const s = found.schedule as any;
      if (s.data_executada) setDataReal(s.data_executada);
      if (s.responsavel_id) setResponsavel(s.responsavel_id);

      const tests: any[] = s.tests ?? [];
      if (tests[0]?.notas) setObservacoes(tests[0].notas);
      if (tests.length > 0) {
        setSamples((prev) => {
          const next = { ...prev };
          for (const test of tests) {
            const tipo = test.tipo_amostra as TipoAmostra;
            if (!TIPOS_AMOSTRA.includes(tipo)) continue;
            const sorted = [...(test.samples ?? [])].sort((a: any, b: any) => a.numero - b.numero);
            const loaded = sorted.map((sample: any) => ({
              forca_kn: sample.forca_kn != null ? String(sample.forca_kn) : "",
              peso_kg: sample.peso_kg != null ? String(sample.peso_kg) : "",
            }));
            while (loaded.length < 3) loaded.push({ forca_kn: "", peso_kg: "" });
            next[tipo] = loaded;
          }
          return next;
        });
      }

      if (s.geometrias) setAreas(s.geometrias as any);
    }
  }, [found?.schedule]);

  const updateSample = useCallback((tipo: TipoAmostra, index: number, field: keyof SampleInput, value: string) => {
    setSamples((prev) => ({
      ...prev,
      [tipo]: prev[tipo].map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  }, []);

  const { settings } = useTechnicalSettings();

  const calcTensaoPorTipo = useCallback((tipo: TipoAmostra, forca_kn: number) => {
    if (tipo === "paver" && settings?.formula_tensao_paver) {
      return calcTensaoPaver(forca_kn, settings.formula_tensao_paver, areas[tipo], settings?.formula_tensao_b);
    }
    if (tipo === "laje") {
      return calcTensaoLaje(forca_kn, settings?.formula_tensao_laje, settings?.formula_tensao_laje_mult);
    }
    return calcTensao(forca_kn, areas[tipo], settings?.formula_tensao_b);
  }, [areas, settings]);

  // Coletar pares (peso, resistência) para todas as amostras válidas
  const scatterData = useMemo(() => {
    const data: { tipo: string; peso: number; resistencia: number }[] = [];
    for (const tipo of tiposVisiveis) {
      samples[tipo].forEach((s) => {
        const peso = parseFloat(s.peso_kg || "");
        const forca = parseFloat(s.forca_kn || "");
        if (!isNaN(peso) && peso > 0 && !isNaN(forca) && forca > 0) {
          // Calcular resistência (MPa)
          const resistencia = calcTensaoPorTipo(tipo, forca);
          data.push({ tipo, peso, resistencia });
        }
      });
    }
    return data;
  }, [samples, calcTensaoPorTipo, tiposVisiveis]);

  // Dados para gráfico Peso × Tempo de Ciclo
  // Supondo que cada schedule tem um idade_dias e samples preenchidas
  // Aqui, para a página de detalhe, só temos o ciclo atual, então mostramos os pesos das amostras deste ciclo
  // Para múltiplos ciclos, seria necessário buscar dados históricos
  const pesoPorCiclo = useMemo(() => {
    // Se houver batch ou schedule com histórico, pode-se adaptar para múltiplos ciclos
    // Aqui, apenas o ciclo atual
    const idade = found?.schedule?.idade_dias;
    const pesos: number[] = [];
    for (const tipo of TIPOS_AMOSTRA) {
      samples[tipo].forEach((s) => {
        const peso = parseFloat(s.peso_kg || "");
        if (!isNaN(peso) && peso > 0) pesos.push(peso);
      });
    }
    return idade ? [{ ciclo: idade, peso_medio: pesos.length ? (pesos.reduce((a, b) => a + b, 0) / pesos.length) : 0 }] : [];
  }, [samples, found]);

  // Calcular correlação de Pearson entre peso e resistência
  const pearsonCorrelation = useMemo(() => {
    if (scatterData.length < 2) return null;
    const pesos = scatterData.map((d) => d.peso);
    const resistencias = scatterData.map((d) => d.resistencia);
    const meanPeso = pesos.reduce((a, b) => a + b, 0) / pesos.length;
    const meanRes = resistencias.reduce((a, b) => a + b, 0) / resistencias.length;
    const num = pesos.reduce((sum, p, i) => sum + (p - meanPeso) * (resistencias[i] - meanRes), 0);
    const denPeso = Math.sqrt(pesos.reduce((sum, p) => sum + Math.pow(p - meanPeso, 2), 0));
    const denRes = Math.sqrt(resistencias.reduce((sum, r) => sum + Math.pow(r - meanRes, 2), 0));
    const corr = denPeso && denRes ? num / (denPeso * denRes) : null;
    return corr;
  }, [scatterData]);

  // Calculate stats per test type in real-time
  const statsPerTipo = useMemo(() => {
    const metaFinal = found?.analysis?.resistencia_prevista ?? 0;
    const idadeDias = found?.schedule?.idade_dias ?? 0;
    const result: Record<TipoAmostra, ReturnType<typeof calcRuptureStats> | null> = {
      bloco: null,
      paver: null,
      cp: null,
      laje: null,
    };

    // Usar parâmetros técnicos do banco ou fallbacks do motor
    const divisorA = settings?.formula_tensao_a;
    const divisorB = settings?.formula_tensao_b;
    const multiplicadorPaver = settings?.formula_tensao_paver;
    const divisorLaje = settings?.formula_tensao_laje;
    const multiplicadorLaje = settings?.formula_tensao_laje_mult;

    for (const tipo of tiposVisiveis) {
      const meta = getMetaForAge(tipo, idadeDias, settings, metaFinal);
      const forcas = samples[tipo]
        .map((s) => parseFloat(s.forca_kn))
        .filter((f) => !isNaN(f) && f > 0);
      if (forcas.length > 0) {
        if (tipo === "paver" && multiplicadorPaver) {
          // Para paver, usar a fórmula especial: Tensão × multiplicador
          result[tipo] = calcRuptureStatsPaver(
            forcas,
            meta,
            multiplicadorPaver,
            areas[tipo] || AREAS_PADRAO.paver,
            divisorB
          );
        } else if (tipo === "laje") {
          // Para laje, usar a fórmula especial: (TF ÷ divisor) × multiplicador
          result[tipo] = calcRuptureStatsLaje(forcas, meta, divisorLaje, multiplicadorLaje);
        } else {
          // Para bloco e cp, usar a fórmula padrão: Força ÷ divisor_a ÷ divisor_b
          result[tipo] = calcRuptureStats(
            forcas,
            meta,
            areas[tipo] || divisorA, // Usa área específica ou fallback do divisor A
            divisorB
          );
        }
      }
    }
    return result;
  }, [samples, found, areas, settings, tiposVisiveis]);

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

  const isAdmin = profile?.role === "ADMIN";
  const isViewOnlyRole = profile?.role === "VENDAS" || profile?.role === "GERENTE" || profile?.role === "PRODUCAO";
  const isConcluido =
    schedule.status === 'concluido' ||
    (batch as any).status === 'liberado_antecipado';
  const isReadOnly =
    isViewOnlyRole ||
    schedule.status === 'ignorado' ||
    (isConcluido && !isAdmin);

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

    const tipoComAmostra = tiposVisiveis.find((tipo) =>
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
          meta_mpa: getMetaForAge(tipoComAmostra, found?.schedule?.idade_dias ?? 0, settings, found?.analysis?.resistencia_prevista ?? 0),
          media_mpa: testStats.media,
          min_mpa: testStats.minimo,
          max_mpa: testStats.maximo,
          desvio_padrao: testStats.desvio_padrao,
          status: testStats.status,
          notas: observacoes,
          samples: samples[tipoComAmostra].map((s, idx) => ({
            numero: idx + 1,
            forca_kn: parseFloat(s.forca_kn),
            peso_kg: s.peso_kg ? parseFloat(s.peso_kg) : undefined,
            tensao_mpa: calcTensaoPorTipo(tipoComAmostra, parseFloat(s.forca_kn)),
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

    const tipoComAmostra = tiposVisiveis.find((tipo) =>
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
          meta_mpa: getMetaForAge(tipoComAmostra, found?.schedule?.idade_dias ?? 0, settings, found?.analysis?.resistencia_prevista ?? 0),
          media_mpa: testStats.media,
          min_mpa: testStats.minimo,
          max_mpa: testStats.maximo,
          desvio_padrao: testStats.desvio_padrao,
          status: testStats.status,
          notas: observacoes,
          samples: samples[tipoComAmostra].map((s, idx) => ({
            numero: idx + 1,
            forca_kn: parseFloat(s.forca_kn),
            peso_kg: s.peso_kg ? parseFloat(s.peso_kg) : undefined,
            tensao_mpa: calcTensaoPorTipo(tipoComAmostra, parseFloat(s.forca_kn)),
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

  const handleUpdate = async () => {
    const tipoComAmostra = tiposVisiveis.find((tipo) =>
      samples[tipo].some((s) => s.forca_kn && parseFloat(s.forca_kn) > 0)
    );
    if (!tipoComAmostra) {
      toast.error("Informe ao menos uma amostra com força (kN)");
      return;
    }
    const testStats = statsPerTipo[tipoComAmostra];
    if (!testStats) return;
    try {
      await updateRupture({
        scheduleId: scheduleId!,
        dataExecutada: dataReal,
        observacoes,
        testData: {
          tipo_amostra: tipoComAmostra,
          meta_mpa: getMetaForAge(tipoComAmostra, found?.schedule?.idade_dias ?? 0, settings, found?.analysis?.resistencia_prevista ?? 0),
          media_mpa: testStats.media,
          min_mpa: testStats.minimo,
          max_mpa: testStats.maximo,
          desvio_padrao: testStats.desvio_padrao,
          status: testStats.status,
          notas: observacoes,
          samples: samples[tipoComAmostra].map((s, idx) => ({
            numero: idx + 1,
            forca_kn: parseFloat(s.forca_kn),
            peso_kg: s.peso_kg ? parseFloat(s.peso_kg) : null,
            tensao_mpa: calcTensaoPorTipo(tipoComAmostra, parseFloat(s.forca_kn)),
            status: "concluido"
          }))
        }
      });
      toast.success("Ensaio atualizado com sucesso!", {
        description: `${found?.batch.batch_code} — ${found?.schedule.idade_dias} dias`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar rompimento");
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
            {isReadOnly ? "Visualização de Rompimento" : isAdmin && isConcluido ? "Edição de Rompimento" : "Lançamento de Rompimento"} — {schedule.idade_dias} dias
          </h1>
          <p className="text-sm text-muted-foreground">
            {batch.batch_code} · {analysis?.produto ?? analysis?.nome ?? "—"}
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
              <p className="font-medium">{analysis?.produto ?? analysis?.nome ?? "—"}</p>
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

      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0" /> Modo somente visualização — este ensaio já foi registrado e não pode ser alterado.
        </div>
      )}

      {/* Data real + Responsável */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data Real do Ensaio</Label>
          <Input type="date" value={dataReal} onChange={(e) => setDataReal(e.target.value)} disabled={isReadOnly} />
        </div>
        <div className="space-y-2">
          <Label>Responsável *</Label>
          <Select value={responsavel} onValueChange={setResponsavel} disabled={isReadOnly}>
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
      {tiposVisiveis.map((tipo) => {
        const stats = statsPerTipo[tipo];
        const cardTitle = tipo === "bloco" && found?.analysis?.tipo === "bloco_vedacao"
          ? "Bloco de Vedação"
          : tipoLabel[tipo];
        return (
          <Card key={tipo} className="shadow-sm border-l-4 border-l-primary/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{cardTitle}</CardTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Ensaios Técnicos
                </p>
              </div>
              <div className="flex items-center gap-3">
                {tipo === "bloco" && (
                  <Select
                    value={areas.bloco.toString()}
                    onValueChange={(v) => setAreas(s => ({ ...s, bloco: parseFloat(v) }))}
                    disabled={isReadOnly}
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
                  const tensao = !isNaN(forca) && forca > 0
                    ? calcTensaoPorTipo(tipo, forca)
                    : null;
                  return (
                    <div key={i} className="relative group">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase absolute -top-2 left-2 bg-background px-1 z-10">
                        Amostra {i + 1}
                      </Label>
                      {isReadOnly ? (
                        <>
                          <div className="flex items-center gap-2 mb-1 border rounded-md px-3 h-10">
                            <p className="font-bold text-foreground text-base flex-1">
                              {sample.forca_kn && sample.forca_kn !== "0" ? sample.forca_kn : <span className="text-muted-foreground">—</span>}
                            </p>
                            <span className="text-[10px] font-black text-muted-foreground">kN</span>
                          </div>
                          <div className="flex items-center gap-2 border rounded-md px-3 h-10">
                            <p className="font-bold text-foreground text-base flex-1">
                              {sample.peso_kg && sample.peso_kg !== "0" ? sample.peso_kg : <span className="text-muted-foreground">—</span>}
                            </p>
                            <span className="text-[10px] font-black text-muted-foreground">kg</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Força (kN)"
                              className="h-10 font-bold focus-visible:ring-primary/30"
                              value={sample.forca_kn === "0" ? "" : sample.forca_kn}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateSample(tipo, i, "forca_kn", e.target.value)}
                            />
                            <span className="text-[10px] font-black text-muted-foreground mr-2">kN</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Peso (kg)"
                              className="h-10 font-bold focus-visible:ring-primary/30"
                              value={sample.peso_kg === "0" ? "" : sample.peso_kg}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateSample(tipo, i, "peso_kg", e.target.value)}
                            />
                            <span className="text-[10px] font-black text-muted-foreground mr-2">kg</span>
                          </div>
                        </>
                      )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 items-center">
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
          disabled={isReadOnly}
        />
      </div>


      {/* Correlação Peso x Resistência - Gráfico melhorado */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Correlação Peso × Resistência</h2>
        {scatterData.length >= 2 ? (
          <>
            <div className="mb-2 text-sm">
              <span className="font-semibold">Coeficiente de correlação de Pearson:</span> {pearsonCorrelation !== null ? pearsonCorrelation.toFixed(3) : "—"}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="peso" name="Peso (kg)" unit="kg" tick={{ fontSize: 14 }} label={{ value: 'Peso (kg)', position: 'insideBottom', offset: -5, fontWeight: 'bold', fontSize: 16 }} />
                <YAxis type="number" dataKey="resistencia" name="Resistência (MPa)" unit="MPa" tick={{ fontSize: 14 }} label={{ value: 'Resistência (MPa)', angle: -90, position: 'insideLeft', fontWeight: 'bold', fontSize: 16 }} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'peso') return [`${value} kg`, 'Peso (kg)'];
                    if (name === 'resistencia') return [`${value} MPa`, 'Resistência (MPa)'];
                    return [value, name];
                  }}
                  labelFormatter={() => ''}
                />
                <Legend verticalAlign="top" height={36} />
                <Scatter name="Amostras" data={scatterData} fill="#d7263d" shape="circle" line={{ stroke: '#d7263d', strokeWidth: 2 }} legendType="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">Preencha ao menos duas amostras com peso e força para visualizar a correlação.</div>
        )}
      </div>

      {/* Peso × Tempo de Ciclo */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Peso Médio × Tempo de Ciclo</h2>
        {pesoPorCiclo.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={pesoPorCiclo} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="ciclo" name="Ciclo (dias)" unit="dias" tick={{ fontSize: 14 }} label={{ value: 'Tempo de Ciclo (dias)', position: 'insideBottom', offset: -5, fontWeight: 'bold', fontSize: 16 }} />
              <YAxis dataKey="peso_medio" name="Peso Médio (kg)" unit="kg" tick={{ fontSize: 14 }} label={{ value: 'Peso Médio (kg)', angle: -90, position: 'insideLeft', fontWeight: 'bold', fontSize: 16 }} />
              <Tooltip formatter={(value: any, name: any) => [`${value}`, name === 'ciclo' ? 'Ciclo (dias)' : 'Peso Médio (kg)']} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="peso_medio" name="Peso Médio" stroke="#2563eb" strokeWidth={3} dot={{ r: 6, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted-foreground text-sm">Preencha pesos para visualizar o gráfico de evolução do peso médio.</div>
        )}
      </div>

      {/* Actions */}
      {isReadOnly ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => navigate("/ruptures")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Rompimentos
          </Button>
        </div>
      ) : isAdmin && isConcluido ? (
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/ruptures")} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating} className="gap-2">
            <Save className="h-4 w-4" />
            {isUpdating ? "Atualizando..." : "Atualizar Ensaio"}
          </Button>
        </div>
      ) : (
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
      )}

      {/* Modal Finalização Antecipada */}
      <Dialog open={finalizeModalOpen} onOpenChange={setFinalizeModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
