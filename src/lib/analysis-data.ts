// =============================================================================
// Analysis Interfaces & Types (Remove mock data — use API hooks instead)
// =============================================================================

import type { SieveData } from "./granulometry-engine";

// ── Product Interface ──
export interface Product {
  id: string;
  nome: string;
  tipo_produto: "bloco_estrutural" | "bloco_vedacao" | "paver" | "cp" | "laje";
  dimensoes: string;
  resistencia_referencia: number;
  ativo: boolean;
  created_at: string;
}

export interface AnalysisFormData {
  id?: string;
  // Step 1 — Identification
  tipo_analise: "bloco_estrutural" | "bloco_vedacao" | "paver" | "cp" | "laje" | "";
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
  // Override manual da dimensão máxima do agregado permitida pelo projeto (mm),
  // usado no modelo LAJE_PROTENDIDA. Quando ausente, cai para o valor do DNA.
  dimensao_maxima_permitida_mm?: number;
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

// Limites normativos padrão para Lajes Protendidas — curva de máxima
// compacidade para concreto seco de extrusão/vibroacabadora (espelho do seed
// 017_seed_laje_curve.sql, DNA "ABNT – Laje Protendida (Extrusão)").
// Independente da curva de vibroprensados acima.
// Usados como fallback quando o banco não retorna standard_curve_items.
export const LIMITES_LAJE_PADRAO: Array<{ sieve_id: number; limite_min: number; limite_max: number }> = [
  { sieve_id: 1,  limite_min: 0.00, limite_max: 0.00 },
  { sieve_id: 2,  limite_min: 0.04, limite_max: 0.06 },
  { sieve_id: 3,  limite_min: 0.16, limite_max: 0.20 },
  { sieve_id: 4,  limite_min: 0.26, limite_max: 0.30 },
  { sieve_id: 5,  limite_min: 0.40, limite_max: 0.44 },
  { sieve_id: 6,  limite_min: 0.56, limite_max: 0.60 },
  { sieve_id: 7,  limite_min: 0.72, limite_max: 0.76 },
  { sieve_id: 8,  limite_min: 0.86, limite_max: 0.90 },
  { sieve_id: 9,  limite_min: 0.94, limite_max: 0.98 },
  { sieve_id: 10, limite_min: 1.00, limite_max: 1.00 },
];

// Seleciona a curva de referência (fallback local) de acordo com o tipo de
// produto/análise. Vibroprensados (bloco_estrutural, bloco_vedacao, paver,
// cp, etc.) usam a curva atual; Lajes Protendidas usam a curva própria.
// Ponto único de decisão — novas famílias de produto (tubos, postes,
// vigotas, pilares, estacas...) só precisam de uma nova entrada aqui.
export function getLimitesPadrao(tipo?: string): Array<{ sieve_id: number; limite_min: number; limite_max: number }> {
  if (tipo === "laje") return LIMITES_LAJE_PADRAO;
  return LIMITES_BLOCO_PADRAO;
}

// TODO: Load from Supabase using useProfiles() hook
export const ANALISTAS = [];

// Tipos de análise
export const TIPOS_ANALISE = [
  { value: "bloco_estrutural", label: "Bloco Estrutural" },
  { value: "bloco_vedacao", label: "Bloco de Vedação" },
  { value: "paver", label: "Paver" },
  { value: "cp", label: "Corpo de Prova (CP)" },
  { value: "laje", label: "Laje" },
];

// Configuração centralizada da capacidade do misturador por tipo de análise
export const CONFIG_MISTURADOR: Record<string, { capacidade_kg: number; volume_m3: number }> = {
  bloco_estrutural: { capacidade_kg: 550,  volume_m3: 0.55 },
  bloco_vedacao:    { capacidade_kg: 550,  volume_m3: 0.55 },
  paver:            { capacidade_kg: 550,  volume_m3: 0.55 },
  cp:               { capacidade_kg: 550,  volume_m3: 0.55 },
  laje:             { capacidade_kg: 2500, volume_m3: 1.00 },
};

export function getConfigMisturador(tipo: string) {
  return CONFIG_MISTURADOR[tipo] ?? CONFIG_MISTURADOR.bloco_estrutural;
}

// =============================================================================
// Modelo de dosagem/otimização — separa a família de produto usada para
// ESCOLHER o algoritmo de otimização granulométrica.
//
// VIBROPRESSADO         → concreto seco de blocos/pavers/CP (algoritmo atual,
//                          busca o centro da faixa sem restrição de papel do agregado).
// LAJE_PROTENDIDA        → (DEPRECADO como caminho ativo) modelo antigo que
//                          assumia laje protendida como concreto seco de
//                          extrusão/vibroacabadora (ver src/lib/laje-optimizer.ts).
//                          O processo real é Wet Casting — preservado no código
//                          e testável, mas não é mais usado pela UI para "laje".
// WET_CASTING_PROTENDIDO → concreto estrutural fresco/plástico moldado de
//                          lajes/vigotas/painéis protendidos, meta 25 MPa em
//                          24h (algoritmo próprio, ver src/lib/wet-cast-optimizer.ts).
//                          Caminho ativo para tipo_analise = "laje".
//
// Estrutura extensível: para adicionar novas famílias no futuro, basta
// ampliar o union type e o mapa abaixo — nenhum código consumidor precisa
// de novos if/else.
// =============================================================================
export type TipoDosagem = "VIBROPRESSADO" | "LAJE_PROTENDIDA" | "WET_CASTING_PROTENDIDO";

const TIPO_ANALISE_TO_DOSAGEM: Record<string, TipoDosagem> = {
  bloco_estrutural: "VIBROPRESSADO",
  bloco_vedacao: "VIBROPRESSADO",
  paver: "VIBROPRESSADO",
  cp: "VIBROPRESSADO",
  laje: "WET_CASTING_PROTENDIDO", // era LAJE_PROTENDIDA — processo real é Wet Casting
};

export function getTipoDosagem(tipoAnalise?: string): TipoDosagem {
  return TIPO_ANALISE_TO_DOSAGEM[tipoAnalise ?? ""] ?? "VIBROPRESSADO";
}

// Limiares de ALERTA da composição de agregados para Laje Protendida.
// IMPORTANTE: não são exigência normativa da ABNT — são parâmetros internos
// de controle do algoritmo/UI, configuráveis, para sinalizar composições
// tecnicamente suspeitas (excesso de finos, pouca areia, pouco graúdo).
export const LAJE_ALERT_THRESHOLDS = {
  poDePedraMaxPct: 0.50,
  areiaMinPct: 0.20,
  agregadoGraudoMinPct: 0.40,
} as const;

// Ponto de partida da BUSCA do otimizador de Laje Protendida.
// IMPORTANTE: não são limites normativos da ABNT — apenas restringem o
// espaço de busca inicial do algoritmo para impedir que ele encontre
// soluções ricas em finos (como o modelo de vibroprensados faz). O
// algoritmo pode se afastar dessas faixas conforme as curvas reais dos
// materiais cadastrados e o resultado da pontuação (score).
export const LAJE_SEARCH_SEED = {
  areiaPct: { min: 0.30, max: 0.40 },
  graudoPct: { min: 0.55, max: 0.65 },
  poDePedraPct: { min: 0.00, max: 0.15 },
} as const;

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
    consumo_alvo_m3: 50,
    volume_m3: 0.55,
    densidade_cimento: 3.15,
    aditivos_ml: 0,
    custo_cimento_ton: 0,
    custo_aditivo_lt: 0,
    limites_curva: [],
  };
}

