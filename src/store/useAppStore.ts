import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Material {
  id: string;
  nome: string;
  tipo: string;
  fornecedor: string;
  mf: string;
  ativo: boolean;
  created_at: string;
}

export interface Sieve {
  id: string;
  mm: number;
  serie: "Normal" | "Intermediária";
  ativo: boolean;
  created_at: string;
}

export interface AnalysisType {
  id: string;
  label: string;
  value: string;
  ativo: boolean;
}

export type UserRole = "ADMIN" | "PRODUCAO" | "VENDAS" | "LABORATORIO";

export type AnalysisStatus = "rascunho" | "em_analise" | "aprovado" | "liberado_producao";

export interface OrganizationIdentity {
  nome: string;
  cnpj: string;
  endereco: string;
  responsavel_tecnico: string;
}

export interface SystemParams {
  volume_batelada: number;
  densidade_cimento: number;
  fator_a: number;
  fator_b: number;
}

interface AppState {
  identity: OrganizationIdentity;
  updateIdentity: (data: Partial<OrganizationIdentity>) => void;
  params: SystemParams;
  updateParams: (data: Partial<SystemParams>) => void;
}


export const useAppStore = create<AppState>()(persist((set, get) => ({
  // NOTE: Identity and params should be loaded from Supabase TechnicalSettings & Organization tables
  // Remove hardcoded mock data — use API hooks instead
  identity: {
    nome: "",
    cnpj: "",
    endereco: "",
    responsavel_tecnico: "",
  },
  updateIdentity: (data) => set((state) => ({ identity: { ...state.identity, ...data } })),

  params: {
    volume_batelada: 550,
    densidade_cimento: 3.15,
    fator_a: 0.0546,
    fator_b: 98.0665,
  },
  updateParams: (data) => set((state) => ({ params: { ...state.params, ...data } })),

}), { name: "granulometria-store" }));
