import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

// A listagem geral de useRuptures() não traz os testes/amostras junto
// (só o detalhe de um schedule individual traz) — o relatório mensal
// precisa agregar todos os testes do período, então busca sua própria
// versão já com tests/samples embutidos.
export function useRuptureSchedulesWithTests() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["rupture_schedules_with_tests", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rupture_schedules")
        .select(`
          *,
          batch:production_batches (
            id,
            batch_code,
            produced_at,
            status,
            notas,
            analyses (nome, codigo, produto, tipo)
          ),
          tests:rupture_tests (
            *,
            samples:rupture_samples (*)
          )
        `)
        .order("data_prevista", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });
}

export interface MonthlyReport {
  id: string;
  ano: number;
  mes: number;
  conclusao: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useMonthlyReport(ano: number, mes: number) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: report, isLoading } = useQuery({
    queryKey: ["monthly-report", orgId, ano, mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("ano", ano)
        .eq("mes", mes)
        .maybeSingle();

      if (error) throw error;
      return data as MonthlyReport | null;
    },
    enabled: !!orgId,
  });

  const saveConclusaoMutation = useMutation({
    mutationFn: async (conclusao: string) => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .upsert(
          {
            organization_id: orgId,
            ano,
            mes,
            conclusao,
            responsavel_id: profile?.id,
            created_by: profile?.id,
          },
          { onConflict: "organization_id,ano,mes" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as MonthlyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-report", orgId, ano, mes] });
    },
  });

  return {
    report,
    isLoading,
    saveConclusao: saveConclusaoMutation.mutateAsync,
    isSaving: saveConclusaoMutation.isPending,
  };
}
