import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useAppStore, Sieve } from "@/store/useAppStore";
import { toast } from "sonner";

export function SievesTab() {
  const { sieves, addSieve, updateSieve, deleteSieve } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [mm, setMm] = useState("");
  const [serie, setSerie] = useState<"Normal" | "Intermediária">("Normal");
  const [ativo, setAtivo] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenModal = (sieve?: Sieve) => {
    if (sieve) {
      setEditingId(sieve.id);
      setMm(sieve.mm.toString());
      setSerie(sieve.serie);
      setAtivo(sieve.ativo);
    } else {
      setEditingId(null);
      setMm("");
      setSerie("Normal");
      setAtivo(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const valMm = parseFloat(mm);
    if (isNaN(valMm) || valMm <= 0) {
      toast.error("Preencha a abertura nominal (mm) com um valor numérico válido.");
      return;
    }

    if (editingId) {
      // Evitar duplicatas desconsiderando o próprio registro sendo editado
      if (sieves.some(s => s.mm === valMm && s.id !== editingId)) {
        toast.error("Já existe uma peneira cadastrada com esta abertura.");
        return;
      }
      updateSieve(editingId, { mm: valMm, serie, ativo });
      toast.success("Peneira atualizada com sucesso");
    } else {
      // Evitar duplicatas na hora de criar
      if (sieves.some(s => s.mm === valMm)) {
        toast.error("Já existe uma peneira cadastrada com esta abertura.");
        return;
      }
      addSieve({ mm: valMm, serie, ativo });
      toast.success("Nova peneira cadastrada com sucesso");
    }
    
    setIsModalOpen(false);
  };

  const handleToggleAtivo = (id: string, currentStatus: boolean) => {
    updateSieve(id, { ativo: !currentStatus });
    toast.success(`A peneira foi ${!currentStatus ? 'ativada' : 'desativada'} no sistema.`);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteSieve(deleteId);
      toast.success("Peneira removida com sucesso");
      setDeleteId(null);
    }
  };

  return (
    <Card className="shadow-sm mt-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Especificações de Peneiras (ABNT NBR)
        </CardTitle>
        <Button onClick={() => handleOpenModal()} size="sm" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nova Peneira
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground w-full md:w-3/4">
          Conjunto de peneiras homologadas pelo sistema para os ensaios granulométricos. A série Normal é a principal exigência da norma para o cálculo do Módulo de Finura, enquanto as peneiras Intermediárias ajudam no detalhamento da curva. Você pode ativar/desativar peneiras ou adicionar novas caso use normas diferentes ou para estudos específicos.
        </p>

        <div className="rounded-md border mt-6 overflow-hidden max-w-4xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Abertura Nominal (mm)</TableHead>
                <TableHead className="font-bold">Série Nominal</TableHead>
                <TableHead className="font-bold w-[120px] text-center">Ativa</TableHead>
                <TableHead className="text-right font-bold w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sieves.map((sieve) => (
                <TableRow key={sieve.id} className={!sieve.ativo ? "bg-muted/30" : ""}>
                  <TableCell className="font-mono font-medium py-3">
                    {sieve.mm} mm
                  </TableCell>
                  <TableCell className="py-3">
                    {sieve.serie === "Normal" ? (
                      <span className="font-bold text-primary text-xs uppercase tracking-wider">{sieve.serie}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs uppercase tracking-wider">{sieve.serie}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Switch 
                      checked={sieve.ativo} 
                      onCheckedChange={() => handleToggleAtivo(sieve.id, sieve.ativo)}
                    />
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(sieve)}>
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(sieve.id)}>
                        <Trash2 className="h-4 w-4 text-destructive opacity-70 hover:opacity-100" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {sieves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhuma peneira cadastrada no sistema.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal Nova/Editar Peneira */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Peneira" : "Nova Peneira"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="mm">
                Abertura Nominal (mm)
              </Label>
              <Input
                id="mm"
                type="number"
                step="0.01"
                min="0"
                value={mm}
                onChange={(e) => setMm(e.target.value)}
                className="font-mono"
                placeholder="Exemplo: 4.8"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Série da Malha</Label>
              <Select value={serie} onValueChange={(val: "Normal"|"Intermediária") => setSerie(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Intermediária">Intermediária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Status da Peneira</Label>
                <div className="text-[10px] text-muted-foreground">Peneiras inativas não aparecem nos cálculos de módulos.</div>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Peneira</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Remoção */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Peneira</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta peneira? A remoção influenciará em todas as curvas que dependem desta leitura. Para histórico, considere apenas inativá-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
