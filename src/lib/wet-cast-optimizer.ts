// =============================================================================
// MOTOR DE ESTUDO DE DOSAGEM — LAJE PROTENDIDA (WET CASTING)
// =============================================================================
//
// Caminho ativo para tipo_analise = "laje" (TipoDosagem "WET_CASTING_PROTENDIDO").
// Substitui laje-optimizer.ts (que assumia extrusão) para este produto.
//
// Contexto: o processo real de fabricação é Wet Casting (concreto fresco/
// plástico moldado), meta de 25 MPa em 24 horas. Não existe uma "curva
// ideal" fixa — dois traços experimentais reais (A e B), com composições e
// custos bem diferentes entre si, atingem a meta. Este módulo:
//   1. calibra uma estimativa de resistência aos 24h a partir dos pontos
//      experimentais reais disponíveis (nunca inventa uma fórmula física);
//   2. gera e ranqueia traços candidatos na região delimitada pelos
//      experimentos reais, buscando reduzir cimento/custo sem violar a meta;
//   3. sinaliza extrapolação e baixa confiança sempre que a base experimental
//      for pequena — nenhum candidato é apresentado como "validado" só por
//      cálculo, apenas por ensaio real registrado.
//
// Fora de escopo desta entrega: recalibração automática do modelo de
// estimativa, motor de cálculo sobre cura/concreto fresco (campos de
// registro simples), alteração de rupture_schedules/idade em dias.
// =============================================================================

import {
  calcCombinedCurve,
  calcVolumeBateladaAbsoluto,
  type MaterialInput,
  type SieveData,
} from "./granulometry-engine";
import { calcularCustoMaterial } from "./utils";
import {
  classificarPapelAgregado,
  dimensaoMaximaCaracteristica,
  type PapelAgregado,
} from "./laje-optimizer";

export type { PapelAgregado };

// ── Limiares de ALERTA da composição de agregados — Wet Casting ──
// IMPORTANTE: não são exigência normativa da ABNT — são parâmetros internos
// de controle, configuráveis, para sinalizar composições tecnicamente
// suspeitas (excesso de finos, pouca areia, pouco graúdo).
export const WET_CAST_ALERT_THRESHOLDS = {
  poDePedraMaxPct: 0.50,
  areiaMinPct: 0.20,
  graudoMinPct: 0.30,
} as const;

// Meta confirmada pelo usuário: acima de 20 MPa aos 24h (não 25 — valor do
// plano original foi corrigido nesta sessão a partir dos dados reais).
export const META_RESISTENCIA_24H_MPA = 20;

/** Filtra os experimentos elegíveis para calibrar o modelo cimento×resistência
 * e para delimitar a região de busca de candidatos (exclui experimentos com
 * causa conhecida marcados usar_na_calibragem === false). */
export function experimentosParaCalibragem(experimentos: WetCastExperiment[]): WetCastExperiment[] {
  return experimentos.filter((e) => e.usar_na_calibragem !== false);
}

export type DosageExperimentStatus =
  | "SIMULACAO"
  | "CANDIDATO_PARA_ENSAIO"
  | "EM_ENSAIO"
  | "VALIDADO_EXPERIMENTALMENTE"
  | "REPROVADO";

export type DosageExperimentOrigem = "EXPERIMENTO_REAL" | "CANDIDATO_GERADO";

export interface WetCastMaterialComposicao {
  material_id: string;
  nome?: string;
  proporcao_kg: number; // kg absolutos na batelada
  densidade?: number; // kg/dm³ (g/cm³)
  custo_tonelada?: number;
  gradations: SieveData[];
}

export interface WetCastExperiment {
  id?: string; // id no banco (dosage_experiments.id) — ausente em candidatos ainda não persistidos
  codigo: string; // "A", "B", ou gerado para candidatos
  origem: DosageExperimentOrigem;
  status: DosageExperimentStatus;
  cimento_kg: number;
  agua_kg: number;
  aditivo_kg: number;
  materiais: WetCastMaterialComposicao[]; // agregados, sem cimento/água/aditivo
  densidade_cimento?: number; // default 3.15
  resultado_resistencia_mpa?: number; // ensaio real registrado (24h)
  resistencia_estimada_mpa?: number;
  confianca_estimativa?: "baixa" | "media" | "alta";
  erro_estimado_vs_real_pct?: number;
  extrapolacao?: boolean;
  extrapolacao_motivo?: string;
  score?: number;
  alertas?: string[];
  // Experimento real com causa conhecida (execução/cura/adensamento) que
  // explica um resultado fora do esperado — fica registrado no histórico
  // (comparação, status) mas é excluído da calibragem cimento×resistência e
  // da região de busca de candidatos. Default true (entra na calibragem).
  usar_na_calibragem?: boolean;
  motivo_exclusao_calibragem?: string;
}

// ── Derivados simples de um experimento ──
export function relacaoAC(exp: Pick<WetCastExperiment, "cimento_kg" | "agua_kg">): number {
  return exp.cimento_kg > 0 ? exp.agua_kg / exp.cimento_kg : 0;
}

export function aditivoPctCimento(exp: Pick<WetCastExperiment, "cimento_kg" | "aditivo_kg">): number {
  return exp.cimento_kg > 0 ? exp.aditivo_kg / exp.cimento_kg : 0;
}

/**
 * Volume da batelada pelo método de volumes absolutos, reaproveitando
 * calcVolumeBateladaAbsoluto (granulometry-engine.ts) — não duplica a
 * lógica de cálculo de volume.
 */
export function volumeBateladaM3(exp: WetCastExperiment): number {
  const densidadeCimento = exp.densidade_cimento ?? 3.15;
  const { volume_batelada_m3 } = calcVolumeBateladaAbsoluto(
    exp.cimento_kg,
    relacaoAC(exp),
    densidadeCimento,
    exp.materiais.map((m) => ({ proporcao_kg: m.proporcao_kg, densidade: m.densidade }))
  );
  // Aditivo tem massa pequena e densidade próxima de 1 — soma direta em m³.
  return volume_batelada_m3 + exp.aditivo_kg / 1000;
}

export function kgCimentoPorM3(exp: WetCastExperiment): number {
  const vol = volumeBateladaM3(exp);
  return vol > 0 ? exp.cimento_kg / vol : 0;
}

/**
 * Custo total da batelada (R$), reaproveitando calcularCustoMaterial
 * (utils.ts) — não duplica lógica de custo já usada por StepDosage.tsx.
 */
export function custoBatelada(
  exp: WetCastExperiment,
  custoCimentoTon: number,
  custoAditivoLt: number
): number {
  const densidadeCimento = exp.densidade_cimento ?? 3.15;
  const custoCimento = calcularCustoMaterial({
    custo_valor: custoCimentoTon,
    custo_unidade: "tonelada",
    quantidade: exp.cimento_kg,
    densidade: densidadeCimento,
  });
  const custoAgregados = exp.materiais.reduce(
    (s, m) =>
      s +
      calcularCustoMaterial({
        custo_valor: m.custo_tonelada ?? 0,
        custo_unidade: "tonelada",
        quantidade: m.proporcao_kg,
        densidade: m.densidade,
      }),
    0
  );
  // custoAditivoLt é R$/litro; densidade do aditivo ~1 kg/L (aproximação usual).
  const custoAditivo = custoAditivoLt > 0 ? custoAditivoLt * exp.aditivo_kg : 0;
  return custoCimento + custoAgregados + custoAditivo;
}

export function custoPorM3(exp: WetCastExperiment, custoCimentoTon: number, custoAditivoLt: number): number {
  const vol = volumeBateladaM3(exp);
  return vol > 0 ? custoBatelada(exp, custoCimentoTon, custoAditivoLt) / vol : 0;
}

export interface IndicadoresWetCast {
  kgCimentoPorM3: number;
  custoM3: number;
  kgCimentoPorMpa24h: number | null; // null se sem resistência (estimada ou real)
  custoPorMpa24h: number | null;
  economiaVsA_pct: number | null;
  economiaVsB_pct: number | null;
}

export function calcularIndicadoresWetCast(
  exp: WetCastExperiment,
  custoCimentoTon: number,
  custoAditivoLt: number,
  expA?: WetCastExperiment,
  expB?: WetCastExperiment
): IndicadoresWetCast {
  const kgCim = kgCimentoPorM3(exp);
  const custoM3 = custoPorM3(exp, custoCimentoTon, custoAditivoLt);
  const resistencia = exp.resultado_resistencia_mpa ?? exp.resistencia_estimada_mpa ?? null;

  const economiaVs = (ref?: WetCastExperiment): number | null => {
    if (!ref) return null;
    const custoRef = custoPorM3(ref, custoCimentoTon, custoAditivoLt);
    if (custoRef <= 0) return null;
    return ((custoRef - custoM3) / custoRef) * 100;
  };

  return {
    kgCimentoPorM3: kgCim,
    custoM3,
    kgCimentoPorMpa24h: resistencia && resistencia > 0 ? kgCim / resistencia : null,
    custoPorMpa24h: resistencia && resistencia > 0 ? custoM3 / resistencia : null,
    economiaVsA_pct: economiaVs(expA),
    economiaVsB_pct: economiaVs(expB),
  };
}

// ── Estimativa de resistência aos 24h ──

export interface PontoCalibragem {
  kgCimentoPorM3: number;
  resistencia_mpa: number;
}

export interface EstimativaResistencia {
  resistencia_estimada_mpa: number;
  confianca: "baixa" | "media" | "alta";
}

/**
 * Regressão linear simples resistência(24h) ~ f(kg cimento/m³), calibrada
 * pelos pontos experimentais reais disponíveis. Com poucos pontos (o caso
 * típico desta entrega — 2 a 3 experimentos reais), a confiança é sempre
 * "baixa" e a UI deve rotular como "RESISTÊNCIA ESTIMADA (não validada)" —
 * nunca "resistência" isolado. Recalibração automática fica fora de escopo.
 */
export function estimarResistencia24h(
  kgCimentoM3: number,
  pontos: PontoCalibragem[]
): EstimativaResistencia | { ok: false; motivo: "DADOS_INSUFICIENTES" } {
  if (pontos.length < 2) {
    return { ok: false, motivo: "DADOS_INSUFICIENTES" };
  }

  const n = pontos.length;
  const mediaX = pontos.reduce((s, p) => s + p.kgCimentoPorM3, 0) / n;
  const mediaY = pontos.reduce((s, p) => s + p.resistencia_mpa, 0) / n;
  const somaXY = pontos.reduce((s, p) => s + (p.kgCimentoPorM3 - mediaX) * (p.resistencia_mpa - mediaY), 0);
  const somaXX = pontos.reduce((s, p) => s + (p.kgCimentoPorM3 - mediaX) ** 2, 0);

  // Pontos com cimento idêntico (ex.: 2 pontos iguais em x) — não dá para
  // extrair inclinação; usa a média das resistências como estimativa plana.
  const b1 = somaXX > 0 ? somaXY / somaXX : 0;
  const b0 = mediaY - b1 * mediaX;

  const resistencia_estimada_mpa = b0 + b1 * kgCimentoM3;

  // Confiança sempre "baixa" nesta entrega — poucos pontos, sem
  // recalibração automática (ver cabeçalho do módulo).
  return { resistencia_estimada_mpa: Math.max(0, resistencia_estimada_mpa), confianca: "baixa" };
}

function frac(materiais: WetCastMaterialComposicao[], papeis: PapelAgregado[], papel: PapelAgregado): number {
  const total = materiais.reduce((s, m) => s + m.proporcao_kg, 0) || 1;
  return materiais.reduce((s, m, i) => s + (papeis[i] === papel ? m.proporcao_kg : 0), 0) / total;
}

/**
 * Marca extrapolação: candidato fora do min/max observado nas variáveis
 * relevantes (kg cimento/m³, a/c, fração de cada papel de agregado) dos
 * experimentos reais/calibração. Não bloqueia — reduz apenas a confiança.
 */
export function verificarExtrapolacao(
  candidato: WetCastExperiment,
  referencias: WetCastExperiment[]
): { extrapolacao: boolean; motivo?: string } {
  if (referencias.length === 0) return { extrapolacao: true, motivo: "Sem experimentos reais de referência." };

  const motivos: string[] = [];
  const kgCim = kgCimentoPorM3(candidato);
  const kgCimRefs = referencias.map(kgCimentoPorM3);
  if (kgCim < Math.min(...kgCimRefs) || kgCim > Math.max(...kgCimRefs)) {
    motivos.push("consumo de cimento fora da faixa dos experimentos reais");
  }

  const ac = relacaoAC(candidato);
  const acRefs = referencias.map(relacaoAC);
  if (ac < Math.min(...acRefs) || ac > Math.max(...acRefs)) {
    motivos.push("relação a/c fora da faixa dos experimentos reais");
  }

  const papeisCand = candidato.materiais.map((m) => classificarPapelAgregado(m.gradations));
  (["po_de_pedra", "areia", "graudo"] as PapelAgregado[]).forEach((papel) => {
    const fCand = frac(candidato.materiais, papeisCand, papel);
    const fRefs = referencias.map((r) => frac(r.materiais, r.materiais.map((m) => classificarPapelAgregado(m.gradations)), papel));
    if (fCand < Math.min(...fRefs) || fCand > Math.max(...fRefs)) {
      motivos.push(`participação de ${papel.replace("_", " ")} fora da faixa dos experimentos reais`);
    }
  });

  return motivos.length > 0
    ? { extrapolacao: true, motivo: motivos.join("; ") }
    : { extrapolacao: false };
}

export function gerarAlertasComposicaoWetCast(materiais: WetCastMaterialComposicao[]): string[] {
  const papeis = materiais.map((m) => classificarPapelAgregado(m.gradations));
  const alertas: string[] = [];
  const fPo = frac(materiais, papeis, "po_de_pedra");
  const fAreia = frac(materiais, papeis, "areia");
  const fGraudo = frac(materiais, papeis, "graudo");

  if (fPo > WET_CAST_ALERT_THRESHOLDS.poDePedraMaxPct) {
    alertas.push("Composição com excesso de material fino (pó de pedra). Verifique risco de aumento de água/aditivo e custo.");
  }
  if (fAreia < WET_CAST_ALERT_THRESHOLDS.areiaMinPct) {
    alertas.push("Baixa participação de areia. Verificar trabalhabilidade e risco de segregação/exsudação.");
  }
  if (fGraudo < WET_CAST_ALERT_THRESHOLDS.graudoMinPct) {
    alertas.push("Baixa participação de agregado graúdo (brita). Verificar consumo de cimento e custo.");
  }
  return alertas;
}

// ── Verificação de dados suficientes ──
export interface WetCastDataError {
  ok: false;
  motivo: "DADOS_INSUFICIENTES";
  detalhe: string;
}

export function verificarDadosSuficientes(
  experimentosReais: WetCastExperiment[]
): WetCastDataError | null {
  const elegiveis = experimentosParaCalibragem(experimentosReais);
  if (elegiveis.length < 2) {
    return {
      ok: false,
      motivo: "DADOS_INSUFICIENTES",
      detalhe:
        "É necessário ao menos 2 experimentos reais elegíveis para calibragem (excluindo os marcados com causa conhecida) para calibrar o modelo e gerar candidatos.",
    };
  }
  const semResultado = elegiveis.filter((e) => e.resultado_resistencia_mpa == null);
  if (semResultado.length > 0) {
    return {
      ok: false,
      motivo: "DADOS_INSUFICIENTES",
      detalhe: `Experimento(s) sem resultado real de resistência registrado: ${semResultado
        .map((e) => e.codigo)
        .join(", ")}.`,
    };
  }
  const semGranulometria = elegiveis.flatMap((e) => e.materiais).filter(
    (m) => m.gradations.reduce((s, g) => s + g.massa_retida, 0) === 0
  );
  if (semGranulometria.length > 0) {
    return {
      ok: false,
      motivo: "DADOS_INSUFICIENTES",
      detalhe: "Há material sem granulometria cadastrada em algum experimento real elegível.",
    };
  }
  return null;
}

// ── Score de um candidato ──
export const WET_CAST_SCORE_WEIGHTS = {
  cimento: 1.0,
  custo: 1.0,
  descontinuidade: 3.0,
  dimensaoIncompativel: 10.0,
  po: 1.5,
  areia: 1.0,
  graudo: 1.0,
} as const;

export interface ScoreWetCastInput {
  candidato: WetCastExperiment;
  pontosCalibragem: PontoCalibragem[];
  metaMpa?: number;
  custoCimentoTon: number;
  custoAditivoLt: number;
  limits?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
  dimensaoMaximaPermitidaMm?: number;
}

/**
 * Pontuação de um traço candidato (menor = melhor). Candidato cuja
 * resistência estimada não atinge a meta é marcado inválido (score
 * Infinity) — nunca escolhido, mesmo que barato. Reaproveita
 * calcCombinedCurve (granulometry-engine.ts) para penalizar descontinuidade
 * quando uma faixa/DNA é informada.
 */
export function scoreTracoWetCast(input: ScoreWetCastInput): { score: number; resistenciaEstimada: number; valido: boolean } {
  const { candidato, pontosCalibragem, custoCimentoTon, custoAditivoLt, limits, dimensaoMaximaPermitidaMm } = input;
  const metaMpa = input.metaMpa ?? META_RESISTENCIA_24H_MPA;

  const est = estimarResistencia24h(kgCimentoPorM3(candidato), pontosCalibragem);
  if ("ok" in est) return { score: Infinity, resistenciaEstimada: 0, valido: false };

  if (est.resistencia_estimada_mpa < metaMpa) {
    return { score: Infinity, resistenciaEstimada: est.resistencia_estimada_mpa, valido: false };
  }

  const cimentoScore = kgCimentoPorM3(candidato) * WET_CAST_SCORE_WEIGHTS.cimento;
  const custoScore = custoPorM3(candidato, custoCimentoTon, custoAditivoLt) * WET_CAST_SCORE_WEIGHTS.custo;

  const papeis = candidato.materiais.map((m) => classificarPapelAgregado(m.gradations));
  const fPo = frac(candidato.materiais, papeis, "po_de_pedra");
  const fAreia = frac(candidato.materiais, papeis, "areia");
  const fGraudo = frac(candidato.materiais, papeis, "graudo");

  let penalidadePo = fPo > WET_CAST_ALERT_THRESHOLDS.poDePedraMaxPct ? (fPo - WET_CAST_ALERT_THRESHOLDS.poDePedraMaxPct) * 1000 : 0;
  let penalidadeAreia = fAreia < WET_CAST_ALERT_THRESHOLDS.areiaMinPct ? (WET_CAST_ALERT_THRESHOLDS.areiaMinPct - fAreia) * 1000 : 0;
  let penalidadeGraudo = fGraudo < WET_CAST_ALERT_THRESHOLDS.graudoMinPct ? (WET_CAST_ALERT_THRESHOLDS.graudoMinPct - fGraudo) * 1000 : 0;

  let penalidadeDescontinuidade = 0;
  if (limits && limits.length > 0) {
    const asMaterialInput: MaterialInput[] = candidato.materiais.map((m) => ({
      material_id: m.material_id,
      proporcao_pct: m.proporcao_kg,
      gradations: m.gradations,
    }));
    const totalKg = asMaterialInput.reduce((s, m) => s + m.proporcao_pct, 0) || 1;
    asMaterialInput.forEach((m) => (m.proporcao_pct = m.proporcao_pct / totalKg));
    const curve = calcCombinedCurve(asMaterialInput, limits);
    for (let i = 0; i < curve.length; i++) {
      if (curve[i].pct_combinado === 0) {
        const antes = curve.slice(0, i).some((r) => r.pct_combinado > 0);
        const depois = curve.slice(i + 1).some((r) => r.pct_combinado > 0);
        if (antes && depois) penalidadeDescontinuidade += 10 * WET_CAST_SCORE_WEIGHTS.descontinuidade;
      }
    }
  }

  let penalidadeDimensao = 0;
  if (dimensaoMaximaPermitidaMm) {
    candidato.materiais.forEach((m, i) => {
      if (papeis[i] === "graudo" && dimensaoMaximaCaracteristica(m.gradations) > dimensaoMaximaPermitidaMm) {
        penalidadeDimensao += WET_CAST_SCORE_WEIGHTS.dimensaoIncompativel * 50;
      }
    });
  }

  const score =
    cimentoScore +
    custoScore +
    penalidadeDescontinuidade +
    penalidadeDimensao +
    penalidadePo * WET_CAST_SCORE_WEIGHTS.po +
    penalidadeAreia * WET_CAST_SCORE_WEIGHTS.areia +
    penalidadeGraudo * WET_CAST_SCORE_WEIGHTS.graudo;

  return { score, resistenciaEstimada: est.resistencia_estimada_mpa, valido: true };
}

// ── Geração de candidatos ──
export interface GerarCandidatosInput {
  experimentosReais: WetCastExperiment[]; // A, B, ...
  custoCimentoTon: number;
  custoAditivoLt: number;
  quantidade?: number; // nº de candidatos a gerar (default 200)
  limits?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
  dimensaoMaximaPermitidaMm?: number;
  metaMpa?: number;
}

/**
 * Gera traços candidatos por amostragem Monte Carlo na região delimitada
 * pelos experimentos reais (min/max de cimento, a/c, aditivo/cimento e
 * fração de cada material), seguida de hill climbing pelo score. Nunca
 * repete A, B, nem a simples média entre eles.
 */
export function gerarTracosCandidatos(
  input: GerarCandidatosInput
): { ok: true; candidatos: WetCastExperiment[] } | WetCastDataError {
  const erro = verificarDadosSuficientes(input.experimentosReais);
  if (erro) return erro;

  const { experimentosReais, custoCimentoTon, custoAditivoLt, limits, dimensaoMaximaPermitidaMm } = input;
  const metaMpa = input.metaMpa ?? META_RESISTENCIA_24H_MPA;
  const quantidade = input.quantidade ?? 200;

  // Experimentos com causa conhecida (usar_na_calibragem === false) ficam de
  // fora tanto da calibragem cimento×resistência quanto da região de busca —
  // não faz sentido gerar candidatos numa faixa de composição associada a um
  // resultado que se sabe não refletir o comportamento esperado do traço.
  const elegiveis = experimentosParaCalibragem(experimentosReais);

  const pontosCalibragem: PontoCalibragem[] = elegiveis.map((e) => ({
    kgCimentoPorM3: kgCimentoPorM3(e),
    resistencia_mpa: e.resultado_resistencia_mpa as number,
  }));

  const cimentoRange = {
    min: Math.min(...elegiveis.map((e) => e.cimento_kg)),
    max: Math.max(...elegiveis.map((e) => e.cimento_kg)),
  };
  const acRange = {
    min: Math.min(...elegiveis.map(relacaoAC)),
    max: Math.max(...elegiveis.map(relacaoAC)),
  };
  const aditivoRange = {
    min: Math.min(...elegiveis.map(aditivoPctCimento)),
    max: Math.max(...elegiveis.map(aditivoPctCimento)),
  };

  // Base de materiais: usa o experimento com mais materiais como referência
  // de quais materiais/papéis existem (mesmos materiais reais cadastrados,
  // proporções variam).
  const base = elegiveis.reduce((a, b) => (a.materiais.length >= b.materiais.length ? a : b));

  const materialFracRanges = base.materiais.map((_, i) => {
    const fracs = elegiveis
      .filter((e) => e.materiais[i])
      .map((e) => e.materiais[i].proporcao_kg / e.materiais.reduce((s, m) => s + m.proporcao_kg, 0));
    return { min: Math.min(...fracs) * 0.7, max: Math.max(...fracs) * 1.3 };
  });

  const gerarAleatorio = (): WetCastExperiment => {
    const cimento_kg = cimentoRange.min + Math.random() * (cimentoRange.max - cimentoRange.min || 1);
    const ac = acRange.min + Math.random() * (acRange.max - acRange.min || 0.01);
    const aditivoPct = aditivoRange.min + Math.random() * (aditivoRange.max - aditivoRange.min || 0.001);
    const rawFracs = base.materiais.map((_, i) => {
      const { min, max } = materialFracRanges[i];
      return Math.max(0, min + Math.random() * (max - min || 0.01));
    });
    const sumFrac = rawFracs.reduce((a, b) => a + b, 0) || 1;
    const agregadosTotalKg = cimento_kg * 3; // ordem de grandeza plausível vs. experimentos reais
    const materiais = base.materiais.map((m, i) => ({
      ...m,
      proporcao_kg: (rawFracs[i] / sumFrac) * agregadosTotalKg,
    }));
    return {
      codigo: "",
      origem: "CANDIDATO_GERADO",
      status: "SIMULACAO",
      cimento_kg,
      agua_kg: cimento_kg * ac,
      aditivo_kg: cimento_kg * aditivoPct,
      materiais,
    };
  };

  const avaliar = (cand: WetCastExperiment) =>
    scoreTracoWetCast({ candidato: cand, pontosCalibragem, metaMpa, custoCimentoTon, custoAditivoLt, limits, dimensaoMaximaPermitidaMm });

  const candidatos: WetCastExperiment[] = [];
  const vistos = new Set<string>();
  const chave = (c: WetCastExperiment) => `${Math.round(c.cimento_kg)}-${Math.round(relacaoAC(c) * 1000)}`;

  let tentativas = 0;
  while (candidatos.length < quantidade && tentativas < quantidade * 20) {
    tentativas++;
    const cand = gerarAleatorio();
    const k = chave(cand);
    if (vistos.has(k)) continue;
    const avaliacao = avaliar(cand);
    if (!avaliacao.valido) continue;
    vistos.add(k);
    cand.score = avaliacao.score;
    cand.resistencia_estimada_mpa = avaliacao.resistenciaEstimada;
    cand.confianca_estimativa = "baixa";
    const extrap = verificarExtrapolacao(cand, elegiveis);
    cand.extrapolacao = extrap.extrapolacao;
    cand.extrapolacao_motivo = extrap.motivo;
    cand.alertas = gerarAlertasComposicaoWetCast(cand.materiais);
    candidatos.push(cand);
  }

  candidatos.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
  candidatos.forEach((c, i) => {
    c.codigo = `CAND-${String(i + 1).padStart(3, "0")}`;
  });

  return { ok: true, candidatos };
}

/**
 * Registra o resultado real de resistência de um experimento/candidato
 * testado, calcula o erro estimado-vs-real e atualiza o status. Não
 * recalibra o modelo automaticamente (fora de escopo desta entrega).
 */
export function registrarResultadoReal(
  exp: WetCastExperiment,
  resultadoRealMpa: number,
  metaMpa: number = META_RESISTENCIA_24H_MPA
): WetCastExperiment {
  const erro_estimado_vs_real_pct =
    exp.resistencia_estimada_mpa && exp.resistencia_estimada_mpa > 0
      ? ((exp.resistencia_estimada_mpa - resultadoRealMpa) / resultadoRealMpa) * 100
      : undefined;
  const status: DosageExperimentStatus = resultadoRealMpa >= metaMpa ? "VALIDADO_EXPERIMENTALMENTE" : "REPROVADO";
  return { ...exp, resultado_resistencia_mpa: resultadoRealMpa, erro_estimado_vs_real_pct, status };
}
