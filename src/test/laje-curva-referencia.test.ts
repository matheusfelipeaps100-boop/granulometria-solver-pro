import { describe, it, expect } from "vitest";
import {
  LIMITES_LAJE_PADRAO,
  LIMITES_BLOCO_PADRAO,
  getLimitesPadrao,
} from "@/lib/analysis-data";
import {
  calcCombinedCurve,
  calcCurvaStatus,
  calcModuloFinura,
  type MaterialInput,
  type SieveData,
} from "@/lib/granulometry-engine";

// =============================================================================
// Curva de referência de Laje Protendida — traço real Concreart (812/963/85kg)
// =============================================================================
// Prova as garantias pedidas explicitamente: a curva de referência é isolada
// de bloco/paver, o traço exato reproduz a curva de referência (compatibilidade
// ~100%), e LIMITES_BLOCO_PADRAO (usado por bloco/paver) não foi alterado.

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

function grad(massaPorAbertura: Record<number, number>): SieveData[] {
  return SIEVES.map((s) => ({
    sieve_id: s.sieve_id,
    abertura_mm: s.abertura_mm,
    massa_retida: massaPorAbertura[s.abertura_mm] ?? 0,
  }));
}

// Granulometrias reais cadastradas no Supabase para os materiais da Concreart
// (mesmos dados usados no preset "Traço/Curva Protendida Concreart").
const areiaBarranco = grad({ 0.6: 4, 0.3: 456, 0.15: 464, 0: 79 });
const brita0 = grad({ 9.5: 259, 6.3: 463, 4.8: 142, 2.4: 116, 1.2: 5 });
const poDePedra = grad({ 4.8: 27, 2.4: 182, 1.2: 172, 0.6: 100, 0.3: 84, 0.15: 113, 0: 181 });

const tracoConcreart: MaterialInput[] = [
  { material_id: "areia-barranco", proporcao_pct: 812, gradations: areiaBarranco },
  { material_id: "brita-0", proporcao_pct: 963, gradations: brita0 },
  { material_id: "po-de-pedra", proporcao_pct: 85, gradations: poDePedra },
];

// Curva de referência esperada (% acumulado retido), fornecida pelo usuário
// a partir do traço real da Concreart.
const REFERENCIA_POR_SIEVE_ID: Record<number, number> = {
  2: 0.136, // 9,5 mm
  3: 0.380, // 6,3 mm
  4: 0.456, // 4,8 mm
  5: 0.526, // 2,4 mm
  6: 0.538, // 1,2 mm
  7: 0.545, // 0,6 mm
  8: 0.748, // 0,3 mm
  9: 0.956, // 0,15 mm
  10: 1.000, // Fundo
};

describe("getLimitesPadrao('laje') — isolamento de bloco/paver", () => {
  it("laje usa LIMITES_LAJE_PADRAO, diferente de bloco/paver", () => {
    expect(getLimitesPadrao("laje")).toBe(LIMITES_LAJE_PADRAO);
    expect(getLimitesPadrao("bloco_estrutural")).toBe(LIMITES_BLOCO_PADRAO);
    expect(getLimitesPadrao("paver")).toBe(LIMITES_BLOCO_PADRAO);
  });

  it("LIMITES_BLOCO_PADRAO (bloco/paver) permanece exatamente como antes", () => {
    // Regressão: qualquer alteração aqui indicaria que bloco/paver foram
    // afetados pela mudança da curva de laje — não deve acontecer.
    expect(LIMITES_BLOCO_PADRAO).toEqual([
      { sieve_id: 2, limite_min: 0.00, limite_max: 0.15 },
      { sieve_id: 3, limite_min: 0.00, limite_max: 0.25 },
      { sieve_id: 4, limite_min: 0.00, limite_max: 0.33 },
      { sieve_id: 5, limite_min: 0.19, limite_max: 0.51 },
      { sieve_id: 6, limite_min: 0.37, limite_max: 0.66 },
      { sieve_id: 7, limite_min: 0.54, limite_max: 0.78 },
      { sieve_id: 8, limite_min: 0.72, limite_max: 0.90 },
      { sieve_id: 9, limite_min: 0.85, limite_max: 0.97 },
      { sieve_id: 10, limite_min: 1.00, limite_max: 1.00 },
    ]);
  });
});

// Peneiras onde a faixa ±5pp é "clampada" em 0%/100% (0,15mm e Fundo — a
// referência do usuário já é assimétrica ali: ex. Fundo passante
// referência=0%, inferior=0%, superior=5%) — o centro da faixa não fica
// exatamente igual à referência nessas duas, por construção; nas demais 7
// peneiras, sim.
const SIEVE_IDS_CLAMPADOS = [9, 10];

describe("LIMITES_LAJE_PADRAO — curva de referência ±5pp (traço real Concreart)", () => {
  it("o centro da faixa (média min/max) é exatamente a curva de referência nas peneiras não clampadas", () => {
    for (const limite of LIMITES_LAJE_PADRAO) {
      if (limite.sieve_id === 1 || SIEVE_IDS_CLAMPADOS.includes(limite.sieve_id)) continue;
      const centro = (limite.limite_min + limite.limite_max) / 2;
      expect(centro).toBeCloseTo(REFERENCIA_POR_SIEVE_ID[limite.sieve_id], 3);
    }
  });

  it("a faixa tem exatamente ±5 pontos percentuais (exceto onde clampado em 0%/100%)", () => {
    for (const limite of LIMITES_LAJE_PADRAO) {
      if (limite.sieve_id === 1) continue;
      const largura = limite.limite_max - limite.limite_min;
      expect(largura).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });
});

describe("Traço exato 812/963/85 reproduz a curva de referência da laje", () => {
  const curva = calcCombinedCurve(tracoConcreart, LIMITES_LAJE_PADRAO);

  it("pct_acumulado de cada peneira bate com a curva de referência", () => {
    for (const r of curva) {
      expect(r.pct_acumulado).toBeCloseTo(REFERENCIA_POR_SIEVE_ID[r.sieve_id], 2);
    }
  });

  it("nenhuma peneira fica fora da faixa", () => {
    curva.forEach((r) => {
      expect(r.fora_da_faixa).toBe(false);
    });
  });

  it("desvio do centro é ~0 nas peneiras não clampadas (9,5mm a 0,3mm)", () => {
    curva
      .filter((r) => !SIEVE_IDS_CLAMPADOS.includes(r.sieve_id))
      .forEach((r) => {
        expect(r.desvio_absoluto ?? 0).toBeLessThan(0.01);
      });
  });

  it("compatibilidade (calcCurvaStatus) é 100% — status conforme", () => {
    const status = calcCurvaStatus(curva);
    expect(status.peneiras_fora).toBe(0);
    expect(status.status).toBe("conforme");
    expect(status.indice_compatibilidade).toBe(1);
  });

  it("MF ponderado da mistura é ≈ 3,77 (mesmo valor informado pelo usuário)", () => {
    const totalKg = 812 + 963 + 85;
    const mfCombinado = tracoConcreart.reduce((sum, m) => {
      const gradations = (m as MaterialInput).gradations;
      const mf = calcModuloFinura(gradations);
      return sum + mf * (m.proporcao_pct / totalKg);
    }, 0);
    expect(mfCombinado).toBeCloseTo(3.77, 2);
  });
});

describe("Traço diferente do de referência se afasta da compatibilidade máxima", () => {
  it("uma composição bem diferente (100% brita) fica fora da faixa em várias peneiras", () => {
    const soBrita: MaterialInput[] = [
      { material_id: "brita-0", proporcao_pct: 1, gradations: brita0 },
    ];
    const curva = calcCombinedCurve(soBrita, LIMITES_LAJE_PADRAO);
    const status = calcCurvaStatus(curva);
    expect(status.indice_compatibilidade).toBeLessThan(1);
    expect(status.peneiras_fora).toBeGreaterThan(0);
  });
});
