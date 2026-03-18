import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/store/useAppStore";
import { hasRoutePermission } from "@/lib/permissions";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  // Aguardando verificação de sessão com o Supabase
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Carregando...</span>
        </div>
      </div>
    );
  }

  // Não autenticado → redireciona para login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário inativo
  if (profile && !profile.ativo) {
    return <Navigate to="/unauthorized" replace />;
  }

  const role = profile?.role ?? "LABORATORIO";

  // Verifica permissão de role e rota
  const hasAccess =
    hasRoutePermission(role, location.pathname) &&
    allowedRoles.includes(role);

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
