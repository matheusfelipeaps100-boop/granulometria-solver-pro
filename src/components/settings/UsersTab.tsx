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
import { Users, Plus, Pencil, Trash2, Info, Eye, EyeOff } from "lucide-react";
import { useAppStore, AppUser, UserRole } from "@/store/useAppStore";
import { toast } from "sonner";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrativo",
  PRODUCAO: "Produção",
  VENDAS: "Vendas",
  LABORATORIO: "Laboratório",
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "bg-red-500/15 text-red-700 border-red-200",
  PRODUCAO: "bg-blue-500/15 text-blue-700 border-blue-200",
  VENDAS: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  LABORATORIO: "bg-purple-500/15 text-purple-700 border-purple-200",
};

type FormState = {
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  senha_provisoria: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  email: "",
  role: "LABORATORIO",
  ativo: true,
  senha_provisoria: "",
};

export function UsersTab() {
  const { appUsers, addAppUser, updateAppUser, deleteAppUser } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingId(user.id);
    setForm({
      nome: user.nome,
      email: user.email,
      role: user.role,
      ativo: user.ativo,
      senha_provisoria: user.senha_provisoria || "",
    });
    setShowPass(false);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error("Preencha o nome completo do usuário."); return; }
    if (!form.email.trim() || !form.email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }

    const duplicate = appUsers.find(u => u.email === form.email.trim() && u.id !== editingId);
    if (duplicate) { toast.error("Já existe um usuário com este e-mail."); return; }

    if (editingId) {
      updateAppUser(editingId, {
        nome: form.nome.trim(),
        email: form.email.trim(),
        role: form.role,
        ativo: form.ativo,
        ...(form.senha_provisoria.trim() ? { senha_provisoria: form.senha_provisoria.trim() } : {}),
      });
      toast.success("Usuário atualizado com sucesso.");
    } else {
      if (!form.senha_provisoria.trim()) { toast.error("Defina uma senha provisória para o novo usuário."); return; }
      addAppUser({
        nome: form.nome.trim(),
        email: form.email.trim(),
        role: form.role,
        ativo: form.ativo,
        senha_provisoria: form.senha_provisoria.trim(),
      });
      toast.success("Usuário cadastrado com sucesso.");
    }
    setIsModalOpen(false);
  };

  const handleToggleAtivo = (id: string, current: boolean) => {
    updateAppUser(id, { ativo: !current });
    toast.success(`Usuário ${!current ? "ativado" : "desativado"} com sucesso.`);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteAppUser(deleteId);
      toast.success("Usuário removido.");
      setDeleteId(null);
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

        {/* Banner informativo */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Pré-configuração de Usuários.</strong> Cadastre os usuários e defina as permissões agora.
            Quando o <strong>Supabase Auth</strong> for ativado, o login será vinculado ao perfil já configurado aqui.
            As senhas provisórias serão substituídas pelas credenciais do Supabase.
          </p>
        </div>

        <div className="rounded-md border overflow-hidden">
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
              {appUsers.map((user) => (
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
                    {user.email}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
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
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}>
                        <Trash2 className="h-4 w-4 text-destructive opacity-70 hover:opacity-100" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {appUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          {appUsers.filter(u => u.ativo).length} usuário(s) ativo(s) · {appUsers.length} cadastrado(s) no total.
        </p>
      </CardContent>

      {/* Modal Novo / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
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
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Este e-mail será usado para o login no sistema.
              </p>
            </div>
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
                      <span className="font-bold">Vendas</span>
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

            {/* Senha provisória */}
            <div className="space-y-2">
              <Label htmlFor="user-senha" className="flex items-center gap-1.5">
                🔒 Senha Provisória
                {editingId && <span className="text-[10px] text-muted-foreground font-normal">(deixe vazio para manter a atual)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="user-senha"
                  type={showPass ? "text" : "password"}
                  placeholder={editingId ? "Nova senha (opcional)" : "Senha de acesso inicial"}
                  value={form.senha_provisoria}
                  onChange={(e) => setForm(p => ({ ...p, senha_provisoria: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Esta senha será substituída pelas credenciais do Supabase quando a autenticação for integrada.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Usuário</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal remover */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário? Ele perderá todo o acesso ao sistema. Essa ação não pode ser desfeita.
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
