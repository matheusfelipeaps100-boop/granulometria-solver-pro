import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const RECIPIENT_ROLES = ["admin", "gestor", "laboratorio", "producao"];
const RUPTURE_TYPES = ["rupture_due_today", "rupture_overdue"];
const RESOLVED_STATUSES = ["concluido", "ignorado"];

/**
 * Ao abrir o app, garante que existam notificações para rompimentos
 * previstos para hoje ou em atraso, sem depender de pg_cron.
 * Idempotente: não duplica notificação para o mesmo schedule+tipo.
 * Também marca como lidas notificações cujo rompimento já foi concluído.
 */
export function useRuptureNotificationsSync() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.organization_id || !profile.ativo) return;

    const orgId = profile.organization_id;

    const markResolvedAsRead = async () => {
      const { data: unread } = await supabase
        .from("notifications")
        .select("id, dados")
        .eq("organization_id", orgId)
        .eq("lida", false)
        .in("tipo", RUPTURE_TYPES);

      if (!unread || unread.length === 0) return;

      const scheduleIds = [
        ...new Set(
          unread
            .map((n) => (n.dados as any)?.schedule_id as string | undefined)
            .filter((id): id is string => !!id)
        ),
      ];

      if (scheduleIds.length === 0) return;

      const { data: schedules } = await supabase
        .from("rupture_schedules")
        .select("id, status")
        .in("id", scheduleIds);

      const resolvedIds = new Set(
        (schedules ?? [])
          .filter((s) => RESOLVED_STATUSES.includes(s.status))
          .map((s) => s.id)
      );

      if (resolvedIds.size === 0) return;

      const notificationIdsToMark = unread
        .filter((n) => resolvedIds.has((n.dados as any)?.schedule_id))
        .map((n) => n.id);

      if (notificationIdsToMark.length === 0) return;

      await supabase
        .from("notifications")
        .update({ lida: true })
        .in("id", notificationIdsToMark);
    };

    const sync = async () => {
      await markResolvedAsRead();

      const today = new Date().toISOString().split("T")[0];

      const { data: schedules, error: schedulesError } = await supabase
        .from("rupture_schedules")
        .select(`
          id,
          idade_dias,
          data_prevista,
          status,
          batch:production_batches!inner (
            batch_code,
            organization_id
          )
        `)
        .eq("status", "pendente")
        .lte("data_prevista", today)
        .eq("batch.organization_id", orgId);

      if (schedulesError || !schedules || schedules.length === 0) return;

      const { data: existing } = await supabase
        .from("notifications")
        .select("tipo, dados")
        .eq("organization_id", orgId)
        .in("tipo", ["rupture_due_today", "rupture_overdue"]);

      const alreadyNotified = new Set(
        (existing ?? []).map((n) => `${n.tipo}:${(n.dados as any)?.schedule_id}`)
      );

      const pending = schedules.filter((s: any) => {
        const tipo = s.data_prevista === today ? "rupture_due_today" : "rupture_overdue";
        return !alreadyNotified.has(`${tipo}:${s.id}`);
      });

      if (pending.length === 0) return;

      const { data: recipients } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("ativo", true)
        .in("role", RECIPIENT_ROLES);

      if (!recipients || recipients.length === 0) return;

      const rows = pending.flatMap((s: any) => {
        const tipo = s.data_prevista === today ? "rupture_due_today" : "rupture_overdue";
        const batchCode = s.batch?.batch_code ?? "—";
        const titulo =
          tipo === "rupture_due_today"
            ? `Rompimento hoje: Lote ${batchCode}`
            : `Rompimento em atraso: Lote ${batchCode}`;
        const mensagem =
          tipo === "rupture_due_today"
            ? `O lote ${batchCode} tem rompimento de ${s.idade_dias} dias previsto para hoje.`
            : `O lote ${batchCode} tem rompimento de ${s.idade_dias} dias em atraso (previsto: ${s.data_prevista}).`;

        return recipients.map((r) => ({
          organization_id: orgId,
          user_id: r.id,
          tipo,
          titulo,
          mensagem,
          link: "/ruptures",
          dados: {
            schedule_id: s.id,
            batch_code: batchCode,
            idade_dias: s.idade_dias,
            data_prevista: s.data_prevista,
          },
        }));
      });

      await supabase.from("notifications").insert(rows);
    };

    sync();
  }, [profile?.id, profile?.organization_id, profile?.ativo]);
}
