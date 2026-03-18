import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface Product {
  id: string;
  organization_id: string;
  nome: string;
  tipo_produto: string;
  dimensoes: string | null;
  resistencia_referencia: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", orgId)
        .order("nome");
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: Omit<Product, "id" | "organization_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("products")
        .insert([{ ...newProduct, organization_id: orgId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", orgId] });
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
