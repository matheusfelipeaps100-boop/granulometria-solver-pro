import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import { useProducts } from "@/hooks/api/useProducts";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
}

const emptyForm = {
  nome: "",
  tipo_produto: "",
  dimensoes: "",
  resistencia_referencia: 0,
  ativo: true,
};

export function ProductModal({ open, onOpenChange, editId }: ProductModalProps) {
  const analysisTypes = TIPOS_ANALISE;
  const { products, createProduct, updateProduct, isCreating, isUpdating } = useProducts();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && editId) {
      const p = products.find((x) => x.id === editId);
      if (p) {
        setForm({
          nome: p.nome,
          tipo_produto: p.tipo_produto,
          dimensoes: p.dimensoes || "",
          resistencia_referencia: p.resistencia_referencia || 0,
          ativo: p.ativo,
        });
      }
    } else if (open) {
      setForm(emptyForm);
    }
  }, [open, editId, products]);

  const handleSave = async () => {
    if (!form.nome.trim() || !form.tipo_produto) {
      toast.error("Preencha nome e tipo do produto");
      return;
    }

    try {
      if (editId) {
        await updateProduct({
          id: editId,
          nome: form.nome,
          tipo_produto: form.tipo_produto,
          dimensoes: form.dimensoes,
          resistencia_referencia: form.resistencia_referencia,
          ativo: form.ativo,
        });
        toast.success("Produto atualizado");
      } else {
        await createProduct({
          nome: form.nome,
          tipo_produto: form.tipo_produto,
          dimensoes: form.dimensoes,
          resistencia_referencia: form.resistencia_referencia,
          ativo: form.ativo,
        });
        toast.success("Produto criado com sucesso");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar produto");
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Bloco 14x19x39"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Análise *</Label>
            <Select
              value={form.tipo_produto}
              onValueChange={(v) => setForm({ ...form, tipo_produto: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes
                  .map((t: any) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dimensões</Label>
            <Input
              value={form.dimensoes}
              onChange={(e) => setForm({ ...form, dimensoes: e.target.value })}
              placeholder="Ex: 14x19x39 cm"
            />
          </div>

          <div className="space-y-2">
            <Label>Resistência de Referência (MPa)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={form.resistencia_referencia || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  resistencia_referencia: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="Ex: 4.0"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Produto ativo</Label>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm({ ...form, ativo: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {editId ? "Salvar Alterações" : "Criar Produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
