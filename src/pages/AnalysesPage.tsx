import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import { useAppStore } from "@/store/useAppStore";
import { hasActionPermission } from "@/lib/permissions";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_analise", label: "Em Análise" },
  { value: "aprovado", label: "Aprovado" },
  { value: "liberado_producao", label: "Liberado" },
];

const AnalysesPage = () => {
  const navigate = useNavigate();
  const { analyses: storedAnalyses, deleteAnalysis, currentUserRole } = useAppStore();
  
  const canCreate = hasActionPermission(currentUserRole, "analysis:create");
  const canEdit = hasActionPermission(currentUserRole, "analysis:edit");
  const canDelete = hasActionPermission(currentUserRole, "analysis:delete");
  const [deletedMockCodes, setDeletedMockCodes] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; codigo: string; nome: string; isFromStore: boolean }>({
    open: false,
    codigo: "",
    nome: "",
    isFromStore: false,
  });

  const openDeleteModal = (codigo: string, nome: string, isFromStore: boolean) => {
    setDeleteModal({ open: true, codigo, nome, isFromStore });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.isFromStore) {
      deleteAnalysis(deleteModal.codigo);
    } else {
      setDeletedMockCodes((prev) => [...prev, deleteModal.codigo]);
    }
    toast.success("Análise excluída com sucesso!");
    setDeleteModal({ open: false, codigo: "", nome: "", isFromStore: false });
  };

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Merge store analyses + mock data (excluding duplicates and deleted mocks)
  const allAnalyses = useMemo(() => {
    const mockAnalyses = [
      { codigo: "ANL-2026-012", nome: "Paver H8 Alta Resistência", tipo: "paver", analista: "Carlos Silva", data: "07/03/2026", status: "aprovado" as const, fromStore: false },
      { codigo: "ANL-2026-011", nome: "Bloco Estrutural 14x19x39", tipo: "bloco_estrutural", analista: "Maria Santos", data: "05/03/2026", status: "liberado_producao" as const, fromStore: false },
      { codigo: "ANL-2026-010", nome: "Bloco Vedação Standard", tipo: "bloco_vedacao", analista: "João Oliveira", data: "03/03/2026", status: "em_analise" as const, fromStore: false },
      { codigo: "ANL-2026-009", nome: "CP Teste Dosagem", tipo: "cp", analista: "Carlos Silva", data: "01/03/2026", status: "rascunho" as const, fromStore: false },
    ];

    const storeCodes = new Set(storedAnalyses.map((a) => a.codigo));
    const activeMocks = mockAnalyses.filter((m) => !storeCodes.has(m.codigo) && !deletedMockCodes.includes(m.codigo));

    const storeItems = storedAnalyses.map((a) => ({
      codigo: a.codigo,
      nome: a.nome,
      tipo: a.tipo_analise,
      analista: a.analista,
      data: new Date(a.data).toLocaleDateString("pt-BR"),
      status: a.status,
      fromStore: true,
    }));

    return [...storeItems, ...activeMocks];
  }, [storedAnalyses, deletedMockCodes]);

  const filtered = allAnalyses.filter((a) => {
    const matchSearch =
      !search ||
      a.codigo.toLowerCase().includes(search.toLowerCase()) ||
      a.nome.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "all" || a.tipo === filterTipo;
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchTipo && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análises</h1>
          <p className="text-sm text-muted-foreground">Gerenciar análises granulométricas</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate("/analyses/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Análise
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {TIPOS_ANALISE.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Analista</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.codigo} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{a.codigo}</TableCell>
                  <TableCell>{a.nome}</TableCell>
                  <TableCell className="capitalize">{a.tipo.replace(/_/g, " ")}</TableCell>
                  <TableCell>{a.analista}</TableCell>
                  <TableCell>{a.data}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/analyses/new?edit=${a.codigo}`)} title="Revisar / Editar">
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/analyses/${a.codigo}`)} title="Visualizar">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDeleteModal(a.codigo, a.nome, a.fromStore); }} title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma análise encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir Análise
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a análise <strong>{deleteModal.codigo}</strong> — {deleteModal.nome}?
              <br />
              <span className="text-destructive">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnalysesPage;
