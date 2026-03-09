import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Search, Layers } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ProductTypeModal } from "./ProductTypeModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function ProductTypesTab() {
  const { analysisTypes, products, deleteAnalysisType } = useAppStore();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = analysisTypes.filter(
    (at) => at.label.toLowerCase().includes(search.toLowerCase())
  );

  const countProducts = (value: string) =>
    products.filter((p) => p.tipo_produto === value).length;

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      const at = analysisTypes.find((t) => t.id === deleteId);
      const count = at ? countProducts(at.value) : 0;
      if (count > 0) {
        toast.error(`Não é possível remover. Existem ${count} produto(s) vinculado(s).`);
        setDeleteId(null);
        return;
      }
      deleteAnalysisType(deleteId);
      toast.success("Tipo de análise removido");
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Tipos de Análise</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os tipos de análise disponíveis para vincular aos produtos
            </p>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum tipo cadastrado</p>
              <p className="text-sm">Clique em "Novo Tipo" para começar</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead className="text-center">Produtos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((pt) => (
                    <TableRow key={pt.id}>
                      <TableCell className="font-medium">{pt.label}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {pt.value}
                      </TableCell>
                      <TableCell className="text-center">
                        {countProducts(pt.value)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            pt.ativo
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {pt.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(pt.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(pt.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductTypeModal open={modalOpen} onOpenChange={setModalOpen} editId={editingId} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tipo de produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O tipo será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
