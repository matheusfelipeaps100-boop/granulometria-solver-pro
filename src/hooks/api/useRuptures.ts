import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../useAuth";
export type ScheduleStatus = "pendente" | "em_andamento" | "concluido" | "atrasado" | "ignorado";

export interface DBRuptureSchedule {
  id: string;
  batch_id: string;
  idade_dias: number;
  data_prevista: string;
  data_executada: string | null;
  status: ScheduleStatus;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  created_at: string;
  batch?: {
    id: string;
    batch_code: string;
    produced_at: string;
    status: string;
    analyses?: {
      nome: string;
      codigo: string;
      produto: string | null;
      tipo: string | null;
    };
  };
}

export interface DBRuptureTest {
  id: string;
  schedule_id: string;
  tipo_amostra: string;
  meta_mpa: number | null;
  media_mpa: number | null;
  min_mpa: number | null;
  max_mpa: number | null;
  desvio_padrao: number | null;
  status: string;
  notas: string | null;
  samples?: DBRuptureSample[];
}

export interface DBRuptureSample {
  id: string;
  test_id: string;
  numero: number;
  forca_kn: number | null;
  tensao_mpa: number | null;
  status: string | null;
}

export function useRuptures() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["rupture_schedules", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("rupture_schedules")
        .select(`
          *,
          batch:production_batches (
            id,
            batch_code,
            produced_at,
            status,
            analyses (nome, codigo, produto, tipo)
          )
        `)
        .order("data_prevista", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const getScheduleDetail = async (scheduleId: string) => {
    const { data: schedule, error: sError } = await supabase
      .from("rupture_schedules")
      .select(`
        *,
        batch:production_batches (
          id,
          batch_code,
          produced_at,
          status,
          analyses (id, nome, codigo, tipo, resistencia_prevista)
        )
      `)
      .eq("id", scheduleId)
      .single();

    if (sError) throw sError;

    const { data: tests, error: tError } = await supabase
      .from("rupture_tests")
      .select(`
        *,
        samples:rupture_samples (*)
      `)
      .eq("schedule_id", scheduleId);

    if (tError) throw tError;

    return { ...schedule, tests: tests || [] };
  };

  const completeRuptureMutation = useMutation({
    mutationFn: async ({ 
      scheduleId, 
      dataExecutada, 
      testData 
    }: { 
      scheduleId: string; 
      dataExecutada: string; 
      testData: {
        tipo_amostra: string;
        meta_mpa: number;
        media_mpa: number;
        min_mpa: number;
        max_mpa: number;
        desvio_padrao: number;
        status: string;
        notas?: string;
        samples: {
          numero: number;
          forca_kn: number;
          tensao_mpa: number;
          status: string;
        }[];
      }
    }) => {
      // 1. Atualizar Schedule
      const { error: sError } = await supabase
        .from("rupture_schedules")
        .update({
          status: "concluido",
          data_executada: dataExecutada,
          responsavel_id: profile?.id,
          responsavel_nome: profile?.nome
        })
        .eq("id", scheduleId);

      if (sError) throw sError;

      // 2. Criar Teste
      const { data: test, error: tError } = await supabase
        .from("rupture_tests")
        .insert([{
          schedule_id: scheduleId,
          tipo_amostra: testData.tipo_amostra,
          meta_mpa: testData.meta_mpa,
          media_mpa: testData.media_mpa,
          min_mpa: testData.min_mpa,
          max_mpa: testData.max_mpa,
          desvio_padrao: testData.desvio_padrao,
          status: testData.status,
          notas: testData.notas
        }])
        .select()
        .single();

      if (tError) throw tError;

      // 3. Criar Samples
      const samplesToInsert = testData.samples.map(s => ({
        test_id: test.id,
        numero: s.numero,
        forca_kn: s.forca_kn,
        peso_kg: (s as any).peso_kg ?? null,
        tensao_mpa: s.tensao_mpa,
        status: s.status,
        registrado_por: profile?.id
      }));

      const { error: smError } = await supabase
        .from("rupture_samples")
        .insert(samplesToInsert);

      if (smError) throw smError;

      return { scheduleId, test };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
    }
  });

  const finalizeWithCurrentTestMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      batchId,
      dataExecutada,
      motivo,
      testData
    }: {
      scheduleId: string;
      batchId: string;
      dataExecutada: string;
      motivo: string;
      testData: {
        tipo_amostra: string;
        meta_mpa: number;
        media_mpa: number;
        min_mpa: number;
        max_mpa: number;
        desvio_padrao: number;
        status: string;
        notas?: string;
        samples: { numero: number; forca_kn: number; tensao_mpa: number; status: string }[];
      };
    }) => {
      // 1. Marcar schedule atual como concluído
      const { error: sError } = await supabase
        .from("rupture_schedules")
        .update({ status: "concluido", data_executada: dataExecutada, responsavel_id: profile?.id, responsavel_nome: profile?.nome })
        .eq("id", scheduleId);
      if (sError) throw sError;

      // 2. Criar o teste de rompimento
      const { data: test, error: tError } = await supabase
        .from("rupture_tests")
        .insert([{ schedule_id: scheduleId, tipo_amostra: testData.tipo_amostra, meta_mpa: testData.meta_mpa, media_mpa: testData.media_mpa, min_mpa: testData.min_mpa, max_mpa: testData.max_mpa, desvio_padrao: testData.desvio_padrao, status: testData.status, notas: testData.notas }])
        .select().single();
      if (tError) throw tError;

      // 3. Inserir amostras
      const { error: smError } = await supabase
        .from("rupture_samples")
        .insert(testData.samples.map(s => ({ test_id: test.id, numero: s.numero, forca_kn: s.forca_kn, peso_kg: (s as any).peso_kg ?? null, tensao_mpa: s.tensao_mpa, status: s.status, registrado_por: profile?.id })));
      if (smError) throw smError;

      // 4. Ignorar todos os demais agendamentos pendentes do mesmo lote
      const { error: ignError } = await supabase
        .from("rupture_schedules")
        .update({ status: "ignorado" })
        .eq("batch_id", batchId)
        .neq("id", scheduleId)
        .in("status", ["pendente", "atrasado", "em_andamento"]);
      if (ignError) throw ignError;

      // 5. Atualizar status do lote
      const { error: bError } = await supabase
        .from("production_batches")
        .update({ status: "liberado_antecipado", notas: `Finalizado no dia atual: ${motivo}` })
        .eq("id", batchId);
      if (bError) throw bError;

      return { scheduleId, test };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
    }
  });

  const exemptFromTestingMutation = useMutation({
    mutationFn: async ({ batchId }: { batchId: string }) => {
      const { error: sError } = await supabase
        .from("rupture_schedules")
        .update({ status: "ignorado" })
        .eq("batch_id", batchId)
        .in("status", ["pendente", "atrasado", "em_andamento"]);
      if (sError) throw sError;

      const { error: bError } = await supabase
        .from("production_batches")
        .update({ status: "aprovado_sem_ensaio" })
        .eq("id", batchId);
      if (bError) throw bError;

      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
    },
  });

  const releaseEarlyMutation = useMutation({
    mutationFn: async ({ batchId, motivo }: { batchId: string; motivo: string }) => {
      // 1. Marcar todos os agendamentos pendentes como 'ignorado'
      const { error: sError } = await supabase
        .from("rupture_schedules")
        .update({ status: "ignorado" })
        .eq("batch_id", batchId)
        .in("status", ["pendente", "atrasado", "em_andamento"]);

      if (sError) throw sError;

      // 2. Atualizar status do lote
      const { error: bError } = await supabase
        .from("production_batches")
        .update({ 
          status: "liberado_antecipado",
          notas: motivo // Pode usar notas pra guardar o motivo da liberação
        })
        .eq("id", batchId);

      if (bError) throw bError;

      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
    }
  });

  const updateRuptureMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      dataExecutada,
      observacoes,
      testData
    }: {
      scheduleId: string;
      dataExecutada: string;
      observacoes?: string;
      testData: {
        tipo_amostra: string;
        meta_mpa: number;
        media_mpa: number;
        min_mpa: number;
        max_mpa: number;
        desvio_padrao: number;
        status: string;
        notas?: string;
        samples: { numero: number; forca_kn: number; peso_kg?: number | null; tensao_mpa: number; status: string }[];
      };
    }) => {
      // 1. Atualizar schedule
      const { error: sError } = await supabase
        .from("rupture_schedules")
        .update({ data_executada: dataExecutada, responsavel_id: profile?.id, responsavel_nome: profile?.nome })
        .eq("id", scheduleId);
      if (sError) throw sError;

      // 2. Deletar tests existentes (cascade deleta rupture_samples)
      const { error: dError } = await supabase
        .from("rupture_tests")
        .delete()
        .eq("schedule_id", scheduleId);
      if (dError) throw dError;

      // 3. Re-inserir test
      const { data: test, error: tError } = await supabase
        .from("rupture_tests")
        .insert([{ schedule_id: scheduleId, tipo_amostra: testData.tipo_amostra, meta_mpa: testData.meta_mpa, media_mpa: testData.media_mpa, min_mpa: testData.min_mpa, max_mpa: testData.max_mpa, desvio_padrao: testData.desvio_padrao, status: testData.status, notas: testData.notas }])
        .select().single();
      if (tError) throw tError;

      // 4. Re-inserir samples
      const { error: smError } = await supabase
        .from("rupture_samples")
        .insert(testData.samples.map(s => ({ test_id: test.id, numero: s.numero, forca_kn: s.forca_kn, peso_kg: s.peso_kg ?? null, tensao_mpa: s.tensao_mpa, status: s.status, registrado_por: profile?.id })));
      if (smError) throw smError;

      return { scheduleId, test };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
      queryClient.invalidateQueries({ queryKey: ["rupture_schedule_detail"] });
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
    }
  });

  return {
    schedules,
    isLoadingSchedules,
    getScheduleDetail,
    completeRupture: completeRuptureMutation.mutateAsync,
    isCompleting: completeRuptureMutation.isPending,
    finalizeWithCurrentTest: finalizeWithCurrentTestMutation.mutateAsync,
    isFinalizing: finalizeWithCurrentTestMutation.isPending,
    exemptFromTesting: exemptFromTestingMutation.mutateAsync,
    isExempting: exemptFromTestingMutation.isPending,
    releaseEarly: releaseEarlyMutation.mutateAsync,
    isReleasing: releaseEarlyMutation.isPending,
    updateRupture: updateRuptureMutation.mutateAsync,
    isUpdating: updateRuptureMutation.isPending,
  };
}

export function useScheduleDetail(scheduleId?: string) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["rupture_schedule_detail", scheduleId, orgId],
    queryFn: async () => {
      if (!scheduleId || !orgId) return null;

      const { data: schedule, error: sError } = await supabase
        .from("rupture_schedules")
        .select(`
          *,
          batch:production_batches (
            id,
            batch_code,
            produced_at,
            status,
            analyses (id, nome, codigo, tipo, resistencia_prevista)
          )
        `)
        .eq("id", scheduleId)
        .single();

      if (sError) throw sError;

      const { data: tests, error: tError } = await supabase
        .from("rupture_tests")
        .select(`
          *,
          samples:rupture_samples (*)
        `)
        .eq("schedule_id", scheduleId);

      if (tError) throw tError;

      return { ...schedule, tests: tests || [] };
    },
    enabled: !!scheduleId && !!orgId,
  });
}
