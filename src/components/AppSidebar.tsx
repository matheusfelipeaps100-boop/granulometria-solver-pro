import {
  LayoutDashboard,
  FlaskConical,
  Boxes,
  Factory,
  Hammer,
  FileText,
  Package,
  Settings,
  ChevronLeft,
  LogOut,
  DollarSign,
  BarChart2,
  TestTube2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo-lajeforro.png";
import type { UserRole } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: React.ElementType; allowedRoles: UserRole[]; exact?: boolean };

const mainItems: NavItem[] = [
  { title: "Métricas", url: "/", icon: LayoutDashboard, allowedRoles: ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE", "LABORATORIO"], exact: true },
  { title: "Análises", url: "/analyses", icon: FlaskConical, allowedRoles: ["ADMIN", "VENDAS", "GERENTE", "LABORATORIO"] },
  { title: "Produção", url: "/production", icon: Factory, allowedRoles: ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE"] },
  { title: "Rompimentos", url: "/ruptures", icon: Hammer, allowedRoles: ["ADMIN", "PRODUCAO", "VENDAS", "GERENTE", "LABORATORIO"] },
  { title: "Traços Padrão", url: "/standard-traces", icon: Boxes, allowedRoles: ["ADMIN", "LABORATORIO"] },
  { title: "Granulometria", url: "/granulometria", icon: BarChart2, allowedRoles: ["ADMIN", "LABORATORIO", "GERENTE"] },
  { title: "Estudo de Dosagem", url: "/dosagem/estudo", icon: TestTube2, allowedRoles: ["ADMIN", "LABORATORIO", "GERENTE"] },
  { title: "Materiais", url: "/materials", icon: Package, allowedRoles: ["ADMIN", "LABORATORIO"] },
  { title: "Relatórios", url: "/reports", icon: FileText, allowedRoles: ["ADMIN", "VENDAS", "GERENTE", "LABORATORIO"], exact: true },
  { title: "Custos", url: "/reports/costs", icon: DollarSign, allowedRoles: ["ADMIN", "VENDAS", "GERENTE", "LABORATORIO"] },
];

const adminItems: NavItem[] = [
  { title: "Configurações", url: "/settings", icon: Settings, allowedRoles: ["ADMIN"] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrativo",
  PRODUCAO: "Produção",
  VENDAS: "Diretor",
  GERENTE: "Gerente",
  LABORATORIO: "Laboratório",
};

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const currentUserRole: UserRole = profile?.role ?? "LABORATORIO";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };
  
  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const visibleMain = mainItems.filter(item => item.allowedRoles.includes(currentUserRole));
  const visibleAdmin = adminItems.filter(item => item.allowedRoles.includes(currentUserRole));

  return (
    <Sidebar collapsible="icon">
      {/* Header with logo and collapse button */}
      <SidebarHeader className={collapsed ? "p-2 flex items-center justify-center" : "p-4 pb-2"}>
        <div className={collapsed ? "flex items-center justify-center" : "flex items-center justify-between"}>
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Lajeforro Laboratório"
              className={collapsed ? "h-7 w-7 object-contain" : "h-10 w-auto object-contain"}
            />
          </div>
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleMain.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      size="lg"
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={
                          active
                            ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 rounded-lg"
                            : "text-sidebar-foreground hover:bg-accent hover:text-foreground rounded-lg font-medium"
                        }
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="ml-2">{item.title}</span>}
                        {!collapsed && active && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin items at bottom of content */}
        {visibleAdmin.length > 0 && (
          <SidebarGroup className="p-0 mt-auto">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {visibleAdmin.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        size="lg"
                      >
                        <NavLink
                          to={item.url}
                          className={
                            active
                              ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 rounded-lg"
                              : "text-sidebar-foreground hover:bg-accent hover:text-foreground rounded-lg font-medium"
                          }
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && <span className="ml-2">{item.title}</span>}
                          {!collapsed && active && (
                            <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" />
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={collapsed ? "border-t border-border p-2 flex items-center justify-center" : "border-t border-border p-4"}>
        <div className={collapsed ? "flex items-center justify-center" : "flex flex-col gap-3"}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {(profile?.nome || ROLE_LABELS[currentUserRole])[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">{profile?.nome || ROLE_LABELS[currentUserRole]}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{ROLE_LABELS[currentUserRole]}</span>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
