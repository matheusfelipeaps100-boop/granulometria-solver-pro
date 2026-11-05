import { calcularCustoMaterial } from "@/lib/utils";

// Linha da receita (1 traço) de uma análise de laje
export interface ReceitaLajeItem {
  key: string;
  material: string;
  unidade: "kg" | "L" | "mL";
  previsto: number;
  custoUnit: number;
  destaque: boolean;
}

export const fmtReceita = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const parseNumReceita = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

interface AcoMaterial {
  custo_valor?: number | null;
  custo_tonelada?: number | null;
  custo_unidade?: string | null;
  densidade?: number | null;
}

/** Receita prevista de 1 traço, com custo unitário de cada material. */
export function buildReceitaLaje(fd: any, acoDb?: AcoMaterial | null): ReceitaLajeItem[] {
  const cimento = fd.consumo_alvo_m3 || 0;
  const custoAcoKg = acoDb
    ? calcularCustoMaterial({
        custo_valor: acoDb.custo_valor ?? acoDb.custo_tonelada ?? 0,
        custo_unidade: acoDb.custo_unidade || "kg",
        quantidade: 1,
        densidade: acoDb.densidade ?? undefined,
      })
    : 0;
  return [
    { key: "cimento", material: "Cimento", unidade: "kg", previsto: cimento, custoUnit: (fd.custo_cimento_ton || 0) / 1000, destaque: true },
    ...(fd.materiais_selecionados ?? []).map((m: any, i: number): ReceitaLajeItem => ({
      key: `mat-${i}`,
      material: m.nome,
      unidade: "kg",
      previsto: m.proporcao_kg ?? 0,
      custoUnit: (m.custo_tonelada ?? 0) / 1000,
      destaque: false,
    })),
    { key: "agua", material: "Água", unidade: "L", previsto: cimento * (fd.relacao_ac || 0), custoUnit: 0, destaque: false },
    { key: "aditivo", material: "Aditivo", unidade: "mL", previsto: fd.aditivos_ml || 0, custoUnit: (fd.custo_aditivo_lt || 0) / 1000, destaque: false },
    { key: "aco", material: "Aço", unidade: "kg", previsto: fd.aco_quantidade_kg || 0, custoUnit: custoAcoKg, destaque: false },
  ];
}

/** Massa que vai ao misturador (aço fica fora: vai na pista). */
export function massaTraco<T extends { key: string; unidade: string }>(itens: T[], valor: (i: T) => number) {
  return itens.reduce((s, i) => (i.key === "aco" ? s : s + (i.unidade === "mL" ? valor(i) / 1000 : valor(i))), 0);
}
