import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAnalysisDraftStore } from "@/store/useAnalysisDraftStore";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/WizardStepper";
import { StepIdentification } from "@/components/analysis/StepIdentification";
import { StepGranulometry } from "@/components/analysis/StepGranulometry";
import { StepDosage } from "@/components/analysis/StepDosage";
import { StepReview } from "@/components/analysis/StepReview";
import { StepResult } from "@/components/analysis/StepResult";
import {
  createEmptyAnalysis,
  generateAnalysisCode,
  PENEIRAS_PADRAO,
  getConfigMisturador,
  type AnalysisFormData,
} from "@/lib/analysis-data";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Grid3X3,
  Beaker,
  CheckSquare,
  Trophy,
  Save,
  X,
  Copy,
  FastForward,
} from "lucide-react";
import { useAnalyses, useAnalysis } from "@/hooks/api/useAnalyses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Error Boundary (deve ficar antes do componente que a usa) ────────────────
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary capturou erro nos Steps:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-left bg-red-50 text-red-600 rounded mt-10 w-full border border-red-200">
          <h2 className="font-bold text-xl mb-4">
            Erro ao renderizar o formulário.
          </h2>
          <pre className="text-xs bg-white p-4 overflow-auto border-red-100 whitespace-pre-wrap">
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const STEPS = [
  { number: 1, title: "Identificação", icon: ClipboardList },
  { number: 2, title: "Granulometria", icon: Grid3X3 },
  { number: 3, title: "Dosagem", icon: Beaker },
  { number: 4, title: "Revisão", icon: CheckSquare },
  { number: 5, title: "Resultado", icon: Trophy },
];

// ─── Conversão banco → formData (usada no editar e no duplicar) ───────────────
function mapAnalysisToFormData(analysisData: any): AnalysisFormData {
  const dosage = Array.isArray(analysisData.analysis_dosage)
    ? analysisData.analysis_dosage[0]
    : analysisData.analysis_dosage;

  const materiais = (analysisData.analysis_materials || []).map((am: any) => {
    const gradations = (am.analysis_material_gradations || []).map((g: any) => {
      const peneira = PENEIRAS_PADRAO.find((p) => p.sieve_id === g.sieve_id);
      return {
        sieve_id: g.sieve_id,
        abertura_mm: peneira?.abertura_mm ?? 0,
        massa_retida: g.massa_retida ?? 0,
      };
    });
    return {
      material_id: am.material_id,
      nome: am.materials?.nome || "",
      proporcao_kg: am.massa_kg ?? am.proporcao_kg ?? am.proporcao_pct * getConfigMisturador(analysisData.tipo).capacidade_kg,
      proporcao_pct: am.proporcao_pct ?? 0,
      densidade: am.materials?.densidade || 2.65,
      custo_tonelada: am.materials?.custo_tonelada ?? undefined,
      gradations,
    };
  });

  return {
    ...createEmptyAnalysis(),
    id: analysisData.id,
    codigo: analysisData.codigo,
    nome: analysisData.nome || "",
    tipo_analise: (analysisData.tipo as any) || "",
    produto_nome: analysisData.produto || "",
    resistencia_prevista: analysisData.resistencia_prevista || 0,
    unidade: analysisData.unidade || "",
    observacoes: analysisData.observacoes || "",
    data: analysisData.data_analise || new Date().toISOString().split("T")[0],
    relacao_cimento: dosage?.relacao_cimento || 18,
    relacao_ac: dosage?.relacao_ac || 0.2,
    consumo_alvo_m3: dosage?.consumo_cimento_kg || 137,
    volume_m3: dosage?.volume_batelada_litros
      ? dosage.volume_batelada_litros / 1000
      : getConfigMisturador(analysisData.tipo).volume_m3,
    densidade_cimento: dosage?.densidade_cimento || 3.15,
    aditivos_ml: dosage?.aditivos_ml || 0,
    custo_cimento_ton: dosage?.custo_cimento_ton || 0,
    custo_aditivo_lt: dosage?.custo_aditivo_lt || 0,
    cimento_marca_id: dosage?.cimento_marca_id || undefined,
    cimento_lote: dosage?.cimento_lote || undefined,
    cimento_observacao: dosage?.cimento_observacao || undefined,
    aditivo_marca_id: dosage?.aditivo_marca_id || undefined,
    aditivo_lote: dosage?.aditivo_lote || undefined,
    aditivo_diluicao: dosage?.aditivo_diluicao || undefined,
    aditivo_observacao: dosage?.aditivo_observacao || undefined,
    materiais_selecionados: materiais,
    dna_selecionado: "",
    limites_curva: [],
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────
const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const editCode = searchParams.get("edit");
  const isEditMode = !!editCode;

  // Modo duplicar: ?from=CODIGO copia o traço de uma análise existente para uma nova.
  const fromCode = !isEditMode ? searchParams.get("from") : null;
  const isDuplicateMode = !!fromCode;
  const sourceCode = editCode ?? fromCode;

  // Código da análise de origem — mantido em estado porque o ?from= é removido
  // da URL após o carregamento (evita recarregar por cima das edições).
  const [duplicatedFrom, setDuplicatedFrom] = useState<string | null>(null);

  const {
    currentStep,
    formData,
    setStep: setCurrentStep,
    setFormData,
    loadAnalysis,
    clearDraft,
  } = useAnalysisDraftStore();

  const { createAnalysis } = useAnalyses();
  const { data: analysisData, isLoading: isLoadingAnalysis, isError } = useAnalysis(sourceCode);

  const [approved, setApproved] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Rastreia qual código foi carregado com sucesso no draft.
  // useState (não useRef) para disparar re-render quando o carregamento terminar.
  const [loadedCode, setLoadedCode] = useState<string | null>(null);

  // Quando a análise de origem muda (troca de análise), resetar o estado de carregamento.
  useEffect(() => {
    setLoadedCode(null);
    setParseError(null);
  }, [sourceCode]);

  // Carrega os dados da análise no draft quando disponíveis.
  useEffect(() => {
    if (!sourceCode || isLoadingAnalysis || isError || !analysisData) return;
    if (loadedCode === sourceCode) return; // já carregado para este código

    // Se o código de edição coincidir com o rascunho atual, e já tivermos progresso salvo localmente,
    // usamos o estado local e ignoramos os dados do banco para não sobrescrever rascunhos.
    if (isEditMode && formData.codigo === editCode && currentStep > 1) {
      setLoadedCode(editCode);
      return;
    }

    try {
      const mapped = mapAnalysisToFormData(analysisData);

      if (isDuplicateMode) {
        // Nova análise: mantém o traço (materiais, granulometria, dosagem, cimento/aditivo)
        // e zera apenas os dados de identificação que mudam a cada análise.
        loadAnalysis({
          ...mapped,
          id: undefined,
          codigo: generateAnalysisCode(),
          nome: "",
          data: new Date().toISOString().split("T")[0],
          observacoes: "",
        }, 1);
        setDuplicatedFrom(fromCode);
        setLoadedCode(fromCode);
        // Remove o ?from= para que um recarregamento da página não sobrescreva as edições.
        setSearchParams({}, { replace: true });
        return;
      }

      loadAnalysis(mapped, analysisData.wizard_step || 1);

      // Marcar como carregado — dispara re-render para sair da tela de loading.
      setLoadedCode(editCode);
    } catch (err: any) {
      setParseError(err?.message || String(err));
    }
  }, [sourceCode, analysisData, isLoadingAnalysis, isError, loadedCode]);

  // ── Callbacks — TODOS os hooks antes de qualquer return condicional ──────────
  const handleChange = useCallback(
    (updates: Partial<AnalysisFormData>) => {
      setFormData(updates);
    },
    [setFormData]
  );

  const handleApprove = useCallback(async () => {
    try {
      if (!formData.id) {
        const result = await createAnalysis({ formData, status: "aprovado" });
        setFormData({ id: result.id });
      }
      setApproved(true);
      setCurrentStep(5);
      toast.success("Análise salva e aprovada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar análise: " + error.message);
    }
  }, [formData, createAnalysis, setFormData, setCurrentStep]);

  const handleSaveDraft = useCallback(async () => {
    try {
      const result = await createAnalysis({ formData, status: "rascunho", currentStep });
      toast.success("Rascunho salvo com sucesso", {
        description: `${result.codigo} — Etapa ${currentStep} de 5`,
      });
      // clearDraft(); // Removido para não perder o rascunho em andamento
      navigate("/analyses");
    } catch (error: any) {
      toast.error("Erro ao salvar rascunho: " + error.message);
    }
  }, [formData, createAnalysis, navigate, currentStep]);

  const canProceed = useCallback(() => {
    if (currentStep === 1) {
      return !!formData.tipo_analise && !!formData.nome && !!formData.codigo;
    }
    return true;
  }, [currentStep, formData.tipo_analise, formData.nome, formData.codigo]);

  // ── Tela de carregamento (early return DEPOIS de todos os hooks) ─────────────
  // Condição baseada em estado, não em localStorage, para evitar tela presa.
  if ((isEditMode || isDuplicateMode) && loadedCode !== sourceCode) {
    const hasLoadError = isError || !!parseError;
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center p-8 gap-4">
        {!hasLoadError && (
          <p className="text-muted-foreground animate-pulse">
            Carregando dados da análise...
          </p>
        )}
        {parseError && (
          <pre className="text-xs bg-muted p-4 rounded max-w-md w-full overflow-auto text-red-500 whitespace-pre-wrap">
            {`Erro ao processar dados:\n${parseError}`}
          </pre>
        )}
        {isError && !parseError && (
          <p className="text-sm text-destructive">
            Análise não encontrada. Verifique se o código é válido.
          </p>
        )}
        {hasLoadError && (
          <Button variant="outline" onClick={() => navigate("/analyses")}>
            Voltar para análises
          </Button>
        )}
      </div>
    );
  }

  // ── Renderização principal ────────────────────────────────────────────────────
  const progressPct = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Cabeçalho sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Cancelar */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              clearDraft();
              navigate("/analyses");
            }}
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CANCELAR</span>
          </Button>

          {/* Título central + progresso */}
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs font-black text-foreground/60 uppercase tracking-widest">
              {isEditMode ? "Editar Análise" : duplicatedFrom ? "Nova Análise (cópia)" : "Nova Análise"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {formData.codigo}
            </p>
          </div>

          {/* Salvar rascunho */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleSaveDraft}
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RASCUNHO</span>
          </Button>
        </div>

        {/* Barra de progresso */}
        <div className="h-0.5 w-full bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Container de conteúdo */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stepper */}
        <WizardStepper
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
        />

        {/* Aviso: análise duplicada */}
        {duplicatedFrom && (
          <div className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 px-4 py-3">
            <Copy className="h-4 w-4 text-sky-600 shrink-0" />
            <p className="text-sm text-foreground">
              Duplicada de <span className="font-mono font-semibold">{duplicatedFrom}</span> — Granulometria e
              Dosagem já preenchidas. Altere a identificação e confira o traço, se necessário.
            </p>
          </div>
        )}

        {/* Step content */}
        <FormErrorBoundary>
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <StepIdentification data={formData} onChange={handleChange} />
            )}
            {currentStep === 2 && (
              <StepGranulometry data={formData} onChange={handleChange} />
            )}
            {currentStep === 3 && (
              <StepDosage data={formData} onChange={handleChange} />
            )}
            {currentStep === 4 && (
              <StepReview data={formData} onApprove={handleApprove} onChange={handleChange} />
            )}
            {currentStep === 5 && <StepResult data={formData} />}
          </div>
        </FormErrorBoundary>

        {/* Botões de navegação */}
        {currentStep < 5 && (
          <div
            className={cn(
              "flex pt-4 border-t gap-3",
              currentStep === 1 ? "justify-end" : "justify-between"
            )}
          >
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                ANTERIOR
              </Button>
            )}

            {currentStep < 4 && (
              <div className="flex gap-3">
                {duplicatedFrom && currentStep === 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    disabled={!canProceed()}
                    className="gap-2 font-bold"
                  >
                    PULAR PARA REVISÃO
                    <FastForward className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="gap-2 font-bold"
                >
                  PRÓXIMO
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAnalysisPage;
