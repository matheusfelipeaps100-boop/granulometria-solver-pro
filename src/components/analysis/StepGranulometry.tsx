import { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
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

interface StepGranulometryProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

export function StepGranulometry({ data, onChange }: StepGranulometryProps) {
  const materials = data.materiais_selecionados.length > 0
    ? data.materiais_selecionados
    : MATERIAIS_DISPONIVEIS;

  const dna = DNAS_PADRAO.find((d) => d.id === data.dna_selecionado);
  const limits = dna?.limites;

  // Calculate combined curve
  const curveResults = useMemo(
    () => calcCombinedCurve(materials, limits),
    [materials, limits]
  );

  const curvaStatus = useMemo(
    () => calcCurvaStatus(curveResults),
    [curveResults]
  );

  // MF per material
  const mfPerMaterial = useMemo(
    () => materials.map((m) => ({
      id: m.material_id,
      mf: calcModuloFinura(m.gradations),
    })),
    [materials]
  );

  // Combined MF
  const mfCombinado = useMemo(() => {
    const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0);
    if (totalProp === 0) return 0;
    return materials.reduce((sum, m, i) => {
      return sum + (mfPerMaterial[i].mf * m.proporcao_pct) / totalProp;
    }, 0);
  }, [materials, mfPerMaterial]);

  // Chart data
  const chartData = useMemo(() => {
    return curveResults.map((r) => ({
      abertura: r.abertura_mm,
      label: PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "",
      acumulado: Math.round(r.pct_acumulado * 10000) / 100,
      limiteMin: r.limite_min ? Math.round(r.limite_min * 10000) / 100 : undefined,
      limiteMax: r.limite_max ? Math.round(r.limite_max * 10000) / 100 : undefined,
      fora: r.fora_da_faixa,
    }));
  }, [curveResults]);

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
      // Normalize to sum 1
      const total = updated.reduce((s, m) => s + m.proporcao_pct, 0);
      if (total > 0) {
        const normalized = updated.map((m) => ({
          ...m,
          proporcao_pct: m.proporcao_pct / total,
        }));
        onChange({ materiais_selecionados: normalized });
      }
    },
    [materials, onChange]
  );

  // Initialize materials if empty
  if (data.materiais_selecionados.length === 0) {
    onChange({ materiais_selecionados: [...MATERIAIS_DISPONIVEIS] });
  }

  const statusConfig = {
    conforme: { label: "CONFORME", color: "bg-success/15 text-success border-success/30" },
    atencao: { label: "ATENÇÃO", color: "bg-warning/15 text-warning border-warning/30" },
    nao_conforme: { label: "FORA DA FAIXA", color: "bg-destructive/15 text-destructive border-destructive/30" },
  };

  const statusInfo = statusConfig[curvaStatus.status];

  return (
    <div className="space-y-4">
      {/* Top: Table + Technical Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Sieve Table — 60% */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tabela Granulométrica</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Peneira</TableHead>
                  {materials.map((m, i) => (
                    <TableHead key={m.material_id} className="text-center min-w-[110px]">
                      <div className="space-y-1">
                        <span className="text-xs font-medium block truncate">{m.nome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(m.proporcao_pct * 100)}%
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PENEIRAS_PADRAO.map((peneira) => (
                  <TableRow key={peneira.sieve_id}>
                    <TableCell className="font-medium text-xs">
                      {peneira.label}
                    </TableCell>
                    {materials.map((m, mi) => {
                      const grad = m.gradations.find((g) => g.sieve_id === peneira.sieve_id);
                      return (
                        <TableCell key={m.material_id} className="p-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            className="h-8 text-xs text-center w-full"
                            value={grad?.massa_retida ?? 0}
                            onChange={(e) =>
                              handleMassChange(mi, peneira.sieve_id, parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {/* MF footer */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="text-xs">MF</TableCell>
                  {mfPerMaterial.map((mf) => (
                    <TableCell key={mf.id} className="text-center text-xs font-semibold">
                      {mf.mf.toFixed(4)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Technical Panel — 40% */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Painel Técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DNA selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">DNA / Traço Padrão</label>
              <Select
                value={data.dna_selecionado}
                onValueChange={(v) => onChange({ dna_selecionado: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o DNA" />
                </SelectTrigger>
                <SelectContent>
                  {DNAS_PADRAO.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MF Combinado */}
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Módulo de Finura Combinado</p>
              <p className="text-3xl font-bold text-foreground">{mfCombinado.toFixed(4)}</p>
            </div>

            {/* Status badge */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={cn("text-sm px-4 py-1.5 font-semibold", statusInfo.color)}
              >
                {statusInfo.label}
              </Badge>
            </div>

            {/* Peneiras fora */}
            {curvaStatus.peneiras_fora > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">
                  {curvaStatus.peneiras_fora} peneira(s) fora da faixa
                </p>
                <ul className="text-xs text-destructive/80 space-y-0.5">
                  {curveResults
                    .filter((r) => r.fora_da_faixa)
                    .map((r) => (
                      <li key={r.sieve_id}>
                        • {PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label} —{" "}
                        {(r.pct_acumulado * 100).toFixed(1)}%
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Compatibility index */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Índice de Compatibilidade</p>
              <p className="text-lg font-semibold">
                {(curvaStatus.indice_compatibilidade * 100).toFixed(0)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Curva Granulométrica Combinada</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis domain={[0, 100]} fontSize={10} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="acumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                name="Curva Combinada"
              />
              {limits && (
                <>
                  <Line
                    type="monotone"
                    dataKey="limiteMin"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Limite Inferior"
                  />
                  <Line
                    type="monotone"
                    dataKey="limiteMax"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Limite Superior"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Proportion sliders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Proporções dos Materiais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {materials.map((m, i) => (
              <div key={m.material_id} className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium truncate">{m.nome}</p>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[Math.round(m.proporcao_pct * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => handleProportionChange(i, v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-12 text-right">
                    {Math.round(m.proporcao_pct * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
