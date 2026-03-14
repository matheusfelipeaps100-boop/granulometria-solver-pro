import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { ANALISTAS } from "@/lib/analysis-data";
import { calcTensao, calcRuptureStats } from "@/lib/granulometry-engine";

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
  const batches = useAppStore((s) => s.batches);
  const analyses = useAppStore((s) => s.analyses);
  const completeRuptureSchedule = useAppStore((s) => s.completeRuptureSchedule);

  // Find the schedule across all batches
  const found = useMemo(() => {
    for (const batch of batches) {
      const schedule = batch.rupture_schedules.find((s) => s.id === scheduleId);
      if (schedule) {
        const analysis = analyses.find((a) => a.id === batch.analysis_id);
        return { batch, schedule, analysis };
      }
    }
    return null;
  }, [batches, analyses, scheduleId]);

  const [dataReal, setDataReal] = useState(new Date().toISOString().split("T")[0]);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  // 3 samples per test type
  const [samples, setSamples] = useState<Record<TipoAmostra, SampleInput[]>>({
    bloco: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
    paver: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
    cp: [{ forca_kn: "" }, { forca_kn: "" }, { forca_kn: "" }],
  });

  const updateSample = useCallback((tipo: TipoAmostra, index: number, value: string) => {
    setSamples((prev) => ({
      ...prev,
      [tipo]: prev[tipo].map((s, i) => (i === index ? { forca_kn: value } : s)),
    }));
  }, []);

  // Calculate stats per test type in real-time
  const statsPerTipo = useMemo(() => {
    const meta = found?.analysis?.resistencia_prevista ?? 0;
    const result: Record<TipoAmostra, ReturnType<typeof calcRuptureStats> | null> = {
      bloco: null,
      paver: null,
      cp: null,
    };

    for (const tipo of TIPOS_AMOSTRA) {
      const forcas = samples[tipo]
        .map((s) => parseFloat(s.forca_kn))
        .filter((f) => !isNaN(f) && f > 0);
      if (forcas.length > 0) {
        result[tipo] = calcRuptureStats(forcas, meta);
      }
    }
    return result;
  }, [samples, found]);

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

  const handleSave = () => {
    if (!responsavel) {
      toast.error("Selecione o responsável pelo ensaio");
      return;
    }

    const hasAnySample = TIPOS_AMOSTRA.some((tipo) =>
      samples[tipo].some((s) => s.forca_kn && parseFloat(s.forca_kn) > 0)
    );

    if (!hasAnySample) {
      toast.error("Informe ao menos uma amostra com força (kN)");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      completeRuptureSchedule(schedule.id, dataReal);
      setSaving(false);
      toast.success("Ensaio de rompimento salvo!", {
        description: `${batch.batch_code} — ${schedule.idade_dias} dias`,
      });
      navigate("/ruptures");
    }, 600);
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
              {ANALISTAS.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blocos de amostras por tipo (PRD: bloco, paver, cp) */}
      {TIPOS_AMOSTRA.map((tipo) => {
        const stats = statsPerTipo[tipo];
        return (
          <Card key={tipo} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{tipoLabel[tipo]}</span>
                {analysis && (
                  <span className="text-sm text-muted-foreground font-normal">
                    Meta ≥ {analysis.resistencia_prevista} MPa
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {samples[tipo].map((sample, i) => {
                  const forca = parseFloat(sample.forca_kn);
                  const tensao = !isNaN(forca) && forca > 0 ? calcTensao(forca) : null;
                  return (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Amostra {i + 1} — Força (kN)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 120.5"
                        value={sample.forca_kn}
                        onChange={(e) => updateSample(tipo, i, e.target.value)}
                      />
                      {tensao !== null && (
                        <p className="text-xs text-muted-foreground">
                          Tensão: <span className="font-semibold text-foreground">{tensao.toFixed(2)} MPa</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stats calculados em tempo real */}
              {stats && (
                <>
                  <Separator />
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Média:</span>{" "}
                      <span className="font-semibold">{stats.media.toFixed(2)} MPa</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min:</span>{" "}
                      <span className="font-semibold">{stats.minimo.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max:</span>{" "}
                      <span className="font-semibold">{stats.maximo.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DP:</span>{" "}
                      <span className="font-semibold">{stats.desvio_padrao.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stats.status === "conforme" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> CONFORME
                        </Badge>
                      ) : stats.status === "nao_conforme" ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
                          <XCircle className="h-3 w-3" /> NÃO CONFORME
                        </Badge>
                      ) : (
                        <Badge variant="outline">Registro</Badge>
                      )}
                    </div>
                  </div>
                </>
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
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/ruptures")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Rompimento"}
        </Button>
      </div>
    </div>
  );
};

export default RuptureDetailPage;
