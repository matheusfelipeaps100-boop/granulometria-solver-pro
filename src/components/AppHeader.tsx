import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";

export function AppHeader() {
  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
            A
          </div>
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-sm font-medium">Admin</span>
            <span className="text-xs text-muted-foreground">LAJEFORRO MATRIZ</span>
          </div>
        </div>
      </div>
    </header>
  );
}
