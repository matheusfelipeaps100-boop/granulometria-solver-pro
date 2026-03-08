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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, type StoredAnalysis } from "@/store/useAppStore";
import { ANALISTAS } from "@/lib/analysis-data";

interface RegisterProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis | null;
}

export function RegisterProductionModal({ open, onOpenChange, analysis }: RegisterProductionModalProps) {
  const registerBatch = useAppStore((s) => s.registerBatch);
  const [operador, setOperador] = useState("");
  const [maquina, setMaquina] = useState("");
  const [volume, setVolume] = useState("");
  const [dataProducao, setDataProducao] = useState(new Date().toISOString().slice(0, 16));
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!analysis) return null;

  const handleRegister = () => {
    if (!operador.trim()) {
      toast.error("Selecione o operador");
      return;
    }
    if (!maquina.trim()) {
      toast.error("Informe a máquina");
      return;
    }
    if (!volume.trim() || Number(volume) <= 0) {
      toast.error("Informe o volume produzido");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const batch = registerBatch(analysis.id, {
        operador_nome: ANALISTAS.find((a) => a.id === operador)?.nome ?? operador,
        maquina,
        volume_produzido: Number(volume),
        notas: observacoes,
        produced_at: dataProducao,
      });

      setLoading(false);
      onOpenChange(false);
      resetForm();

      toast.success("Lote de produção criado!", {
        description: `${batch.batch_code} — 4 rompimentos agendados`,
      });
    }, 600);
  };

  const resetForm = () => {
    setOperador("");
    setMaquina("");
    setVolume("");
    setObservacoes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
            <p><span className="text-muted-foreground">Tipo:</span> {analysis.tipo_analise}</p>
            <p><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operador">Operador *</Label>
            <Select value={operador} onValueChange={setOperador}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o operador" />
              </SelectTrigger>
              <SelectContent>
                {ANALISTAS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label htmlFor="volume">Volume Produzido (L) *</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="Ex: 550"
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

          <div className="space-y-2">
            <Label htmlFor="obs-producao">Observações (opcional)</Label>
            <Textarea
              id="obs-producao"
              placeholder="Registre observações sobre a produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={loading} className="gap-2">
            {loading ? "Registrando..." : "Confirmar Registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
