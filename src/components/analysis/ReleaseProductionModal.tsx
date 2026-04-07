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
import { Factory } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useAnalysisDraftStore } from "@/store/useAnalysisDraftStore";
import type { AnalysisFormData } from "@/lib/analysis-data";

interface ReleaseProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnalysisFormData & { id?: string };
}

export function ReleaseProductionModal({ open, onOpenChange, data }: ReleaseProductionModalProps) {
  const navigate = useNavigate();
  const { updateStatus, createAnalysis, isUpdatingStatus, isCreating } = useAnalyses();
  const [dataHora, setDataHora] = useState(new Date().toISOString().slice(0, 16));
  const [observacoes, setObservacoes] = useState("");

  const handleRelease = async () => {
    try {
      if (!data.id) {
        // É um rascunho novo (criado na NewAnalysisPage sem ir pro banco)
        await createAnalysis({ formData: data, status: "liberado_producao" });
      } else {
        // Análise que já existe no Supabase
        await updateStatus({ id: data.id, status: "liberado_producao" });
      }
      // Limpar rascunho se usava local
      useAnalysisDraftStore.getState().clearDraft();

      onOpenChange(false);
      toast.success("Análise liberada para produção!", {
        description: `${data.codigo} — Status atualizado para "Liberado para Produção"`,
      });
      navigate("/production");
    } catch (error) {
      console.error(error);
      const msg = (error as any).message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast.error("Erro ao liberar para produção.", {
        description: msg
      });
    } finally { }
  };

  const isWorking = isUpdatingStatus || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            Liberar para Produção
          </DialogTitle>
          <DialogDescription>
            Confirme a liberação da análise <strong>{data.codigo}</strong> para o setor de produção.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="data-hora">Data / Hora da Liberação</Label>
            <Input
              id="data-hora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
            />
          </div>

          <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Análise:</span> <strong>{data.codigo}</strong> — {data.nome}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {data.resistencia_prevista} MPa</p>
            <p><span className="text-muted-foreground">Materiais:</span> {data.materiais_selecionados.length} selecionados</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-prod">Observações (opcional)</Label>
            <Textarea
              id="obs-prod"
              placeholder="Observações para a equipe de produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
            Cancelar
          </Button>
          <Button onClick={handleRelease} disabled={isWorking} className="gap-2">
            {isWorking ? "Liberando..." : "Confirmar Liberação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
