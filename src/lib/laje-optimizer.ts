// =============================================================================
// OTIMIZADOR GRANULOMÉTRICO — LAJE PROTENDIDA / CONCRETO ESTRUTURAL
// =============================================================================
//
// Módulo isolado do motor de vibroprensados (granulometry-engine.ts →
// otimizarCurvaVibroprensado) para não arriscar regressão em bloco/paver/CP.
//
// Contexto: o algoritmo de vibroprensados minimiza apenas o desvio ao centro
// da faixa carregada, sem nenhuma restrição sobre a participação de areia/
// brita/pó de pedra. Aplicado a laje protendida, isso pode convergir para
// composições dominadas por finos (ex.: ~80% pó de pedra), o que não é
// adequado para concreto estrutural.
//
// Este módulo busca uma composição que:
//   1. respeite a curva combinada real dos materiais cadastrados
//      (não inventa proporções fixas nem dados ausentes);
//   2. evite domínio excessivo de pó de pedra;
//   3. verifique a dimensão máxima do agregado graúdo contra a dimensão
//      máxima permitida pelo projeto/geometria da peça, quando informada.
//
// IMPORTANTE: as faixas usadas aqui (LAJE_SEARCH_SEED, LAJE_ALERT_THRESHOLDS)
// são heurísticas internas de busca/alerta — NÃO são exigência normativa da
// ABNT. A composição ótima de fato depende do estudo de dosagem, das
// características reais dos agregados, da geometria da peça, resistência,
// trabalhabilidade e processo produtivo (NBR 7211, 12655, 6118, 9062,
// 14861, 14859-1 orientam requisitos de agregados/concreto/estruturas, não
// uma curva granulométrica única).
// =============================================================================

import {
  calcCombinedCurve,
  calcPctAcumulada,
  type MaterialInput,
  type SieveData,
} from "./granulometry-engine";
import { LAJE_ALERT_THRESHOLDS, LAJE_SEARCH_SEED } from "./analysis-data";

export type PapelAgregado = "graudo" | "areia" | "po_de_pedra" | "indefinido";

/**
 * Classifica o papel de um material na mistura a partir da curva
 * granulométrica REAL digitada pelo usuário (não inventa dados):
 *  - graúdo: pouco passa na peneira 4,8 mm (material retido nas peneiras maiores);
 *  - pó de pedra: quase tudo passa na peneira 0,15 mm (muito fino);
 *  - areia: passa bem em 4,8 mm mas não é tão fino quanto o pó de pedra;
 *  - indefinido: sem massa retida cadastrada (soma zero).
 */
export function classificarPapelAgregado(gradations: SieveData[]): PapelAgregado {
  const total = gradations.reduce((s, g) => s + g.massa_retida, 0);
  if (total === 0) return "indefinido";

  const acum = calcPctAcumulada(gradations);
  const acumEm = (abertura: number) => acum.find((g) => g.abertura_mm === abertura)?.pct_acumulado ?? 0;

  const passante4_8 = 1 - acumEm(4.8);
  const passante0_15 = 1 - acumEm(0.15);

  if (passante4_8 < 0.60) return "graudo";
  if (passante0_15 >= 0.90) return "po_de_pedra";
  return "areia";
}

/**
 * Dimensão máxima característica de um material: maior abertura de peneira
 * com massa retida > 0. Usada para checar compatibilidade com a
 * dimensão_maxima_permitida_mm do projeto (Regra de geometria da peça).
 */
export function dimensaoMaximaCaracteristica(gradations: SieveData[]): number {
  const comMassa = gradations.filter((g) => g.massa_retida > 0);
  if (comMassa.length === 0) return 0;
  return Math.max(...comMassa.map((g) => g.abertura_mm));
}

export const LAJE_SCORE_WEIGHTS = {
  desvioFaixa: 1.0,
  poDePedra: 2.0,
  areia: 1.5,
  graudo: 1.5,
  descontinuidade: 3.0,
  dimensaoIncompativel: 5.0,
} as const;

/**
 * Pontuação de uma composição candidata para Laje Protendida (menor = melhor).
 * Soma ponderada de penalidades — nunca "inventa" compatibilidade apenas
 * pelo menor erro matemático em relação à faixa; penaliza fortemente
 * dimensão incompatível e descontinuidade da curva, que são requisitos
 * estruturais/de execução, não só estatísticos.
 */
export function scoreCurvaLajeProtendida(
  materials: MaterialInput[],
  limits: Array<{ sieve_id: number; limite_min: number; limite_max: number }>,
  papeis: PapelAgregado[],
  dimensaoMaximaPermitidaMm?: number,
  dimensoesMaximasMateriais?: number[]
): number {
  const curve = calcCombinedCurve(materials, limits);

  // 1) Desvio médio ao centro da faixa (pontos percentuais)
  const comFaixa = curve.filter((r) => r.limite_min !== undefined);
  const desvioMedioFaixa =
    comFaixa.length > 0
      ? (comFaixa.reduce((s, r) => s + (r.desvio_absoluto ?? 0), 0) / comFaixa.length) * 100
      : 0;

  // 2) Participação por papel de agregado (fração normalizada)
  const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0) || 1;
  const fracPorPapel = (papel: PapelAgregado) =>
    materials.reduce((s, m, i) => s + (papeis[i] === papel ? m.proporcao_pct : 0), 0) / totalProp;

  const fracPo = fracPorPapel("po_de_pedra");
  const fracAreia = fracPorPapel("areia");
  const fracGraudo = fracPorPapel("graudo");

  const distanciaFaixa = (v: number, min: number, max: number) =>
    v < min ? min - v : v > max ? v - max : 0;

  let penalidadePo = distanciaFaixa(fracPo, LAJE_SEARCH_SEED.poDePedraPct.min, LAJE_SEARCH_SEED.poDePedraPct.max) * 100;
  if (fracPo > LAJE_ALERT_THRESHOLDS.poDePedraMaxPct) penalidadePo *= 2;

  let penalidadeAreia = distanciaFaixa(fracAreia, LAJE_SEARCH_SEED.areiaPct.min, LAJE_SEARCH_SEED.areiaPct.max) * 100;
  if (fracAreia < LAJE_ALERT_THRESHOLDS.areiaMinPct) penalidadeAreia *= 2;

  let penalidadeGraudo = distanciaFaixa(fracGraudo, LAJE_SEARCH_SEED.graudoPct.min, LAJE_SEARCH_SEED.graudoPct.max) * 100;
  if (fracGraudo < LAJE_ALERT_THRESHOLDS.agregadoGraudoMinPct) penalidadeGraudo *= 2;

  // 3) Descontinuidade: peneiras "furadas" (pct_combinado individual == 0)
  // entre duas peneiras com material presente — indica curva descontínua.
  const semZero = curve.filter((r) => r.pct_combinado > 0);
  let penalidadeDescontinuidade = 0;
  for (let i = 0; i < curve.length; i++) {
    if (curve[i].pct_combinado === 0) {
      const antes = curve.slice(0, i).some((r) => r.pct_combinado > 0);
      const depois = curve.slice(i + 1).some((r) => r.pct_combinado > 0);
      if (antes && depois) penalidadeDescontinuidade += 10;
    }
  }
  void semZero;

  // 4) Dimensão máxima incompatível com a peça — penalidade dura (reprovação)
  let penalidadeDimensao = 0;
  if (dimensaoMaximaPermitidaMm && dimensoesMaximasMateriais) {
    materials.forEach((m, i) => {
      if (papeis[i] === "graudo" && dimensoesMaximasMateriais[i] > dimensaoMaximaPermitidaMm) {
        penalidadeDimensao += 50;
      }
    });
  }

  return (
    LAJE_SCORE_WEIGHTS.desvioFaixa * desvioMedioFaixa +
    LAJE_SCORE_WEIGHTS.poDePedra * penalidadePo +
    LAJE_SCORE_WEIGHTS.areia * penalidadeAreia +
    LAJE_SCORE_WEIGHTS.graudo * penalidadeGraudo +
    LAJE_SCORE_WEIGHTS.descontinuidade * penalidadeDescontinuidade +
    LAJE_SCORE_WEIGHTS.dimensaoIncompativel * penalidadeDimensao
  );
}

export interface LajeOptimizeInput {
  materials: MaterialInput[];
  limits: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
  dimensaoMaximaPermitidaMm?: number;
  iteracoesMonteCarlo?: number;
  passosHillClimbing?: number;
}

export interface LajeOptimizeResult {
  fracs: number[]; // proporcao_pct final por material, mesma ordem da entrada
  score: number;
  alertas: string[];
}

export interface LajeOptimizeError {
  ok: false;
  motivo: "DADOS_INSUFICIENTES";
  detalhe: string;
}

/**
 * Verifica se há dados suficientes (granulometria real cadastrada) para
 * otimizar. Regra "não inventar dados": se algum material não tem nenhuma
 * massa retida digitada, ou não há faixa/DNA carregado, aborta.
 */
export function verificarDadosSuficientes(
  materials: MaterialInput[],
  limits: Array<{ sieve_id: number; limite_min: number; limite_max: number }>
): LajeOptimizeError | null {
  if (materials.length === 0) {
    return { ok: false, motivo: "DADOS_INSUFICIENTES", detalhe: "Nenhum material selecionado." };
  }
  if (!limits || limits.length === 0) {
    return {
      ok: false,
      motivo: "DADOS_INSUFICIENTES",
      detalhe: "Nenhuma faixa/DNA de Laje Protendida carregado para comparação.",
    };
  }
  const semGranulometria = materials.filter(
    (m) => m.gradations.reduce((s, g) => s + g.massa_retida, 0) === 0
  );
  if (semGranulometria.length > 0) {
    return {
      ok: false,
      motivo: "DADOS_INSUFICIENTES",
      detalhe: `Material(is) sem granulometria cadastrada: ${semGranulometria
        .map((m) => m.material_id)
        .join(", ")}.`,
    };
  }
  return null;
}

/**
 * Gera alertas de composição (não bloqueantes) a partir dos limiares
 * configuráveis em LAJE_ALERT_THRESHOLDS. Pode ser chamado tanto após a
 * otimização quanto sobre a composição atual editada manualmente.
 */
export function gerarAlertasComposicaoLaje(materials: MaterialInput[], papeis: PapelAgregado[]): string[] {
  const alertas: string[] = [];
  const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0) || 1;
  const fracPorPapel = (papel: PapelAgregado) =>
    materials.reduce((s, m, i) => s + (papeis[i] === papel ? m.proporcao_pct : 0), 0) / totalProp;

  const fracPo = fracPorPapel("po_de_pedra");
  const fracAreia = fracPorPapel("areia");
  const fracGraudo = fracPorPapel("graudo");

  if (fracPo > LAJE_ALERT_THRESHOLDS.poDePedraMaxPct) {
    alertas.push(
      "Composição com excesso de material fino para o modelo de concreto estrutural. Verifique a granulometria dos agregados e o estudo de dosagem."
    );
  }
  if (fracAreia < LAJE_ALERT_THRESHOLDS.areiaMinPct) {
    alertas.push("Baixa participação de agregado miúdo. Verificar continuidade granulométrica e trabalhabilidade.");
  }
  if (fracGraudo < LAJE_ALERT_THRESHOLDS.agregadoGraudoMinPct) {
    alertas.push("Baixa participação de agregado graúdo para o modelo estrutural. Verificar a composição dos agregados.");
  }
  return alertas;
}

/**
 * Otimizador de traço para LAJE_PROTENDIDA. Busca Monte Carlo enviesada
 * pelas faixas de LAJE_SEARCH_SEED por papel do agregado, seguida de
 * hill-climbing, usando scoreCurvaLajeProtendida como critério (não o
 * desvio puro do modelo de vibroprensados).
 */
export function otimizarCurvaLajeProtendida(
  input: LajeOptimizeInput
): { ok: true; result: LajeOptimizeResult } | LajeOptimizeError {
  const { materials, limits, dimensaoMaximaPermitidaMm } = input;
  const iteracoesMonteCarlo = input.iteracoesMonteCarlo ?? 2000;
  const passosHillClimbing = input.passosHillClimbing ?? 500;

  const erro = verificarDadosSuficientes(materials, limits);
  if (erro) return erro;

  const papeis = materials.map((m) => classificarPapelAgregado(m.gradations));
  const dimensoesMaximas = materials.map((m) => dimensaoMaximaCaracteristica(m.gradations));

  if (dimensaoMaximaPermitidaMm) {
    const algumGraudoSemDimensao = materials.some(
      (m, i) => papeis[i] === "graudo" && dimensoesMaximas[i] === 0
    );
    if (algumGraudoSemDimensao) {
      return {
        ok: false,
        motivo: "DADOS_INSUFICIENTES",
        detalhe: "Não é possível verificar a dimensão máxima do agregado graúdo sem granulometria completa.",
      };
    }
  }

  const score = (fracs: number[]) => {
    const testMaterials = materials.map((m, i) => ({ ...m, proporcao_pct: fracs[i] }));
    return scoreCurvaLajeProtendida(testMaterials, limits, papeis, dimensaoMaximaPermitidaMm, dimensoesMaximas);
  };

  // Amostragem enviesada: sorteia dentro da faixa de busca de cada papel
  // (LAJE_SEARCH_SEED) e normaliza — favorece amostras plausíveis em vez de
  // uniformidade cega sobre todos os materiais.
  const rangePorPapel = (papel: PapelAgregado) => {
    if (papel === "areia") return LAJE_SEARCH_SEED.areiaPct;
    if (papel === "graudo") return LAJE_SEARCH_SEED.graudoPct;
    if (papel === "po_de_pedra") return LAJE_SEARCH_SEED.poDePedraPct;
    return { min: 0, max: 1 };
  };

  const amostraEnviesada = (): number[] => {
    const raw = materials.map((_, i) => {
      const { min, max } = rangePorPapel(papeis[i]);
      return min + Math.random() * (max - min || 0.01);
    });
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    return raw.map((v) => v / sum);
  };

  const toFracs = (mats: MaterialInput[]) => {
    const total = mats.reduce((s, m) => s + (m.proporcao_pct ?? 0), 0) || 1;
    return mats.map((m) => (m.proporcao_pct ?? 0) / total);
  };

  let bestFracs = toFracs(materials);
  let bestScore = score(bestFracs);

  for (let i = 0; i < iteracoesMonteCarlo; i++) {
    const fracs = amostraEnviesada();
    const s = score(fracs);
    if (s < bestScore) {
      bestScore = s;
      bestFracs = fracs;
    }
  }

  let current = [...bestFracs];
  for (let step = 0; step < passosHillClimbing; step++) {
    const idx1 = Math.floor(Math.random() * materials.length);
    const idx2 = Math.floor(Math.random() * materials.length);
    if (idx1 === idx2) continue;
    const delta = Math.random() * 0.05 - 0.025;
    const next = [...current];
    next[idx1] += delta;
    next[idx2] -= delta;
    if (next[idx1] < 0 || next[idx2] < 0) continue;
    const s = score(next);
    if (s < bestScore) {
      bestScore = s;
      current = next;
    }
  }

  const finalMaterials = materials.map((m, i) => ({ ...m, proporcao_pct: current[i] }));
  const alertas = gerarAlertasComposicaoLaje(finalMaterials, papeis);

  return { ok: true, result: { fracs: current, score: bestScore, alertas } };
}
