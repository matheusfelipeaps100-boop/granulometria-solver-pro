import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import { useSieves } from "@/hooks/api/useSieves";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
}

const TIPOS_PRODUTO = [
  { value: "bloco_estrutural", label: "Bloco Estrutural" },
  { value: "bloco_vedacao", label: "Bloco de Vedação" },
  { value: "paver", label: "Paver" },
  { value: "cp", label: "Corpo de Prova (CP)" },
];

export function ProductTypeModal({ open, onOpenChange, editId }: Props) {
  const { curves, createCurve, updateCurve, isCreating, isUpdating } = useStandardCurves();
  const { sieves } = useSieves();
  
  const isPending = isCreating || isUpdating;
  
  const [form, setForm] = useState({
    nome: "",
    tipo_produto: "bloco_estrutural",
    resistencia_alvo: 0,
    modulo_finura: 0,
    descricao: "",
    ativo: true,
  });

  const [limits, setLimits] = useState<Record<number, { min: number; max: number }>>({});

  useEffect(() => {
    if (open && editId) {
      const curve = curves.find(c => c.id === editId);
      if (curve) {
        setForm({
          nome: curve.nome,
          tipo_produto: curve.tipo_produto,
          resistencia_alvo: curve.resistencia_alvo || 0,
          modulo_finura: curve.modulo_finura || 0,
          descricao: curve.descricao || "",
          ativo: curve.ativo,
        });

        const newLimits: Record<number, { min: number; max: number }> = {};
        curve.standard_curve_items?.forEach(item => {
          newLimits[item.sieve_id] = { min: item.limite_min, max: item.limite_max };
        });
        setLimits(newLimits);
      }
    } else if (open) {
      setForm({
        nome: "",
        tipo_produto: "bloco_estrutural",
        resistencia_alvo: 0,
        modulo_finura: 0,
        descricao: "",
        ativo: true,
      });
      setLimits({});
    }
  }, [open, editId, curves]);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Preencha o nome da curva");
      return;
    }

    try {
      const items = sieves.map(s => ({
        sieve_id: s.id,
        limite_min: limits[s.id]?.min || 0,
        limite_max: limits[s.id]?.max || 1,
        pct_retido: 0, // Calculado na análise
        pct_acumulado: 0, // Calculado na análise
      }));

      if (editId) {
        // Update not implemented in hook yet, but we could add it
        toast.error("Edição de DNA ainda não disponível. Remova e crie um novo.");
      } else {
        await createCurve({ curve: form, items });
        toast.success("DNA criado com sucesso");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar DNA");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar DNA" : "Novo DNA"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2 col-span-2">
            <Label>Nome da Curva (DNA) *</Label>
            <Input 
              value={form.nome} 
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Bloco Estrutural 4MPa Padrão"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Produto</Label>
            <Select 
              value={form.tipo_produto} 
              onValueChange={v => setForm(f => ({ ...f, tipo_produto: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PRODUTO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resistência Alvo (MPa)</Label>
            <Input 
              type="number" 
              value={form.resistencia_alvo} 
              onChange={e => setForm(f => ({ ...f, resistencia_alvo: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-3">Limites Granulométricos (% Acumulada)</h3>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground border-b pb-2 mb-2">
            <div>Peneira</div>
            <div className="text-center">Mín (%)</div>
            <div className="text-center">Máx (%)</div>
          </div>
          <div className="space-y-2">
            {sieves.map(s => (
              <div key={s.id} className="grid grid-cols-3 gap-4 items-center">
                <div className="text-sm">{s.nome}</div>
                <Input 
                  type="number" 
                  className="h-8 text-center"
                  value={limits[s.id]?.min ?? 0}
                  step="0.01"
                  onChange={e => setLimits(l => ({ ...l, [s.id]: { ...l[s.id], min: parseFloat(e.target.value) || 0 } }))}
                />
                <Input 
                  type="number" 
                  className="h-8 text-center"
                  value={limits[s.id]?.max ?? 1}
                  step="0.01"
                  onChange={e => setLimits(l => ({ ...l, [s.id]: { ...l[s.id], max: parseFloat(e.target.value) || 0 } }))}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {editId ? "Salvar" : "Criar DNA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
