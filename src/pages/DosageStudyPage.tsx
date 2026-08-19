import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowLeft, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useDosageExperiments } from "@/hooks/api/useDosageExperiments";
import { useMaterials } from "@/hooks/api/useMaterials";
import {
  gerarTracosCandidatos,
  verificarDadosSuficientes,
  META_RESISTENCIA_24H_MPA,
  type WetCastExperiment,
} from "@/lib/wet-cast-optimizer";

import { ExperimentComparisonTable } from "@/components/dosage-study/ExperimentComparisonTable";
import { Top10Candidates } from "@/components/dosage-study/Top10Candidates";
import { SolutionMapChart } from "@/components/dosage-study/SolutionMapChart";
import { AlertsPanel } from "@/components/dosage-study/AlertsPanel";
import { ExperimentStatusBadge } from "@/components/dosage-study/ExperimentStatusBadge";
import { RegisterRealResultDialog } from "@/components/dosage-study/RegisterRealResultDialog";

// =============================================================================
// ESTUDO DE DOSAGEM E OTIMIZAÇÃO — LAJE PROTENDIDA (WET CASTING)
// =============================================================================
// Página dedicada (não é uma aba do wizard): trabalha com múltiplos
// experimentos/candidatos por produto, diferente do modelo 1 análise = 1
// traço do wizard. Motor em src/lib/wet-cast-optimizer.ts, dados em
// dosage_experiments/dosage_experiment_materials via useDosageExperiments.
// =============================================================================

export default function DosageStudyPage() {
  const { experimentosReais, candidatosPersistidos, isLoading, salvarCandidato, isSalvandoCandidato, registrarResultado } =
    useDosageExperiments();
  const { materials: dbMaterials } = useMaterials();

  const [candidatosGerados, setCandidatosGerados] = useState<WetCastExperiment[]>([]);
  const [gerando, setGerando] = useState(false);

  const cimentoDb = dbMaterials.find((m) => m.tipo === "cimento");
  const aditivoDb = dbMaterials.find((m) => m.tipo === "outro" && m.nome.toLowerCase().includes("aditivo"));
  const custoCimentoTon = cimentoDb?.custo_valor ? cimentoDb.custo_valor * 1000 : cimentoDb?.custo_tonelada ?? 0;
  const custoAditivoLt = aditivoDb?.custo_valor ?? 0;

  const candidatosParaExibir = candidatosGerados.length > 0 ? candidatosGerados : candidatosPersistidos;

  const erroDados = useMemo(() => verificarDadosSuficientes(experimentosReais), [experimentosReais]);

  const handleGerarCandidatos = () => {
    setGerando(true);
    try {
      const resultado = gerarTracosCandidatos({
        experimentosReais,
        custoCimentoTon,
        custoAditivoLt,
        quantidade: 200,
      });
      if (!resultado.ok) {
        toast.error(resultado.detalhe);
        setCandidatosGerados([]);
        return;
      }
      if (resultado.candidatos.length === 0) {
        toast.warning("Nenhum candidato atingiu a meta de resistência dentro da região de busca calibrada.");
      } else {
        toast.success(`${resultado.candidatos.length} candidatos gerados. Nenhum repete A, B ou a média simples.`);
      }
      setCandidatosGerados(resultado.candidatos);
    } finally {
      setGerando(false);
    }
  };

  const handleSalvarCandidato = async (candidato: WetCastExperiment) => {
    try {
      await salvarCandidato({ ...candidato, status: "CANDIDATO_PARA_ENSAIO" });
      toast.success(`Candidato ${candidato.codigo} salvo como Candidato para Ensaio.`);
    } catch (err) {
      toast.error("Erro ao salvar candidato.");
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/granulometria">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">Estudo de Dosagem (Wet Casting)</h1>
          <p className="text-xs text-muted-foreground">Laje / Vigota / Painel Protendido — meta {'>'} {META_RESISTENCIA_24H_MPA} MPa aos 24h</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Nenhum traço aqui é apresentado como "ideal" ou "validado" apenas por cálculo — resistências geradas pelo
          motor aparecem sempre como <strong>estimativa</strong>, até confirmação por ensaio real.
        </span>
      </div>

      {/* Comparação dos experimentos reais */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Experimentos Reais</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <ExperimentComparisonTable
                experimentos={experimentosReais}
                custoCimentoTon={custoCimentoTon}
                custoAditivoLt={custoAditivoLt}
              />
              <div className="mt-3 space-y-2">
                {experimentosReais.map((e) => (
                  <AlertsPanel key={e.codigo} experimento={e} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Geração de candidatos */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">Geração de Candidatos</CardTitle>
          <Button onClick={handleGerarCandidatos} disabled={gerando || !!erroDados} className="gap-2">
            <Sparkles className="h-4 w-4" /> {gerando ? "Gerando..." : "Gerar Candidatos"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {erroDados && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {erroDados.detalhe}
            </div>
          )}
          {!erroDados && (
            <>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Top 10 Candidatos</p>
                <Top10Candidates
                  candidatos={candidatosParaExibir}
                  custoCimentoTon={custoCimentoTon}
                  custoAditivoLt={custoAditivoLt}
                  onSalvar={candidatosGerados.length > 0 ? handleSalvarCandidato : undefined}
                  salvando={isSalvandoCandidato}
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Mapa de Soluções</p>
                <SolutionMapChart
                  experimentosReais={experimentosReais}
                  candidatos={candidatosParaExibir}
                  custoCimentoTon={custoCimentoTon}
                  custoAditivoLt={custoAditivoLt}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Candidatos salvos / em acompanhamento */}
      {candidatosPersistidos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Candidatos Salvos — Acompanhamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {candidatosPersistidos.map((c) => (
              <div key={c.id ?? c.codigo} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{c.codigo}</span>
                  <ExperimentStatusBadge status={c.status} />
                  {c.resistencia_estimada_mpa != null && (
                    <span className="text-[11px] text-muted-foreground">
                      estimada: {c.resistencia_estimada_mpa.toFixed(1)} MPa
                    </span>
                  )}
                  {c.resultado_resistencia_mpa != null && (
                    <Badge variant="outline" className="text-[10px]">
                      real: {c.resultado_resistencia_mpa.toFixed(1)} MPa
                    </Badge>
                  )}
                </div>
                {c.status !== "VALIDADO_EXPERIMENTALMENTE" && c.status !== "REPROVADO" && (
                  <RegisterRealResultDialog
                    experimento={c}
                    onRegistrar={async (atualizado) => {
                      if (!atualizado.id) return;
                      await registrarResultado({
                        id: atualizado.id,
                        resultado_resistencia_mpa: atualizado.resultado_resistencia_mpa as number,
                        status: atualizado.status,
                        erro_estimado_vs_real_pct: atualizado.erro_estimado_vs_real_pct,
                      });
                    }}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
