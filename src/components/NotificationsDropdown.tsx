import { useEffect, useMemo, useState } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Notification as DBNotification } from "@/types/database.types";

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: JSX.Element; color: string }> = {
  trace_approved: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
    color: "text-green-600",
  },
  rupture_due_today: {
    icon: <Clock className="h-4 w-4 text-blue-500 shrink-0" />,
    color: "text-blue-500",
  },
  rupture_overdue: {
    icon: <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />,
    color: "text-destructive",
  },
  batch_status: {
    icon: <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />,
    color: "text-amber-600",
  },
};

const defaultTypeConfig = {
  icon: <Bell className="h-4 w-4 text-muted-foreground shrink-0" />,
  color: "text-muted-foreground",
};

export function NotificationsDropdown() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(
          data.map((n: DBNotification) => ({
            id: n.id,
            tipo: n.tipo,
            titulo: n.titulo,
            mensagem: n.mensagem,
            link: n.link,
            lida: n.lida,
            created_at: n.created_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          if (payload.new.user_id === profile.id) {
            setNotifications((prev) => [
              {
                id: payload.new.id,
                tipo: payload.new.tipo,
                titulo: payload.new.titulo,
                mensagem: payload.new.mensagem,
                link: payload.new.link,
                lida: payload.new.lida,
                created_at: payload.new.created_at,
              },
              ...prev,
            ]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload: any) => {
          if (payload.new.user_id === profile.id) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id
                  ? {
                      ...n,
                      lida: payload.new.lida,
                      titulo: payload.new.titulo,
                      mensagem: payload.new.mensagem,
                    }
                  : n
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleNotificationClick = async (notificationId: string, link: string | null) => {
    await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, lida: true } : n))
    );

    if (link) {
      navigate(link);
    }
  };

  const unread = useMemo(() => notifications.filter((n) => !n.lida), [notifications]);
  const read = useMemo(() => notifications.filter((n) => n.lida), [notifications]);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5 text-muted-foreground animate-pulse" />
      </Button>
    );
  }

  const renderList = (items: Notification[], emptyLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
      );
    }

    return (
      <ScrollArea className="h-72">
        <div className="divide-y divide-border">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n.id, n.link)}
              className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                n.lida ? "opacity-60 hover:bg-muted/30" : "hover:bg-muted/50"
              }`}
            >
              {(typeConfig[n.tipo] ?? defaultTypeConfig).icon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground leading-tight break-words">
                  {n.titulo}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {n.mensagem}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {!n.lida && (
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground bg-destructive">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
        </div>
        <Tabs defaultValue="unread">
          <TabsList className="w-full rounded-none bg-transparent border-b border-border h-auto p-0">
            <TabsTrigger
              value="unread"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Não lidas {unread.length > 0 && `(${unread.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="read"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Lidas {read.length > 0 && `(${read.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unread" className="mt-0">
            {renderList(unread, "Nenhuma notificação pendente 🎉")}
          </TabsContent>
          <TabsContent value="read" className="mt-0">
            {renderList(read, "Nenhuma notificação lida ainda")}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
