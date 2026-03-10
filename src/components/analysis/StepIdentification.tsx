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
import { ANALISTAS, type AnalysisFormData } from "@/lib/analysis-data";
import { useAppStore } from "@/store/useAppStore";
import { useMemo } from "react";
import { Layers, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIdentificationProps {
  data: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

const TIPO_OPTIONS = [
  {
    value: "bloco_estrutural",
    group: "BLOCOS",
    label: "Bloco Estrutural",
    icon: Square,
    desc: "Carga estrutural",
  },
  {
    value: "bloco_vedacao",
    group: "BLOCOS",
    label: "Bloco de Vedação",
    icon: Square,
    desc: "Fechamento / vedação",
  },
  {
    value: "paver",
    group: "PAVERS",
    label: "Paver / Intertravado",
    icon: Layers,
    desc: "Pisos e calçadas",
  },
  {
    value: "cp",
    group: "PAVERS",
    label: "Corpo de Prova",
    icon: Layers,
    desc: "Ensaio laboratorial",
  },
];

const BLOCOS_TIPOS = TIPO_OPTIONS.filter((t) => t.group === "BLOCOS");
const PAVERS_TIPOS = TIPO_OPTIONS.filter((t) => t.group === "PAVERS");

export function StepIdentification({ data, onChange }: StepIdentificationProps) {
  const { products, analysisTypes } = useAppStore();

  const filteredProducts = useMemo(() => {
    if (!data.tipo_analise) return [];
    return products.filter((p) => p.tipo_produto === data.tipo_analise && p.ativo);
  }, [data.tipo_analise, products]);

  const activeGroup = BLOCOS_TIPOS.some((t) => t.value === data.tipo_analise)
    ? "BLOCOS"
    : PAVERS_TIPOS.some((t) => t.value === data.tipo_analise)
    ? "PAVERS"
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Título da etapa */}
      <div className="border-l-4 border-primary pl-4">
        <h2 className="text-xl font-black text-foreground tracking-tight">IDENTIFICAÇÃO</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Etapa 1 de 5 — Complete todos os campos obrigatórios
        </p>
      </div>

      {/* Seletor de grupo — BLOCOS vs PAVERS */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card BLOCOS */}
        <button
          type="button"
          onClick={() =>
            onChange({
              tipo_analise: "bloco_estrutural",
              produto_id: "",
              produto_nome: "",
            })
          }
          className={cn(
            "group relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 p-6 text-left transition-all duration-200 cursor-pointer",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeGroup === "BLOCOS"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          {activeGroup === "BLOCOS" && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
          )}
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-colors",
            activeGroup === "BLOCOS"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted group-hover:border-primary/40"
          )}>
            <Square className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black tracking-wider">BLOCOS / TIJOLOS</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Padrão + Estrutural</p>
          </div>
        </button>

        {/* Card PAVERS */}
        <button
          type="button"
          onClick={() =>
            onChange({
              tipo_analise: "paver",
              produto_id: "",
              produto_nome: "",
            })
          }
          className={cn(
            "group relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 p-6 text-left transition-all duration-200 cursor-pointer",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            activeGroup === "PAVERS"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
          )}
        >
          {activeGroup === "PAVERS" && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
          )}
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-colors",
            activeGroup === "PAVERS"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted group-hover:border-primary/40"
          )}>
            <Layers className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black tracking-wider">PROS / PAVERS</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Base + Face</p>
          </div>
        </button>
      </div>

      {/* Sub-tipo (aparece após escolha do grupo) */}
      {activeGroup && (
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Tipo de Produto *
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(activeGroup === "BLOCOS" ? BLOCOS_TIPOS : PAVERS_TIPOS).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ tipo_analise: t.value as AnalysisFormData["tipo_analise"], produto_id: "", produto_nome: "" })}
                className={cn(
                  "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-all cursor-pointer",
                  data.tipo_analise === t.value
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-border hover:border-primary/40 hover:bg-muted/20"
                )}
              >
                <span className="font-medium text-xs">{t.label}</span>
                <span className="text-[10px] text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Produto e Dimensão */}
      {data.tipo_analise && (
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Dimensão / Tamanho
          </Label>
          <div className="flex gap-2">
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
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione o Tamanho" />
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
      )}

      {/* Identificação principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Nome da Análise *
          </Label>
          <Input
            value={data.nome}
            onChange={(e) => onChange({ nome: e.target.value })}
            placeholder="Ex: Análise Verão Disco 10"
            className="font-medium"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Código Identificador *
          </Label>
          <Input
            value={data.codigo}
            onChange={(e) => onChange({ codigo: e.target.value })}
            placeholder="Ex: AN-2026-001"
            className="font-mono font-semibold"
          />
        </div>
      </div>

      {/* Data e Analista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Data da Análise
          </Label>
          <Input
            type="date"
            value={data.data}
            onChange={(e) => onChange({ data: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Analista Responsável
          </Label>
          <Input
            value={data.analista}
            onChange={(e) => onChange({ analista: e.target.value })}
            placeholder="Nome do analista"
          />
        </div>
      </div>

      {/* Resistência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Resistência Prevista (MPa)
          </Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={data.resistencia_prevista || ""}
            onChange={(e) => onChange({ resistencia_prevista: parseFloat(e.target.value) || 0 })}
            placeholder="Ex: 4.0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Unidade / Planta
          </Label>
          <Input
            value={data.unidade}
            onChange={(e) => onChange({ unidade: e.target.value })}
            placeholder="Ex: Lajeforro Matriz"
          />
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Observações
        </Label>
        <Textarea
          value={data.observacoes}
          onChange={(e) => onChange({ observacoes: e.target.value })}
          placeholder="Notas adicionais sobre a análise..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Botão avançar interno */}
      {data.tipo_analise && data.nome && data.codigo && (
        <div className="text-right">
          <p className="text-xs text-muted-foreground mt-2">
            ✓ Etapa 1 preenchida — use o botão <strong>Próximo</strong> para continuar
          </p>
        </div>
      )}
    </div>
  );
}
