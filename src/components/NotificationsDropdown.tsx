import { useMemo, useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Notification as DBNotification } from "@/types/database.types";

interface Notification {
  id: string;
  type: "analysis_approved" | "rupture_scheduled" | "rupture_overdue" | "batch_status";
  title: string;
  description: string;
  read: boolean;
  created_at: string;
}

export function NotificationsDropdown() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load initial notifications and subscribe to realtime updates
  useEffect(() => {
    if (!profile?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", profile.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(
          data.map((n: DBNotification) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            description: n.message,
            read: n.read,
            created_at: n.created_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchNotifications();

    // Subscribe to realtime notifications for this user
    const subscription = supabase
      .from("notifications")
      .on("INSERT", (payload: any) => {
        if (payload.new.recipient_id === profile.id) {
          setNotifications((prev) => [
            {
              id: payload.new.id,
              type: payload.new.type,
              title: payload.new.title,
              description: payload.new.message,
              read: payload.new.read,
              created_at: payload.new.created_at,
            },
            ...prev,
          ]);
        }
      })
      .on("UPDATE", (payload: any) => {
        if (payload.new.recipient_id === profile.id) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? {
                    ...n,
                    read: payload.new.read,
                    title: payload.new.title,
                    description: payload.new.message,
                  }
                : n
            )
          );
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const handleNotificationClick = async (notificationId: string, relatedEntityId: string | null) => {
    // Mark as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    // Navigate based on entity type
    if (relatedEntityId) {
      navigate(`/ruptures/${relatedEntityId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeConfig = {
    analysis_approved: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
      color: "text-green-600",
    },
    rupture_scheduled: {
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

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5 text-muted-foreground animate-pulse" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground bg-destructive">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
          <p className="text-xs text-muted-foreground">{unreadCount} não lidas</p>
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação 🎉
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id, n.id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  {typeConfig[n.type]?.icon}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
