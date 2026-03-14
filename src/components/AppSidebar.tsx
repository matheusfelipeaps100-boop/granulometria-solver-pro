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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logoImg from "@/assets/logo-lajeforro.png";

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

const mainItems = [
  { title: "Métricas", url: "/", icon: LayoutDashboard },
  { title: "Produção", url: "/production", icon: Factory },
  { title: "Análises", url: "/analyses", icon: FlaskConical },
  { title: "Traços Padrão", url: "/standard-traces", icon: Boxes },
  { title: "Materiais", url: "/materials", icon: Package },
  { title: "Rompimentos", url: "/ruptures", icon: Hammer },
  { title: "Relatórios", url: "/reports", icon: FileText },
];

const adminItems = [
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

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
              {mainItems.map((item) => {
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
        <SidebarGroup className="p-0 mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {adminItems.map((item) => {
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
      </SidebarContent>

      <SidebarFooter className={collapsed ? "border-t border-border p-2 flex items-center justify-center" : "border-t border-border p-4"}>
        <div className={collapsed ? "flex items-center justify-center" : "flex items-center gap-3"}>
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0">
            N
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">Operador Industrial</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Unidade Matriz</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
