import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2, Info } from "lucide-react";
import { useProfiles, DBProfile } from "@/hooks/api/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/store/useAppStore";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrativo",
  PRODUCAO: "Produção",
  VENDAS: "Diretor",
  GERENTE: "Gerente",
  LABORATORIO: "Laboratório",
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-red-500/15 text-red-700 border-red-200",
  PRODUCAO: "bg-blue-500/15 text-blue-700 border-blue-200",
  VENDAS: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  GERENTE: "bg-amber-500/15 text-amber-700 border-amber-200",
  LABORATORIO: "bg-purple-500/15 text-purple-700 border-purple-200",
};

type FormState = {
  nome: string;
  email: string;
  password?: string;
  role: UserRole;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: "",
  email: "",
  password: "",
  role: "LABORATORIO",
  ativo: true,
};

export function UsersTab() {
  const { profiles, isLoading, updateProfile, isUpdating, createProfile, isCreating, deleteProfile, isDeleting } = useProfiles();
  const { profile: currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deletingUser, setDeletingUser] = useState<DBProfile | null>(null);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: DBProfile) => {
    setEditingId(user.id);
    setForm({
      nome: user.nome,
      email: user.email || "",
      role: (user.role?.toUpperCase() as UserRole) ?? "LABORATORIO",
      ativo: user.ativo,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Preencha o nome completo do usuário."); return; }
    
    // Na criação: Email e senha são obrigatórios
    if (!editingId && (!form.email.trim() || !form.password?.trim())) {
      toast.error("Ao cadastrar, e-mail e senha inicial são obrigatórios.");
      return;
    }

    if (editingId) {
      try {
        await updateProfile({
          id: editingId,
          nome: form.nome.trim(),
          role: form.role.toLowerCase() as UserRole,
          ativo: form.ativo,
        });
        toast.success("Usuário atualizado com sucesso.");
        setIsModalOpen(false);
      } catch (error: any) {
        toast.error("Erro ao atualizar usuário: " + error.message);
      }
    } else {
      try {
        await createProfile({
          nome: form.nome.trim(),
          email: form.email.trim(),
          password: form.password?.trim(),
          role: form.role,
          ativo: form.ativo,
        });
        toast.success("Usuário cadastrado com sucesso.");
        setIsModalOpen(false);
      } catch (error: any) {
        toast.error("Erro ao cadastrar usuário: " + error.message);
      }
    }
  };

  const handleToggleAtivo = async (id: string, current: boolean) => {
    try {
      await updateProfile({ id, ativo: !current });
      toast.success(`Usuário ${!current ? "ativado" : "desativado"} com sucesso.`);
    } catch (error) {
      toast.error("Erro ao alterar status do usuário.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteProfile(deletingUser.id);
      toast.success(`Usuário "${deletingUser.nome}" excluído com sucesso.`);
    } catch (error: any) {
      toast.error("Erro ao excluir usuário: " + error.message);
    } finally {
      setDeletingUser(null);
    }
  };

  const initials = (nome: string) =>
    nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <Card className="shadow-sm mt-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Gerenciamento de Usuários
        </CardTitle>
        <Button onClick={handleOpenNew} size="sm" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">

        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-primary leading-relaxed">
            <strong>Cadastro Administrativo.</strong> Todos os usuários cadastrados por aqui receberão suas credenciais imediatamente
            e poderão logar no aplicativo. O perfil inicial será gerado junto com a conta segura no Banco de Dados.
          </p>
        </div>

        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Usuário</TableHead>
                <TableHead className="font-bold">E-mail</TableHead>
                <TableHead className="font-bold">Cargo / Permissão</TableHead>
                <TableHead className="font-bold text-center w-[90px]">Ativo</TableHead>
                <TableHead className="text-right font-bold w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((user) => (
                <TableRow key={user.id} className={!user.ativo ? "opacity-50" : ""}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {initials(user.nome)}
                      </div>
                      <span className="font-semibold text-sm">{user.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground font-mono">
                    {user.email ?? "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 ${ROLE_COLORS[(user.role?.toUpperCase()) as UserRole] ?? ""}`}>
                      {ROLE_LABELS[(user.role?.toUpperCase()) as UserRole] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Switch checked={user.ativo} onCheckedChange={() => handleToggleAtivo(user.id, user.ativo)} />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)}>
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          {profiles.filter(u => u.ativo).length} usuário(s) ativo(s) · {profiles.length} cadastrado(s) no total.
        </p>
      </CardContent>

      {/* Modal Novo / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-nome">Nome Completo</Label>
              <Input
                id="user-nome"
                placeholder="Ex: João Silva"
                value={form.nome}
                onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">E-mail</Label>
              <Input
                id="user-email"
                type="email"
                disabled={!!editingId}
                placeholder="exemplo@lajeforro.com.br"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                O e-mail não pode ser alterado após o cadastro.
              </p>
            </div>
            
            {!editingId && (
              <div className="space-y-2">
                <Label htmlFor="user-password">Senha Inicial</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Defina uma senha provisória"
                  value={form.password || ""}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">
                  Mínimo de 6 caracteres. O usuário poderá alterar depois (em breve).
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nível de Permissão (Cargo)</Label>
              <Select value={form.role} onValueChange={(val: UserRole) => setForm(p => ({ ...p, role: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <div className="flex flex-col">
                      <span className="font-bold">Administrativo</span>
                      <span className="text-[10px] text-muted-foreground">Acesso total a todas as áreas e configurações</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="LABORATORIO">
                    <div className="flex flex-col">
                      <span className="font-bold">Laboratório</span>
                      <span className="text-[10px] text-muted-foreground">Análises, materiais, traços e rompimentos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PRODUCAO">
                    <div className="flex flex-col">
                      <span className="font-bold">Produção</span>
                      <span className="text-[10px] text-muted-foreground">Somente página de produção e lotes</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="VENDAS">
                    <div className="flex flex-col">
                      <span className="font-bold">Diretor</span>
                      <span className="text-[10px] text-muted-foreground">Visualização de análises, produção e rompimentos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="GERENTE">
                    <div className="flex flex-col">
                      <span className="font-bold">Gerente</span>
                      <span className="text-[10px] text-muted-foreground">Visualização de análises, produção e rompimentos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Usuário Ativo</Label>
                <p className="text-[10px] text-muted-foreground">Usuários inativos não poderão acessar o sistema.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm(p => ({ ...p, ativo: v }))} />
            </div>

            {/* Gestão de senha via Supabase Auth */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center">
                A gestão de contas é processada de forma segura diretamente via <strong>Supabase Auth (Edge Functions)</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isUpdating || isCreating}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isUpdating || isCreating}>
              {isUpdating || isCreating ? "Salvando..." : "Salvar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingUser?.nome}</strong>? Esta ação não pode ser desfeita. O usuário perderá acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}
