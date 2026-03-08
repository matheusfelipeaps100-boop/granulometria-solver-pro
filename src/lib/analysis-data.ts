// =============================================================================
// Mock data & types for the Analysis Wizard
// =============================================================================

import type { SieveData } from "./granulometry-engine";

export interface AnalysisFormData {
  // Step 1 — Identification
  tipo_analise: "bloco_estrutural" | "bloco_vedacao" | "paver" | "cp" | "";
  nome: string;
  codigo: string;
  data: string;
  analista: string;
  unidade: string;
  produto: string;
  resistencia_prevista: number;
  observacoes: string;
  // Step 2 — Granulometry
  dna_selecionado: string;
  materiais_selecionados: AnalysisMaterial[];
  // Step 3 — Dosage
  relacao_cimento: number;
  relacao_ac: number;
  volume_batelada: number;
  densidade_cimento: number;
  aditivos_ml: number;
}

export interface AnalysisMaterial {
  material_id: string;
  nome: string;
  proporcao_pct: number; // 0 to 1
  gradations: SieveData[];
}

// 10 peneiras padrão conforme PRD
export const PENEIRAS_PADRAO: Array<{ sieve_id: number; abertura_mm: number; label: string }> = [
  { sieve_id: 1, abertura_mm: 19.0, label: "19,0 mm" },
  { sieve_id: 2, abertura_mm: 12.5, label: "12,5 mm" },
  { sieve_id: 3, abertura_mm: 9.5, label: "9,5 mm" },
  { sieve_id: 4, abertura_mm: 6.3, label: "6,3 mm" },
  { sieve_id: 5, abertura_mm: 4.8, label: "4,8 mm" },
  { sieve_id: 6, abertura_mm: 2.4, label: "2,4 mm" },
  { sieve_id: 7, abertura_mm: 1.2, label: "1,2 mm" },
  { sieve_id: 8, abertura_mm: 0.6, label: "0,6 mm" },
  { sieve_id: 9, abertura_mm: 0.3, label: "0,3 mm" },
  { sieve_id: 10, abertura_mm: 0.15, label: "0,15 mm" },
];

// Materiais mock com dados reais da planilha
export const MATERIAIS_DISPONIVEIS: AnalysisMaterial[] = [
  {
    material_id: "mat-areia-cava",
    nome: "Areia Cava BMW",
    proporcao_pct: 0.25,
    gradations: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      abertura_mm: p.abertura_mm,
      massa_retida: [0, 0, 0, 0, 2.5, 18.3, 42.1, 85.6, 120.4, 55.2][p.sieve_id - 1],
    })),
  },
  {
    material_id: "mat-po-pedra",
    nome: "Pó Pedra Britasul",
    proporcao_pct: 0.35,
    gradations: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      abertura_mm: p.abertura_mm,
      massa_retida: [0, 0, 5.2, 28.4, 62.1, 98.3, 72.5, 45.8, 28.1, 12.6][p.sieve_id - 1],
    })),
  },
  {
    material_id: "mat-brita",
    nome: "Brita Britasul",
    proporcao_pct: 0.25,
    gradations: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      abertura_mm: p.abertura_mm,
      massa_retida: [45.2, 120.8, 185.3, 92.1, 32.5, 8.2, 2.1, 0.8, 0.3, 0.1][p.sieve_id - 1],
    })),
  },
  {
    material_id: "mat-areia-rio",
    nome: "Areia Rio Rafael",
    proporcao_pct: 0.15,
    gradations: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      abertura_mm: p.abertura_mm,
      massa_retida: [0, 0, 0, 1.2, 5.8, 22.4, 55.3, 95.2, 105.8, 38.6][p.sieve_id - 1],
    })),
  },
];

// DNAs pré-configurados
export const DNAS_PADRAO = [
  {
    id: "dna-bloco-estrutural",
    nome: "DNA Bloco Estrutural 4MPa",
    tipo: "bloco_estrutural",
    resistencia_mpa: 4.0,
    limites: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      limite_min: [0, 0, 0, 0.02, 0.05, 0.15, 0.30, 0.50, 0.70, 0.85][p.sieve_id - 1],
      limite_max: [0.05, 0.10, 0.15, 0.25, 0.35, 0.55, 0.70, 0.85, 0.95, 1.0][p.sieve_id - 1],
    })),
  },
  {
    id: "dna-bloco-vedacao",
    nome: "DNA Bloco Vedação 3MPa",
    tipo: "bloco_vedacao",
    resistencia_mpa: 3.0,
    limites: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      limite_min: [0, 0, 0, 0.01, 0.04, 0.12, 0.25, 0.45, 0.65, 0.80][p.sieve_id - 1],
      limite_max: [0.05, 0.10, 0.18, 0.28, 0.40, 0.60, 0.75, 0.88, 0.96, 1.0][p.sieve_id - 1],
    })),
  },
  {
    id: "dna-paver-h8",
    nome: "DNA Paver H8 35MPa",
    tipo: "paver",
    resistencia_mpa: 35.0,
    limites: PENEIRAS_PADRAO.map((p) => ({
      sieve_id: p.sieve_id,
      limite_min: [0, 0, 0.02, 0.05, 0.10, 0.20, 0.35, 0.55, 0.72, 0.88][p.sieve_id - 1],
      limite_max: [0.08, 0.15, 0.22, 0.32, 0.42, 0.58, 0.72, 0.88, 0.96, 1.0][p.sieve_id - 1],
    })),
  },
];

// Analistas mock
export const ANALISTAS = [
  { id: "user-1", nome: "Carlos Silva" },
  { id: "user-2", nome: "Maria Santos" },
  { id: "user-3", nome: "João Oliveira" },
];

// Tipos de análise
export const TIPOS_ANALISE = [
  { value: "bloco_estrutural", label: "Bloco Estrutural" },
  { value: "bloco_vedacao", label: "Bloco de Vedação" },
  { value: "paver", label: "Paver" },
  { value: "cp", label: "Corpo de Prova (CP)" },
];

// Gera código automático
export function generateAnalysisCode(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `ANL-${year}-${seq}`;
}

// Initial form state
export function createEmptyAnalysis(): AnalysisFormData {
  return {
    tipo_analise: "",
    nome: "",
    codigo: generateAnalysisCode(),
    data: new Date().toISOString().split("T")[0],
    analista: "",
    unidade: "",
    produto: "",
    resistencia_prevista: 0,
    observacoes: "",
    dna_selecionado: "",
    materiais_selecionados: [],
    relacao_cimento: 5.2,
    relacao_ac: 0.42,
    volume_batelada: 550,
    densidade_cimento: 3.15,
    aditivos_ml: 0,
  };
}
