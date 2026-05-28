import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { AnalysisFormData } from "@/lib/analysis-data";
import { PENEIRAS_PADRAO } from "@/lib/analysis-data";
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
  liberado_em: string | null;
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
      if (!orgId) {
        console.warn("[useAnalyses] orgId não encontrado, retornando vazio");
        return [];
      }

      if (!supabase) {
        console.error("[useAnalyses] Supabase não inicializado");
        throw new Error("Supabase não inicializado");
      }

      try {
        console.log("[useAnalyses] Buscando análises para org:", orgId);
        const { data, error } = await supabase
          .from("analyses")
          .select(`
            *,
            analysis_dosage(*),
            analysis_materials(
              *,
              materials(id, nome, tipo, densidade, custo_tonelada)
            )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[useAnalyses] Erro Supabase:", error);
          throw error;
        }

        console.log("[useAnalyses] Dados carregados:", data?.length || 0);

        return (data || []).map((row: any) => {
          // analysis_dosage pode retornar array (has-many) — pegar o primeiro
          const dosage = Array.isArray(row.analysis_dosage)
            ? row.analysis_dosage[0]
            : row.analysis_dosage;

          // Reconstruir proporcao_kg a partir de massa_kg (preferencial) ou via dosagem
          const allMats = row.analysis_materials || [];
          const totalMassaKg = allMats.reduce((s: number, am: any) => s + (Number(am.massa_kg) || 0), 0);
          // Fallback: recalcular proporcao_kg = pct * consumo * relacao (total agreg. original)
          const consumo = dosage?.consumo_cimento_kg || 0;
          const relacao = dosage?.relacao_cimento || 0;
          const totalKgFallback = consumo * relacao; // totalKg original dos agregados

          const formData = {
            volume_m3: dosage?.volume_batelada_litros ? dosage.volume_batelada_litros / 1000 : 0.55,
            densidade_cimento: dosage?.densidade_cimento || 3.15,
            relacao_cimento: relacao,
            relacao_ac: dosage?.relacao_ac || 0,
            consumo_alvo_m3: consumo,
            aditivos_ml: dosage?.aditivos_ml || 0,
            custo_cimento_ton: dosage?.custo_cimento_ton || 0,
            custo_aditivo_lt: dosage?.custo_aditivo_lt || 0,
            custo_total_m3: dosage?.custo_total_m3 || 0,
            custo_total_batelada: dosage?.custo_total_batelada || 0,
            materiais_selecionados: allMats.map((am: any) => {
              const massaKg = Number(am.massa_kg) || 0;
              // Se massa_kg foi salvo, usa direto; senão reconstrói via dosagem
              const kgFinal = massaKg > 0
                ? massaKg
                : (totalKgFallback > 0 ? am.proporcao_pct * totalKgFallback : 0);
              // proporcao_pct derivado de massa_kg real (mais confiável que o pct salvo)
              const pctFinal = totalMassaKg > 0
                ? massaKg / totalMassaKg
                : am.proporcao_pct;

              return {
                material_id: am.material_id,
                nome: am.materials?.nome || "",
                proporcao_kg: kgFinal,
                proporcao_pct: pctFinal,
                densidade: am.materials?.densidade || 2.65,
                custo_tonelada: am.materials?.custo_tonelada ?? undefined,
                gradations: (am.analysis_material_gradations || []).map((g: any) => {
                  const peneira = PENEIRAS_PADRAO.find(p => p.sieve_id === g.sieve_id);
                  return {
                    sieve_id: g.sieve_id,
                    abertura_mm: peneira?.abertura_mm ?? 0,
                    massa_retida: g.massa_retida ?? 0,
                  };
                })
              };
            })
          };

          return {
            ...row,
            formData
          } as StoredAnalysis;
        });
      } catch (err) {
        console.error("[useAnalyses] Erro na query:", err);
        throw err;
      }
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ formData, status = 'em_analise', currentStep = 1, liberado_em }: { formData: AnalysisFormData, status?: AnalysisStatus, currentStep?: number, liberado_em?: string }) => {
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
          wizard_step: currentStep, // Rastreia o progresso do rascunho
          observacoes: formData.observacoes || null,
          data_analise: formData.data,
          analista_id: profile.id, // quem criou a análise
          created_by: profile.id,
          ...(liberado_em ? { liberado_em } : {}),
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
            
            // Calcula proporcao_pct corretamente a partir de proporcao_kg
            const totalKgInsert = formData.materiais_selecionados.reduce(
              (s: number, mat: any) => s + (mat.proporcao_kg ?? 0), 0
            );
            const pctCorreto = totalKgInsert > 0
              ? (m.proporcao_kg ?? 0) / totalKgInsert
              : m.proporcao_pct ?? 0;

            // Insere o material da análise
            const { data: amData, error: amError } = await supabase
              .from("analysis_materials")
              .insert([{
                analysis_id: analysisId,
                material_id: m.material_id,
                proporcao_pct: pctCorreto,
                massa_kg: m.proporcao_kg ?? 0,
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

        // 3. Inserir Dosagem (com snapshot de custos)
        // Calcula custo total para persistir como snapshot
        const totalKgMats = formData.materiais_selecionados.reduce(
          (s: number, mat: any) => s + (mat.proporcao_kg ?? 0), 0
        );
        const volM3 = formData.volume_m3 || 0.55;
        const cimentoBat = (formData.consumo_alvo_m3 || 0) * volM3;
        const custoCimentoBat = cimentoBat * ((formData.custo_cimento_ton || 0) / 1000);
        const custoAditivoBat = (formData.aditivos_ml || 0) * ((formData.custo_aditivo_lt || 0) / 1000);
        const custoAgregBat = formData.materiais_selecionados.reduce((sum: number, m: any) => {
          const kg = m.proporcao_kg ?? 0;
          const custoTon = m.custo_tonelada ?? 0;
          return sum + (kg * custoTon / 1000);
        }, 0);
        const custoTotalBat = custoCimentoBat + custoAditivoBat + custoAgregBat;
        const custoTotalM3 = volM3 > 0 ? custoTotalBat / volM3 : 0;

        const { error: dosError } = await supabase.from("analysis_dosage").insert([{
          analysis_id: analysisId,
          relacao_cimento: formData.relacao_cimento,
          relacao_ac: formData.relacao_ac,
          volume_batelada_litros: formData.volume_m3 * 1000,
          densidade_cimento: formData.densidade_cimento,
          consumo_cimento_kg: formData.consumo_alvo_m3,
          aditivos_ml: formData.aditivos_ml,
          custo_cimento_ton: formData.custo_cimento_ton || null,
          custo_aditivo_lt: formData.custo_aditivo_lt || null,
          custo_total_m3: custoTotalM3 > 0 ? Math.round(custoTotalM3 * 100) / 100 : null,
          custo_total_batelada: custoTotalBat > 0 ? Math.round(custoTotalBat * 100) / 100 : null,
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
    mutationFn: async ({ id, status, liberado_em, observacoes }: { id: string; status: AnalysisStatus; liberado_em?: string; observacoes?: string }) => {
      const updateData: Record<string, any> = { status };
      if (status === 'liberado_producao' && liberado_em) {
        updateData.liberado_em = liberado_em;
      }
      if (observacoes !== undefined) {
        updateData.observacoes = observacoes || null;
      }
      const { data, error } = await supabase
        .from("analyses")
        .update(updateData)
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

  const updateNomeMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from("analyses").update({ nome }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se há lotes de produção vinculados antes de excluir
      const { data: batches } = await supabase
        .from("production_batches")
        .select("id, batch_code")
        .eq("analysis_id", id)
        .limit(1);

      if (batches && batches.length > 0) {
        throw new Error(
          `Esta análise está vinculada ao lote ${batches[0].batch_code} e não pode ser excluída. Remova o lote primeiro.`
        );
      }

      // Limpar tabelas filhas antes de deletar a análise
      await supabase.from("analysis_gradation_results").delete().eq("analysis_id", id);
      await supabase.from("analysis_dosage").delete().eq("analysis_id", id);

      // analysis_material_gradations será deletado em cascata via analysis_materials
      await supabase.from("analysis_materials").delete().eq("analysis_id", id);

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

  // Mutation para recalcular custos de uma análise (garante sincronização com preços atuais)
  const recalculateCostsMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      // Busca a análise completa
      const { data: analysis, error: fetchError } = await supabase
        .from("analyses")
        .select(`
          *,
          analysis_dosage(*),
          analysis_materials(
            *,
            materials(id, nome, tipo, densidade, custo_tonelada, custo_valor, custo_unidade)
          )
        `)
        .eq("id", analysisId)
        .single();

      if (fetchError) throw fetchError;
      if (!analysis) throw new Error("Análise não encontrada");

      const dosage = Array.isArray(analysis.analysis_dosage)
        ? analysis.analysis_dosage[0]
        : analysis.analysis_dosage;

      if (!dosage) throw new Error("Dosagem não encontrada");

      // Reconstrói formData para recalcular custos
      const allMats = analysis.analysis_materials || [];
      const totalMassaKg = allMats.reduce((s: number, am: any) => s + (Number(am.massa_kg) || 0), 0);
      const consumo = dosage?.consumo_cimento_kg || 0;
      const relacao = dosage?.relacao_cimento || 0;
      const totalKgFallback = consumo * relacao;
      
      const volM3 = dosage?.volume_batelada_litros ? dosage.volume_batelada_litros / 1000 : 0.55;
      
      // Recalcula custos usando os dados salvos
      const cimentoBat = (consumo || 0) * volM3;
      const custoCimentoBat = cimentoBat * ((dosage?.custo_cimento_ton || 0) / 1000);
      const custoAditivoBat = (dosage?.aditivos_ml || 0) * ((dosage?.custo_aditivo_lt || 0) / 1000);
      
      const custoAgregBat = allMats.reduce((sum: number, am: any) => {
        const massaKg = Number(am.massa_kg) || 0;
        const kgFinal = massaKg > 0 ? massaKg : (totalKgFallback > 0 ? am.proporcao_pct * totalKgFallback : 0);
        const custoTon = am.materials?.custo_tonelada ?? 0;
        return sum + ((kgFinal * custoTon) / 1000);
      }, 0);

      const custoTotalBat = custoCimentoBat + custoAditivoBat + custoAgregBat;
      const custoTotalM3 = volM3 > 0 ? custoTotalBat / volM3 : 0;

      // Atualiza a dosagem com os novos custos
      const { error: updateError } = await supabase
        .from("analysis_dosage")
        .update({
          custo_total_batelada: custoTotalBat > 0 ? Math.round(custoTotalBat * 100) / 100 : null,
          custo_total_m3: custoTotalM3 > 0 ? Math.round(custoTotalM3 * 100) / 100 : null,
        })
        .eq("analysis_id", analysisId);

      if (updateError) throw updateError;

      return { custoTotalBat, custoTotalM3 };
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
    updateNome: updateNomeMutation.mutateAsync,
    deleteAnalysis: deleteMutation.mutateAsync,
    recalculateCosts: recalculateCostsMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRecalculatingCosts: recalculateCostsMutation.isPending,
  };
}

/**
 * Busca UMA an\u00e1lise completa pelo c\u00f3digo (incluindo gradua\u00e7\u00f5es).
 * Usado ao abrir uma an\u00e1lise existente para edi\u00e7\u00e3o.
 */
export function useAnalysis(codigo: string | null) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["analysis", codigo, orgId],
    enabled: !!codigo && !!orgId,
    queryFn: async () => {
      if (!codigo || !orgId) return null;

      const cleanCode = codigo.trim();
      console.log(`[useAnalysis] Buscando por: '${cleanCode}' (original: '${codigo}') em org: ${orgId}`);

      // Busca análise com dosagem e materiais
      // Usando ilike para ignorar case e usando % caso haja espaços invisíveis
      const { data, error } = await supabase
        .from("analyses")
        .select(`
          *,
          analysis_dosage(*),
          analysis_materials(
            *,
            materials(id, nome, tipo, densidade, custo_tonelada)
          )
        `)
        .eq("organization_id", orgId)
        .ilike("codigo", `%${cleanCode}%`)
        .maybeSingle();

      if (error) {
        console.error("[useAnalysis] Erro no Supabase:", error);
        throw error;
      }
      
      if (!data) {
        console.warn(`[useAnalysis] Nenhum dado encontrado para '${cleanCode}'. Tente verificar as permiss\u00f5es ou se o c\u00f3digo est\u00e1 exato no banco.`);
        return null;
      }

      // Busca grada\u00e7\u00f5es separadamente por material
      const materialIds = (data.analysis_materials || []).map((am: any) => am.id);
      let gradationsByMaterialId: Record<string, any[]> = {};

      if (materialIds.length > 0) {
        const { data: grads } = await supabase
          .from("analysis_material_gradations")
          .select("analysis_material_id, sieve_id, massa_retida")
          .in("analysis_material_id", materialIds);

        if (grads) {
          grads.forEach((g: any) => {
            if (!gradationsByMaterialId[g.analysis_material_id]) {
              gradationsByMaterialId[g.analysis_material_id] = [];
            }
            gradationsByMaterialId[g.analysis_material_id].push(g);
          });
        }
      }

      // Injeta grada\u00e7\u00f5es em cada material
      const materialsWithGrads = (data.analysis_materials || []).map((am: any) => ({
        ...am,
        analysis_material_gradations: gradationsByMaterialId[am.id] || [],
      }));

      const fullData = { ...data, analysis_materials: materialsWithGrads };

      const dosage = Array.isArray(fullData.analysis_dosage)
        ? fullData.analysis_dosage[0]
        : fullData.analysis_dosage;

      const formData = {
        id: fullData.id,
        codigo: fullData.codigo,
        nome: fullData.nome,
        tipo_analise: fullData.tipo,
        produto_nome: fullData.produto || "",
        resistencia_prevista: fullData.resistencia_prevista || 0,
        unidade: fullData.unidade || "",
        observacoes: fullData.observacoes || "",
        data: fullData.data_analise || new Date().toISOString().split("T")[0],
        volume_m3: dosage?.volume_batelada_litros ? dosage.volume_batelada_litros / 1000 : 0.55,
        densidade_cimento: dosage?.densidade_cimento || 3.15,
        relacao_cimento: dosage?.relacao_cimento || 18,
        relacao_ac: dosage?.relacao_ac || 0.2,
        consumo_alvo_m3: dosage?.consumo_cimento_kg || 137,
        aditivos_ml: dosage?.aditivos_ml || 0,
        materiais_selecionados: (fullData.analysis_materials || []).map((am: any) => ({
          material_id: am.material_id,
          nome: am.materials?.nome || "",
          proporcao_kg: am.massa_kg ?? am.proporcao_kg ?? (am.proporcao_pct * 550),
          proporcao_pct: am.proporcao_pct,
          densidade: am.materials?.densidade || 2.65,
          custo_tonelada: am.materials?.custo_tonelada ?? undefined,
          gradations: (am.analysis_material_gradations || []).map((g: any) => {
            const peneira = PENEIRAS_PADRAO.find(p => p.sieve_id === g.sieve_id);
            return {
              sieve_id: g.sieve_id,
              abertura_mm: peneira?.abertura_mm ?? 0,
              massa_retida: g.massa_retida ?? 0,
            };
          })
        }))
      };

      return { ...fullData, formData } as StoredAnalysis;
    },
    staleTime: 30_000,
  });
}

