import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface StandardCurve {
  id: string;
  nome: string;
  tipo_produto: string;
  resistencia_alvo: number | null;
  modulo_finura: number | null;
  descricao: string | null;
  ativo: boolean;
  is_system: boolean;
  // Dimensão máxima do agregado permitida pelo projeto (mm) — usada na
  // verificação de compatibilidade do otimizador de Laje Protendida.
  // Não é um limite normativo; é informada manualmente pelo usuário.
  dimensao_maxima_permitida_mm?: number | null;
  standard_curve_items?: StandardCurveItem[];
  created_at: string;
}

export interface StandardCurveItem {
  id: string;
  curve_id: string;
  sieve_id: number;
  pct_retido: number;
  pct_acumulado: number;
  limite_min: number;
  limite_max: number;
}

export function useStandardCurves() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: curves = [], isLoading, error } = useQuery({
    queryKey: ["standard_curves", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("standard_curves")
        .select("*, standard_curve_items(*)")
        .or(`organization_id.eq.${orgId},is_system.eq.true`)
        .order("is_system", { ascending: false })
        .order("nome");
      
      if (error) throw error;
      return data as StandardCurve[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ curve, items }: { curve: Omit<StandardCurve, "id" | "created_at" | "standard_curve_items">, items: Omit<StandardCurveItem, "id" | "curve_id">[] }) => {
      const { data: newCurve, error: curveError } = await supabase
        .from("standard_curves")
        .insert([{ ...curve, organization_id: orgId, created_by: profile?.id }])
        .select()
        .single();
      
      if (curveError) throw curveError;

      if (items.length > 0) {
        const itemsWithCurveId = items.map(item => ({ ...item, curve_id: newCurve.id }));
        const { error: itemsError } = await supabase
          .from("standard_curve_items")
          .insert(itemsWithCurveId);
        
        if (itemsError) throw itemsError;
      }

      return newCurve;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard_curves", orgId] });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, curve, items }: { id: string, curve: Partial<Omit<StandardCurve, "id" | "created_at" | "standard_curve_items">>, items: Omit<StandardCurveItem, "id" | "curve_id">[] }) => {
      // 1. Atualizar metadados da curva
      const { error: curveError } = await supabase
        .from("standard_curves")
        .update(curve)
        .eq("id", id);
      
      if (curveError) throw curveError;

      // 2. Deletar itens antigos
      const { error: deleteError } = await supabase
        .from("standard_curve_items")
        .delete()
        .eq("curve_id", id);
      
      if (deleteError) throw deleteError;

      // 3. Inserir novos itens
      if (items.length > 0) {
        const itemsWithCurveId = items.map(item => ({ ...item, curve_id: id }));
        const { error: itemsError } = await supabase
          .from("standard_curve_items")
          .insert(itemsWithCurveId);
        
        if (itemsError) throw itemsError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard_curves", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("standard_curves")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard_curves", orgId] });
    },
  });

  return {
    curves,
    isLoading,
    error,
    createCurve: createMutation.mutateAsync,
    deleteCurve: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updateCurve: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
