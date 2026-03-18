import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../useAuth";

export interface DBOrganization {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  responsavel_tecnico: string | null;
  logo_url: string | null;
}

export function useOrganization() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: organization, isLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) {
        console.error("Erro ao buscar organização:", error);
        throw error;
      }

      return data as DBOrganization;
    },
    enabled: !!orgId,
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (updates: Partial<DBOrganization>) => {
      if (!orgId) throw new Error("Organização não identificada");

      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
    },
  });

  return {
    organization,
    isLoading,
    updateOrganization: updateOrganizationMutation.mutateAsync,
    isUpdating: updateOrganizationMutation.isPending,
  };
}
