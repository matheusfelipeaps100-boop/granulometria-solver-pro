import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type MaterialBrandTipo = "cimento" | "aditivo";

export interface MaterialBrand {
  id: string;
  tipo: MaterialBrandTipo;
  nome: string;
  fornecedor: string | null;
  ativo: boolean;
  created_at: string;
}

export function useMaterialBrands(tipo?: MaterialBrandTipo) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: brands = [], isLoading, error } = useQuery({
    queryKey: ["material-brands", orgId, tipo ?? "all"],
    queryFn: async () => {
      let query = supabase.from("material_brands").select("*").order("nome");
      if (tipo) query = query.eq("tipo", tipo);

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialBrand[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (newBrand: Omit<MaterialBrand, "id" | "created_at" | "ativo"> & { ativo?: boolean }) => {
      const { data, error } = await supabase
        .from("material_brands")
        .insert([{ ...newBrand, organization_id: orgId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-brands", orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialBrand> & { id: string }) => {
      const { data, error } = await supabase
        .from("material_brands")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-brands", orgId] });
    },
  });

  // Soft delete (inativar) — preserva a referência para análises antigas
  // que já apontam para essa marca via cimento_marca_id/aditivo_marca_id.
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("material_brands")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-brands", orgId] });
    },
  });

  return {
    brands,
    isLoading,
    error,
    createBrand: createMutation.mutateAsync,
    updateBrand: updateMutation.mutateAsync,
    deactivateBrand: deactivateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
  };
}
