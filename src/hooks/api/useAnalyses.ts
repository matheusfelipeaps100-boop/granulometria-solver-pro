import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisFormData } from "@/lib/analysis-data";
import type { AnalysisStatus } from "@/store/useAppStore";

export interface StoredAnalysis {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  produto: string | null;
  resistencia_prevista: number | null;
  unidade: string | null;
  status: AnalysisStatus;
  wizard_step: number;
  observacoes: string | null;
  data_analise: string;
  created_at: string;
  formData: any; // Mapeado dinamicamente pelas tabelas analysis_dosage e analysis_materials
}

export function useAnalyses() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  const { data: analyses = [], isLoading, error } = useQuery({
    queryKey: ["analyses", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("analyses")
        .select(`
          *,
          analysis_dosage(*),
          analysis_materials(
            *,
            materials(id, nome, tipo, densidade)
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      return (data || []).map((row: any) => {
        // Reconstrói o formData essencial para algumas telas baseadas no banco
        const formData = {
          volume_m3: row.analysis_dosage?.volume_batelada_litros ? row.analysis_dosage.volume_batelada_litros / 1000 : 0.55,
          densidade_cimento: row.analysis_dosage?.densidade_cimento || 3.15,
          relacao_cimento: row.analysis_dosage?.relacao_cimento || 0,
          relacao_ac: row.analysis_dosage?.relacao_ac || 0,
          consumo_alvo_m3: row.analysis_dosage?.consumo_cimento_kg || 0,
          aditivos_ml: row.analysis_dosage?.aditivos_ml || 0,
          materiais_selecionados: (row.analysis_materials || []).map((am: any) => ({
            material_id: am.material_id,
            nome: am.materials?.nome || "",
            tipo: am.materials?.tipo || "",
            proporcao_kg: am.proporcao_kg ?? (am.proporcao_pct * 550),
            proporcao_pct: am.proporcao_pct,
            densidade: am.materials?.densidade || 2.65,
            gradations: [] // Não precisamos reconstruir pra Produção
          }))
        };

        return {
          ...row,
          formData
        } as StoredAnalysis;
      });
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ formData, status = 'em_analise' }: { formData: AnalysisFormData, status?: AnalysisStatus }) => {
      if (!orgId) throw new Error("Usuário não tem organização vinculada");
      if (!profile?.id) throw new Error("Usuário não autenticado");

      // 1. Inserir ou Atualizar Análise
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .upsert([{
          organization_id: orgId,
          codigo: formData.codigo,
          nome: formData.nome,
          tipo: formData.tipo_analise, // Map this correctly for the table
          produto: formData.produto_nome || null,
          resistencia_prevista: formData.resistencia_prevista || null,
          unidade: formData.unidade || null,
          status, // Status dinâmico ou em_analise
          wizard_step: 1, // Não estamos rastreando steps de forma estrita no backend
          observacoes: formData.observacoes || null,
          data_analise: formData.data,
          analista_id: profile.id, // quem criou a análise
          created_by: profile.id
        }], { onConflict: 'organization_id,codigo' })
        .select()
        .single();
      
      if (analysisError) throw analysisError;

      const analysisId = analysis.id;

      try {
        // Limpar dados antigos caso seja uma edição (Upsert via mesmo Código)
        await supabase.from("analysis_materials").delete().eq("analysis_id", analysisId);
        await supabase.from("analysis_dosage").delete().eq("analysis_id", analysisId);

        // 2. Inserir Materiais e suas Graduações (Retenções)
        if (formData.materiais_selecionados.length > 0) {
          for (let index = 0; index < formData.materiais_selecionados.length; index++) {
            const m = formData.materiais_selecionados[index];
            
            // Insere o material da análise
            const { data: amData, error: amError } = await supabase
              .from("analysis_materials")
              .insert([{
                analysis_id: analysisId,
                material_id: m.material_id,
                proporcao_pct: m.proporcao_pct,
                ordem: index
              }])
              .select("id")
              .single();
              
            if (amError) throw amError;

            // Insere as as massas retidas de cada peneira para aquele material
            if (m.gradations && m.gradations.length > 0) {
              const gradationsToInsert = m.gradations.map(g => ({
                analysis_material_id: amData.id,
                sieve_id: g.sieve_id,
                massa_retida: g.massa_retida || 0
              }));
              
              const { error: gError } = await supabase
                .from("analysis_material_gradations")
                .insert(gradationsToInsert);
                
              if (gError) throw gError;
            }
          }
        }

        // 3. Inserir Dosagem
        const { error: dosError } = await supabase.from("analysis_dosage").insert([{
          analysis_id: analysisId,
          relacao_cimento: formData.relacao_cimento,
          relacao_ac: formData.relacao_ac,
          volume_batelada_litros: formData.volume_m3 * 1000,
          densidade_cimento: formData.densidade_cimento,
          consumo_cimento_kg: formData.consumo_alvo_m3,
          aditivos_ml: formData.aditivos_ml,
          // massa_total_kg e agregados kg poderiam ser inseridos baseados no cálculo
        }]);
        if (dosError) throw dosError;

        // 4. Inserir Curva / Resultados (Opcional, se quisermos salvar snapshot estático)
        // Se a Engine calcula isso no frontend, podemos salvar os resultados finais
        if (formData.limites_curva && formData.limites_curva.length > 0) {
          // Precisamos do objeto curveResults. Idealmente nós salvaríamos isso, mas para simplificar, 
          // nós podemos omitir se apenas reproduzirmos a curva no carregamento, porém 
          // analysis_gradation_results serve como histórico fixo.
          // Por ora, salvaremos apenas dados principais.
        }

      } catch (err) {
        // Rollback improvisado (já que não temos transação via SDK do front)
        await supabase.from("analyses").delete().eq("id", analysisId);
        throw err;
      }

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", orgId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AnalysisStatus }) => {
      const { data, error } = await supabase
        .from("analyses")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("analyses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", orgId] });
    },
  });

  return {
    analyses,
    isLoading,
    error,
    createAnalysis: createMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteAnalysis: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
