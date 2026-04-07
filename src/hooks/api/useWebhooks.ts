import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type WebhookEvento = 
  | "trace_approved"
  | "trace_released"
  | "batch_created"
  | "rupture_scheduled"
  | "rupture_completed"
  | "sample_nonconformity"
  | "report_generated"
  | "batch_rejected";

export interface WebhookConfig {
  id: string;
  organization_id: string;
  nome: string;
  url: string;
  evento: WebhookEvento;
  secret: string;
  ativo: boolean;
  retry_count: number;
  timeout_seconds: number;
  created_at: string;
}

export function useWebhooks() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhook_configs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WebhookConfig[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (webhook: Omit<WebhookConfig, "id" | "organization_id" | "created_at" | "secret">) => {
      const secret = crypto.randomUUID().replace(/-/g, ""); // Gerando um secret simples
      const { data, error } = await supabase
        .from("webhook_configs")
        .insert([{ ...webhook, organization_id: orgId, secret }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_configs", orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...webhook }: Partial<WebhookConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("webhook_configs")
        .update(webhook)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_configs", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_configs")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_configs", orgId] });
    },
  });

  return {
    webhooks,
    isLoading,
    createWebhook: createMutation.mutateAsync,
    updateWebhook: updateMutation.mutateAsync,
    deleteWebhook: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
