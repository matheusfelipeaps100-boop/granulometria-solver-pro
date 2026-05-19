// =============================================================================
// Analysis Interfaces & Types (Remove mock data — use API hooks instead)
// =============================================================================

import type { SieveData } from "./granulometry-engine";

// ── Product Interface ──
export interface Product {
  id: string;
  nome: string;
  tipo_produto: "bloco_estrutural" | "bloco_vedacao" | "paver" | "cp";
  dimensoes: string;
  resistencia_referencia: number;
  ativo: boolean;
  created_at: string;
}

export interface AnalysisFormData {
  id?: string;
  // Step 1 — Identification
  tipo_analise: "bloco_estrutural" | "bloco_vedacao" | "paver" | "cp" | "";
  nome: string;
  codigo: string;
  data: string;
  analista: string;
  unidade: string;
  produto_id: string;
  produto_nome: string;
  resistencia_prevista: number;
  observacoes: string;
  // Step 2 — Granulometry
  dna_selecionado: string;
  materiais_selecionados: AnalysisMaterial[];
  // Step 3 — Dosage
  relacao_cimento: number;
  relacao_ac: number;
  consumo_alvo_m3: number;
  volume_m3: number;
  densidade_cimento: number;
  aditivos_ml: number;
  custo_cimento_ton: number;
  custo_aditivo_lt: number;
  limites_curva?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
}

export interface AnalysisMaterial {
  material_id: string;
  nome: string;
  proporcao_kg: number;  // kg absoluto na batelada (referência 550 kg)
  proporcao_pct: number; // derivado: proporcao_kg / soma_total_kg
  densidade?: number; // g/cm³ ou kg/dm³
  custo_tonelada?: number;
  gradations: SieveData[];
}

// 8 peneiras padrão conforme PRD
export const PENEIRAS_PADRAO: Array<{ sieve_id: number; abertura_mm: number; label: string }> = [
  { sieve_id: 2, abertura_mm: 9.5, label: "9,5 mm" },
  { sieve_id: 3, abertura_mm: 6.3, label: "6,3 mm" },
  { sieve_id: 4, abertura_mm: 4.8, label: "4,8 mm" },
  { sieve_id: 5, abertura_mm: 2.4, label: "2,4 mm" },
  { sieve_id: 6, abertura_mm: 1.2, label: "1,2 mm" },
  { sieve_id: 7, abertura_mm: 0.6, label: "0,6 mm" },
  { sieve_id: 8, abertura_mm: 0.3, label: "0,3 mm" },
  { sieve_id: 9, abertura_mm: 0.15, label: "0,15 mm" },
  { sieve_id: 10, abertura_mm: 0, label: "Fundo" },
];

// TODO: Load from Supabase using useMaterials() hook
export const MATERIAIS_DISPONIVEIS: AnalysisMaterial[] = [];

// TODO: Load from Supabase using useStandardCurves() hook
export const DNAS_PADRAO: any[] = [];

// Limites normativos padrão para Bloco Estrutural (espelho do seed 006_seed_standard_curves.sql)
// Usados como fallback quando o banco não retorna standard_curve_items
export const LIMITES_BLOCO_PADRAO: Array<{ sieve_id: number; limite_min: number; limite_max: number }> = [
  { sieve_id: 2,  limite_min: 0.00, limite_max: 0.15 },
  { sieve_id: 3,  limite_min: 0.00, limite_max: 0.25 },
  { sieve_id: 4,  limite_min: 0.00, limite_max: 0.33 },
  { sieve_id: 5,  limite_min: 0.19, limite_max: 0.51 },
  { sieve_id: 6,  limite_min: 0.37, limite_max: 0.66 },
  { sieve_id: 7,  limite_min: 0.54, limite_max: 0.78 },
  { sieve_id: 8,  limite_min: 0.72, limite_max: 0.90 },
  { sieve_id: 9,  limite_min: 0.85, limite_max: 0.97 },
  { sieve_id: 10, limite_min: 1.00, limite_max: 1.00 },
];

// TODO: Load from Supabase using useProfiles() hook
export const ANALISTAS = [];

// Tipos de análise
export const TIPOS_ANALISE = [
  { value: "bloco_estrutural", label: "Bloco Estrutural" },
  { value: "bloco_vedacao", label: "Bloco de Vedação" },
  { value: "paver", label: "Paver" },
  { value: "cp", label: "Corpo de Prova (CP)" },
];

// TODO: Load from Supabase using API hook
export const PRODUTOS_DISPONIVEIS: Product[] = [];

// Helpers de produto
export function getProductsByType(tipo: string): Product[] {
  return PRODUTOS_DISPONIVEIS.filter((p) => p.tipo_produto === tipo && p.ativo);
}

export function getProductById(id: string): Product | undefined {
  return PRODUTOS_DISPONIVEIS.find((p) => p.id === id);
}

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
    produto_id: "",
    produto_nome: "",
    resistencia_prevista: 0,
    observacoes: "",
    dna_selecionado: "",
    materiais_selecionados: [],
    relacao_cimento: 18.0,
    relacao_ac: 0.20,
    consumo_alvo_m3: 137,
    volume_m3: 0.55,
    densidade_cimento: 3.15,
    aditivos_ml: 0,
    custo_cimento_ton: 0,
    custo_aditivo_lt: 0,
    limites_curva: [],
  };
}

