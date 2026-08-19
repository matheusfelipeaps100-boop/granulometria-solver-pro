import { describe, it, expect } from "vitest";
import { getTipoDosagem } from "@/lib/analysis-data";
import {
  relacaoAC,
  aditivoPctCimento,
  kgCimentoPorM3,
  custoBatelada,
  estimarResistencia24h,
  verificarDadosSuficientes,
  verificarExtrapolacao,
  gerarAlertasComposicaoWetCast,
  gerarTracosCandidatos,
  registrarResultadoReal,
  scoreTracoWetCast,
  META_RESISTENCIA_24H_MPA,
  type WetCastExperiment,
} from "@/lib/wet-cast-optimizer";
import type { SieveData } from "@/lib/granulometry-engine";

// Peneiras padrão do sistema (sieve_id → abertura_mm) — mesmo padrão de laje-optimizer.test.ts
const SIEVES = [
  { sieve_id: 2, abertura_mm: 9.5 },
  { sieve_id: 3, abertura_mm: 6.3 },
  { sieve_id: 4, abertura_mm: 4.8 },
  { sieve_id: 5, abertura_mm: 2.4 },
  { sieve_id: 6, abertura_mm: 1.2 },
  { sieve_id: 7, abertura_mm: 0.6 },
  { sieve_id: 8, abertura_mm: 0.3 },
  { sieve_id: 9, abertura_mm: 0.15 },
  { sieve_id: 10, abertura_mm: 0 },
];

function makeGradations(massaPorAbertura: Record<number, number>): SieveData[] {
  return SIEVES.map((s) => ({
    sieve_id: s.sieve_id,
    abertura_mm: s.abertura_mm,
    massa_retida: massaPorAbertura[s.abertura_mm] ?? 0,
  }));
}

const britaGradations = makeGradations({ 9.5: 200, 6.3: 400, 4.8: 300, 2.4: 100 });
const areiaGradations = makeGradations({ 4.8: 20, 2.4: 100, 1.2: 200, 0.6: 250, 0.3: 250, 0.15: 130, 0: 50 });
const poDePedraGradations = makeGradations({ 0.3: 20, 0.15: 30, 0: 950 });

// Fixtures de teste — números INVENTADOS apenas para validar a lógica do
// motor. Não são os valores reais dos Experimentos A/B (esses só entram
// via seed do banco, com o mapeamento de materiais confirmado pelo usuário).
function makeExperimento(overrides: Partial<WetCastExperiment>): WetCastExperiment {
  return {
    codigo: "X",
    origem: "EXPERIMENTO_REAL",
    status: "VALIDADO_EXPERIMENTALMENTE",
    cimento_kg: 400,
    agua_kg: 180,
    aditivo_kg: 4,
    materiais: [
      { material_id: "brita", proporcao_kg: 900, densidade: 2.7, custo_tonelada: 80, gradations: britaGradations },
      { material_id: "areia", proporcao_kg: 700, densidade: 2.6, custo_tonelada: 60, gradations: areiaGradations },
      { material_id: "po", proporcao_kg: 100, densidade: 2.6, custo_tonelada: 40, gradations: poDePedraGradations },
    ],
    resultado_resistencia_mpa: 26,
    ...overrides,
  };
}

// Experimento A: mais cimento, menor custo esperado de finos
const experimentoA = makeExperimento({
  codigo: "A",
  cimento_kg: 420,
  agua_kg: 189,
  aditivo_kg: 4.2,
  resultado_resistencia_mpa: 27,
});

// Experimento B: menos cimento, mais pó de pedra — composição bem diferente de A
const experimentoB = makeExperimento({
  codigo: "B",
  cimento_kg: 360,
  agua_kg: 162,
  aditivo_kg: 3.6,
  materiais: [
    { material_id: "brita", proporcao_kg: 800, densidade: 2.7, custo_tonelada: 80, gradations: britaGradations },
    { material_id: "areia", proporcao_kg: 600, densidade: 2.6, custo_tonelada: 60, gradations: areiaGradations },
    { material_id: "po", proporcao_kg: 300, densidade: 2.6, custo_tonelada: 40, gradations: poDePedraGradations },
  ],
  resultado_resistencia_mpa: 25.5,
});

describe("getTipoDosagem — roteamento", () => {
  it("laje roteia para WET_CASTING_PROTENDIDO", () => {
    expect(getTipoDosagem("laje")).toBe("WET_CASTING_PROTENDIDO");
  });
  it("paver continua VIBROPRESSADO", () => {
    expect(getTipoDosagem("paver")).toBe("VIBROPRESSADO");
  });
});

describe("relacaoAC / aditivoPctCimento", () => {
  it("calcula a/c corretamente", () => {
    expect(relacaoAC(experimentoA)).toBeCloseTo(189 / 420, 5);
  });
  it("calcula aditivo/cimento corretamente", () => {
    expect(aditivoPctCimento(experimentoA)).toBeCloseTo(4.2 / 420, 5);
  });
});

describe("kgCimentoPorM3 / custoBatelada", () => {
  it("retorna um valor positivo plausível", () => {
    const kg = kgCimentoPorM3(experimentoA);
    expect(kg).toBeGreaterThan(200);
    expect(kg).toBeLessThan(600);
  });
  it("custo da batelada soma cimento + agregados + aditivo", () => {
    const custo = custoBatelada(experimentoA, 700, 8);
    expect(custo).toBeGreaterThan(0);
  });
});

describe("estimarResistencia24h", () => {
  it("com dados insuficientes (<2 pontos) retorna erro", () => {
    const est = estimarResistencia24h(400, [{ kgCimentoPorM3: 400, resistencia_mpa: 27 }]);
    expect("ok" in est && est.ok === false).toBe(true);
  });
  it("com exatamente 2 pontos, reproduz a reta exata nos próprios pontos", () => {
    const pontos = [
      { kgCimentoPorM3: 350, resistencia_mpa: 25.5 },
      { kgCimentoPorM3: 400, resistencia_mpa: 27 },
    ];
    const est1 = estimarResistencia24h(350, pontos);
    const est2 = estimarResistencia24h(400, pontos);
    expect("ok" in est1).toBe(false);
    if (!("ok" in est1) && !("ok" in est2)) {
      expect(est1.resistencia_estimada_mpa).toBeCloseTo(25.5, 4);
      expect(est2.resistencia_estimada_mpa).toBeCloseTo(27, 4);
      expect(est1.confianca).toBe("baixa");
    }
  });
});

describe("verificarDadosSuficientes", () => {
  it("reprova com menos de 2 experimentos reais", () => {
    const erro = verificarDadosSuficientes([experimentoA]);
    expect(erro?.motivo).toBe("DADOS_INSUFICIENTES");
  });
  it("aprova com 2 experimentos reais completos", () => {
    expect(verificarDadosSuficientes([experimentoA, experimentoB])).toBeNull();
  });
  it("reprova experimento sem resultado real", () => {
    const semResultado = makeExperimento({ codigo: "C", resultado_resistencia_mpa: undefined });
    const erro = verificarDadosSuficientes([experimentoA, semResultado]);
    expect(erro?.motivo).toBe("DADOS_INSUFICIENTES");
  });
  it("reprova quando só resta 1 experimento elegível após excluir um com causa conhecida", () => {
    const comCausaConhecida = makeExperimento({
      codigo: "B",
      usar_na_calibragem: false,
      motivo_exclusao_calibragem: "Falha de cura conhecida",
    });
    const erro = verificarDadosSuficientes([experimentoA, comCausaConhecida]);
    expect(erro?.motivo).toBe("DADOS_INSUFICIENTES");
  });
});

describe("verificarExtrapolacao", () => {
  it("marca extrapolação quando cimento está fora da faixa A/B", () => {
    const foraDaFaixa = makeExperimento({ codigo: "X", cimento_kg: 700 });
    const { extrapolacao } = verificarExtrapolacao(foraDaFaixa, [experimentoA, experimentoB]);
    expect(extrapolacao).toBe(true);
  });
  it("não marca extrapolação para um ponto dentro da região A/B", () => {
    const dentro = makeExperimento({ codigo: "X", cimento_kg: 390, agua_kg: 390 * (relacaoAC(experimentoA)) });
    const { extrapolacao } = verificarExtrapolacao(dentro, [experimentoA, experimentoB]);
    expect(extrapolacao).toBe(false);
  });
});

describe("gerarAlertasComposicaoWetCast", () => {
  it("alerta excesso de pó de pedra", () => {
    const materiaisRicosEmPo = [
      { material_id: "po", proporcao_kg: 800, gradations: poDePedraGradations },
      { material_id: "brita", proporcao_kg: 200, gradations: britaGradations },
    ];
    const alertas = gerarAlertasComposicaoWetCast(materiaisRicosEmPo);
    expect(alertas.some((a) => a.toLowerCase().includes("fino"))).toBe(true);
  });
});

describe("scoreTracoWetCast", () => {
  it("candidato abaixo da meta é inválido (score Infinity)", () => {
    const pontos = [
      { kgCimentoPorM3: relacaoAC(experimentoB) as any, resistencia_mpa: 25.5 }, // não usado diretamente
    ];
    void pontos;
    const pontosCalibragem = [experimentoA, experimentoB].map((e) => ({
      kgCimentoPorM3: kgCimentoPorM3(e),
      resistencia_mpa: e.resultado_resistencia_mpa as number,
    }));
    const candidatoFraco = makeExperimento({ codigo: "FRACO", cimento_kg: 150, agua_kg: 100 });
    const resultado = scoreTracoWetCast({
      candidato: candidatoFraco,
      pontosCalibragem,
      custoCimentoTon: 700,
      custoAditivoLt: 8,
    });
    expect(resultado.valido).toBe(false);
    expect(resultado.score).toBe(Infinity);
  });

  it("candidato acima da meta é válido com score finito", () => {
    const pontosCalibragem = [experimentoA, experimentoB].map((e) => ({
      kgCimentoPorM3: kgCimentoPorM3(e),
      resistencia_mpa: e.resultado_resistencia_mpa as number,
    }));
    const resultado = scoreTracoWetCast({
      candidato: experimentoA,
      pontosCalibragem,
      custoCimentoTon: 700,
      custoAditivoLt: 8,
    });
    expect(resultado.valido).toBe(true);
    expect(Number.isFinite(resultado.score)).toBe(true);
    expect(resultado.resistenciaEstimada).toBeGreaterThanOrEqual(META_RESISTENCIA_24H_MPA);
  });
});

describe("gerarTracosCandidatos", () => {
  it("gera candidatos distintos de A, B e da média simples", () => {
    const resultado = gerarTracosCandidatos({
      experimentosReais: [experimentoA, experimentoB],
      custoCimentoTon: 700,
      custoAditivoLt: 8,
      quantidade: 30,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const mediaCimento = (experimentoA.cimento_kg + experimentoB.cimento_kg) / 2;
    resultado.candidatos.forEach((c) => {
      expect(c.cimento_kg).not.toBe(experimentoA.cimento_kg);
      expect(c.cimento_kg).not.toBe(experimentoB.cimento_kg);
      expect(c.cimento_kg).not.toBe(mediaCimento);
      expect(c.origem).toBe("CANDIDATO_GERADO");
      expect(c.status).toBe("SIMULACAO");
    });
    // Garante que nem todos os candidatos convergiram para o mesmo ponto
    // (ex.: colapsaram todos perto da média) — deve haver variação real.
    const cimentos = resultado.candidatos.map((c) => c.cimento_kg);
    const min = Math.min(...cimentos);
    const max = Math.max(...cimentos);
    expect(max - min).toBeGreaterThan(1);
  });

  it("todo candidato gerado atinge a meta de resistência estimada", () => {
    const resultado = gerarTracosCandidatos({
      experimentosReais: [experimentoA, experimentoB],
      custoCimentoTon: 700,
      custoAditivoLt: 8,
      quantidade: 20,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    resultado.candidatos.forEach((c) => {
      expect(c.resistencia_estimada_mpa ?? 0).toBeGreaterThanOrEqual(META_RESISTENCIA_24H_MPA);
    });
  });

  it("com menos de 2 experimentos reais retorna DADOS_INSUFICIENTES", () => {
    const resultado = gerarTracosCandidatos({
      experimentosReais: [experimentoA],
      custoCimentoTon: 700,
      custoAditivoLt: 8,
    });
    expect(resultado.ok).toBe(false);
  });
});

describe("registrarResultadoReal", () => {
  it("transição SIMULAÇÃO → VALIDADO_EXPERIMENTALMENTE quando resultado atinge a meta", () => {
    const candidato = makeExperimento({
      codigo: "CAND-001",
      origem: "CANDIDATO_GERADO",
      status: "CANDIDATO_PARA_ENSAIO",
      resultado_resistencia_mpa: undefined,
      resistencia_estimada_mpa: 26,
    });
    const atualizado = registrarResultadoReal(candidato, 26.5);
    expect(atualizado.status).toBe("VALIDADO_EXPERIMENTALMENTE");
    expect(atualizado.resultado_resistencia_mpa).toBe(26.5);
    expect(atualizado.erro_estimado_vs_real_pct).toBeCloseTo(((26 - 26.5) / 26.5) * 100, 4);
  });

  it("marca REPROVADO quando resultado real fica abaixo da meta", () => {
    const candidato = makeExperimento({
      codigo: "CAND-002",
      origem: "CANDIDATO_GERADO",
      status: "CANDIDATO_PARA_ENSAIO",
      resultado_resistencia_mpa: undefined,
      resistencia_estimada_mpa: 26,
    });
    const atualizado = registrarResultadoReal(candidato, 18);
    expect(atualizado.status).toBe("REPROVADO");
  });
});
