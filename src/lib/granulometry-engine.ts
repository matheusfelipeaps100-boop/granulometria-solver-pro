// =============================================================================
// GRANULOMETRIA SOLVER PRO — Motor de Cálculo (TypeScript)
// Baseado no PRD v3.0 — Seção 6
// Valores validados contra a planilha XLSM original
// =============================================================================

export interface SieveData {
  sieve_id: number;
  abertura_mm: number;
  massa_retida: number;
}

export interface MaterialInput {
  material_id: string;
  proporcao_pct: number; // 0 a 1
  gradations: SieveData[];
}

export interface GradationResult {
  sieve_id: number;
  abertura_mm: number;
  pct_combinado: number;
  pct_acumulado: number;
  limite_min?: number;
  limite_max?: number;
  desvio_absoluto?: number;
  fora_da_faixa: boolean;
}

export interface CurvaStatus {
  status: "conforme" | "atencao" | "nao_conforme";
  peneiras_fora: number;
  indice_compatibilidade: number;
}

export interface RuptureStats {
  tensoes: number[];
  media: number;
  minimo: number;
  maximo: number;
  desvio_padrao: number;
  meta_mpa: number;
  conforme: boolean | null;
  status: "conforme" | "nao_conforme" | "registro";
}

export interface DosageInput {
  relacao_cimento: number;
  relacao_ac: number;
  volume_batelada: number;
  densidade_cimento: number;
  proporcoes_materiais: Array<{ nome: string; proporcao_pct: number }>;
  aditivos_ml: number;
}

export interface DosageResult {
  consumo_cimento_kg: number;
  massa_total_kg: number;
  agua_litros: number;
  traco_final: string;
  materiais_batelada: Array<{ nome: string; kg: number }>;
}

// Peneiras que entram no cálculo do Módulo de Finura
const MF_SIEVES = [4.8, 2.4, 1.2, 0.6, 0.3, 0.15];

/**
 * CÁLCULO 1 — % Individual de cada peneira para um material
 */
export function calcPctIndividual(
  gradations: SieveData[]
): (SieveData & { pct_individual: number })[] {
  const total = gradations.reduce((sum, g) => sum + g.massa_retida, 0);
  if (total === 0)
    return gradations.map((g) => ({ ...g, pct_individual: 0 }));

  return gradations.map((g) => ({
    ...g,
    pct_individual: g.massa_retida / total,
  }));
}

/**
 * CÁLCULO 2 — % Acumulada retida (cumulativa)
 */
export function calcPctAcumulada(gradations: SieveData[]) {
  const withInd = calcPctIndividual(gradations);
  let acum = 0;
  return withInd.map((g) => {
    acum += g.pct_individual;
    return { ...g, pct_acumulado: acum };
  });
}

/**
 * CÁLCULO 3 — Módulo de Finura
 * MF = soma dos % retidos acumulados nas peneiras 4.8, 2.4, 1.2, 0.6, 0.3, 0.15
 */
export function calcModuloFinura(gradations: SieveData[]): number {
  const withAcum = calcPctAcumulada(gradations);
  const mf = withAcum
    .filter((g) => MF_SIEVES.includes(g.abertura_mm))
    .reduce((sum, g) => sum + g.pct_acumulado, 0);
  return Math.round(mf * 10000) / 10000;
}

/**
 * CÁLCULO 4 — Curva combinada da mistura
 */
export function calcCombinedCurve(
  materials: MaterialInput[],
  limits?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>
): GradationResult[] {
  const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0);
  if (totalProp === 0) return [];

  const normalized = materials.map((m) => ({
    ...m,
    proporcao_pct: m.proporcao_pct / totalProp,
  }));

  const sieveMap = new Map<
    number,
    { abertura_mm: number; pct_combinado: number }
  >();

  for (const mat of normalized) {
    const withInd = calcPctIndividual(mat.gradations);
    for (const g of withInd) {
      const current = sieveMap.get(g.sieve_id) ?? {
        abertura_mm: g.abertura_mm,
        pct_combinado: 0,
      };
      sieveMap.set(g.sieve_id, {
        abertura_mm: g.abertura_mm,
        pct_combinado:
          current.pct_combinado + g.pct_individual * mat.proporcao_pct,
      });
    }
  }

  const sorted = [...sieveMap.entries()].sort((a, b) => a[0] - b[0]);
  let acum = 0;

  return sorted.map(([sieve_id, data]) => {
    acum += data.pct_combinado;
    const limit = limits?.find((l) => l.sieve_id === sieve_id);
    const foraMin = limit ? acum < limit.limite_min : false;
    const foraMax = limit ? acum > limit.limite_max : false;

    return {
      sieve_id,
      abertura_mm: data.abertura_mm,
      pct_combinado: data.pct_combinado,
      pct_acumulado: acum,
      limite_min: limit?.limite_min,
      limite_max: limit?.limite_max,
      desvio_absoluto: limit
        ? Math.abs(acum - (limit.limite_min + limit.limite_max) / 2)
        : undefined,
      fora_da_faixa: foraMin || foraMax,
    };
  });
}

/**
 * CÁLCULO 5 — Status da curva combinada
 */
export function calcCurvaStatus(results: GradationResult[]): CurvaStatus {
  const total = results.filter((r) => r.limite_min !== undefined).length;
  const fora = results.filter((r) => r.fora_da_faixa).length;

  return {
    peneiras_fora: fora,
    status:
      fora === 0 ? "conforme" : fora <= 2 ? "atencao" : "nao_conforme",
    indice_compatibilidade: total > 0 ? (total - fora) / total : 1,
  };
}

/**
 * CÁLCULO 6 — Tensão de rompimento
 * Fórmula: Tensão = Força ÷ divisor_a ÷ divisor_b
 */
export function calcTensao(
  forca_kn: number,
  divisor_a = 0.0546,
  divisor_b = 98.0665
): number {
  if (forca_kn <= 0) return 0;
  return Math.round((forca_kn / divisor_a / divisor_b) * 10000) / 10000;
}

/**
 * CÁLCULO 7 — Estatísticas de rompimento
 */
export function calcRuptureStats(
  forcas: number[],
  meta_mpa: number,
  divisor_a = 0.0546,
  divisor_b = 98.0665
): RuptureStats {
  const tensoes = forcas.map((f) => calcTensao(f, divisor_a, divisor_b));
  const media = tensoes.reduce((a, b) => a + b, 0) / tensoes.length;
  const variance =
    tensoes.reduce((v, t) => v + Math.pow(t - media, 2), 0) / tensoes.length;

  return {
    tensoes,
    media: Math.round(media * 10000) / 10000,
    minimo: Math.min(...tensoes),
    maximo: Math.max(...tensoes),
    desvio_padrao: Math.round(Math.sqrt(variance) * 10000) / 10000,
    meta_mpa,
    conforme: meta_mpa > 0 ? media >= meta_mpa : null,
    status:
      meta_mpa > 0
        ? media >= meta_mpa
          ? "conforme"
          : "nao_conforme"
        : "registro",
  };
}

/**
 * CÁLCULO 8 — Dosagem simplificada
 */
export function calcDosage(input: DosageInput): DosageResult {
  const consumo_cimento_kg =
    (input.volume_batelada * input.densidade_cimento) /
    (1 + input.relacao_cimento);
  const agua_litros = consumo_cimento_kg * input.relacao_ac;
  const massa_agregados = consumo_cimento_kg * input.relacao_cimento;
  const massa_total_kg = consumo_cimento_kg + massa_agregados + agua_litros;

  const materiais_batelada = input.proporcoes_materiais.map((m) => ({
    nome: m.nome,
    kg: Math.round(massa_agregados * m.proporcao_pct * 100) / 100,
  }));

  return {
    consumo_cimento_kg: Math.round(consumo_cimento_kg * 100) / 100,
    massa_total_kg: Math.round(massa_total_kg * 100) / 100,
    agua_litros: Math.round(agua_litros * 100) / 100,
    traco_final: `1:${input.relacao_cimento.toFixed(1)}`,
    materiais_batelada,
  };
}
