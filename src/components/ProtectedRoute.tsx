import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { UserRole } from "@/store/useAppStore";
import { hasRoutePermission } from "@/lib/permissions";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentUserRole = useAppStore((s) => s.currentUserRole);
  const location = useLocation();

  // 1. Se não estiver autenticado → redireciona para /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Verifica permissão de role e rota
  const hasAccess = hasRoutePermission(currentUserRole, location.pathname) &&
    allowedRoles.includes(currentUserRole);

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
