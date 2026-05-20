import { useMemo } from "react";
import { useAnalyses } from "./useAnalyses";
import { useProduction } from "./useProduction";
import { useMaterials } from "./useMaterials";
import { calcularCustoTracoCompleto } from "@/lib/utils";

export interface MonthlyCost {
  month: string;       // "2026-04"
  label: string;       // "Abr/26"
  totalM3: number;
  totalBatelada: number;
  batchCount: number;
  analysisCount: number;
}

export interface CostMetrics {
  /** Média de custo por m³ (últimos 12 meses) */
  mediaCustoM3: number;
  /** Custo total acumulado no mês corrente */
  custoMesAtual: number;
  /** Custo total acumulado no ano corrente */
  custoAnoAtual: number;
  /** Variação % do mês atual vs mês anterior */
  variacaoMensal: number;
  /** Dados mensais (últimos 6 meses) */
  mensais: MonthlyCost[];
  /** Top 5 traços mais caros por m³ */
  topTracos: Array<{ codigo: string; nome: string; custoM3: number; custoTotal: number }>;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${MONTH_LABELS[Number(m) - 1]}/${y.slice(2)}`;
}

/**
 * Hook que agrega métricas de custo a partir das análises existentes.
 * Usa os dados já carregados por useAnalyses e useProduction (sem query extra).
 */
export function useCostMetrics(): CostMetrics & { isLoading: boolean } {
  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { batches, isLoadingBatches } = useProduction();
  const { materials: dbMaterials, isLoading: isLoadingMaterials } = useMaterials();

  const metrics = useMemo<CostMetrics>(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = now.getFullYear();

    // Apenas análises que têm custo salvo (aprovadas/liberadas com custo persistido)
    const analysesWithCost = analyses.filter(
      (a) => a.formData?.custo_total_m3 > 0 || a.formData?.custo_total_batelada > 0
    );

    // Mapa: analysis_id → batch count (para ponderar produção real)
    const batchesByAnalysis = new Map<string, number>();
    for (const b of batches) {
      batchesByAnalysis.set(b.analysis_id, (batchesByAnalysis.get(b.analysis_id) || 0) + 1);
    }

    // Agrupa por mês
    const monthMap = new Map<string, MonthlyCost>();

    for (const a of analysesWithCost) {
      const date = a.data_analise || a.created_at;
      if (!date) continue;
      const ym = date.slice(0, 7); // "2026-04"

      if (!monthMap.has(ym)) {
        monthMap.set(ym, {
          month: ym,
          label: formatMonthLabel(ym),
          totalM3: 0,
          totalBatelada: 0,
          batchCount: 0,
          analysisCount: 0,
        });
      }

      const entry = monthMap.get(ym)!;
      const nBatches = batchesByAnalysis.get(a.id) || 0;

      // Recalcula com preços atuais para garantir consistência com a tabela de detalhamento
      const custos = calcularCustoTracoCompleto({ formData: a.formData, dbMaterials: dbMaterials || [] });
      const custoProd = nBatches > 0
        ? custos.totalBatelada * nBatches
        : custos.totalBatelada;

      entry.totalBatelada += custoProd;
      entry.totalM3 += custos.totalM3;
      entry.batchCount += nBatches;
      entry.analysisCount += 1;
    }

    // Últimos 6 meses
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const mensais: MonthlyCost[] = last6.map((ym) => {
      return monthMap.get(ym) || {
        month: ym,
        label: formatMonthLabel(ym),
        totalM3: 0,
        totalBatelada: 0,
        batchCount: 0,
        analysisCount: 0,
      };
    });

    // Custo mês atual
    const mesAtual = monthMap.get(currentMonth);
    const custoMesAtual = mesAtual?.totalBatelada || 0;

    // Custo ano atual
    const custoAnoAtual = Array.from(monthMap.values())
      .filter((m) => m.month.startsWith(String(currentYear)))
      .reduce((s, m) => s + m.totalBatelada, 0);

    // Variação mensal
    const prevMonth = `${currentMonth === `${currentYear}-01`
      ? `${currentYear - 1}-12`
      : `${currentYear}-${String(now.getMonth()).padStart(2, "0")}`
    }`;
    const custoMesAnterior = monthMap.get(prevMonth)?.totalBatelada || 0;
    const variacaoMensal = custoMesAnterior > 0
      ? ((custoMesAtual - custoMesAnterior) / custoMesAnterior) * 100
      : 0;

    // Média custo m³ recalculada com preços atuais
    const allCustoM3 = analysesWithCost.map((a) => {
      const c = calcularCustoTracoCompleto({ formData: a.formData, dbMaterials: dbMaterials || [] });
      return c.totalM3;
    }).filter((v) => v > 0);
    const mediaCustoM3 = allCustoM3.length > 0
      ? allCustoM3.reduce((s, v) => s + v, 0) / allCustoM3.length
      : 0;

    // Top 5 traços mais caros (ordenado pelo valor total recalculado com preços atuais)
    const topTracos = [...analysesWithCost]
      .map((a) => {
        // Recalcula custo com preços atuais para consistência com o detalhamento
        const custos = calcularCustoTracoCompleto({
          formData: a.formData,
          dbMaterials: dbMaterials || [],
        });
        return {
          codigo: a.codigo,
          nome: a.nome,
          custoM3: custos.totalM3,
          custoTotal: custos.totalBatelada,
        };
      })
      .sort((a, b) => b.custoTotal - a.custoTotal)
      .slice(0, 5);

    return {
      mediaCustoM3: Math.round(mediaCustoM3 * 100) / 100,
      custoMesAtual: Math.round(custoMesAtual * 100) / 100,
      custoAnoAtual: Math.round(custoAnoAtual * 100) / 100,
      variacaoMensal: Math.round(variacaoMensal * 10) / 10,
      mensais,
      topTracos,
    };
  }, [analyses, batches, dbMaterials]);

  return {
    ...metrics,
    isLoading: loadingAnalyses || isLoadingBatches || isLoadingMaterials,
  };
}
