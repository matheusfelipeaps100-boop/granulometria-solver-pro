import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function ProductTypeModal({ open, onOpenChange, editId }: Props) {
  const { analysisTypes, addAnalysisType, updateAnalysisType } = useAppStore();
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [ativo, setAtivo] = useState(true);
  const isEdit = !!editId;

  useEffect(() => {
    if (open && editId) {
      const at = analysisTypes.find((t) => t.id === editId);
      if (at) {
        setLabel(at.label);
        setValue(at.value);
        setAtivo(at.ativo);
      }
    } else if (open) {
      setLabel("");
      setValue("");
      setAtivo(true);
    }
  }, [open, editId, analysisTypes]);

  const handleLabelChange = (v: string) => {
    setLabel(v);
    if (!isEdit) setValue(toSlug(v));
  };

  const handleSave = () => {
    if (!label.trim() || !value.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    const duplicate = analysisTypes.find(
      (at) => at.value === value && at.id !== editId
    );
    if (duplicate) {
      toast.error("Já existe um tipo com esse identificador");
      return;
    }

    if (isEdit) {
      updateAnalysisType(editId, { label, value, ativo });
      toast.success("Tipo atualizado");
    } else {
      addAnalysisType({ label, value, ativo });
      toast.success("Tipo criado");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Tipo de Análise" : "Novo Tipo de Análise"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Ex: Bloco Estrutural" />
          </div>
          <div className="space-y-2">
            <Label>Identificador (slug)</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="bloco_estrutural"
              className="font-mono text-sm"
              disabled={isEdit}
            />
            <p className="text-xs text-muted-foreground">Usado internamente. Não pode ser alterado após criação.</p>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEdit ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
