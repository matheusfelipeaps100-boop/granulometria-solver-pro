import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { hasActionPermission } from "@/lib/permissions";
import { MaterialModal } from "@/components/materials/MaterialModal";
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

const MaterialsPage = () => {
  const { materials, deleteMaterial, currentUserRole } = useAppStore();
  
  const canCreate = hasActionPermission(currentUserRole, "material:create");
  const canEdit = hasActionPermission(currentUserRole, "material:edit");
  const canDelete = hasActionPermission(currentUserRole, "material:delete");
  
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = materials.filter(
    (m) =>
      m.nome.toLowerCase().includes(search.toLowerCase()) ||
      m.tipo.toLowerCase().includes(search.toLowerCase()) ||
      m.fornecedor.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setEditingMaterial(id);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingMaterial(null);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMaterial(deleteId);
      toast.success("Material removido com sucesso");
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Materiais</h1>
            <p className="text-sm text-muted-foreground">Cadastro de materiais e curvas granulométricas</p>
          </div>
          {canCreate && (
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          )}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar material..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>MF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="capitalize">{m.tipo.replace("_", " ")}</TableCell>
                    <TableCell>{m.fornecedor}</TableCell>
                    <TableCell className="font-mono">{m.mf}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.ativo ? "aprovado" : "arquivado"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(m.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(m.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <MaterialModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editId={editingMaterial}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O material será removido do cadastro.
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
};

export default MaterialsPage;
