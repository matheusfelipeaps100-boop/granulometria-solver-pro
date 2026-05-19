import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { hasActionPermission } from "@/lib/permissions";
import { useAppStore } from "@/store/useAppStore";
import { useStandardCurves } from "@/hooks/api/useStandardCurves";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";


const StandardTracesPage = () => {
  const { profile } = useAuth();
  const currentUserRole = profile?.role ?? "LABORATORIO";
  const customDNAs = useAppStore((state) => state.customDNAs) || [];
  const { curves } = useStandardCurves();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  const canCreate = hasActionPermission(currentUserRole, "material:create");
  const canDelete = hasActionPermission(currentUserRole, "material:delete");

  // Mutation para deletar traço
  const deleteMutation = useMutation({
    mutationFn: async (traceId: string) => {
      const { error } = await supabase
        .from("standard_curves")
        .delete()
        .eq("id", traceId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ["standard-curves"] });
      
      // Se for custom DNA, remover do store
      if (selectedTrace && 'id' in selectedTrace) {
        const customIndex = customDNAs.findIndex((c) => c.id === selectedTrace.id);
        if (customIndex > -1) {
          useAppStore.setState({
            customDNAs: customDNAs.filter((_, i) => i !== customIndex),
          });
        }
      }

      toast.success(`Traço "${selectedTrace?.nome}" deletado com sucesso!`);
      setDeleteDialogOpen(false);
      setSelectedTrace(null);
    },
    onError: (error) => {
      toast.error("Erro ao deletar traço");
      console.error(error);
    },
  });

  const dbTraces = curves.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo_produto || "bloco_estrutural",
    resistencia: c.resistencia_alvo ? `${c.resistencia_alvo} MPa` : "—",
    mf: c.modulo_finura ? String(c.modulo_finura) : "—",
    ativo: true,
  }));

  const allTraces = [...dbTraces, ...customDNAs];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Traços Padrão</h1>
          <p className="text-sm text-muted-foreground">DNAs e curvas de referência</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Traço Padrão
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar traço..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo Produto</TableHead>
                <TableHead>Resistência Alvo</TableHead>
                <TableHead>MF</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTraces.map((t, index) => (
                <TableRow key={`${t.nome}-${index}`} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {t.nome}
                    {'isSaved' in t && t.isSaved && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Novo</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{t.tipo.replace("_", " ")}</TableCell>
                  <TableCell className="font-mono">{t.resistencia}</TableCell>
                  <TableCell className="font-mono">{t.mf}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.ativo ? "aprovado" : "arquivado"} />
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setSelectedTrace(t);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmação de deleção */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Deletar Traço?</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-foreground">
              Você tem certeza que deseja deletar o traço <strong>"{selectedTrace?.nome}"</strong>?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTrace?.id) {
                  deleteMutation.mutate(selectedTrace.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StandardTracesPage;
