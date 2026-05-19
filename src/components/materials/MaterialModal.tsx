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
import { useMaterials } from "@/hooks/api/useMaterials";
import { toast } from "sonner";

const TIPOS_MATERIAL = [
  { label: "Areia Fina", value: "areia_fina" },
  { label: "Areia Grossa", value: "areia_grossa" },
  { label: "Pó de Pedra", value: "po_pedra" },
  { label: "Brita", value: "brita" },
  { label: "Granilha", value: "granilha" },
  { label: "Cimento", value: "cimento" },
  { label: "Outro", value: "outro" },
];

interface MaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
}

const emptyForm = {
  nome: "",
  tipo: "",
  fornecedor: "",
  mf: "",
  custo_valor: "",
  custo_unidade: "tonelada",
  ativo: true,
};

export function MaterialModal({ open, onOpenChange, editId }: MaterialModalProps) {
  const { materials, createMaterial, updateMaterial, isCreating, isUpdating } = useMaterials();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && editId) {
      const m = materials.find((x) => x.id === editId);
      if (m) {
        setForm({
          nome: m.nome,
          tipo: m.tipo,
          fornecedor: m.fornecedor || "",
          mf: m.mf ? m.mf.toString().replace('.', ',') : "",
          custo_valor: m.custo_valor ? m.custo_valor.toString().replace('.', ',') : "",
          custo_unidade: m.custo_unidade || "tonelada",
          ativo: m.ativo,
        });
      }
    } else if (open) {
      setForm(emptyForm);
    }
  }, [open, editId, materials]);

  const handleSave = async () => {
    if (!form.nome.trim() || !form.tipo) {
      toast.error("Preencha nome e tipo do material");
      return;
    }

    try {
      // Supabase numeric format aceita ponto em vez de vírgula, e null se estiver vazio
      const mfVal = form.mf ? parseFloat(form.mf.replace(',', '.')) : null;
      const custoVal = form.custo_valor ? parseFloat(form.custo_valor.replace(',', '.')) : null;
      const payload = {
        ...form,
        mf: mfVal,
        custo_valor: custoVal,
        fornecedor: form.fornecedor || null,
        densidade: null
      };
      if (editId) {
        await updateMaterial({ id: editId, ...payload });
        toast.success("Material atualizado");
      } else {
        await createMaterial(payload);
        toast.success("Material criado com sucesso");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Material" : "Novo Material"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome do Material *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Areia de Cava BMW"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MATERIAL.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Input
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              placeholder="Ex: Britasul"
            />
          </div>

          <div className="space-y-2">
            <Label>Módulo de Finura (MF)</Label>
            <Input
              value={form.mf}
              onChange={(e) => setForm({ ...form, mf: e.target.value })}
              placeholder="Ex: 2,699"
            />
          </div>

          <div className="space-y-2">
            <Label>Preço de Custo</Label>
            <div className="flex gap-2">
              <Input
                value={form.custo_valor}
                onChange={(e) => setForm({ ...form, custo_valor: e.target.value })}
                placeholder="Ex: 85,50"
                className="w-32"
              />
              <Select
                value={form.custo_unidade}
                onValueChange={(v) => setForm({ ...form, custo_unidade: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tonelada">R$ / ton</SelectItem>
                  <SelectItem value="kg">R$ / kg</SelectItem>
                  <SelectItem value="m3">R$ / m³</SelectItem>
                  <SelectItem value="saco">R$ / saco</SelectItem>
                  <SelectItem value="unidade">R$ / un.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Material ativo</Label>
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
          <Button onClick={handleSave} disabled={isCreating || isUpdating}>
            {(isCreating || isUpdating) ? "Salvando..." : (editId ? "Salvar Alterações" : "Criar Material")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
