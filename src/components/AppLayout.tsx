import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useRuptureNotificationsSync } from "@/hooks/useRuptureNotificationsSync";

export function AppLayout() {
  useRuptureNotificationsSync();

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main id="main-scroll" className="flex-1 overflow-auto bg-slate-50/50">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
              <PageErrorBoundary>
                <Outlet />
              </PageErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
