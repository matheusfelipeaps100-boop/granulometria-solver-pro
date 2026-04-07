import { useAppStore, UserRole } from "@/store/useAppStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

export function RoleSwitcher() {
  const { currentUserRole, setCurrentUserRole } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      <Select value={currentUserRole} onValueChange={(val: UserRole) => setCurrentUserRole(val)}>
        <SelectTrigger className="w-[160px] h-8 text-xs font-semibold bg-muted/20 border-border/50">
          <SelectValue placeholder="Selecione o Perfil" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ADMIN">Administrativo</SelectItem>
          <SelectItem value="PRODUCAO">Produção</SelectItem>
          <SelectItem value="VENDAS">Vendas</SelectItem>
          <SelectItem value="LABORATORIO">Laboratório</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
