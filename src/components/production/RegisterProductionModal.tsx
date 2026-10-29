import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useProduction, type ReceitaRealItem } from "@/hooks/api/useProduction";
import { useMaterials } from "@/hooks/api/useMaterials";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";
import { getConfigMisturador } from "@/lib/analysis-data";
import { calcularCustoMaterial } from "@/lib/utils";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

const PISTAS_LAJE = ["Pista 1", "Pista 2", "Pista 3", "Pista 4", "Pista 5", "Pista 6"];

const fmt = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function generateBatchCode() {
  return `L-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const { createBatch, isCreating, batches } = useProduction();
  const { materials: dbMaterials } = useMaterials();

  const [batchCode, setBatchCode] = useState(generateBatchCode);
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const toLocalDateTimeInput = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [dataProducao, setDataProducao] = useState(toLocalDateTimeInput(new Date()));
  const [observacoes, setObservacoes] = useState("");
  const [aguaKg, setAguaKg] = useState<string>("");
  const [aditivoMl, setAditivoMl] = useState<string>("");

  // Campos exclusivos de laje
  const isLaje = analysis?.tipo === "laje";
  const [pista, setPista] = useState("");
  const [fios, setFios] = useState("");
  const [numTracos, setNumTracos] = useState("1");
  const [reais, setReais] = useState<Record<string, string>>({});
  const [comprimentoPista, setComprimentoPista] = useState("");
  const [volumeConcreto, setVolumeConcreto] = useState("");
  const [metrosPerda, setMetrosPerda] = useState("0");

  const perdaPct = useMemo(() => {
    const comp = Number(comprimentoPista) || 0;
    const perda = Number(metrosPerda) || 0;
    if (comp <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((perda / comp) * 10000) / 100));
  }, [comprimentoPista, metrosPerda]);
  const aproveitamentoPct = Math.round((100 - perdaPct) * 100) / 100;

  // Sincroniza data/hora com o momento de liberação da análise quando o modal abre
  useEffect(() => {
    if (analysis?.liberado_em) {
      setDataProducao(toLocalDateTimeInput(new Date(analysis.liberado_em)));
    } else {
      setDataProducao(toLocalDateTimeInput(new Date()));
    }
  }, [analysis?.id]);

  // Receita calculada diretamente dos valores da análise, sem escala
  const recipe = useMemo(() => {
    if (!analysis) return null;
    const fd = analysis.formData;
    const cimento_kg = fd.consumo_alvo_m3 || 0;
    const agua_l = cimento_kg * (fd.relacao_ac || 0);
    const materiais = (fd.materiais_selecionados ?? []).map((m: any) => ({
      nome: m.nome,
      kg: Math.round((m.proporcao_kg ?? 0) * 10) / 10,
    }));
    const aditivos_ml = Math.round((fd.aditivos_ml || 0) * 10) / 10;
    const totalKg = Math.round((cimento_kg + materiais.reduce((s: number, m: any) => s + m.kg, 0) + agua_l + aditivos_ml / 1000) * 10) / 10;

    return {
      consumo_cimento_batelada: Math.round(cimento_kg * 100) / 100,
      agua_batelada: Math.round(agua_l * 100) / 100,
      materiais_batelada: materiais,
      aditivos_batelada_ml: aditivos_ml,
      massa_total_batelada: totalKg,
    };
  }, [analysis]);

  useEffect(() => {
    if (recipe) {
      setAguaKg(recipe.agua_batelada.toFixed(2));
      setAditivoMl(recipe.aditivos_batelada_ml.toFixed(1));
    }
  }, [recipe]);

  // Laje: receita prevista de 1 traço, com custo unitário de cada material
  const receitaLaje = useMemo(() => {
    if (!analysis || !isLaje) return [];
    const fd = analysis.formData;
    const cimento = fd.consumo_alvo_m3 || 0;
    const acoDb = dbMaterials.find((m) => m.id === fd.aco_material_id);
    const custoAcoKg = acoDb
      ? calcularCustoMaterial({
          custo_valor: acoDb.custo_valor ?? acoDb.custo_tonelada ?? 0,
          custo_unidade: acoDb.custo_unidade || "kg",
          quantidade: 1,
          densidade: acoDb.densidade ?? undefined,
        })
      : 0;
    return [
      { key: "cimento", material: "Cimento", unidade: "kg" as const, previsto: cimento, custoUnit: (fd.custo_cimento_ton || 0) / 1000, destaque: true },
      ...(fd.materiais_selecionados ?? []).map((m: any, i: number) => ({
        key: `mat-${i}`,
        material: m.nome,
        unidade: "kg" as const,
        previsto: m.proporcao_kg ?? 0,
        custoUnit: (m.custo_tonelada ?? 0) / 1000,
        destaque: false,
      })),
      { key: "agua", material: "Água", unidade: "L" as const, previsto: cimento * (fd.relacao_ac || 0), custoUnit: 0, destaque: false },
      { key: "aditivo", material: "Aditivo", unidade: "mL" as const, previsto: fd.aditivos_ml || 0, custoUnit: (fd.custo_aditivo_lt || 0) / 1000, destaque: false },
      { key: "aco", material: "Aço", unidade: "kg" as const, previsto: fd.aco_quantidade_kg || 0, custoUnit: custoAcoKg, destaque: false },
    ];
  }, [analysis, isLaje, dbMaterials]);

  // Massa que vai ao misturador (aço fica fora: vai na pista)
  const massaTraco = (itens: Array<{ key: string; unidade: string }>, valor: (i: any) => number) =>
    itens.reduce((s, i) => (i.key === "aco" ? s : s + (i.unidade === "mL" ? valor(i) / 1000 : valor(i))), 0);

  const totalTracoLaje = massaTraco(receitaLaje, (i) => i.previsto);
  const nTracos = Math.max(1, Math.floor(Number(numTracos) || 1));

  const receitaReal = useMemo(() => {
    return receitaLaje.map((i) => {
      const previsto = i.previsto * nTracos;
      const real = parseNum(reais[i.key] ?? "");
      return {
        ...i,
        previsto,
        real,
        dif: real != null ? real - previsto : null,
        custo: real != null && i.custoUnit > 0 ? real * i.custoUnit : null,
      };
    });
  }, [receitaLaje, nTracos, reais]);
  const temReal = receitaReal.some((i) => i.real != null);
  const totalRealPrevisto = massaTraco(receitaReal, (i) => i.previsto);
  const totalRealInformado = massaTraco(receitaReal, (i) => i.real ?? i.previsto);
  const custoReal = receitaReal.reduce((s, i) => s + (i.custo ?? 0), 0);

  const capacidadeMisturador = getConfigMisturador(analysis?.tipo ?? "").capacidade_kg;

  // Pista escolhida: sugere o último comprimento registrado para ela
  const handlePistaChange = (valor: string) => {
    setPista(valor);
    const anterior = batches.find((b) => b.pista === valor && Number(b.comprimento_pista_m) > 0);
    if (anterior) setComprimentoPista(String(anterior.comprimento_pista_m));
  };

  const totalBatelada = useMemo(() => {
    if (!recipe) return 0;
    const agua = Number(aguaKg) || 0;
    const aditivo = Number(aditivoMl) || 0;
    const materiaisTotal = recipe.materiais_batelada.reduce((s: number, m: any) => s + m.kg, 0);
    return Math.round((recipe.consumo_cimento_batelada + materiaisTotal + agua + aditivo / 1000) * 10) / 10;
  }, [recipe, aguaKg, aditivoMl]);

  if (!analysis) return null;

  const handleRegister = async () => {
    if (!batchCode.trim()) {
      toast.error("Informe o código do lote");
      return;
    }
    if (!operador.trim()) {
      toast.error("Informe o operador");
      return;
    }
    if (!maquina.trim()) {
      toast.error("Informe a máquina");
      return;
    }
    if (isLaje) {
      if (!pista.trim()) {
        toast.error("Informe a pista");
        return;
      }
      if (!fios) {
        toast.error("Informe a quantidade de fios");
        return;
      }
      if (!(Number(comprimentoPista) > 0)) {
        toast.error("Informe o comprimento da pista");
        return;
      }
      if (!(Number(volumeConcreto) > 0)) {
        toast.error("Informe o volume de concreto produzido (m³)");
        return;
      }
      if (Number(metrosPerda) > Number(comprimentoPista)) {
        toast.error("Metros de perda não pode ser maior que o comprimento da pista");
        return;
      }
    }

    try {
      await createBatch({
        ...(isLaje && {
          laje: {
            pista: pista.trim(),
            fios: Number(fios),
            comprimento_pista_m: Number(comprimentoPista),
            volume_concreto_m3: Number(volumeConcreto),
            metros_perda: Number(metrosPerda) || 0,
            perda_pct: perdaPct,
            aproveitamento_pct: aproveitamentoPct,
            ...((temReal || nTracos > 1) && {
              num_tracos: nTracos,
              receita_real: receitaReal.map<ReceitaRealItem>((i) => ({
                material: i.material,
                unidade: i.unidade,
                previsto: Math.round(i.previsto * 100) / 100,
                real: i.real,
                custo: i.custo != null ? Math.round(i.custo * 100) / 100 : null,
              })),
            }),
          },
        }),
        analysis_id: analysis.id,
        batch_code: batchCode.trim(),
        operador_nome: operador.trim(),
        maquina,
        volume_produzido: Math.round((analysis.formData.volume_m3 || 0.55) * 1000),
        notas: observacoes,
        produced_at: new Date(dataProducao).toISOString(),
      });

      onOpenChange(false);
      resetForm();

      toast.success("Lote de produção criado!", {
        description: `${batchCode} — 4 rompimentos agendados automaticamente.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar o lote de produção");
    }
  };

  const resetForm = () => {
    setBatchCode(generateBatchCode());
    setOperador("");
    setMaquina("");
    setObservacoes("");
    setPista("");
    setFios("");
    setNumTracos("1");
    setReais({});
    setComprimentoPista("");
    setVolumeConcreto("");
    setMetrosPerda("0");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isLaje ? "sm:max-w-xl" : "sm:max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registrar Produção
          </DialogTitle>
          <DialogDescription>
            Crie um lote de produção para <strong>{analysis.codigo}</strong>. Os 4 agendamentos de rompimento (1, 3, 7 e 28 dias) serão criados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
            <p><span className="text-muted-foreground">Análise:</span> <strong>{analysis.codigo}</strong> — {analysis.nome}</p>
            <p><span className="text-muted-foreground">Tipo:</span> {analysis.tipo}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-code">Código do Lote *</Label>
            <Input
              id="batch-code"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              placeholder="Ex: L-2026-0001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Input
              id="operador"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Nome do operador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maquina">Máquina *</Label>
            <Input
              id="maquina"
              value={maquina}
              onChange={(e) => setMaquina(e.target.value)}
              placeholder="Ex: Vibro-prensa VP-3000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Volume Produzido (L)</Label>
              <Input
                type="number"
                value={Math.round((analysis.formData.volume_m3 || 0.55) * 1000)}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-producao">Data/Hora Produção</Label>
              <Input
                id="data-producao"
                type="datetime-local"
                value={dataProducao}
                onChange={(e) => setDataProducao(e.target.value)}
              />
            </div>
          </div>

          {isLaje && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pista *</Label>
                  <Select value={pista} onValueChange={handlePistaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PISTAS_LAJE.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fios *</Label>
                  <Select value={fios} onValueChange={setFios}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 7].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} fios</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comprimento-pista">Comprimento da Pista (m) *</Label>
                  <Input
                    id="comprimento-pista"
                    type="number"
                    min="0"
                    step="0.01"
                    value={comprimentoPista}
                    onChange={(e) => setComprimentoPista(e.target.value)}
                    placeholder="Ex: 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume-concreto">Volume de Concreto Produzido (m³) *</Label>
                  <Input
                    id="volume-concreto"
                    type="number"
                    min="0"
                    step="0.001"
                    value={volumeConcreto}
                    onChange={(e) => setVolumeConcreto(e.target.value)}
                    placeholder="Ex: 12.6"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="metros-perda">Metros de Perda (m)</Label>
                  <Input
                    id="metros-perda"
                    type="number"
                    min="0"
                    step="0.01"
                    value={metrosPerda}
                    onChange={(e) => setMetrosPerda(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>% Perda</Label>
                  <Input value={perdaPct.toFixed(2)} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label>% Aprov.</Label>
                  <Input value={aproveitamentoPct.toFixed(2)} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Se a perda ainda não foi medida, deixe 0. Todos os dados da pista podem ser corrigidos depois nos detalhes do lote (botão Editar em Concretagem da Pista).
              </p>
            </>
          )}

          {isLaje && receitaLaje.length > 0 && (
            <>
              {/* Receita prevista de 1 traço */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Receita Prevista (1 traço)
                </Label>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left py-1.5 px-3 font-black uppercase">Material</th>
                        <th className="text-right py-1.5 px-3 font-black uppercase">Qtd. por traço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {receitaLaje.map((i) => (
                        <tr key={i.key} className={i.key === "agua" ? "bg-blue-50/30 dark:bg-blue-950/20" : undefined}>
                          <td className={
                            i.key === "agua"
                              ? "py-1.5 px-3 font-bold text-blue-600 dark:text-blue-400"
                              : i.destaque ? "py-1.5 px-3 font-bold" : "py-1.5 px-3 text-muted-foreground"
                          }>
                            {i.material}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold">
                            {fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}{" "}
                            <span className="text-[10px] text-muted-foreground">{i.unidade}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-black">
                        <td className="py-2 px-3 uppercase">Total do traço</td>
                        <td className="py-2 px-3 text-right text-sm">{fmt(totalTracoLaje)} kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {totalTracoLaje > capacidadeMisturador && (
                  <p className="text-[10px] text-destructive font-bold">
                    ⚠️ ATENÇÃO: massa de 1 traço excede a capacidade de {capacidadeMisturador} kg do misturador!
                  </p>
                )}
              </div>

              {/* Receita real utilizada na pista (opcional) */}
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Receita Real Utilizada <span className="normal-case tracking-normal font-medium">(opcional)</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Informe a soma de todos os traços da pista. Os números em cinza são o previsto; deixe em branco o que não quiser informar.
                    </p>
                  </div>
                  <div className="space-y-1 shrink-0">
                    <Label htmlFor="num-tracos" className="text-[10px] font-bold text-muted-foreground uppercase">Nº de traços</Label>
                    <Input
                      id="num-tracos"
                      type="number"
                      min="1"
                      step="1"
                      value={numTracos}
                      onChange={(e) => setNumTracos(e.target.value)}
                      className="w-20 h-8 text-right"
                    />
                  </div>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left py-1.5 px-2 font-black uppercase">Material</th>
                        <th className="text-right py-1.5 px-2 font-black uppercase">Previsto</th>
                        <th className="text-right py-1.5 px-2 font-black uppercase">Real</th>
                        <th className="text-right py-1.5 px-2 font-black uppercase">Dif.</th>
                        <th className="text-right py-1.5 px-2 font-black uppercase">Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {receitaReal.map((i) => (
                        <tr key={i.key}>
                          <td className={i.destaque ? "py-1 px-2 font-bold" : "py-1 px-2 text-muted-foreground"}>{i.material}</td>
                          <td className="py-1 px-2 text-right whitespace-nowrap">
                            {fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}{" "}
                            <span className="text-[10px] text-muted-foreground">{i.unidade}</span>
                          </td>
                          <td className="py-1 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={reais[i.key] ?? ""}
                                placeholder={fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}
                                onChange={(e) => setReais((r) => ({ ...r, [i.key]: e.target.value }))}
                                className="w-20 h-7 text-xs text-right placeholder:text-muted-foreground/50"
                              />
                              <span className="inline-block w-5 text-[10px] text-muted-foreground">{i.unidade}</span>
                            </div>
                          </td>
                          <td className={
                            i.dif == null || Math.abs(i.dif) < 0.005
                              ? "py-1 px-2 text-right text-muted-foreground"
                              : i.dif > 0 ? "py-1 px-2 text-right font-bold text-destructive" : "py-1 px-2 text-right font-bold text-blue-600"
                          }>
                            {i.dif == null ? "—" : `${i.dif > 0 ? "+" : ""}${fmt(i.dif)}`}
                          </td>
                          <td className="py-1 px-2 text-right whitespace-nowrap">
                            {i.custo == null ? <span className="text-muted-foreground">—</span> : `R$ ${fmt(i.custo)}`}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-black">
                        <td className="py-2 px-2 uppercase">Total da mistura</td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">{fmt(totalRealPrevisto)} kg</td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">{temReal ? `${fmt(totalRealInformado)} kg` : "—"}</td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {temReal ? `${totalRealInformado - totalRealPrevisto > 0 ? "+" : ""}${fmt(totalRealInformado - totalRealPrevisto)}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">{custoReal > 0 ? `R$ ${fmt(custoReal)}` : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!isLaje && recipe && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Receita de Pesagem (Misturador)
              </Label>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left py-1.5 px-3 font-black uppercase">Material</th>
                      <th className="text-right py-1.5 px-3 font-black uppercase text-primary">Peso (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-1.5 px-3 font-bold">Cimento</td>
                      <td className="py-1.5 px-3 text-right font-black text-primary">
                        {recipe.consumo_cimento_batelada.toFixed(2)} kg
                      </td>
                    </tr>
                    {recipe.materiais_batelada.map((m) => (
                      <tr key={m.nome}>
                        <td className="py-1.5 px-3 text-muted-foreground">{m.nome}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                      </tr>
                    ))}
                    {recipe.aditivos_batelada_ml > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 text-muted-foreground">Aditivo</td>
                        <td className="py-1 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={aditivoMl}
                              onChange={(e) => setAditivoMl(e.target.value)}
                              className="w-16 h-6 text-xs text-right font-bold border-muted-foreground/30 pr-0"
                              step="0.1"
                            />
                            <span className="inline-block w-5 text-left text-xs font-bold text-muted-foreground">mL</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                      <td className="py-1.5 px-3 font-bold text-blue-600 dark:text-blue-400">Água</td>
                      <td className="py-1 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={aguaKg}
                            onChange={(e) => setAguaKg(e.target.value)}
                            className="w-16 h-6 text-xs text-right font-black text-blue-600 dark:text-blue-400 border-blue-300 pr-0"
                            step="0.01"
                          />
                          <span className="inline-block w-5 text-left text-xs font-black text-blue-600 dark:text-blue-400">L</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-muted/30 font-black">
                      <td className="py-2 px-3 uppercase">Total Batelada</td>
                      <td className="py-2 px-3 text-right text-sm">
                        {totalBatelada.toFixed(1)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {totalBatelada > capacidadeMisturador && (
                <p className="text-[10px] text-destructive font-bold animate-pulse">
                  ⚠️ ATENÇÃO: Massa total excede a capacidade de {capacidadeMisturador}kg do misturador!
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs-producao">Observações (opcional)</Label>
            <Textarea
              id="obs-producao"
              placeholder="Registre observações sobre a produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={isCreating} className="gap-2">
            {isCreating ? "Registrando..." : "Confirmar Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
