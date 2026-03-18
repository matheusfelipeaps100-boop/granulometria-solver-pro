import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface Material {
  id: string;
  nome: string;
  tipo: string;
  fornecedor: string | null;
  densidade: number | null;
  mf: number | string | null;
  ativo: boolean;
  created_at: string;
}

export function useMaterials() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ["materials", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (newMaterial: Omit<Material, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("materials")
        .insert([{ ...newMaterial, organization_id: orgId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Material> & { id: string }) => {
      const { data, error } = await supabase
        .from("materials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", orgId] });
    },
  });

  return {
    materials,
    isLoading,
    error,
    createMaterial: createMutation.mutateAsync,
    updateMaterial: updateMutation.mutateAsync,
    deleteMaterial: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
