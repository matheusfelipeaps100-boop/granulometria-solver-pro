import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnalysisFormData } from "@/lib/analysis-data";

// Enums from schema.prisma
export type AnalysisStatus = "rascunho" | "em_analise" | "aprovado" | "liberado_producao" | "arquivado";
export type BatchStatus = "aguardando_rompimentos" | "em_andamento" | "aprovado" | "aprovado_com_ressalva" | "reprovado";
export type ScheduleStatus = "pendente" | "em_andamento" | "concluido" | "atrasado";

export interface StoredAnalysis {
  id: string;
  codigo: string;
  nome: string;
  tipo_analise: string;
  analista: string;
  data: string;
  resistencia_prevista: number;
  status: AnalysisStatus;
  formData: AnalysisFormData;
  created_at: string;
  approved_at?: string;
  released_at?: string;
}

export interface RuptureSchedule {
  id: string;
  batch_id: string;
  idade_dias: number;
  data_prevista: string;
  data_executada?: string;
  status: ScheduleStatus;
}

export interface ProductionBatch {
  id: string;
  analysis_id: string;
  batch_code: string;
  operador_nome: string;
  maquina: string;
  volume_produzido: number;
  status: BatchStatus;
  notas: string;
  produced_at: string;
  rupture_schedules: RuptureSchedule[];
}

function generateBatchCode(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `LOTE-${year}-${seq}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createRuptureSchedules(batchId: string, producedAt: string): RuptureSchedule[] {
  const baseDate = new Date(producedAt);
  return [1, 3, 7, 28].map((dias) => {
    const dataPrevista = new Date(baseDate);
    dataPrevista.setDate(dataPrevista.getDate() + dias);
    return {
      id: generateId(),
      batch_id: batchId,
      idade_dias: dias,
      data_prevista: dataPrevista.toISOString().split("T")[0],
      status: "pendente" as ScheduleStatus,
    };
  });
}

interface AppState {
  analyses: StoredAnalysis[];
  batches: ProductionBatch[];

  // Analysis actions
  addAnalysis: (formData: AnalysisFormData) => void;
  approveAnalysis: (codigo: string) => void;
  deleteAnalysis: (codigo: string) => void;
  releaseForProduction: (codigo: string) => void;

  // Production actions
  registerBatch: (analysisId: string, data: { operador_nome: string; maquina: string; volume_produzido: number; notas: string; produced_at: string }) => ProductionBatch;

  // Rupture actions
  completeRuptureSchedule: (scheduleId: string, dataExecutada: string) => void;

  // Helpers
  getAnalysesByStatus: (status: AnalysisStatus) => StoredAnalysis[];
  getReleasedAnalyses: () => StoredAnalysis[];
  getBatchByAnalysisId: (analysisId: string) => ProductionBatch | undefined;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  analyses: [],
  batches: [],

  addAnalysis: (formData) => {
    const analysis: StoredAnalysis = {
      id: generateId(),
      codigo: formData.codigo,
      nome: formData.nome,
      tipo_analise: formData.tipo_analise,
      analista: formData.analista,
      data: formData.data,
      resistencia_prevista: formData.resistencia_prevista,
      status: "rascunho",
      formData,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ analyses: [...state.analyses, analysis] }));
  },

  approveAnalysis: (codigo) => {
    set((state) => ({
      analyses: state.analyses.map((a) =>
        a.codigo === codigo
          ? { ...a, status: "aprovado" as AnalysisStatus, approved_at: new Date().toISOString() }
          : a
      ),
    }));
  },

  releaseForProduction: (codigo) => {
    set((state) => ({
      analyses: state.analyses.map((a) =>
        a.codigo === codigo
          ? { ...a, status: "liberado_producao" as AnalysisStatus, released_at: new Date().toISOString() }
          : a
      ),
    }));
  },

  deleteAnalysis: (codigo) => {
    set((state) => ({
      analyses: state.analyses.filter((a) => a.codigo !== codigo),
    }));
  },

  registerBatch: (analysisId, data) => {
    const batchId = generateId();
    const batch: ProductionBatch = {
      id: batchId,
      analysis_id: analysisId,
      batch_code: generateBatchCode(),
      operador_nome: data.operador_nome,
      maquina: data.maquina,
      volume_produzido: data.volume_produzido,
      status: "aguardando_rompimentos",
      notas: data.notas,
      produced_at: data.produced_at,
      rupture_schedules: createRuptureSchedules(batchId, data.produced_at),
    };
    set((state) => ({ batches: [...state.batches, batch] }));
    return batch;
  },

  completeRuptureSchedule: (scheduleId, dataExecutada) => {
    set((state) => {
      // Find the batch that contains this schedule
      const batchToUpdate = state.batches.find(b => 
        b.rupture_schedules.some(s => s.id === scheduleId)
      );

      if (!batchToUpdate) return state;

      const updatedSchedules = batchToUpdate.rupture_schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, status: "concluido" as ScheduleStatus, data_executada: dataExecutada }
          : s
      );

      // Check if this is the first completed test, update batch status to em_andamento
      const hasCompletedTests = updatedSchedules.some(s => s.status === "concluido");
      const allCompleted = updatedSchedules.every(s => s.status === "concluido");
      
      let newBatchStatus = batchToUpdate.status;
      if (allCompleted) {
        newBatchStatus = "aprovado";
      } else if (hasCompletedTests) {
        newBatchStatus = "em_andamento";
      }

      return {
        batches: state.batches.map((batch) => 
          batch.id === batchToUpdate.id
            ? { ...batch, status: newBatchStatus, rupture_schedules: updatedSchedules }
            : batch
        ),
      };
    });
  },

  getAnalysesByStatus: (status) => get().analyses.filter((a) => a.status === status),
  getReleasedAnalyses: () => get().analyses.filter((a) => a.status === "liberado_producao"),
  getBatchByAnalysisId: (analysisId) => get().batches.find((b) => b.analysis_id === analysisId),
}), { name: "granulometria-store" }));
