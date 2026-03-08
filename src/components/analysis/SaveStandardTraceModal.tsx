import { useState } from "react";
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
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { AnalysisFormData } from "@/lib/analysis-data";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

interface SaveStandardTraceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnalysisFormData;
}

export function SaveStandardTraceModal({ open, onOpenChange, data }: SaveStandardTraceModalProps) {
  const navigate = useNavigate();
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const [nomeDna, setNomeDna] = useState(`DNA ${tipoLabel} ${data.resistencia_prevista}MPa`);
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!nomeDna.trim()) {
      toast.error("Informe o nome do traço padrão");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      toast.success("Traço padrão salvo com sucesso!", {
        description: `"${nomeDna}" disponível para futuras análises`,
      });
      navigate("/standard-traces");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Salvar como Traço Padrão
          </DialogTitle>
          <DialogDescription>
            Salve esta composição como um DNA reutilizável para futuras análises.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nome-dna">Nome do Traço Padrão *</Label>
            <Input
              id="nome-dna"
              value={nomeDna}
              onChange={(e) => setNomeDna(e.target.value)}
              placeholder="Ex: DNA Bloco Estrutural 4MPa"
            />
          </div>

          <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Origem:</span> <strong>{data.codigo}</strong></p>
            <p><span className="text-muted-foreground">Tipo:</span> {tipoLabel}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {data.resistencia_prevista} MPa</p>
            <p><span className="text-muted-foreground">Materiais:</span> {data.materiais_selecionados.map((m) => m.nome).join(", ") || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc-dna">Descrição (opcional)</Label>
            <Textarea
              id="desc-dna"
              placeholder="Descrição técnica ou observações sobre este traço..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? "Salvando..." : "Salvar Traço Padrão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
