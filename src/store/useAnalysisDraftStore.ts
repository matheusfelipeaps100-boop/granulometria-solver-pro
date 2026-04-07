import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createEmptyAnalysis, type AnalysisFormData } from "@/lib/analysis-data";

interface AnalysisDraftState {
  currentStep: number;
  formData: AnalysisFormData;
  setStep: (step: number) => void;
  setFormData: (updates: Partial<AnalysisFormData>) => void;
  loadAnalysis: (data: AnalysisFormData) => void;
  clearDraft: () => void;
}

export const useAnalysisDraftStore = create<AnalysisDraftState>()(
  persist(
    (set) => ({
      currentStep: 1,
      formData: createEmptyAnalysis(),
      setStep: (step) => set({ currentStep: step }),
      setFormData: (updates) =>
        set((state) => ({
          formData: { ...state.formData, ...updates },
        })),
      // Carrega uma análise existente do banco: substitui formData inteiro e reseta step
      loadAnalysis: (data) => set({ currentStep: 1, formData: data }),
      clearDraft: () =>
        set({
          currentStep: 1,
          formData: createEmptyAnalysis(),
        }),
    }),
    {
      name: "analysis-draft-storage",
    }
  )
);
