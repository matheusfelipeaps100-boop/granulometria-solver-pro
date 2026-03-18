import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../useAuth";
import type { UserRole } from "@/store/useAppStore";

export interface DBProfile {
  id: string;
  organization_id: string;
  nome: string;
  email: string | null;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

export function useProfiles() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", orgId)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar perfis:", error);
        throw error;
      }

      return data as DBProfile[];
    },
    enabled: !!orgId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DBProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", orgId] });
      // Se o próprio usuário atualizar seu perfil, precisamos invalidar o auth também
      queryClient.invalidateQueries({ queryKey: ["auth_profile"] });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (newUser: Partial<DBProfile> & { password?: string }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: newUser
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data?.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles", orgId] });
    },
  });

  return {
    profiles,
    isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    createProfile: createProfileMutation.mutateAsync,
    isCreating: createProfileMutation.isPending,
  };
}
