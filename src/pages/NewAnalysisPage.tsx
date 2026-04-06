import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAnalysisDraftStore } from "@/store/useAnalysisDraftStore";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/WizardStepper";
import { StepIdentification } from "@/components/analysis/StepIdentification";
import { StepGranulometry } from "@/components/analysis/StepGranulometry";
import { StepDosage } from "@/components/analysis/StepDosage";
import { StepReview } from "@/components/analysis/StepReview";
import { StepResult } from "@/components/analysis/StepResult";
import { createEmptyAnalysis, type AnalysisFormData } from "@/lib/analysis-data";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, title: "Identificação", icon: ClipboardList },
  { number: 2, title: "Granulometria", icon: Grid3X3 },
  { number: 3, title: "Dosagem", icon: Beaker },
  { number: 4, title: "Revisão", icon: CheckSquare },
  { number: 5, title: "Resultado", icon: Trophy },
];

const NewAnalysisPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = !!searchParams.get("edit");
  const { currentStep, formData, setStep: setCurrentStep, setFormData, clearDraft } = useAnalysisDraftStore();
  const [approved, setApproved] = useState(false);
  
  const { createAnalysis, isCreating } = useAnalyses();

  const handleChange = useCallback((updates: Partial<AnalysisFormData>) => {
    setFormData(updates);
  }, [setFormData]);

  const handleApprove = useCallback(async () => {
    try {
      if (!formData.id) {
        const result = await createAnalysis({ formData, status: 'aprovado' });
        setFormData({ id: result.id });
      }
      setApproved(true);
      setCurrentStep(5);
      toast.success("Análise salva e aprovada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar análise: " + error.message);
    }
  }, [formData, createAnalysis, setFormData]);

  const handleSaveDraft = useCallback(async () => {
    try {
      if (!formData.id) {
        await createAnalysis({ formData, status: 'rascunho' });
      }
      toast.success("Rascunho salvo com sucesso", {
        description: `${formData.codigo} — Etapa ${currentStep} de 5`,
      });
      clearDraft();
      navigate("/analyses");
    } catch (error: any) {
      toast.error("Erro ao salvar rascunho: " + error.message);
    }
  }, [formData, createAnalysis, navigate, currentStep]);

  const canProceed = () => {
    if (currentStep === 1) {
      return !!formData.tipo_analise && !!formData.nome && !!formData.codigo;
    }
    return true;
  };

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
            CANCELAR
          </Button>

          {/* Título central + progresso */}
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs font-black text-foreground/60 uppercase tracking-widest">
              Nova Análise
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
            RASCUNHO
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
          onStepClick={(step) => {
            if (isEditMode || approved || step <= currentStep) setCurrentStep(step);
          }}
        />

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && <StepIdentification data={formData} onChange={handleChange} />}
          {currentStep === 2 && <StepGranulometry data={formData} onChange={handleChange} />}
          {currentStep === 3 && <StepDosage data={formData} onChange={handleChange} />}
          {currentStep === 4 && <StepReview data={formData} onApprove={handleApprove} />}
          {currentStep === 5 && <StepResult data={formData} />}
        </div>

        {/* Botões de navegação */}
        {currentStep < 5 && (
          <div className={cn(
            "flex pt-4 border-t gap-3",
            currentStep === 1 ? "justify-end" : "justify-between"
          )}>
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
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="gap-2 font-bold"
              >
                PRÓXIMO
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAnalysisPage;
