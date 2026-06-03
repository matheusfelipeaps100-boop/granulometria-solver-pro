import { useNavigate } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrativo",
  PRODUCAO: "Produção",
  VENDAS: "Diretor",
  LABORATORIO: "Laboratório",
};

const ROLE_REDIRECTS: Record<string, string> = {
  ADMIN: "/",
  PRODUCAO: "/production",
  VENDAS: "/analyses",
  LABORATORIO: "/analyses",
};

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const currentUserRole = profile?.role ?? "LABORATORIO";
  const homePath = ROLE_REDIRECTS[currentUserRole] || "/";
  const roleLabel = ROLE_LABELS[currentUserRole] || currentUserRole;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6 animate-fade-in">
      <div className="rounded-full bg-destructive/10 p-5">
        <ShieldOff className="h-12 w-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-foreground">Acesso Negado</h1>
        <p className="text-muted-foreground max-w-sm">
          Você está acessando com o perfil <strong>{roleLabel}</strong>, que não tem permissão para visualizar esta página.
        </p>
      </div>
      <Button onClick={() => navigate(homePath)} variant="default">
        Ir para minha área
      </Button>
    </div>
  );
};

export default UnauthorizedPage;
