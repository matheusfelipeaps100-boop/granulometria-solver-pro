import { useMemo, useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { GranulometryChart } from "./GranulometryChart";
import { cn, calcularCustoMaterial } from "@/lib/utils";
import {
  calcCombinedCurve,
  calcCurvaStatus,
  calcModuloFinura,
  otimizarCurvaVibroprensado,
} from "@/lib/granulometry-engine";
import {
  otimizarCurvaLajeProtendida,
  classificarPapelAgregado,
  gerarAlertasComposicaoLaje,
} from "@/lib/laje-optimizer";
import {
  PENEIRAS_PADRAO,
  getLimitesPadrao,
  getConfigMisturador,
  getTipoDosagem,
  type AnalysisFormData,
  type AnalysisMaterial,
} from "@/lib/analysis-data";
import { useMaterials } from "@/hooks/api/useMaterials";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import { Database, Dna, AlertTriangle, CheckCircle2, AlertCircle, Trash2, Plus, Save, FolderOpen } from "lucide-react";
import { useGranulometryPresets } from "@/hooks/api/useGranulometryPresets";

interface StepGranulometryProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
  readOnly?: boolean;
}

export function StepGranulometry({ data, onChange, readOnly }: StepGranulometryProps) {
  const capacidadeMisturador = getConfigMisturador(data.tipo_analise).capacidade_kg;
  const tipoDosagem = getTipoDosagem(data.tipo_analise);

  const [fonteAtiva, setFonteAtiva] = useState<"bica" | "manual">("bica");
  const [camadaAtiva, setCamadaAtiva] = useState<"base" | "face">("base");
  const [unidadeAtiva, setUnidadeAtiva] = useState<"pct" | "kg">("pct");
  const [isBancoOpen, setIsBancoOpen] = useState(false);
  const [isDnaOpen, setIsDnaOpen] = useState(false);
  const [bancoDraft, setBancoDraft] = useState<string[]>([]); // Staging array para modal de materiais
  const [isPresetSaveOpen, setIsPresetSaveOpen] = useState(false);
  const [isPresetLoadOpen, setIsPresetLoadOpen] = useState(false);
  const [presetNome, setPresetNome] = useState("");

  // Toggle para exibir/ocultar colunas % RETIDA
  const [showPctRetida, setShowPctRetida] = useState(false);

  // Estado local temporário para os inputs da tabela.
  // Chave: "mi-sieveId". Permite apagar, digitar decimais e vírgula
  // sem que o React force o campo de volta ao valor do store.
  // O valor só é gravado no store quando o campo perde o foco (onBlur).
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const getLocalKey = (mi: number, sieveId: number) => `${mi}-${sieveId}`;

  const { materials: dbMaterials } = useMaterials();
  const { presets, createPreset, isCreating: isSavingPreset, deletePreset } = useGranulometryPresets();
  const { curves: dbCurves } = useStandardCurves();

  // Converter curvas padrão do banco para o formato usado nos componentes
  const dnasDisponiveis = useMemo(() => {
    return dbCurves.map(c => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo_produto,
      resistencia: c.resistencia_alvo ? `${c.resistencia_alvo} MPa` : "",
      mf: c.modulo_finura ? String(c.modulo_finura) : "",
      dimensaoMaximaPermitidaMm: c.dimensao_maxima_permitida_mm ?? undefined,
      limites: (c.standard_curve_items ?? []).map(item => ({
        sieve_id: item.sieve_id,
        limite_min: item.limite_min,
        limite_max: item.limite_max,
      })),
    }));
  }, [dbCurves]);

  const materiaisDisponiveis = useMemo<AnalysisMaterial[]>(() => {
    return dbMaterials.filter(m => m.ativo).map(mat => ({
      material_id: mat.id,
      nome: mat.nome,
      proporcao_kg: 0,
      proporcao_pct: 0,
      densidade: mat.densidade || undefined,
      custo_tonelada: mat.custo_tonelada ?? undefined,
      gradations: PENEIRAS_PADRAO.map(p => ({
        sieve_id: p.sieve_id,
        abertura_mm: p.abertura_mm,
        massa_retida: 0
      }))
    }));
  }, [dbMaterials]);

  const materials = data.materiais_selecionados || [];

  // KG total dos agregados na batelada
  const totalKgMistura = useMemo(
    () => materials.reduce((sum, m) => sum + (m.proporcao_kg ?? 0), 0),
    [materials]
  );

  // proporcao_pct derivado de proporcao_kg – usado na curva granulométrica
  const materialsWithPct = useMemo(() => {
    const total = totalKgMistura || 1;
    return materials.map(m => ({
      ...m,
      proporcao_pct: (m.proporcao_kg ?? 0) / total,
    }));
  }, [materials, totalKgMistura]);

  // Seleção automática do DNA: prioriza o salvo na análise; senão, o DNA
  // do banco cujo tipo bate com o tipo de análise (garante que Lajes usam a
  // curva de Laje, e vibroprensados continuam usando a curva atual).
  const dna =
    dnasDisponiveis.find((d) => d.id === data.dna_selecionado) ??
    dnasDisponiveis.find((d) => d.tipo === data.tipo_analise && d.limites.length) ??
    dnasDisponiveis[0];
  // Cascata: DB → form → normativo hardcoded por tipo (garante que limites nunca ficam vazios)
  const limits = dna?.limites?.length
    ? dna.limites
    : data.limites_curva?.length
      ? data.limites_curva
      : getLimitesPadrao(data.tipo_analise);

  // Dimensão máxima do agregado permitida pelo projeto: override manual na
  // análise → valor do DNA carregado → indefinido (não checa se ausente).
  const dimensaoMaximaPermitidaMm = data.dimensao_maxima_permitida_mm ?? dna?.dimensaoMaximaPermitidaMm ?? undefined;

  // Persiste limites no form quando o DNA é auto-selecionado com dados do banco
  useEffect(() => {
    if (dna?.limites?.length && !data.limites_curva?.length) {
      onChange({ limites_curva: dna.limites });
    }
  }, [dna?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Curva combinada – usa proporcao_pct derivado
  const curveResults = useMemo(
    () => calcCombinedCurve(materialsWithPct, limits),
    [materialsWithPct, limits]
  );

  const curvaStatus = useMemo(
    () => calcCurvaStatus(curveResults),
    [curveResults]
  );

  // Exclusivo para LAJE PROTENDIDA: o gráfico da laje mostra % PASSANTE (mais
  // adequado para comparação visual da curva), não % acumulado retido. Não
  // afeta bloco/paver (que continuam recebendo `curveResults` original em
  // % retido) nem a tabela de digitação/compatibilidade acima, que seguem
  // usando `curveResults` (retido) normalmente — é só uma transformação de
  // exibição para o componente de gráfico, calculada aqui e isolada por
  // tipoDosagem. limite_min/limite_max são invertidos e trocados de posição
  // porque, ao converter retido→passante, o que era limite mínimo em retido
  // vira o limite máximo em passante (e vice-versa).
  const curveResultsParaGrafico = useMemo(() => {
    if (tipoDosagem !== "WET_CASTING_PROTENDIDO") return curveResults;
    return curveResults.map((r) => ({
      ...r,
      pct_acumulado: 1 - r.pct_acumulado,
      limite_min: r.limite_max != null ? 1 - r.limite_max : undefined,
      limite_max: r.limite_min != null ? 1 - r.limite_min : undefined,
    }));
  }, [curveResults, tipoDosagem]);

  // MF por material
  const mfPerMaterial = useMemo(
    () => materials.map((m) => ({
      id: m.material_id,
      mf: calcModuloFinura(m.gradations),
    })),
    [materials]
  );

  // MF combinado – ponderado pelo proporcao_kg
  const mfCombinado = useMemo(() => {
    if (totalKgMistura === 0) return 0;
    return materials.reduce((sum, m, i) => {
      return sum + (mfPerMaterial[i].mf * (m.proporcao_kg ?? 0)) / totalKgMistura;
    }, 0);
  }, [materials, mfPerMaterial, totalKgMistura]);

  // Custo base ponderado dos agregados — busca preço atualizado de materiaisDisponiveis (DB)
  const custoBaseAgregadosTon = useMemo(() => {
    if (totalKgMistura === 0) return 0;
    return materials.reduce((sum, m) => {
      const dbMat = materiaisDisponiveis.find((d) => d.material_id === m.material_id);
      const custo = dbMat?.custo_tonelada ?? m.custo_tonelada ?? 0;
      return sum + (custo * ((m.proporcao_kg ?? 0) / totalKgMistura));
    }, 0);
  }, [materials, totalKgMistura, materiaisDisponiveis]);

  const handleMassChange = useCallback(
    (materialIndex: number, sieveId: number, value: number) => {
      const updated = materials.map((m, i) => {
        if (i !== materialIndex) return m;
        return {
          ...m,
          gradations: m.gradations.map((g) =>
            g.sieve_id === sieveId ? { ...g, massa_retida: value } : g
          ),
        };
      });
      onChange({ materiais_selecionados: updated });
    },
    [materials, onChange]
  );

  const handleProportionChange = useCallback(
    (materialIndex: number, newKg: number) => {
      const updated = materials.map((m, i) =>
        i === materialIndex ? { ...m, proporcao_kg: newKg } : m
      );
      onChange({ materiais_selecionados: updated });
    },
    [materials, onChange]
  );

  const handleDensityChange = useCallback(
    (materialIndex: number, newValue: number) => {
      const updated = materials.map((m, i) => {
        if (i === materialIndex) return { ...m, densidade: newValue };
        return m;
      });
      onChange({ materiais_selecionados: updated });
    },
    [materials, onChange]
  );

  const handleRemoveMaterial = useCallback(
    (materialIndex: number) => {
      const updated = materials.filter((_, i) => i !== materialIndex);
      onChange({ materiais_selecionados: updated });
    },
    [materials, onChange]
  );

  const handleConfirmBanco = useCallback(() => {
    // Pegar quem foi selecionado no draft que ainda não existe na mistura
    const novosMateriais = materiaisDisponiveis
      .filter((mat) => bancoDraft.includes(mat.material_id))
      .filter((mat) => !materials.some((m) => m.material_id === mat.material_id))
      .map((mat) => ({
        ...mat,
        custo_tonelada: mat.custo_tonelada || 0,
        proporcao_kg: 0,
        proporcao_pct: 0,
      }));

    if (novosMateriais.length > 0) {
      onChange({ materiais_selecionados: [...materials, ...novosMateriais] });
      toast.success(`${novosMateriais.length} material(ais) adicionado(s) com sucesso!`);
    }
    
    setIsBancoOpen(false);
  }, [bancoDraft, materials, materiaisDisponiveis, onChange]);

  const toggleBancoDraft = useCallback((id: string) => {
    setBancoDraft(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleSelectDna = useCallback((dnaId: string) => {
    const selectedDna = dnasDisponiveis.find(d => d.id === dnaId);
    onChange({ 
      dna_selecionado: dnaId,
      limites_curva: selectedDna?.limites || []
    });
    toast.success(`DNA de projeto alterado: ${selectedDna?.nome}`);
    setIsDnaOpen(false);
  }, [onChange]);

  const handleNormalize = useCallback(() => {
    const total = materials.reduce((sum, m) => sum + (m.proporcao_kg ?? 0), 0);
    if (total === 0) return;
    const scale = capacidadeMisturador / total;
    const updated = materials.map((m) => ({
      ...m,
      proporcao_kg: Math.round((m.proporcao_kg ?? 0) * scale),
    }));
    onChange({ materiais_selecionados: updated });
    toast.success(`Mistura normalizada para ${capacidadeMisturador} kg!`);
  }, [materials, onChange]);

  // Otimizador de VIBROPRENSADOS (blocos, pavers, CP) — comportamento
  // preservado integralmente, apenas delegando ao motor puro extraído em
  // granulometry-engine.ts. NÃO usar para Laje Protendida.
  const handleOptimize = useCallback(() => {
    if (!limits || materials.length === 0) return;

    const testMaterials = materials.map(m => ({
      material_id: m.material_id,
      proporcao_pct: (m.proporcao_kg ?? 0),
      gradations: m.gradations,
    }));
    const current = otimizarCurvaVibroprensado(testMaterials, limits);

    // Converte frações para kg (referência capacidadeMisturador)
    const updated = materials.map((m, i) => ({
      ...m,
      proporcao_kg: Math.round(current[i] * capacidadeMisturador),
    }));
    onChange({ materiais_selecionados: updated });
    toast.success("Traço otimizado (Centro da Faixa)!");
  }, [materials, limits, onChange, capacidadeMisturador]);

  // Otimizador de LAJE PROTENDIDA — algoritmo independente (ver
  // src/lib/laje-optimizer.ts), busca uma composição dentro das faixas de
  // areia/brita/pó de pedra da Laje Protendida (LAJE_SEARCH_SEED) e verifica
  // dimensão máxima do agregado graúdo vs. peça. Não depende de experimentos
  // reais cadastrados — a resistência real só é conhecida após a produção.
  const handleOptimizeLaje = useCallback(() => {
    if (!limits || materials.length === 0) return;

    const testMaterials = materials.map(m => ({
      material_id: m.material_id,
      proporcao_pct: (m.proporcao_kg ?? 0),
      gradations: m.gradations,
    }));

    const res = otimizarCurvaLajeProtendida({
      materials: testMaterials,
      limits,
      dimensaoMaximaPermitidaMm,
    });

    if (!res.ok) {
      toast.error("Dados insuficientes para otimização granulométrica.");
      return;
    }

    const updated = materials.map((m, i) => ({
      ...m,
      proporcao_kg: Math.round(res.result.fracs[i] * capacidadeMisturador),
    }));
    onChange({ materiais_selecionados: updated });
    toast.success("Traço otimizado (Laje Protendida)!");
    res.result.alertas.forEach((msg) => toast.warning(msg));
  }, [materials, limits, onChange, capacidadeMisturador, dimensaoMaximaPermitidaMm]);

  // Alertas de composição da mistura ATUAL para Laje Protendida — calculados
  // independente de rodar o otimizador, também refletem edição manual.
  const alertasLaje = useMemo(() => {
    if (tipoDosagem !== "WET_CASTING_PROTENDIDO" || materials.length === 0) return [];
    const testMaterials = materialsWithPct.map(m => ({
      material_id: m.material_id,
      proporcao_pct: m.proporcao_pct,
      gradations: m.gradations,
    }));
    const papeis = testMaterials.map(m => classificarPapelAgregado(m.gradations));
    return gerarAlertasComposicaoLaje(testMaterials, papeis);
  }, [tipoDosagem, materials, materialsWithPct]);

  // Status config
  const statusConfig = {
    conforme: {
      label: "DENTRO DA FAIXA",
      color: "bg-success/15 text-success border-success/30",
      icon: CheckCircle2,
      iconColor: "text-success",
    },
    atencao: {
      label: "PRÓXIMO DO IDEAL",
      color: "bg-warning/15 text-warning border-warning/30",
      icon: AlertCircle,
      iconColor: "text-warning",
    },
    nao_conforme: {
      label: "FORA DA FAIXA",
      color: "bg-destructive/15 text-destructive border-destructive/30",
      icon: AlertTriangle,
      iconColor: "text-destructive",
    },
  };

  const statusInfo = statusConfig[curvaStatus.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Switcher de Camada */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex bg-muted/40 rounded-full border p-1 border-primary/10">
          <button
            type="button"
            onClick={() => setCamadaAtiva("base")}
            className={cn(
              "px-4 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full transition-all flex items-center gap-2",
              camadaAtiva === "base" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Database className="h-3.5 w-3.5" /> CAMADA BASE
          </button>
          <button
            type="button"
            onClick={() => setCamadaAtiva("face")}
            className={cn(
              "px-4 py-1.5 text-[11px] font-black tracking-widest uppercase rounded-full transition-all flex items-center gap-2",
              camadaAtiva === "face" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Database className="h-3.5 w-3.5" /> CAMADA FACE
          </button>
        </div>
      </div>

      {/* Top Banner (Status + Button Combinar DNA) */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-1.5",
          curvaStatus.status === "conforme" ? "border-success/30 bg-success/10 text-success font-black" :
            curvaStatus.status === "atencao" ? "border-warning/30 bg-warning/10 text-warning font-black" :
              "border-destructive/30 bg-destructive/10 text-destructive font-black"
        )}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-[11px] tracking-widest uppercase">{statusInfo.label}</span>
        </div>

        <Button 
          onClick={() => setIsDnaOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-full text-[11px] font-black tracking-widest px-6 h-9 gap-2"
        >
          <Dna className="w-4 h-4" />
          COMBINAR DNA
        </Button>
      </div>

      {/* Seletor de fonte */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fonte de Bica:</span>
        <button
          type="button"
          onClick={() => setFonteAtiva("bica")}
          className={cn(
            "rounded px-3 py-1 text-xs font-semibold transition-all",
            fonteAtiva === "bica"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          BICA CORRIDA
        </button>
        <button
          type="button"
          onClick={() => setFonteAtiva("manual")}
          className={cn(
            "rounded px-3 py-1 text-xs font-semibold transition-all",
            fonteAtiva === "manual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          ENTRADA MANUAL
        </button>
      </div>

      {/* Layout principal: Coluna Esquerda (Tabela + Dosagem) | Coluna Direita (Gráfico) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* Coluna Esquerda: ocupa 2/3 - Tabela e Proporção */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <Card className="h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider">
                TABELA GRANULOMÉTRICA –{" "}
                {data.tipo_analise === "laje"
                  ? "LAJES"
                  : data.tipo_analise === "paver" || data.tipo_analise === "cp"
                  ? "PAVERS"
                  : "BLOCOS"}
              </CardTitle>
              <div className="flex flex-row gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowPctRetida(v => !v)}
                  aria-pressed={showPctRetida}
                  aria-label={showPctRetida ? "Ocultar % Retida" : "Mostrar % Retida"}
                >
                  {showPctRetida ? "Ocultar % Retida" : "Mostrar % Retida"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setBancoDraft(materials.map(m => m.material_id));
                    setIsBancoOpen(true);
                  }}
                >
                  <Database className="h-3 w-3" />
                  BANCO DE AGREGADOS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setIsPresetLoadOpen(true)}
                >
                  <FolderOpen className="h-3 w-3" />
                  CARREGAR
                </Button>
                {!readOnly && materials.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => { setPresetNome(""); setIsPresetSaveOpen(true); }}
                  >
                    <Save className="h-3 w-3" />
                    SALVAR
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  {/* Primeira linha: Nome dos materiais com colSpan e informações */}
                  <TableRow className="bg-transparent border-b-2 border-primary/60 hover:bg-transparent">
                    <TableHead className="w-[90px] text-xs font-black uppercase py-2 align-bottom">Peneira</TableHead>
                    {materials.map((m, mi) => (
                      <TableHead
                        key={m.material_id}
                        colSpan={showPctRetida ? 2 : 1}
                        className="text-center py-2 px-1 align-bottom"
                      >
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                          <div className="flex items-center gap-1 mb-1">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterial(mi)}
                                className="h-4 w-4 rounded-full border border-destructive/40 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                                title="Remover Material"
                              >
                                <span className="text-[8px] leading-none font-bold">✕</span>
                              </button>
                            )}
                            <span className="text-[11px] font-black uppercase text-foreground leading-tight tracking-tight">
                              {m.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px]">
                            <span className="font-bold text-muted-foreground">MF: {mfPerMaterial[mi]?.mf.toFixed(2)}</span>
                            <span className="text-muted-foreground">{totalKgMistura > 0 ? ((m.proporcao_kg ?? 0) / totalKgMistura * 100).toFixed(0) : "0"}%</span>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center py-2 px-1 align-bottom" colSpan={2}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-black uppercase text-foreground leading-tight">% RETIDA MISTURA</span>
                        <span className="text-[8px] text-muted-foreground uppercase leading-tight block">(acumulada)</span>
                      </div>
                    </TableHead>
                  </TableRow>

                  {/* Segunda linha: Subheaders MASSA e % RETIDA */}
                  <TableRow className="bg-muted/20 border-b hover:bg-muted/20">
                    <TableHead className="text-xs font-bold uppercase text-muted-foreground py-1.5" />
                    {materials.map((m) => [
                      <TableHead
                        key={m.material_id + '-mass'}
                        className="text-center text-[9px] font-bold uppercase text-muted-foreground py-1.5 border-r border-muted/40"
                      >
                        MASSA
                      </TableHead>,
                      showPctRetida && (
                        <TableHead
                          key={m.material_id + '-pct'}
                          className="text-center text-[9px] font-bold uppercase text-muted-foreground py-1.5"
                        >
                          % RETIDA
                        </TableHead>
                      )
                    ])}
                    <TableHead className="text-center text-[9px] font-bold uppercase text-muted-foreground py-1.5 border-l border-primary/30" colSpan={2}>
                      %
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {PENEIRAS_PADRAO.map((peneira) => {
                    const combined = curveResults.find((r) => r.sieve_id === peneira.sieve_id);
                    const isOutside = combined?.fora_da_faixa;
                    return (
                      <TableRow key={peneira.sieve_id} className={cn("hover:bg-muted/50 transition-colors", isOutside && "bg-destructive/5")}>
                        <TableCell className="font-mono text-xs font-bold py-2 pl-2">
                          <span className={cn(isOutside && "text-destructive font-black")}>
                            {peneira.label}
                          </span>
                        </TableCell>
                        {materials.map((m, mi) => {
                          const grad = m.gradations.find((g) => g.sieve_id === peneira.sieve_id);
                          const totalMass = m.gradations.reduce((sum, g) => sum + g.massa_retida, 0);
                          const pctIndividual = grad && totalMass > 0 ? (grad.massa_retida / totalMass) * 100 : 0;

                          return [
                            <TableCell key={m.material_id + '-input'} className="p-1 text-center">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                className="h-7 text-[10px] font-bold text-center w-full rounded-md border-muted-foreground/20 focus-visible:ring-primary/20"
                                placeholder="0"
                                value={
                                  localValues[getLocalKey(mi, peneira.sieve_id)] ??
                                  (grad?.massa_retida?.toString() ?? "")
                                }
                                onFocus={() => {
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  setLocalValues(prev => ({
                                    ...prev,
                                    [key]: grad?.massa_retida?.toString() ?? ""
                                  }));
                                }}
                                onChange={(e) => {
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  setLocalValues(prev => ({ ...prev, [key]: e.target.value }));
                                }}
                                onBlur={(e) => {
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  const parsed = parseFloat(e.target.value);
                                  handleMassChange(mi, peneira.sieve_id, isNaN(parsed) ? 0 : parsed);
                                  setLocalValues(prev => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>,
                            showPctRetida && (
                              <TableCell key={m.material_id + '-pct'} className="p-1 text-center">
                                <span className="inline-flex items-center justify-center h-7 text-[10px] font-bold text-foreground rounded-md bg-muted/40 min-w-[45px]">
                                  {pctIndividual.toFixed(1)}%
                                </span>
                              </TableCell>
                            )
                          ];
                        })}
                        <TableCell className="p-1 text-center border-l border-primary/30" colSpan={2}>
                          <span className="inline-flex items-center justify-center h-7 text-[11px] font-black text-primary rounded-md bg-primary/10 min-w-[60px]">
                            {combined ? (combined.pct_acumulado * 100).toFixed(1) : "–"}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}


                  {/* MF footer */}
                  <TableRow className="bg-muted/40 border-t-2 hover:bg-muted/40">
                    <TableCell className="text-xs font-black py-2 pl-2">MF</TableCell>
                    {mfPerMaterial.map((mf, idx) => [
                      <TableCell key={materials[idx].material_id + '-mf-mass'} className="text-center text-xs font-bold text-foreground py-2 border-r border-muted/40">
                        {mf.mf.toFixed(3)}
                      </TableCell>,
                      showPctRetida && (
                        <TableCell key={materials[idx].material_id + '-mf-pct'} className="text-center text-xs font-bold text-foreground py-2">
                          100.0%
                        </TableCell>
                      )
                    ])}
                    <TableCell className="text-center text-xs font-black text-primary py-2 border-l border-primary/30" colSpan={2}>
                      {mfCombinado.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Seção PROPORÇÃO DE MISTURA */}
          <Card className="border-transparent shadow-none bg-transparent">
            <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-destructive" />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground">
                  PROPORÇÃO DA MISTURA
                </CardTitle>
              </div>

              <div className="flex items-center gap-4">
                {/* Toggle % / KG */}
                <div className="flex bg-muted/40 rounded-full border p-0.5 border-primary/10">
                  <button
                    type="button"
                    onClick={() => setUnidadeAtiva("pct")}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-full transition-all flex items-center gap-1",
                      unidadeAtiva === "pct" ? "bg-white text-destructive shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnidadeAtiva("kg")}
                    className={cn(
                      "px-3 py-1 text-[10px] font-black rounded-full transition-all flex items-center gap-1",
                      unidadeAtiva === "kg" ? "bg-white text-destructive shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Database className="h-3 w-3" /> KG
                  </button>
                </div>

                <Badge
                  className={cn(
                    "px-3 py-1 text-[11px] uppercase tracking-widest font-black rounded-full flex items-center gap-1.5",
                    Math.abs(totalKgMistura - capacidadeMisturador) < capacidadeMisturador * 0.02
                      ? "bg-success hover:bg-success/90 text-white"
                      : "bg-warning hover:bg-warning/90 text-white"
                  )}
                >
                  {totalKgMistura.toFixed(0)} kg
                  {Math.abs(totalKgMistura - capacidadeMisturador) < capacidadeMisturador * 0.02 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                </Badge>
              </div>
            </CardHeader>

            {/* Barra verde abaixo do titulo igual no layout */}
            <div className="h-1.5 w-full bg-success rounded-full mb-6 relative overflow-hidden" />

            <CardContent className="p-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {materials.map((m, i) => (
                  <div
                    key={m.material_id}
                    className="group relative rounded-xl border border-destructive/20 bg-white p-4 transition-all hover:border-destructive hover:shadow-md"
                  >
                    {/* Nome do material e valor */}
                    <div className="flex gap-3 items-start mb-6">
                      <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Dna className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-black uppercase text-foreground leading-tight tracking-tight">
                          {m.nome.split(" ").slice(0, 2).join(" ")}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight tracking-tight mb-1">
                          {m.nome.split(" ").slice(2).join(" ")}
                        </p>
                        <p className="text-sm font-black text-destructive tracking-tight">
                            {readOnly
                              ? `${(m.proporcao_kg ?? 0).toFixed(0)} kg`
                              : unidadeAtiva === "pct"
                                ? `${totalKgMistura > 0 ? ((m.proporcao_kg ?? 0) / totalKgMistura * 100).toFixed(1) : "0.0"}%`
                                : `${(m.proporcao_kg ?? 0).toFixed(0)} kg`
                            }
                          </p>
                          {readOnly && (
                            <p className="text-[10px] font-bold text-muted-foreground">
                              {totalKgMistura > 0 ? ((m.proporcao_kg ?? 0) / totalKgMistura * 100).toFixed(1) : "0.0"}%
                            </p>
                          )}
                        {/* Custo dinâmico do material */}
                        <p className="text-[9px] font-bold text-success/80 mt-1 uppercase">
                          {(() => {
                            // Busca info do material no banco
                            const dbMat = dbMaterials.find((mat) => mat.id === m.material_id);
                            const custo_valor = dbMat?.custo_valor ?? dbMat?.custo_tonelada ?? 0;
                            const custo_unidade = dbMat?.custo_unidade || (dbMat?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                            const densidade = m.densidade || dbMat?.densidade || 2.65;
                            const quantidade = m.proporcao_kg ?? 0;
                            const custo = calcularCustoMaterial({ custo_valor, custo_unidade, quantidade, densidade });
                            if (!custo_valor) return 'Sem custo def.';
                            return `R$ ${custo.toFixed(2)} / ${quantidade.toFixed(0)}kg`;
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Densidade Field */}
                    <div className="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-lg border border-border/50">
                       <div className="flex flex-col flex-1">
                          <Label className="text-[9px] font-bold text-muted-foreground uppercase">Densidade</Label>
                          <span className="text-[9px] text-muted-foreground opacity-70">(g/cm³)</span>
                       </div>
                       <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-8 w-20 text-[11px] font-black text-center"
                          value={m.densidade === 0 ? "" : (m.densidade ?? "")}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleDensityChange(i, e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                       />
                    </div>

                    {/* Slider */}
                    <div className="px-1">
                      <Slider
                        min={0}
                        max={capacidadeMisturador}
                        step={1}
                        value={[m.proporcao_kg ?? 0]}
                        onValueChange={(vals) => handleProportionChange(i, vals[0])}
                        className="cursor-grab active:cursor-grabbing"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Botões Operacionais */}
              <div className="flex items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={handleNormalize}
                  className="border-muted-foreground/30 text-[11px] font-black tracking-widest uppercase gap-2 h-10 px-6 rounded-full hover:bg-muted/30"
                >
                  <Database className="w-4 h-4 text-muted-foreground" /> NORMALIZAR MISTURA (100%)
                </Button>
                <Button
                  onClick={tipoDosagem === "WET_CASTING_PROTENDIDO" ? handleOptimizeLaje : handleOptimize}
                  className="bg-destructive hover:bg-destructive/90 text-white text-[11px] font-black tracking-widest uppercase gap-2 h-10 px-6 rounded-full shadow-lg shadow-destructive/20"
                >
                  <Dna className="w-4 h-4" />
                  {tipoDosagem === "WET_CASTING_PROTENDIDO" ? "OTIMIZAR TRAÇO (LAJE PROTENDIDA)" : "OTIMIZAR TRAÇO (CENTRO DA FAIXA)"}
                </Button>
              </div>

              {/* Alertas de composição — específicos do modelo Laje Protendida.
                  Não são exigência normativa, apenas parâmetros internos de
                  controle para sinalizar composições tecnicamente suspeitas. */}
              {alertasLaje.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {alertasLaje.map((msg, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">{msg}</p>
                    </div>
                  ))}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: flutua via CSS puro */}
        <div className="xl:col-span-1 sticky top-24 z-10 transition-all duration-300">
          <Card className="pt-4 shadow-sm border-destructive/10">
            <CardContent className="p-4 flex flex-col relative">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {tipoDosagem === "WET_CASTING_PROTENDIDO" ? "Curva Combinada — Concreto Estrutural Protendido" : "Curva Combinada"}
                    </p>
                    <p className="text-4xl font-black text-destructive leading-none tracking-tighter">
                      {mfCombinado.toFixed(2)}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest pt-1">MF TOTAL</p>
                  </div>

                  {/* Badge de Compatibilidade */}
                  <div className="bg-primary/10 border border-primary/20 rounded-md p-2 text-center min-w-[70px]">
                    <p className="text-[9px] font-black uppercase text-primary/70 mb-0.5 tracking-widest">COMPAT.</p>
                    <p className="text-xl font-black text-primary leading-none">
                      {(curvaStatus.indice_compatibilidade * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Informações de erros se houver */}
                {curvaStatus.peneiras_fora > 0 && (
                  <div className="mb-4 mt-2 border-l-2 border-destructive pl-2 shrink-0">
                    <p className="text-[10px] font-bold text-destructive">
                      {curvaStatus.peneiras_fora} peneira(s) fora
                    </p>
                  </div>
                )}

                {/* Indicador de Custo Total dos Agregados */}
                <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-lg mt-2 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-success"></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Custo Total dos Agregados</p>
                    <p className="text-sm font-bold text-success">
                      {(() => {
                        // Soma custo real de todos os agregados
                        let total = 0;
                        materials.forEach((m) => {
                          const dbMat = dbMaterials.find((mat) => mat.id === m.material_id);
                          const custo_valor = dbMat?.custo_valor ?? dbMat?.custo_tonelada ?? 0;
                          const custo_unidade = dbMat?.custo_unidade || (dbMat?.custo_tonelada != null ? 'tonelada' : 'tonelada');
                          const densidade = m.densidade || dbMat?.densidade || 2.65;
                          const quantidade = m.proporcao_kg ?? 0;
                          total += calcularCustoMaterial({ custo_valor, custo_unidade, quantidade, densidade });
                        });
                        return `R$ ${total.toFixed(2)}`;
                      })()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-black border-success/30 text-success bg-success/5 uppercase font-mono">
                    TOTAL
                  </Badge>
                </div>

                {/* Gráfico */}
                <div className="mt-2 border rounded-xl overflow-hidden bg-white/50 relative h-[320px]">
                  <div className="absolute inset-0 pt-4 pb-2">
                    <GranulometryChart curveResults={curveResultsParaGrafico} hasLimits={!!(limits?.length)} tipoDosagem={tipoDosagem} compact />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL BANCO DE AGREGADOS */}
      <Dialog 
        open={isBancoOpen} 
        onOpenChange={(v) => {
          if (!v) setBancoDraft([]); // Limpa ao fechar
          setIsBancoOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">BANCO DE AGREGADOS</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Selecione os materiais disponíveis para compor sua mistura
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-[50vh] overflow-y-auto p-1">
            {materiaisDisponiveis.map((mat) => {
              const isAlreadyInMixture = materials.some(m => m.material_id === mat.material_id);
              const isSelectedInDraft = bancoDraft.includes(mat.material_id);

              return (
                <div 
                  key={mat.material_id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
                    isAlreadyInMixture 
                      ? "bg-muted/50 border-transparent opacity-60 cursor-not-allowed" // Já está na mistura
                      : isSelectedInDraft
                        ? "bg-primary/5 border-primary shadow-sm" // Selecionado agora
                        : "bg-white border-border hover:border-primary/50 hover:shadow-md" // Disponível
                  )}
                  onClick={() => {
                    if (!isAlreadyInMixture) {
                      toggleBancoDraft(mat.material_id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isAlreadyInMixture 
                        ? "bg-muted text-muted-foreground" 
                        : isSelectedInDraft 
                          ? "bg-primary text-white scale-110 shadow-md"
                          : "bg-primary/10 text-primary"
                    )}>
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn("text-xs font-black uppercase tracking-tight", isSelectedInDraft && "text-primary")}>
                        {mat.nome}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Insumo Base</p>
                    </div>
                  </div>
                  
                  {isAlreadyInMixture ? (
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-muted-foreground/30">NA MISTURA</Badge>
                  ) : isSelectedInDraft ? (
                    <div className="bg-primary text-white p-1 rounded-full shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end border-t pt-4 mt-2">
            <Button 
              size="lg" 
              className="font-black uppercase tracking-widest text-[11px] gap-2 rounded-full w-full sm:w-auto px-8"
              onClick={handleConfirmBanco}
              disabled={bancoDraft.filter(id => !materials.some(m => m.material_id === id)).length === 0}
            >
              CONFIRMAR SELEÇÃO
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL SALVAR GRANULOMETRIA */}
      <Dialog open={isPresetSaveOpen} onOpenChange={setIsPresetSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">SALVAR GRANULOMETRIA</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Dê um nome para este preset de granulometria
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nome do Preset</label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="Ex.: Semana 23 – Padrão Bloco"
                value={presetNome}
                onChange={(e) => setPresetNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && presetNome.trim()) {
                    createPreset({
                      nome: presetNome.trim(),
                      materiais: data.materiais_selecionados,
                      dna_selecionado: data.dna_selecionado,
                      limites_curva: data.limites_curva,
                      tipo_analise: data.tipo_analise,
                    }).then(() => {
                      toast.success("Granulometria salva com sucesso!");
                      setIsPresetSaveOpen(false);
                    }).catch((err) => toast.error(err?.message || "Erro ao salvar granulometria"));
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsPresetSaveOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!presetNome.trim() || isSavingPreset}
                onClick={() => {
                  createPreset({
                    nome: presetNome.trim(),
                    materiais: data.materiais_selecionados,
                    dna_selecionado: data.dna_selecionado,
                    limites_curva: data.limites_curva,
                    tipo_analise: data.tipo_analise,
                  }).then(() => {
                    toast.success("Granulometria salva com sucesso!");
                    setIsPresetSaveOpen(false);
                  }).catch((err) => toast.error(err?.message || "Erro ao salvar granulometria"));
                }}
              >
                <Save className="h-3 w-3 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CARREGAR GRANULOMETRIA */}
      <Dialog open={isPresetLoadOpen} onOpenChange={setIsPresetLoadOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">CARREGAR GRANULOMETRIA</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Selecione um preset salvo para preencher a tabela
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {presets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhum preset salvo</p>
                <p className="text-xs mt-1">Preencha a granulometria e clique em "Salvar" para criar um preset</p>
              </div>
            ) : presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/10 cursor-pointer transition-all group"
                onClick={() => {
                  onChange({
                    materiais_selecionados: preset.materiais,
                    dna_selecionado: preset.dna_selecionado ?? undefined,
                    limites_curva: preset.limites_curva ?? undefined,
                  });
                  toast.success(`Granulometria "${preset.nome}" carregada!`);
                  setIsPresetLoadOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                    <FolderOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{preset.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {preset.materiais.length} material(is) · {new Date(preset.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full border border-destructive/40 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-all text-xs"
                  title="Excluir preset"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(preset.id).then(() => toast.success("Preset excluído")).catch(() => toast.error("Erro ao excluir"));
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL COMBINAR DNA */}
      <Dialog open={isDnaOpen} onOpenChange={setIsDnaOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">COMBINAR DNA DE PROJETO</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Altere os limites granulométricos conforme o produto alvo
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 mt-4">
            {dnasDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dna className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Nenhuma curva padrão (DNA) cadastrada</p>
                <p className="text-xs mt-1">Vá em Configurações → Tipos de Análise para criar uma curva padrão</p>
              </div>
            ) : dnasDisponiveis.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                  data.dna_selecionado === item.id ? "bg-primary/5 border-primary shadow-sm" : "bg-white border-border hover:border-primary hover:bg-accent/10"
                )}
                onClick={() => handleSelectDna(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                    data.dna_selecionado === item.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Dna className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{item.nome}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.tipo.replace("_", " ")}</p>
                  </div>
                </div>
                {data.dna_selecionado === item.id && (
                  <div className="bg-primary text-white p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}












