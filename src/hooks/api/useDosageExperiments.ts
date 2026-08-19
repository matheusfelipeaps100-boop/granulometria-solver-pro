// =============================================================================
// HOOK — Estudo de Dosagem (Wet Casting) — dosage_experiments
// =============================================================================
// Padrão de src/hooks/api/useMaterials.ts. Busca os experimentos reais e
// candidatos gerados/persistidos da organização, montando WetCastExperiment
// (src/lib/wet-cast-optimizer.ts) a partir de dosage_experiments +
// dosage_experiment_materials + a granulometria base de cada material
// (materials → material_gradations), a mesma curva usada no wizard.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type {
  WetCastExperiment,
  DosageExperimentStatus,
  DosageExperimentOrigem,
} from "@/lib/wet-cast-optimizer";
import type { SieveData } from "@/lib/granulometry-engine";

interface DosageExperimentRow {
  id: string;
  codigo: string;
  origem: DosageExperimentOrigem;
  status: DosageExperimentStatus;
  cimento_kg: number;
  agua_kg: number;
  aditivo_kg: number;
  densidade_cimento: number | null;
  resultado_resistencia_mpa: number | null;
  resistencia_estimada_mpa: number | null;
  confianca_estimativa: "baixa" | "media" | "alta" | null;
  erro_estimado_vs_real_pct: number | null;
  score: number | null;
  extrapolacao: boolean | null;
  extrapolacao_motivo: string | null;
  alertas: string[] | null;
  usar_na_calibragem: boolean;
  motivo_exclusao_calibragem: string | null;
  produto_nome: string | null;
  observacoes: string | null;
  dosage_experiment_materials: Array<{
    material_id: string;
    proporcao_kg: number;
    ordem: number | null;
    materials: {
      nome: string;
      densidade: number | null;
      custo_tonelada: number | null;
      material_gradations: Array<{ sieve_id: number; massa_retida: number }>;
    } | null;
  }>;
}

// Peneiras padrão do sistema — mesmo mapa de PENEIRAS_PADRAO (analysis-data.ts)
const ABERTURA_POR_SIEVE_ID: Record<number, number> = {
  1: 12.5, 2: 9.5, 3: 6.3, 4: 4.8, 5: 2.4, 6: 1.2, 7: 0.6, 8: 0.3, 9: 0.15, 10: 0,
};

function toGradations(rows: Array<{ sieve_id: number; massa_retida: number }>): SieveData[] {
  return rows.map((g) => ({
    sieve_id: g.sieve_id,
    abertura_mm: ABERTURA_POR_SIEVE_ID[g.sieve_id] ?? 0,
    massa_retida: g.massa_retida ?? 0,
  }));
}

function rowToExperiment(row: DosageExperimentRow): WetCastExperiment {
  return {
    id: row.id,
    codigo: row.codigo,
    origem: row.origem,
    status: row.status,
    cimento_kg: Number(row.cimento_kg),
    agua_kg: Number(row.agua_kg),
    aditivo_kg: Number(row.aditivo_kg),
    densidade_cimento: row.densidade_cimento != null ? Number(row.densidade_cimento) : 3.15,
    resultado_resistencia_mpa: row.resultado_resistencia_mpa != null ? Number(row.resultado_resistencia_mpa) : undefined,
    resistencia_estimada_mpa: row.resistencia_estimada_mpa != null ? Number(row.resistencia_estimada_mpa) : undefined,
    confianca_estimativa: row.confianca_estimativa ?? undefined,
    erro_estimado_vs_real_pct: row.erro_estimado_vs_real_pct != null ? Number(row.erro_estimado_vs_real_pct) : undefined,
    score: row.score != null ? Number(row.score) : undefined,
    extrapolacao: row.extrapolacao ?? undefined,
    extrapolacao_motivo: row.extrapolacao_motivo ?? undefined,
    alertas: row.alertas ?? undefined,
    usar_na_calibragem: row.usar_na_calibragem,
    motivo_exclusao_calibragem: row.motivo_exclusao_calibragem ?? undefined,
    materiais: (row.dosage_experiment_materials || [])
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((m) => ({
        material_id: m.material_id,
        nome: m.materials?.nome,
        proporcao_kg: Number(m.proporcao_kg),
        densidade: m.materials?.densidade ?? undefined,
        custo_tonelada: m.materials?.custo_tonelada ?? undefined,
        gradations: toGradations(m.materials?.material_gradations || []),
      })),
  };
}

const SELECT_EXPERIMENT = `
  id, codigo, origem, status, cimento_kg, agua_kg, aditivo_kg, densidade_cimento,
  resultado_resistencia_mpa, resistencia_estimada_mpa, confianca_estimativa,
  erro_estimado_vs_real_pct, score, extrapolacao, extrapolacao_motivo, alertas,
  usar_na_calibragem, motivo_exclusao_calibragem, produto_nome, observacoes,
  dosage_experiment_materials (
    material_id, proporcao_kg, ordem,
    materials ( nome, densidade, custo_tonelada, material_gradations ( sieve_id, massa_retida ) )
  )
`;

export function useDosageExperiments() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["dosage_experiments", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dosage_experiments")
        .select(SELECT_EXPERIMENT)
        .order("origem", { ascending: false }) // EXPERIMENTO_REAL antes de CANDIDATO_GERADO
        .order("codigo");

      if (error) throw error;
      return data as unknown as DosageExperimentRow[];
    },
    enabled: !!orgId,
  });

  const experimentos = rows.map(rowToExperiment);
  const experimentosReais = experimentos.filter((e) => e.origem === "EXPERIMENTO_REAL");
  const candidatosPersistidos = experimentos.filter((e) => e.origem === "CANDIDATO_GERADO");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dosage_experiments", orgId] });

  /**
   * Persiste um candidato gerado (promovido a "CANDIDATO_PARA_ENSAIO" ou
   * além) — grava o experimento + seus materiais. Não recalibra nada, só
   * salva o snapshot já calculado pelo motor (gerarTracosCandidatos).
   */
  const salvarCandidatoMutation = useMutation({
    mutationFn: async (candidato: WetCastExperiment) => {
      const { data: exp, error: expError } = await supabase
        .from("dosage_experiments")
        .insert([{
          organization_id: orgId,
          codigo: candidato.codigo,
          origem: candidato.origem,
          status: candidato.status,
          cimento_kg: candidato.cimento_kg,
          agua_kg: candidato.agua_kg,
          aditivo_kg: candidato.aditivo_kg,
          densidade_cimento: candidato.densidade_cimento ?? 3.15,
          resistencia_estimada_mpa: candidato.resistencia_estimada_mpa,
          confianca_estimativa: candidato.confianca_estimativa,
          score: candidato.score,
          extrapolacao: candidato.extrapolacao,
          extrapolacao_motivo: candidato.extrapolacao_motivo,
          alertas: candidato.alertas ?? [],
        }])
        .select("id")
        .single();
      if (expError) throw expError;

      const materiais = candidato.materiais.map((m, i) => ({
        experiment_id: exp.id,
        material_id: m.material_id,
        proporcao_kg: m.proporcao_kg,
        ordem: i,
      }));
      const { error: matError } = await supabase.from("dosage_experiment_materials").insert(materiais);
      if (matError) throw matError;

      return exp;
    },
    onSuccess: invalidate,
  });

  /**
   * Registra o resultado real de resistência de um experimento/candidato
   * testado. Não recalibra o modelo — apenas grava o resultado, o erro
   * estimado-vs-real e o novo status (fora de escopo desta entrega).
   */
  const registrarResultadoMutation = useMutation({
    mutationFn: async ({
      id,
      resultado_resistencia_mpa,
      status,
      erro_estimado_vs_real_pct,
    }: {
      id: string;
      resultado_resistencia_mpa: number;
      status: DosageExperimentStatus;
      erro_estimado_vs_real_pct?: number;
    }) => {
      const { error } = await supabase
        .from("dosage_experiments")
        .update({ resultado_resistencia_mpa, status, erro_estimado_vs_real_pct })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    experimentos,
    experimentosReais,
    candidatosPersistidos,
    isLoading,
    error,
    salvarCandidato: salvarCandidatoMutation.mutateAsync,
    isSalvandoCandidato: salvarCandidatoMutation.isPending,
    registrarResultado: registrarResultadoMutation.mutateAsync,
    isRegistrandoResultado: registrarResultadoMutation.isPending,
  };
}
