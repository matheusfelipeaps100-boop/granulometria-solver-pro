import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Search, Package, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useProducts } from "@/hooks/api/useProducts";
import { ProductModal } from "./ProductModal";
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
import { toast } from "sonner";

export function ProductsTab() {
  const { analysisTypes } = useAppStore();
  const { products, isLoading, deleteProduct } = useProducts();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = products.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.dimensoes?.toLowerCase() || "").includes(search.toLowerCase())
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
        await deleteProduct(deleteId);
        toast.success("Produto removido com sucesso");
      } catch (error) {
        toast.error("Erro ao remover produto");
      }
      setDeleteId(null);
    }
  };

  const tipoLabel = (tipo: string) =>
    analysisTypes.find((t) => t.value === tipo)?.label ?? tipo;

  if (isLoading) {
    return (
      <Card className="shadow-sm mt-4">
        <CardContent className="py-12 flex flex-col items-center justify-center text-primary gap-3">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Carregando catálogo...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Catálogo de Produtos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os produtos disponíveis para análises
            </p>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum produto cadastrado</p>
              <p className="text-sm">Clique em "Novo Produto" para começar</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo de Análise</TableHead>
                    <TableHead>Dimensões</TableHead>
                    <TableHead className="text-right">Resistência Ref.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{tipoLabel(p.tipo_produto)}</TableCell>
                      <TableCell>{p.dimensoes}</TableCell>
                      <TableCell className="text-right">
                        {p.resistencia_referencia} MPa
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            p.ativo
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(p.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(p.id)}
                          >
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

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editId={editingId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O produto será removido do catálogo.
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
