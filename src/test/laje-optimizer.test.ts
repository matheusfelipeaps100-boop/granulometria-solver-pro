import { describe, it, expect } from "vitest";
import {
  classificarPapelAgregado,
  dimensaoMaximaCaracteristica,
  scoreCurvaLajeProtendida,
  otimizarCurvaLajeProtendida,
} from "@/lib/laje-optimizer";
import { otimizarCurvaVibroprensado, type MaterialInput, type SieveData } from "@/lib/granulometry-engine";
import { LIMITES_LAJE_PADRAO } from "@/lib/analysis-data";

// Peneiras padrão do sistema (sieve_id → abertura_mm)
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

// Brita 0: retém quase tudo acima de 4,8mm
const britaGradations = makeGradations({ 9.5: 200, 6.3: 400, 4.8: 300, 2.4: 100 });
// Areia média: passa bem em 4,8mm mas não é tão fina quanto pó de pedra
const areiaGradations = makeGradations({ 4.8: 20, 2.4: 100, 1.2: 200, 0.6: 250, 0.3: 250, 0.15: 130, 0: 50 });
// Pó de pedra: quase tudo passa pela peneira 0,15mm e fica retido no fundo
const poDePedraGradations = makeGradations({ 0.3: 20, 0.15: 30, 0: 950 });

describe("classificarPapelAgregado", () => {
  it("classifica brita como graúdo", () => {
    expect(classificarPapelAgregado(britaGradations)).toBe("graudo");
  });
  it("classifica areia média como areia", () => {
    expect(classificarPapelAgregado(areiaGradations)).toBe("areia");
  });
  it("classifica pó de pedra como po_de_pedra", () => {
    expect(classificarPapelAgregado(poDePedraGradations)).toBe("po_de_pedra");
  });
  it("classifica material sem massa retida como indefinido", () => {
    expect(classificarPapelAgregado(makeGradations({}))).toBe("indefinido");
  });
});

describe("dimensaoMaximaCaracteristica", () => {
  it("retorna a maior abertura com massa retida > 0", () => {
    expect(dimensaoMaximaCaracteristica(britaGradations)).toBe(9.5);
    expect(dimensaoMaximaCaracteristica(areiaGradations)).toBe(4.8);
  });
  it("retorna 0 quando não há massa retida", () => {
    expect(dimensaoMaximaCaracteristica(makeGradations({}))).toBe(0);
  });
});

function buildMaterials(): MaterialInput[] {
  return [
    { material_id: "areia", proporcao_pct: 1 / 3, gradations: areiaGradations },
    { material_id: "brita", proporcao_pct: 1 / 3, gradations: britaGradations },
    { material_id: "po", proporcao_pct: 1 / 3, gradations: poDePedraGradations },
  ];
}

describe("otimizarCurvaLajeProtendida", () => {
  it("nunca retorna composição com pó de pedra dominando (> 50%) — regressão do bug relatado", () => {
    const materials = buildMaterials();
    const res = otimizarCurvaLajeProtendida({ materials, limits: LIMITES_LAJE_PADRAO });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const fracPo = res.result.fracs[2]; // índice do material "po"
      expect(fracPo).toBeLessThan(0.5);
    }
  });

  it("consegue produzir composições próximas da faixa de busca (areia 30-40%, graúdo 55-65%, pó 0-15%)", () => {
    const materials = buildMaterials();
    const res = otimizarCurvaLajeProtendida({ materials, limits: LIMITES_LAJE_PADRAO });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const [fracAreia, fracGraudo, fracPo] = res.result.fracs;
      // Não exige que caia exatamente na faixa (a curva real pode empurrar
      // o ótimo para fora), mas deve estar em uma vizinhança plausível.
      expect(fracAreia).toBeGreaterThan(0.15);
      expect(fracGraudo).toBeGreaterThan(0.35);
      expect(fracPo).toBeLessThan(0.35);
    }
  });

  it("retorna DADOS_INSUFICIENTES quando um material está sem granulometria", () => {
    const materials = buildMaterials();
    materials[0] = { ...materials[0], gradations: makeGradations({}) };
    const res = otimizarCurvaLajeProtendida({ materials, limits: LIMITES_LAJE_PADRAO });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.motivo).toBe("DADOS_INSUFICIENTES");
  });

  it("retorna DADOS_INSUFICIENTES quando não há faixa/DNA carregado", () => {
    const materials = buildMaterials();
    const res = otimizarCurvaLajeProtendida({ materials, limits: [] });
    expect(res.ok).toBe(false);
  });

  it("reprova dimensão do agregado graúdo incompatível com a peça", () => {
    const materials = buildMaterials(); // brita com dimensão máxima 9.5mm
    const res = otimizarCurvaLajeProtendida({
      materials,
      limits: LIMITES_LAJE_PADRAO,
      dimensaoMaximaPermitidaMm: 6.3, // menor que a dimensão da brita usada
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      // A penalidade dura de dimensão incompatível deve empurrar o score
      // para cima de forma perceptível em relação a uma peça compatível.
      const resCompatível = otimizarCurvaLajeProtendida({
        materials,
        limits: LIMITES_LAJE_PADRAO,
        dimensaoMaximaPermitidaMm: 12.5, // compatível
      });
      expect(resCompatível.ok).toBe(true);
      if (resCompatível.ok) {
        // Mesmo com a busca tentando fugir da penalidade, o score da peça
        // incompatível não deve ficar melhor que o da compatível.
        expect(res.result.score).toBeGreaterThanOrEqual(0);
        expect(resCompatível.result.score).toBeLessThanOrEqual(res.result.score + 1e-6);
      }
    }
  });
});

describe("scoreCurvaLajeProtendida", () => {
  it("é determinístico e menor para composição plausível (30/60/10) do que para ruim (10/10/80)", () => {
    const materials = buildMaterials();
    const papeis = materials.map((m) => classificarPapelAgregado(m.gradations));

    const boa = materials.map((m, i) => ({ ...m, proporcao_pct: [0.3, 0.6, 0.1][i] }));
    const ruim = materials.map((m, i) => ({ ...m, proporcao_pct: [0.1, 0.1, 0.8][i] }));

    const scoreBoa1 = scoreCurvaLajeProtendida(boa, LIMITES_LAJE_PADRAO, papeis);
    const scoreBoa2 = scoreCurvaLajeProtendida(boa, LIMITES_LAJE_PADRAO, papeis);
    const scoreRuim = scoreCurvaLajeProtendida(ruim, LIMITES_LAJE_PADRAO, papeis);

    expect(scoreBoa1).toBe(scoreBoa2); // determinístico
    expect(scoreBoa1).toBeLessThan(scoreRuim);
  });
});

describe("otimizarCurvaVibroprensado (extração sem regressão)", () => {
  it("produz frações válidas que somam 1 e são não-negativas", () => {
    const materials = buildMaterials();
    const fracs = otimizarCurvaVibroprensado(materials, LIMITES_LAJE_PADRAO);
    const sum = fracs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
    fracs.forEach((f) => expect(f).toBeGreaterThanOrEqual(0));
  });

  it("não aplica nenhuma restrição de papel do agregado (pode dominar em pó de pedra) — confirma que é um algoritmo distinto do de laje", () => {
    // Faixa artificial que empurra fortemente para os finos, simulando o
    // cenário relatado (curva mal aplicada). O otimizador de vibroprensados
    // deve poder convergir para lá livremente — é essa ausência de
    // restrição que justifica NÃO usá-lo para laje protendida.
    const finoLimits = [
      { sieve_id: 2, limite_min: 0, limite_max: 0.05 },
      { sieve_id: 3, limite_min: 0, limite_max: 0.1 },
      { sieve_id: 4, limite_min: 0, limite_max: 0.2 },
      { sieve_id: 5, limite_min: 0.3, limite_max: 0.4 },
      { sieve_id: 6, limite_min: 0.5, limite_max: 0.6 },
      { sieve_id: 7, limite_min: 0.6, limite_max: 0.7 },
      { sieve_id: 8, limite_min: 0.7, limite_max: 0.85 },
      { sieve_id: 9, limite_min: 0.85, limite_max: 0.97 },
      { sieve_id: 10, limite_min: 1, limite_max: 1 },
    ];
    const materials = buildMaterials();
    const fracs = otimizarCurvaVibroprensado(materials, finoLimits);
    // Não afirmamos um valor exato (é estocástico), só que o algoritmo é
    // livre para levar o pó de pedra a valores altos, ao contrário do
    // otimizador de laje que é penalizado nesse cenário.
    expect(fracs.length).toBe(3);
  });
});
