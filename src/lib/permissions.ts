import { UserRole } from "@/store/useAppStore";

// Mapeamento de quais rotas cada role pode acessar.
// chave = path, valor = lista de roles que têm acesso.
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/": ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE", "LABORATORIO"],
  "/analyses": ["ADMIN", "VENDAS", "GERENTE", "LABORATORIO"],
  "/analyses/new": ["ADMIN", "LABORATORIO"],
  "/materials": ["ADMIN", "LABORATORIO"],
  "/standard-traces": ["ADMIN", "LABORATORIO"],
  "/production": ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE"],
  "/ruptures": ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE", "LABORATORIO"],
  "/reports": ["ADMIN", "VENDAS", "GERENTE", "LABORATORIO"],
  "/settings": ["ADMIN"],
};

// Mapeamento das permissões de CRUD por role.
// Usado nos componentes para mostrar/esconder botões de ação.
export const ACTION_PERMISSIONS: Record<string, UserRole[]> = {
  // Apenas ADMIN e LABORATORIO podem criar/editar análises
  "analysis:create": ["ADMIN", "LABORATORIO"],
  "analysis:edit": ["ADMIN"],
  "analysis:approve": ["ADMIN", "LABORATORIO"],
  "analysis:delete": ["ADMIN"],

  // Apenas ADMIN e PRODUCAO podem criar lotes de produção
  "batch:create": ["ADMIN", "PRODUCAO"],
  "batch:view": ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE", "LABORATORIO"],

  // Apenas ADMIN e LABORATORIO podem gerenciar rompimentos
  "rupture:complete": ["ADMIN", "LABORATORIO"],
  "rupture:early_release": ["ADMIN", "LABORATORIO", "ADMINISTRATIVO"],

  // Materiais e Traços: apenas ADMIN e LABORATORIO
  "material:create": ["ADMIN", "LABORATORIO"],
  "material:edit": ["ADMIN", "LABORATORIO"],
  "material:delete": ["ADMIN"],

  // Settings: apenas ADMIN
  "settings:access": ["ADMIN"],
};

export function hasRoutePermission(role: UserRole, path: string): boolean {
  // Verifica pelo path exato primeiro
  if (ROUTE_PERMISSIONS[path] !== undefined) {
    return ROUTE_PERMISSIONS[path].includes(role);
  }
  // Fallback: verifica se o path começa com algo permitido (para paths dinâmicos ex: /analyses/new)
  const parentPath = Object.keys(ROUTE_PERMISSIONS).find(
    (p) => p !== "/" && path.startsWith(p)
  );
  if (parentPath) {
    return ROUTE_PERMISSIONS[parentPath].includes(role);
  }
  // Admin tem acesso a tudo por padrão
  return role === "ADMIN";
}

export function hasActionPermission(role: UserRole, action: string): boolean {
  const allowed = ACTION_PERMISSIONS[action];
  if (!allowed) return role === "ADMIN";
  return allowed.includes(role);
}
