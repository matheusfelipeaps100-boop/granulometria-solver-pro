import { useMemo, useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { GranulometryChart } from "./GranulometryChart";
import { cn } from "@/lib/utils";
import {
  calcCombinedCurve,
  calcCurvaStatus,
  calcModuloFinura,
} from "@/lib/granulometry-engine";
import {
  PENEIRAS_PADRAO,
  MATERIAIS_DISPONIVEIS,
  DNAS_PADRAO,
  type AnalysisFormData,
  type AnalysisMaterial,
} from "@/lib/analysis-data";
import { Database, Dna, AlertTriangle, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";

interface StepGranulometryProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

export function StepGranulometry({ data, onChange }: StepGranulometryProps) {
  const [fonteAtiva, setFonteAtiva] = useState<"bica" | "manual">("bica");

  const materials = data.materiais_selecionados.length > 0
    ? data.materiais_selecionados
    : MATERIAIS_DISPONIVEIS;

  const dna = DNAS_PADRAO.find((d) => d.id === data.dna_selecionado);
  const limits = dna?.limites;

  // Inicializa materiais se vazio
  if (data.materiais_selecionados.length === 0) {
    onChange({ materiais_selecionados: [...MATERIAIS_DISPONIVEIS] });
  }

  // Curva combinada
  const curveResults = useMemo(
    () => calcCombinedCurve(materials, limits),
    [materials, limits]
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

  // MF combinado
  const mfCombinado = useMemo(() => {
    const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0);
    if (totalProp === 0) return 0;
    return materials.reduce((sum, m, i) => {
      return sum + (mfPerMaterial[i].mf * m.proporcao_pct) / totalProp;
    }, 0);
  }, [materials, mfPerMaterial]);

  // Peso total da mistura
  const pesoTotalMistura = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.proporcao_pct * 100), 0);
  }, [materials]);

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
    (materialIndex: number, newValue: number) => {
      const updated = materials.map((m, i) => {
        if (i === materialIndex) return { ...m, proporcao_pct: newValue / 100 };
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

      {/* Cabeçalho da etapa */}
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-xl font-black text-foreground tracking-tight">GRANULOMETRIA</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Etapa 2 de 5 — Complete todos os campos obrigatórios
        </p>
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

      {/* Layout principal: Tabela | Gráfico + Painel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Tabela Granulométrica — ocupa 2/3 */}
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider">
                TABELA GRANULOMÉTRICA — BLOCOS
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Database className="h-3 w-3" />
                BANCO DE AGREGADOS
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[80px] text-xs font-black uppercase">Peneira</TableHead>
                    {materials.map((m) => (
                      <TableHead key={m.material_id} className="text-center min-w-[90px]">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold block truncate">{m.nome}</span>
                          <span className="text-[9px] text-muted-foreground">
                            Área: {(m.proporcao_pct * 100).toFixed(0)}%
                          </span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[70px] text-xs font-black text-primary">COMB.</TableHead>
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
                                className="h-7 text-xs text-center w-full"
                                value={grad?.massa_retida ?? 0}
                                onChange={(e) =>
                                  handleMassChange(mi, peneira.sieve_id, parseFloat(e.target.value) || 0)
                                }
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center text-xs font-bold text-primary">
                          {combined ? (combined.pct_acumulado * 100).toFixed(1) : "—"}%
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
        </div>

        {/* Painel Direito: Resultado + Gráfico compacto */}
        <div className="flex flex-col gap-3">

          {/* Painel de Resultado */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider">RESULTADO</CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Dna className="h-3 w-3" />
                  DADOS DNA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* DNA selector */}
              <Select
                value={data.dna_selecionado}
                onValueChange={(v) => onChange({ dna_selecionado: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione o DNA / Traço" />
                </SelectTrigger>
                <SelectContent>
                  {DNAS_PADRAO.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* MF em destaque */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 border px-3 py-2">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Mód. de Finura</p>
                  <p className="text-3xl font-black text-foreground leading-none mt-1">
                    {mfCombinado.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-2 py-0.5 font-bold", statusInfo.color)}
                  >
                    {(curvaStatus.indice_compatibilidade * 100).toFixed(0)}%
                  </Badge>
                  {dna && (
                    <p className="text-[10px] text-muted-foreground">DNA: {dna.nome.slice(0, 20)}…</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2",
                statusInfo.color
              )}>
                <StatusIcon className={cn("h-4 w-4 shrink-0", statusInfo.iconColor)} />
                <span className="text-xs font-bold">{statusInfo.label}</span>
              </div>

              {/* Peneiras fora */}
              {curvaStatus.peneiras_fora > 0 && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                  <p className="text-[10px] font-bold text-destructive">
                    {curvaStatus.peneiras_fora} peneira(s) fora da faixa
                  </p>
                  <ul className="text-[10px] text-destructive/70 mt-1 space-y-0.5">
                    {curveResults
                      .filter((r) => r.fora_da_faixa)
                      .slice(0, 3)
                      .map((r) => (
                        <li key={r.sieve_id}>
                          • {PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label} —{" "}
                          {(r.pct_acumulado * 100).toFixed(1)}%
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico compacto no painel */}
          <Card className="flex-1">
            <CardContent className="p-2 pt-3">
              <GranulometryChart curveResults={curveResults} hasLimits={!!limits} compact />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção PROPORÇÃO DE MISTURA */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">
              PROPORÇÃO DE MISTURA
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-bold">
              TOTAL: {pesoTotalMistura.toFixed(0)}%
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold",
                Math.abs(pesoTotalMistura - 100) < 1
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-warning/15 text-warning border-warning/30"
              )}
            >
              {Math.abs(pesoTotalMistura - 100) < 1 ? "✓ OK" : "AJUSTAR"}
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            Adicionar Material
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {materials.map((m, i) => (
              <div
                key={m.material_id}
                className="group relative rounded-lg border bg-card p-3 space-y-2 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                {/* Botão remover */}
                <button
                  type="button"
                  onClick={() => handleRemoveMaterial(i)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                {/* Nome */}
                <p className="text-[11px] font-bold truncate pr-4">{m.nome}</p>

                {/* KG estimado (baseado na proporção) */}
                <div className="text-center">
                  <p className="text-lg font-black text-primary leading-none">
                    {(m.proporcao_pct * 550).toFixed(0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">kg / batelada</p>
                </div>

                {/* Input de % */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="h-6 text-xs text-center px-1 font-bold"
                      value={Math.round(m.proporcao_pct * 100)}
                      onChange={(e) => handleProportionChange(i, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  {/* Mini barra de progresso */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(m.proporcao_pct * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-[9px] text-muted-foreground">
                  MF: {mfPerMaterial[i]?.mf.toFixed(3) ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
