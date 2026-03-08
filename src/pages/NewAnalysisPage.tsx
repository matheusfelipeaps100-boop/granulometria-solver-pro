import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "@/components/WizardStepper";
import { StepIdentification } from "@/components/analysis/StepIdentification";
import { StepGranulometry } from "@/components/analysis/StepGranulometry";
import { StepDosage } from "@/components/analysis/StepDosage";
import { StepReview } from "@/components/analysis/StepReview";
import { StepResult } from "@/components/analysis/StepResult";
import { createEmptyAnalysis, type AnalysisFormData } from "@/lib/analysis-data";
import { ArrowLeft, ArrowRight, ClipboardList, Grid3X3, Beaker, CheckSquare, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [approved, setApproved] = useState(false);
  const [formData, setFormData] = useState<AnalysisFormData>(createEmptyAnalysis);

  const handleChange = useCallback((updates: Partial<AnalysisFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const addAnalysis = useAppStore((s) => s.addAnalysis);
  const approveAnalysis = useAppStore((s) => s.approveAnalysis);

  const handleApprove = useCallback(() => {
    // Add to store and approve
    addAnalysis(formData);
    approveAnalysis(formData.codigo);
    setApproved(true);
    setCurrentStep(5);
  }, [formData, addAnalysis, approveAnalysis]);

  const canProceed = () => {
    if (currentStep === 1) {
      return !!formData.tipo_analise && !!formData.nome && !!formData.codigo;
    }
    return true;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/analyses")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Análise</h1>
          <p className="text-sm text-muted-foreground">Wizard de criação — {formData.codigo}</p>
        </div>
      </div>

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

      {/* Navigation buttons */}
      {currentStep < 5 && (
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>
          {currentStep < 4 && (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="gap-2"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default NewAnalysisPage;
