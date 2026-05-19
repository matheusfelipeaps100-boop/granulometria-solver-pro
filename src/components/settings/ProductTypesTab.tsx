import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Search, Layers, RefreshCw } from "lucide-react";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import { ProductTypeModal } from "./ProductTypeModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function ProductTypesTab() {
  const { curves, isLoading, deleteCurve } = useStandardCurves();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = curves.filter(
    (c) => c.nome.toLowerCase().includes(search.toLowerCase()) || 
           c.tipo_produto.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteCurve(deleteId);
        toast.success("DNA removido com sucesso");
      } catch (error) {
        toast.error("Erro ao remover DNA");
      }
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm mt-4">
        <CardContent className="py-12 flex flex-col items-center justify-center text-primary gap-3">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Carregando DNAs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Curvas Padrão (DNAs)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure os limites granulométricos para cada tipo de produto
            </p>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Curva (DNA)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar DNA ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum DNA cadastrado</p>
              <p className="text-sm">Clique em "Nova Curva" para começar</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Resistência Alvo</TableHead>
                    <TableHead className="text-center">Peneiras</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((curve) => (
                    <TableRow key={curve.id}>
                      <TableCell className="font-medium">{curve.nome}</TableCell>
                      <TableCell className="capitalize">{curve.tipo_produto.replace("_", " ")}</TableCell>
                      <TableCell className="text-center">
                        {curve.resistencia_alvo ? `${curve.resistencia_alvo} MPa` : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {curve.standard_curve_items?.length || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            curve.ativo
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {curve.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(curve.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(curve.id)}>
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
            <AlertDialogTitle>Remover tipo de análise?</AlertDialogTitle>
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
