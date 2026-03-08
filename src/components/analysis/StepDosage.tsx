import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Beaker, Droplets, Weight, FlaskConical } from "lucide-react";
import { calcDosage } from "@/lib/granulometry-engine";
import type { AnalysisFormData } from "@/lib/analysis-data";

interface StepDosageProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

export function StepDosage({ data, onChange }: StepDosageProps) {
  const dosageResult = useMemo(() => {
    const materials = data.materiais_selecionados;
    if (materials.length === 0) return null;
    return calcDosage({
      relacao_cimento: data.relacao_cimento,
      relacao_ac: data.relacao_ac,
      volume_batelada: data.volume_batelada,
      densidade_cimento: data.densidade_cimento,
      proporcoes_materiais: materials.map((m) => ({
        nome: m.nome,
        proporcao_pct: m.proporcao_pct,
      })),
      aditivos_ml: data.aditivos_ml,
    });
  }, [data]);

  const cards = dosageResult
    ? [
        { icon: Beaker, label: "Consumo Cimento", value: `${dosageResult.consumo_cimento_kg} kg`, color: "text-primary" },
        { icon: Droplets, label: "Água / Batelada", value: `${dosageResult.agua_litros} L`, color: "text-info" },
        { icon: Weight, label: "Massa Total", value: `${dosageResult.massa_total_kg} kg`, color: "text-success" },
        { icon: FlaskConical, label: "Traço Final", value: dosageResult.traco_final, color: "text-warning" },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Parâmetros de Dosagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Relação Cimento:Agregado</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={data.relacao_cimento}
                onChange={(e) => onChange({ relacao_cimento: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Relação A/C</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={data.relacao_ac}
                onChange={(e) => onChange({ relacao_ac: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Volume Batelada (L)</Label>
              <Input
                type="number"
                step="10"
                min="0"
                value={data.volume_batelada}
                onChange={(e) => onChange({ volume_batelada: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Densidade Cimento (g/cm³)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={data.densidade_cimento}
                onChange={(e) => onChange({ densidade_cimento: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Aditivos (mL)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={data.aditivos_ml}
                onChange={(e) => onChange({ aditivos_ml: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculated cards */}
      {dosageResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4 text-center">
                <c.icon className={`h-6 w-6 mx-auto mb-2 ${c.color}`} />
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className="text-xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Materials per batch table */}
      {dosageResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Materiais por Batelada</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantidade (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-medium">
                  <TableCell>Cimento</TableCell>
                  <TableCell className="text-right">{dosageResult.consumo_cimento_kg} kg</TableCell>
                </TableRow>
                {dosageResult.materiais_batelada.map((m) => (
                  <TableRow key={m.nome}>
                    <TableCell>{m.nome}</TableCell>
                    <TableCell className="text-right">{m.kg} kg</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium">
                  <TableCell>Água</TableCell>
                  <TableCell className="text-right">{dosageResult.agua_litros} L</TableCell>
                </TableRow>
                {data.aditivos_ml > 0 && (
                  <TableRow>
                    <TableCell>Aditivos</TableCell>
                    <TableCell className="text-right">{data.aditivos_ml} mL</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{dosageResult.massa_total_kg} kg</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
