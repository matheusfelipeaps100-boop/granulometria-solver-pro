import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface TechnicalSettings {
  id: string;
  organization_id: string;
  volume_batelada_padrao: number;
  densidade_cimento_padrao: number;
  formula_tensao_a: number;
  formula_tensao_b: number;
  formula_tensao_paver: number;
  formula_tensao_laje: number;
  bloco_meta_1d: number;
  bloco_meta_3d: number;
  bloco_meta_7d: number;
  bloco_meta_28d: number;
  paver_meta_1d: number;
  paver_meta_3d: number;
  paver_meta_7d: number;
  paver_meta_28d: number;
  updated_at: string;
}

export function useTechnicalSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["technical_settings", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      
      if (error) throw error;
      return data as TechnicalSettings | null;
    },
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<TechnicalSettings>) => {
      const { data, error } = await supabase
        .from("technical_settings")
        .upsert({
          ...updates,
          organization_id: orgId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technical_settings", orgId] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
