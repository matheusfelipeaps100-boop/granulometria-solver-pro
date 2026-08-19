import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { registrarResultadoReal, META_RESISTENCIA_24H_MPA, type WetCastExperiment } from "@/lib/wet-cast-optimizer";
import { ClipboardCheck } from "lucide-react";

interface Props {
  experimento: WetCastExperiment;
  onRegistrar: (atualizado: WetCastExperiment) => Promise<unknown>;
  trigger?: React.ReactNode;
}

/**
 * Registra o resultado real de resistência de um experimento/candidato
 * testado. Calcula o erro estimado-vs-real e atualiza o status
 * (registrarResultadoReal, wet-cast-optimizer.ts) — não recalibra o modelo.
 */
export function RegisterRealResultDialog({ experimento, onRegistrar, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    const mpa = Number(valor.replace(",", "."));
    if (!Number.isFinite(mpa) || mpa < 0) {
      toast.error("Informe um valor de resistência válido (MPa).");
      return;
    }
    setSalvando(true);
    try {
      const atualizado = registrarResultadoReal(experimento, mpa, META_RESISTENCIA_24H_MPA);
      await onRegistrar(atualizado);
      toast.success(`Resultado registrado para ${experimento.codigo}: ${mpa} MPa (${atualizado.status.replace(/_/g, " ")})`);
      setOpen(false);
      setValor("");
    } catch (err) {
      toast.error("Erro ao registrar resultado.");
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]">
            <ClipboardCheck className="h-3 w-3" /> Registrar Ensaio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar resultado real — {experimento.codigo}</DialogTitle>
          <DialogDescription>
            Resistência medida no ensaio real aos 24h. A meta é {'>'} {META_RESISTENCIA_24H_MPA} MPa. O status do
            traço é atualizado automaticamente (Validado Experimentalmente ou Reprovado).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resistencia-real">Resistência real aos 24h (MPa)</Label>
          <Input
            id="resistencia-real"
            type="number"
            step="0.1"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 22.5"
          />
          {experimento.resistencia_estimada_mpa != null && (
            <p className="text-[11px] text-muted-foreground">
              Estimativa do modelo (não validada): {experimento.resistencia_estimada_mpa.toFixed(1)} MPa
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>{salvando ? "Salvando..." : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
