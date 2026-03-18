import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface RuptureSchedule {
  id: string;
  organization_id: string;
  tipo_produto: string;
  dias_rompimento: number;
  meta_resistencia_pct: number | null;
  ativo: boolean;
}

export function useRuptureSchedules() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ["rupture_schedules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rupture_schedules")
        .select("*")
        .eq("organization_id", orgId)
        .order("dias_rompimento");
      
      if (error) throw error;
      return data as RuptureSchedule[];
    },
    enabled: !!orgId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (schedule: Omit<RuptureSchedule, "id" | "organization_id">) => {
      const { data, error } = await supabase
        .from("rupture_schedules")
        .upsert({ 
          ...schedule, 
          organization_id: orgId 
        }, { onConflict: "organization_id, tipo_produto, dias_rompimento" })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rupture_schedules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rupture_schedules", orgId] });
    },
  });

  return {
    schedules,
    isLoading,
    error,
    upsertSchedule: upsertMutation.mutateAsync,
    deleteSchedule: deleteMutation.mutateAsync,
    isProcessing: upsertMutation.isPending || deleteMutation.isPending,
  };
}
