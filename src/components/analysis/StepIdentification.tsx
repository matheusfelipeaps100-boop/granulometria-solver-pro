import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIPOS_ANALISE, ANALISTAS, type AnalysisFormData } from "@/lib/analysis-data";
import { useAppStore } from "@/store/useAppStore";
import { useMemo } from "react";

interface StepIdentificationProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

export function StepIdentification({ data, onChange }: StepIdentificationProps) {
  const { products } = useAppStore();

  const filteredProducts = useMemo(() => {
    if (!data.tipo_analise) return [];
    return products.filter((p) => p.tipo_produto === data.tipo_analise && p.ativo);
  }, [data.tipo_analise, products]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Dados da Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Tipo + Código */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_analise">Tipo de Análise *</Label>
              <Select
                value={data.tipo_analise}
                onValueChange={(v) => {
                  onChange({
                    tipo_analise: v as AnalysisFormData["tipo_analise"],
                    produto_id: "",
                    produto_nome: "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ANALISE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={data.codigo}
                onChange={(e) => onChange({ codigo: e.target.value })}
                placeholder="ANL-2026-001"
              />
            </div>
          </div>

          {/* Row 2: Nome + Produto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Análise *</Label>
              <Input
                id="nome"
                value={data.nome}
                onChange={(e) => onChange({ nome: e.target.value })}
                placeholder="Ex: Bloco Estrutural 4MPa Traço A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="produto">Produto</Label>
              <Select
                value={data.produto_id}
                onValueChange={(v) => {
                  const prod = products.find((p) => p.id === v);
                  onChange({
                    produto_id: v,
                    produto_nome: prod?.nome ?? "",
                    resistencia_prevista: prod?.resistencia_referencia ?? data.resistencia_prevista,
                  });
                }}
                disabled={!data.tipo_analise}
              >
                <SelectTrigger>
                  <SelectValue placeholder={data.tipo_analise ? "Selecione o produto" : "Selecione o tipo primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.dimensoes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Data + Analista */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data.data}
                onChange={(e) => onChange({ data: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analista">Analista</Label>
              <Select
                value={data.analista}
                onValueChange={(v) => onChange({ analista: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o analista" />
                </SelectTrigger>
                <SelectContent>
                  {ANALISTAS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Unidade + Resistência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade / Planta</Label>
              <Input
                id="unidade"
                value={data.unidade}
                onChange={(e) => onChange({ unidade: e.target.value })}
                placeholder="Ex: Lajeforro Matriz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resistencia">Resistência Prevista (MPa)</Label>
              <Input
                id="resistencia"
                type="number"
                step="0.1"
                min="0"
                value={data.resistencia_prevista || ""}
                onChange={(e) =>
                  onChange({ resistencia_prevista: parseFloat(e.target.value) || 0 })
                }
                placeholder="Ex: 4.0"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={data.observacoes}
              onChange={(e) => onChange({ observacoes: e.target.value })}
              placeholder="Notas adicionais sobre a análise..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
