import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../useAuth";
import type { BatchStatus } from "@/types/database.types";
import type { ScheduleStatus } from "@/hooks/api/useRuptures";

export interface DBProductionBatch {
  id: string;
  organization_id: string;
  analysis_id: string;
  batch_code: string;
  operador_id: string | null;
  operador_nome: string | null;
  maquina: string | null;
  volume_produzido: number | null;
  status: BatchStatus;
  notas: string | null;
  produced_at: string;
  created_by: string | null;
  created_at: string;
  analyses?: {
    codigo: string;
    nome: string;
    tipo: string;
    produto: string | null;
    status: string;
  };
  rupture_schedules?: {
    id: string;
    idade_dias: number;
    data_prevista: string;
    status: ScheduleStatus;
  }[];
}

export function useProduction() {
  const queryClient = useQueryClient();
  const { session, profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["production_batches", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("production_batches")
        .select(`
          *,
          analyses (codigo, nome, tipo, produto, status),
          rupture_schedules (id, idade_dias, data_prevista, status)
        `)
        .eq("organization_id", orgId)
        .order("produced_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar lotes:", error);
        throw error;
      }

      return (data || []) as DBProductionBatch[];
    },
    enabled: !!orgId,
  });

  const createBatchMutation = useMutation({
    mutationFn: async (batchData: {
      analysis_id: string;
      batch_code: string;
      operador_nome: string;
      maquina: string | null;
      volume_produzido: number | null;
      notas: string | null;
      produced_at: string;
    }) => {
      if (!orgId) throw new Error("Usuário não tem organização vinculada");
      if (!profile?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("production_batches")
        .insert([{
          organization_id: orgId,
          analysis_id: batchData.analysis_id,
          batch_code: batchData.batch_code,
          operador_id: profile.id, // O analista que registrou ou operador se houver RBAC
          operador_nome: batchData.operador_nome,
          maquina: batchData.maquina,
          volume_produzido: batchData.volume_produzido,
          status: "aguardando_rompimentos",
          notas: batchData.notas,
          produced_at: batchData.produced_at,
          created_by: profile.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
      // Invalida os rompimentos também, pois a criação do lote via trigger gerou os cronogramas (rupture_schedules)
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("production_batches")
        .delete()
        .eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_batches", orgId] });
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
    },
  });

  return {
    batches,
    isLoadingBatches,
    createBatch: createBatchMutation.mutateAsync,
    deleteBatch: deleteBatchMutation.mutateAsync,
    isCreating: createBatchMutation.isPending,
    isDeleting: deleteBatchMutation.isPending,
  };
}
