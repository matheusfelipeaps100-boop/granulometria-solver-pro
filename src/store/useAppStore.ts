import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnalysisFormData, Product } from "@/lib/analysis-data";
import { PRODUTOS_DISPONIVEIS, TIPOS_ANALISE } from "@/lib/analysis-data";

export interface Material {
  id: string;
  nome: string;
  tipo: string;
  fornecedor: string;
  mf: string;
  ativo: boolean;
  created_at: string;
}

export interface AnalysisType {
  id: string;
  label: string;
  value: string;
  ativo: boolean;
}

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

const SEED_MATERIALS: Omit<Material, "id" | "created_at">[] = [
  { nome: "Areia de Cava BMW", tipo: "areia_fina", fornecedor: "BMW", mf: "2,699", ativo: true },
  { nome: "Pó de Pedra Britasul", tipo: "po_pedra", fornecedor: "Britasul", mf: "2,721", ativo: true },
  { nome: "Brita Britasul", tipo: "brita", fornecedor: "Britasul", mf: "6,559", ativo: true },
  { nome: "Areia de Rio Rafael", tipo: "areia_grossa", fornecedor: "Rafael", mf: "2,905", ativo: true },
  { nome: "Pó de Pedra 1 Rafael", tipo: "po_pedra", fornecedor: "Rafael", mf: "3,178", ativo: true },
  { nome: "Granilha 01 Duro", tipo: "granilha", fornecedor: "Duro", mf: "4,723", ativo: true },
  { nome: "Granilha 02 Duro", tipo: "granilha", fornecedor: "Duro", mf: "5,017", ativo: true },
  { nome: "Pó de Pedra Fino Duro", tipo: "po_pedra", fornecedor: "Duro", mf: "1,840", ativo: true },
  { nome: "Brita 00 Duro", tipo: "brita", fornecedor: "Duro", mf: "7,068", ativo: true },
];

interface AppState {
  analyses: StoredAnalysis[];
  batches: ProductionBatch[];
  standardTraces: { id: string; nome: string; tipo_produto: string; resistencia_alvo: number; created_at: string; data: AnalysisFormData }[];
  products: Product[];
  analysisTypes: AnalysisType[];
  materials: Material[];

  // Analysis actions
  addAnalysis: (formData: AnalysisFormData) => void;
  saveStandardTrace: (nome: string, data: AnalysisFormData) => void;
  approveAnalysis: (codigo: string) => void;
  deleteAnalysis: (codigo: string) => void;
  releaseForProduction: (codigo: string) => void;

  // Production actions
  registerBatch: (analysisId: string, data: { operador_nome: string; maquina: string; volume_produzido: number; notas: string; produced_at: string }) => ProductionBatch;

  // Rupture actions
  completeRuptureSchedule: (scheduleId: string, dataExecutada: string) => void;

  // Product actions
  addProduct: (data: Omit<Product, "id" | "created_at">) => void;
  updateProduct: (id: string, data: Partial<Omit<Product, "id" | "created_at">>) => void;
  deleteProduct: (id: string) => void;

  // Analysis Type actions
  addAnalysisType: (data: Omit<AnalysisType, "id">) => void;
  updateAnalysisType: (id: string, data: Partial<Omit<AnalysisType, "id">>) => void;
  deleteAnalysisType: (id: string) => void;

  // Material actions
  addMaterial: (data: Omit<Material, "id" | "created_at">) => void;
  updateMaterial: (id: string, data: Partial<Omit<Material, "id" | "created_at">>) => void;
  deleteMaterial: (id: string) => void;

  // Helpers
  getAnalysesByStatus: (status: AnalysisStatus) => StoredAnalysis[];
  getReleasedAnalyses: () => StoredAnalysis[];
  getBatchByAnalysisId: (analysisId: string) => ProductionBatch | undefined;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  analyses: [],
  batches: [],
  standardTraces: [],
  products: [...PRODUTOS_DISPONIVEIS],
  analysisTypes: TIPOS_ANALISE.map((t, i) => ({ id: `at-${i}`, label: t.label, value: t.value, ativo: true })),
  materials: SEED_MATERIALS.map((m, i) => ({ ...m, id: `mat-${i}`, created_at: new Date().toISOString() })),

  // ── Analysis Actions ──
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

  saveStandardTrace: (nome, data) => {
    const standardTrace = {
      id: generateId(),
      nome,
      tipo_produto: data.tipo_analise,
      resistencia_alvo: data.resistencia_prevista,
      created_at: new Date().toISOString(),
      data,
    };
    set((state) => ({ standardTraces: [...state.standardTraces, standardTrace] }));
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

  // ── Production Actions ──
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
      const batchToUpdate = state.batches.find(b =>
        b.rupture_schedules.some(s => s.id === scheduleId)
      );
      if (!batchToUpdate) return state;

      const updatedSchedules = batchToUpdate.rupture_schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, status: "concluido" as ScheduleStatus, data_executada: dataExecutada }
          : s
      );

      const hasCompletedTests = updatedSchedules.some(s => s.status === "concluido");
      const allCompleted = updatedSchedules.every(s => s.status === "concluido");

      let newBatchStatus = batchToUpdate.status;
      if (allCompleted) {
        newBatchStatus = "aprovado";
      } else if (hasCompletedTests) {
        newBatchStatus = "em_andamento";
      }

      if (allCompleted && newBatchStatus === "aprovado") {
        const analysis = state.analyses.find(a => a.id === batchToUpdate.analysis_id);
        if (analysis) {
          const alreadyExists = state.standardTraces.some(
            t => t.nome === `Traço Aprovado — ${analysis.codigo}`
          );
          if (!alreadyExists) {
            const autoTrace = {
              id: generateId(),
              nome: `Traço Aprovado — ${analysis.codigo}`,
              tipo_produto: analysis.tipo_analise,
              resistencia_alvo: analysis.resistencia_prevista,
              created_at: new Date().toISOString(),
              data: analysis.formData,
            };
            return {
              batches: state.batches.map((batch) =>
                batch.id === batchToUpdate.id
                  ? { ...batch, status: newBatchStatus, rupture_schedules: updatedSchedules }
                  : batch
              ),
              standardTraces: [...state.standardTraces, autoTrace],
            };
          }
        }
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

  // ── Product Actions ──
  addProduct: (data) => {
    const product: Product = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    set((state) => ({ products: [...state.products, product] }));
  },

  updateProduct: (id, data) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...data } : p
      ),
    }));
  },

  deleteProduct: (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  // ── Analysis Type Actions ──
  addAnalysisType: (data) => {
    const at: AnalysisType = { ...data, id: generateId() };
    set((state) => ({ analysisTypes: [...state.analysisTypes, at] }));
  },

  updateAnalysisType: (id, data) => {
    set((state) => ({
      analysisTypes: state.analysisTypes.map((at) =>
        at.id === id ? { ...at, ...data } : at
      ),
    }));
  },

  deleteAnalysisType: (id) => {
    set((state) => ({
      analysisTypes: state.analysisTypes.filter((at) => at.id !== id),
    }));
  },

  // ── Material Actions ──
  addMaterial: (data) => {
    const material: Material = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    set((state) => ({ materials: [...state.materials, material] }));
  },

  updateMaterial: (id, data) => {
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...data } : m
      ),
    }));
  },

  deleteMaterial: (id) => {
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
  },

  // ── Helpers ──
  getAnalysesByStatus: (status) => get().analyses.filter((a) => a.status === status),
  getReleasedAnalyses: () => get().analyses.filter((a) => a.status === "liberado_producao"),
  getBatchByAnalysisId: (analysisId) => get().batches.find((b) => b.analysis_id === analysisId),
}), { name: "granulometria-store" }));
