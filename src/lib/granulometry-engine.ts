/**
 * Normaliza proporcao_pct para garantir soma 1.0
 */
export function normalizeProporcaoPct(proporcao: number | undefined, total: number): number {
  if (typeof proporcao !== 'number' || total === 0) return 0;
  return proporcao / total;
}
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
  coeficiente_variacao: number; // Porcentagem (0-100)
  meta_mpa: number;
  conforme: boolean | null;
  status: "conforme" | "nao_conforme" | "registro";
}

export interface DosageInput {
  relacao_cimento: number;
  relacao_ac: number;
  consumo_alvo_m3: number;
  volume_m3: number; // Volume em metros cúbicos
  densidade_cimento: number; // g/cm3 ou kg/dm3
  proporcoes_materiais: Array<{ nome: string; proporcao_kg: number; proporcao_pct: number; densidade?: number }>;
  aditivos_ml: number;
}

export interface DosageResult {
  consumo_cimento_m3: number; // kg/m³
  consumo_cimento_batelada: number; // kg por batelada
  densidade_efetiva: number; // kg/dm³
  massa_total_m3: number;
  massa_total_batelada: number;
  agua_m3: number; // litros/m³
  agua_batelada: number; // litros na batelada
  traco_final: string;
  materiais_m3: Array<{ nome: string; kg: number }>;
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

  // Peneiras com sieve_id menor que o menor id definido na curva padrão são peneiras
  // maiores que o início da faixa → assume 100% passante (limite_min = limite_max = 1)
  const minDefinedSieveId = limits?.length ? Math.min(...limits.map((l) => l.sieve_id)) : Infinity;

  return sorted.map(([sieve_id, data]) => {
    acum += data.pct_combinado;
    const foundLimit = limits?.find((l) => l.sieve_id === sieve_id);
    const limit = foundLimit ?? (sieve_id < minDefinedSieveId && limits?.length ? { sieve_id, limite_min: 1, limite_max: 1 } : undefined);
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
 * ÁREAS PADRÃO (Líquidas em m²) conforme PRD v3.0
 */
export const AREAS_PADRAO = {
  bloco_14: 0.0546,
  bloco_19: 0.076,
  paver: 0.01,
  cp_10x20: 0.007854,
  custom: 1,
} as const;

/**
 * CÁLCULO 6 — Tensão de rompimento
 * Fórmula: Tensão = Força ÷ divisor_a ÷ divisor_b
 */
export function calcTensao(
  forca_kn: number,
  divisor_a: number = AREAS_PADRAO.bloco_14,
  divisor_b = 98.0665
): number {
  if (forca_kn <= 0) return 0;
  return Math.round((forca_kn / divisor_a / divisor_b) * 10000) / 10000;
}

/**
 * CÁLCULO 6.1 — Tensão de rompimento para Paver
 * Fórmula: Resultado = Tensão × multiplicador_paver
 * Onde Tensão = Força ÷ área_paver ÷ 98.0665
 * E multiplicador_paver é configurável (default 1.729)
 */
export function calcTensaoPaver(
  forca_kn: number,
  multiplicador: number = 1.729,
  divisor_a: number = AREAS_PADRAO.paver,
  divisor_b = 98.0665
): number {
  if (forca_kn <= 0) return 0;
  const tensaoBase = forca_kn / divisor_a / divisor_b;
  return Math.round((tensaoBase * multiplicador) * 10000) / 10000;
}

/**
 * CÁLCULO 7 — Estatísticas de rompimento
 */
export function calcRuptureStats(
  forcas: number[],
  meta_mpa: number,
  divisor_a: number = AREAS_PADRAO.bloco_14,
  divisor_b = 98.0665
): RuptureStats {
  const tensoes = forcas.map((f) => calcTensao(f, divisor_a, divisor_b));
  const media = tensoes.reduce((a, b) => a + b, 0) / tensoes.length;
  const variance =
    tensoes.reduce((v, t) => v + Math.pow(t - media, 2), 0) / tensoes.length;
  
  const desvio_padrao = Math.sqrt(variance);
  const cv = media > 0 ? (desvio_padrao / media) * 100 : 0;

  return {
    tensoes,
    media: Math.round(media * 100) / 100,
    minimo: Math.min(...tensoes),
    maximo: Math.max(...tensoes),
    desvio_padrao: Math.round(desvio_padrao * 100) / 100,
    coeficiente_variacao: Math.round(cv * 100) / 100,
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
 * CÁLCULO 7.1 — Estatísticas de rompimento para Paver
 * Usa calcTensaoPaver com multiplicador configurável
 */
export function calcRuptureStatsPaver(
  forcas: number[],
  meta_mpa: number,
  multiplicador: number = 1.729,
  divisor_a: number = AREAS_PADRAO.paver,
  divisor_b = 98.0665
): RuptureStats {
  const tensoes = forcas.map((f) => calcTensaoPaver(f, multiplicador, divisor_a, divisor_b));
  const media = tensoes.reduce((a, b) => a + b, 0) / tensoes.length;
  const variance =
    tensoes.reduce((v, t) => v + Math.pow(t - media, 2), 0) / tensoes.length;
  
  const desvio_padrao = Math.sqrt(variance);
  const cv = media > 0 ? (desvio_padrao / media) * 100 : 0;

  return {
    tensoes,
    media: Math.round(media * 100) / 100,
    minimo: Math.min(...tensoes),
    maximo: Math.max(...tensoes),
    desvio_padrao: Math.round(desvio_padrao * 100) / 100,
    coeficiente_variacao: Math.round(cv * 100) / 100,
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
 * CÁLCULO 8 — Dosagem Industrial Pro (Baseado em Deslocamento de Volume)
 * Calcula consumo kg/m³ e massa por batelada
 */
export function calcDosage(input: DosageInput): DosageResult {
  const c = input.consumo_alvo_m3 || 0;
  const ac = input.relacao_ac;
  const volBatch = input.volume_m3;

  // Cimento: definido pelo consumo alvo e volume da batelada
  const consumo_cimento_m3 = c;
  const consumo_cimento_batelada = c * volBatch;

  // Água
  const agua_m3 = c * ac;
  const agua_batelada = consumo_cimento_batelada * ac;

  // Agregados: usa proporcao_kg diretamente (absoluto, independente)
  const materiais_batelada = input.proporcoes_materiais.map((m) => ({
    nome: m.nome,
    kg: Math.round(m.proporcao_kg * 10) / 10,
  }));

  const totalAggKg = materiais_batelada.reduce((s, m) => s + m.kg, 0);

  const materiais_m3 = input.proporcoes_materiais.map((m) => ({
    nome: m.nome,
    kg: volBatch > 0 ? Math.round((m.proporcao_kg / volBatch) * 10) / 10 : 0,
  }));

  // Totais
  const massa_total_batelada = consumo_cimento_batelada + totalAggKg + agua_batelada + (input.aditivos_ml / 1000);
  const massa_total_m3 = volBatch > 0 ? massa_total_batelada / volBatch : 0;
  const densidade_efetiva = massa_total_m3 / 1000;

  // Traço calculado utiliza a relação parametrizada ou ajustada na interface
  const relacao_calculada = input.relacao_cimento;

  return {
    consumo_cimento_m3: Math.round(consumo_cimento_m3 * 10) / 10,
    consumo_cimento_batelada: Math.round(consumo_cimento_batelada * 10) / 10,
    densidade_efetiva: Math.round(densidade_efetiva * 100) / 100,
    massa_total_m3: Math.round(massa_total_m3 * 10) / 10,
    massa_total_batelada: Math.round(massa_total_batelada * 10) / 10,
    agua_m3: Math.round(agua_m3 * 10) / 10,
    agua_batelada: Math.round(agua_batelada * 10) / 10,
    traco_final: `1:${relacao_calculada.toFixed(1)}`,
    materiais_m3,
    materiais_batelada,
  };
}

/**
 * CÁLCULO 9 — Relação cimento inversa (Encontrar Traço 1:X a partir do Consumo kg/m³)
 * r = [ (1000 / Consumo) - (1/densC) - ac ] * densA
 */
export function calcRelacaoFromConsumo(
  consumo_alvo_m3: number,
  relacao_ac: number,
  densidade_cimento: number,
  proporcoes_materiais: Array<{ proporcao_pct: number; densidade?: number }>
): number {
  if (consumo_alvo_m3 <= 0) return 8; // default de segurança

  // Densidade média dos agregados
  const densA =
    proporcoes_materiais.reduce(
      (acc, m) => acc + (m.densidade ?? 2.65) * m.proporcao_pct,
      0
    ) || 2.65;

  const termo1 = 1000 / consumo_alvo_m3;
  const termo2 = 1 / densidade_cimento;
  const relacao = (termo1 - termo2 - relacao_ac) * densA;

  return Math.max(1, Math.round(relacao * 10) / 10);
}

/**
 * CÁLCULO 10 — Volume da batelada a partir do cimento desejado
 * Mantém a relação 1:X e densidade fixas; ajusta o volume.
 * consumo = (volume × densidade) ÷ (1 + relacao)
 * → volume = consumo_kg × (1 + relacao) / densidade
 */
export function calcVolumeFromCimento(
  consumo_kg: number,
  relacao_cimento: number,
  densidade_cimento: number
): number {
  if (consumo_kg <= 0 || densidade_cimento <= 0) return 0;
  return Math.round((consumo_kg * (1 + relacao_cimento)) / densidade_cimento);
}

/**
 * CÁLCULO 11 — Volume de batelada pelo método de volumes absolutos
 * Recebe kg de cimento por batelada diretamente e retorna
 * { volume_batelada_m3, consumo_equiv_m3 } para uso em calcDosage.
 */
export function calcVolumeBateladaAbsoluto(
  cimento_kg: number,
  relacao_ac: number,
  densidade_cimento: number,
  materiais: Array<{ proporcao_kg: number; densidade?: number }>
): { volume_batelada_m3: number; consumo_equiv_m3: number } {
  const agua_kg = cimento_kg * relacao_ac;
  const vol_cim = densidade_cimento > 0 ? cimento_kg / (densidade_cimento * 1000) : 0;
  const vol_agua = agua_kg / 1000;
  const vol_agg = materiais.reduce(
    (s, m) => s + (m.proporcao_kg ?? 0) / ((m.densidade ?? 2.65) * 1000), 0
  );
  const volume_batelada_m3 = vol_cim + vol_agua + vol_agg;
  const consumo_equiv_m3 = volume_batelada_m3 > 0 ? cimento_kg / volume_batelada_m3 : 0;
  return { volume_batelada_m3, consumo_equiv_m3 };
}
