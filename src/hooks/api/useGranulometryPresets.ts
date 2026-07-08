import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisMaterial } from "@/lib/analysis-data";

export interface GranulometryPreset {
  id: string;
  organization_id: string;
  nome: string;
  materiais: AnalysisMaterial[];
  dna_selecionado: string | null;
  limites_curva: any[] | null;
  tipo_analise?: string;
  created_by: string | null;
  created_at: string;
}

export function useGranulometryPresets() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["granulometry_presets", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("granulometry_presets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GranulometryPreset[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async ({
      nome,
      materiais,
      dna_selecionado,
      limites_curva,
      tipo_analise,
    }: {
      nome: string;
      materiais: AnalysisMaterial[];
      dna_selecionado?: string;
      limites_curva?: any[];
      tipo_analise?: string;
    }) => {
      const { data, error } = await supabase
        .from("granulometry_presets")
        .insert([{
          organization_id: orgId,
          nome,
          materiais,
          dna_selecionado: dna_selecionado ?? null,
          limites_curva: limites_curva ?? null,
          tipo_analise: tipo_analise ?? "bloco_estrutural",
          created_by: profile?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["granulometry_presets", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("granulometry_presets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["granulometry_presets", orgId] });
    },
  });

  return {
    presets,
    isLoading,
    createPreset: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deletePreset: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
