import { useMemo, useCallback, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  calcCombinedCurve,
  calcCurvaStatus,
  calcModuloFinura,
} from "@/lib/granulometry-engine";
import {
  PENEIRAS_PADRAO,
  DNAS_PADRAO,
  type AnalysisFormData,
  type AnalysisMaterial,
} from "@/lib/analysis-data";
import { useMaterials } from "@/hooks/api/useMaterials";
import { Database, Dna, AlertTriangle, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";

interface StepGranulometryProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

export function StepGranulometry({ data, onChange }: StepGranulometryProps) {
  const [fonteAtiva, setFonteAtiva] = useState<"bica" | "manual">("bica");
  const [camadaAtiva, setCamadaAtiva] = useState<"base" | "face">("base");
  const [unidadeAtiva, setUnidadeAtiva] = useState<"pct" | "kg">("pct");
  const [isBancoOpen, setIsBancoOpen] = useState(false);
  const [isDnaOpen, setIsDnaOpen] = useState(false);
  const [bancoDraft, setBancoDraft] = useState<string[]>([]); // Staging array para modal de materiais

  // Estado local temporário para os inputs da tabela.
  // Chave: "mi-sieveId". Permite apagar, digitar decimais e vírgula
  // sem que o React force o campo de volta ao valor do store.
  // O valor só é gravado no store quando o campo perde o foco (onBlur).
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const getLocalKey = (mi: number, sieveId: number) => `${mi}-${sieveId}`;

  const { materials: dbMaterials } = useMaterials();
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

  // proporcao_pct derivado de proporcao_kg — usado na curva granulométrica
  const materialsWithPct = useMemo(() => {
    const total = totalKgMistura || 1;
    return materials.map(m => ({
      ...m,
      proporcao_pct: (m.proporcao_kg ?? 0) / total,
    }));
  }, [materials, totalKgMistura]);

  const dna = DNAS_PADRAO.find((d) => d.id === data.dna_selecionado) || DNAS_PADRAO[0];
  const limits = dna?.limites;

  // Inicializa limites se for a primeira vez
  if (data.limites_curva?.length === 0 && dna) {
    onChange({
      materiais_selecionados: [],
      limites_curva: dna?.limites || []
    });
  }

  // Curva combinada — usa proporcao_pct derivado
  const curveResults = useMemo(
    () => calcCombinedCurve(materialsWithPct, limits),
    [materialsWithPct, limits]
  );

  const curvaStatus = useMemo(
    () => calcCurvaStatus(curveResults),
    [curveResults]
  );

  // MF por material
  const mfPerMaterial = useMemo(
    () => materials.map((m) => ({
      id: m.material_id,
      mf: calcModuloFinura(m.gradations),
    })),
    [materials]
  );

  // MF combinado — ponderado pelo proporcao_kg
  const mfCombinado = useMemo(() => {
    if (totalKgMistura === 0) return 0;
    return materials.reduce((sum, m, i) => {
      return sum + (mfPerMaterial[i].mf * (m.proporcao_kg ?? 0)) / totalKgMistura;
    }, 0);
  }, [materials, mfPerMaterial, totalKgMistura]);

  // Custo base ponderado dos agregados — busca pre\u00e7o atualizado de materiaisDisponiveis (DB)
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
    const selectedDna = DNAS_PADRAO.find(d => d.id === dnaId);
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
    const scale = 550 / total;
    const updated = materials.map((m) => ({
      ...m,
      proporcao_kg: Math.round((m.proporcao_kg ?? 0) * scale),
    }));
    onChange({ materiais_selecionados: updated });
    toast.success("Mistura normalizada para 550 kg!");
  }, [materials, onChange]);

  const handleOptimize = useCallback(() => {
    if (!limits || materials.length === 0) return;

    // Otimizador trabalha em frações (0-1) e converte para kg ao final
    const toFracs = (mats: typeof materials) => {
      const total = mats.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0) || 1;
      return mats.map(m => (m.proporcao_kg ?? 0) / total);
    };

    let bestFracs = toFracs(materials);
    let bestDeviation = Infinity;

    const getDeviation = (fracs: number[]) => {
      const testMaterials = materials.map((m, i) => ({ ...m, proporcao_pct: fracs[i] }));
      const res = calcCombinedCurve(testMaterials, limits);
      return res.reduce((sum, r) => sum + (r.desvio_absoluto || 0), 0);
    };

    bestDeviation = getDeviation(bestFracs);

    // Monte Carlo
    for (let i = 0; i < 2000; i++) {
      const rand = materials.map(() => Math.random());
      const randSum = rand.reduce((a, b) => a + b, 0);
      const fracs = rand.map(p => p / randSum);
      const dev = getDeviation(fracs);
      if (dev < bestDeviation) { bestDeviation = dev; bestFracs = fracs; }
    }

    // Hill climbing
    let current = [...bestFracs];
    for (let step = 0; step < 500; step++) {
      const idx1 = Math.floor(Math.random() * materials.length);
      const idx2 = Math.floor(Math.random() * materials.length);
      if (idx1 === idx2) continue;
      const delta = (Math.random() * 0.05) - 0.025;
      const next = [...current];
      next[idx1] += delta;
      next[idx2] -= delta;
      if (next[idx1] < 0 || next[idx2] < 0) continue;
      const dev = getDeviation(next);
      if (dev < bestDeviation) { bestDeviation = dev; current = next; }
    }

    // Converte frações para kg (referência 550 kg)
    const updated = materials.map((m, i) => ({
      ...m,
      proporcao_kg: Math.round(current[i] * 550),
    }));
    onChange({ materiais_selecionados: updated });
    toast.success("Traço otimizado (Centro da Faixa)!");
  }, [materials, limits, onChange]);

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
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider">
                TABELA GRANULOMÉTRICA — BLOCOS
              </CardTitle>
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
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent border-b-none hover:bg-transparent">
                    <TableHead className="w-[80px] text-xs font-black uppercase align-bottom pb-4">Peneira</TableHead>
                    {materials.map((m, mi) => (
                      <TableHead key={m.material_id} className="text-center min-w-[110px] pb-4 px-1 align-bottom">
                        <div className="flex flex-col items-center justify-end space-y-1.5 h-full">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(mi)}
                            className="h-5 w-5 rounded-full border border-destructive/40 text-destructive hover:bg-destructive hover:text-white flex items-center justify-center transition-colors mb-2"
                            title="Remover Material"
                          >
                            <span className="text-[10px] leading-none font-bold">✕</span>
                          </button>

                          {/* Parse name to split brand/source if needed, or just break words */}
                          <span className="text-[10px] font-black uppercase text-foreground leading-tight tracking-tight">
                            {m.nome.split(" ").slice(0, 2).join(" ")}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase leading-tight tracking-tight">
                            {m.nome.split(" ").slice(2).join(" ")}
                          </span>

                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">
                              MF: {mfPerMaterial[mi]?.mf.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-bold border-l pl-1.5 text-muted-foreground border-muted-foreground/30">
                              {totalKgMistura > 0 ? ((m.proporcao_kg ?? 0) / totalKgMistura * 100).toFixed(1) : "0.0"}%
                            </span>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] text-[10px] font-black uppercase text-muted-foreground align-bottom pb-4 tracking-tighter">
                      % RETIDA<br />INDIVIDUAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PENEIRAS_PADRAO.map((peneira) => {
                    const combined = curveResults.find((r) => r.sieve_id === peneira.sieve_id);
                    const isOutside = combined?.fora_da_faixa;
                    return (
                      <TableRow
                        key={peneira.sieve_id}
                        className={cn(isOutside && "bg-destructive/5")}
                      >
                        <TableCell className="font-mono text-xs font-semibold py-1.5">
                          <span className={cn(isOutside && "text-destructive")}>
                            {peneira.label}
                          </span>
                        </TableCell>
                        {materials.map((m, mi) => {
                          const grad = m.gradations.find((g) => g.sieve_id === peneira.sieve_id);
                          return (
                            <TableCell key={m.material_id} className="p-1">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                className="h-8 text-[11px] font-bold text-center w-full rounded-full border-muted-foreground/20 focus-visible:ring-primary/20"
                                value={
                                  localValues[getLocalKey(mi, peneira.sieve_id)] 
                                  ?? (grad?.massa_retida?.toString() ?? "0")
                                }
                                onFocus={() => {
                                  // Inicializa o estado local com o valor atual do store
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  setLocalValues(prev => ({ ...prev, [key]: grad?.massa_retida?.toString() ?? "0" }));
                                }}
                                onChange={(e) => {
                                  // Atualiza apenas o estado local — não grava no store
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  setLocalValues(prev => ({ ...prev, [key]: e.target.value }));
                                }}
                                onBlur={(e) => {
                                  // Grava no store e remove do estado local
                                  const key = getLocalKey(mi, peneira.sieve_id);
                                  const parsed = parseFloat(e.target.value);
                                  handleMassChange(mi, peneira.sieve_id, isNaN(parsed) ? 0 : parsed);
                                  setLocalValues(prev => { const next = { ...prev }; delete next[key]; return next; });
                                }}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <span className="inline-block bg-muted/30 px-3 py-1 rounded-full text-[11px] font-black text-foreground">
                            {combined ? (combined.pct_acumulado * 100).toFixed(1) : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* MF footer */}
                  <TableRow className="bg-muted/50 border-t-2">
                    <TableCell className="text-xs font-black">MF</TableCell>
                    {mfPerMaterial.map((mf) => (
                      <TableCell key={mf.id} className="text-center text-xs font-bold text-foreground">
                        {mf.mf.toFixed(3)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-black text-primary">
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
                    Math.abs(totalKgMistura - 550) < 10
                      ? "bg-success hover:bg-success/90 text-white"
                      : "bg-warning hover:bg-warning/90 text-white"
                  )}
                >
                  {totalKgMistura.toFixed(0)} kg
                  {Math.abs(totalKgMistura - 550) < 10 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
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
                          {unidadeAtiva === "pct"
                            ? `${totalKgMistura > 0 ? ((m.proporcao_kg ?? 0) / totalKgMistura * 100).toFixed(1) : "0.0"}%`
                            : `${(m.proporcao_kg ?? 0).toFixed(0)} kg`}
                        </p>
                        <p className="text-[9px] font-bold text-success/80 mt-1 uppercase">
                          {m.custo_tonelada ? `R$ ${m.custo_tonelada.toFixed(2)}/ton` : "Sem custo def."}
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
                        max={550}
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
                  onClick={handleOptimize}
                  className="bg-destructive hover:bg-destructive/90 text-white text-[11px] font-black tracking-widest uppercase gap-2 h-10 px-6 rounded-full shadow-lg shadow-destructive/20"
                >
                  <Dna className="w-4 h-4" /> OTIMIZAR TRAÇO (CENTRO DA FAIXA)
                </Button>
              </div>
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
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Curva Combinada</p>
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

                {/* Indicador de Custo Parcial Agregados */}
                <div className="flex justify-between items-center bg-muted/20 border p-3 rounded-lg mt-2 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-success"></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Custo Agregados Base</p>
                    <p className="text-sm font-bold text-success">R$ {custoBaseAgregadosTon.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-black border-success/30 text-success bg-success/5 uppercase font-mono">
                    POR TON
                  </Badge>
                </div>

                {/* Gráfico */}
                <div className="mt-2 border rounded-xl overflow-hidden bg-white/50 relative h-[320px]">
                  <div className="absolute inset-0 pt-4 pb-2">
                    <GranulometryChart curveResults={curveResults} hasLimits={!!limits} compact />
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
        <DialogContent className="max-w-2xl">
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

      {/* MODAL COMBINAR DNA */}
      <Dialog open={isDnaOpen} onOpenChange={setIsDnaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter">COMBINAR DNA DE PROJETO</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Altere os limites granulométricos conforme o produto alvo
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 mt-4">
            {DNAS_PADRAO.map((item) => (
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
