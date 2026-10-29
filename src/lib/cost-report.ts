// =============================================================================
// Relatório de Custos — custo de cada lote de produção, separado por segmento.
// Lote com receita real informada (laje) usa o custo real pesado; os demais
// são estimados pelo custo previsto do traço × nº de traços.
// =============================================================================

import type { DBProductionBatch } from "@/hooks/api/useProduction";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";
import { calcularCustoTracoCompleto } from "./utils";

export type SegmentoCusto = "laje" | "bloco_paver";

export interface LoteCusto {
  id: string;
  lote: string;
  analiseCodigo: string;
  analiseNome: string;
  produto: string;
  data: string; // ISO
  origem: "real" | "estimado";
  // Real com todos os materiais (exceto água) informados
  realCompleto: boolean;
  tracos: number;
  concretoM3: number;
  comprimentoM: number | null;
  total: number;
  porM3: number | null;
  porMetro: number | null;
  previstoPorM3: number;
  // Composição do custo real por material (só lotes reais)
  composicao: Array<{ material: string; custo: number }>;
}

export const segmentoDoTipo = (tipo?: string | null): SegmentoCusto =>
  tipo === "laje" ? "laje" : "bloco_paver";

export function calcularCustosLotes(
  batches: DBProductionBatch[],
  analyses: StoredAnalysis[],
  dbMaterials: any[]
): Array<LoteCusto & { segmento: SegmentoCusto }> {
  const analysesById = new Map(analyses.map((a) => [a.id, a]));

  return batches.map((b) => {
    const analysis = analysesById.get(b.analysis_id);
    const segmento = segmentoDoTipo(b.analyses?.tipo ?? analysis?.tipo);
    const custos = calcularCustoTracoCompleto({ formData: analysis?.formData, dbMaterials });
    const volTraco = custos.totalM3 > 0 ? custos.totalBatelada / custos.totalM3 : 0;

    // Concreto e nº de traços: laje usa os dados da pista; bloco/paver, a batelada
    const concretoInformado =
      segmento === "laje" ? Number(b.volume_concreto_m3) || 0 : (Number(b.volume_produzido) || 0) / 1000;
    const tracos =
      b.num_tracos && b.num_tracos > 0
        ? b.num_tracos
        : segmento === "laje" && concretoInformado > 0 && volTraco > 0
          ? Math.max(1, Math.round(concretoInformado / volTraco))
          : 1;
    const concretoM3 = concretoInformado > 0 ? concretoInformado : tracos * volTraco;

    const receita = b.receita_real ?? [];
    const composicao = receita
      .filter((i) => i.custo != null && i.custo > 0)
      .map((i) => ({ material: i.material, custo: i.custo as number }));
    const custoReal = composicao.reduce((s, i) => s + i.custo, 0);
    const origem = custoReal > 0 ? "real" : "estimado";
    const realCompleto =
      origem === "real" && receita.filter((i) => i.material !== "Água" && i.previsto > 0).every((i) => i.real != null);

    const total = origem === "real" ? custoReal : custos.totalBatelada * tracos;
    const comprimentoM = Number(b.comprimento_pista_m) > 0 ? Number(b.comprimento_pista_m) : null;

    return {
      id: b.id,
      segmento,
      lote: b.batch_code,
      analiseCodigo: b.analyses?.codigo ?? analysis?.codigo ?? "—",
      analiseNome: b.analyses?.nome ?? analysis?.nome ?? "—",
      produto: b.analyses?.produto || analysis?.produto || "Sem produto",
      data: b.produced_at,
      origem,
      realCompleto,
      tracos,
      concretoM3,
      comprimentoM,
      total,
      porM3: concretoM3 > 0 ? total / concretoM3 : null,
      porMetro: comprimentoM ? total / comprimentoM : null,
      previstoPorM3: custos.totalM3,
      composicao,
    };
  });
}
