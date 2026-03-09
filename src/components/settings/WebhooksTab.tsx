import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/useAppStore";
import { Plus, Pencil, Trash2, Webhook, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Eventos de webhook conforme schema.prisma
const WEBHOOK_EVENTOS = [
  { value: "trace_approved", label: "Traço Aprovado" },
  { value: "trace_released", label: "Traço Liberado para Produção" },
  { value: "batch_created", label: "Lote Criado" },
  { value: "rupture_scheduled", label: "Rompimento Agendado" },
  { value: "rupture_completed", label: "Rompimento Concluído" },
  { value: "sample_nonconformity", label: "Não Conformidade de Amostra" },
  { value: "report_generated", label: "Relatório Gerado" },
  { value: "batch_rejected", label: "Lote Reprovado" },
] as const;

type WebhookEvento = typeof WEBHOOK_EVENTOS[number]["value"];

export interface WebhookConfig {
  id: string;
  nome: string;
  url: string;
  evento: WebhookEvento;
  secret: string;
  ativo: boolean;
  retry_count: number;
  timeout_seconds: number;
  created_at: string;
}

interface WebhookFormData {
  nome: string;
  url: string;
  evento: WebhookEvento | "";
  retry_count: number;
  timeout_seconds: number;
  ativo: boolean;
}

const initialFormData: WebhookFormData = {
  nome: "",
  url: "",
  evento: "",
  retry_count: 3,
  timeout_seconds: 30,
  ativo: true,
};

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function WebhooksTab() {
  const { webhooks, addWebhook, updateWebhook, deleteWebhook } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>(initialFormData);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (webhook: WebhookConfig) => {
    setEditingId(webhook.id);
    setFormData({
      nome: webhook.nome,
      url: webhook.url,
      evento: webhook.evento,
      retry_count: webhook.retry_count,
      timeout_seconds: webhook.timeout_seconds,
      ativo: webhook.ativo,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      toast.error("Informe o nome do webhook.");
      return;
    }
    if (!formData.url.trim() || !formData.url.startsWith("https://")) {
      toast.error("URL inválida. Deve começar com https://");
      return;
    }
    if (!formData.evento) {
      toast.error("Selecione um evento.");
      return;
    }

    if (editingId) {
      updateWebhook(editingId, formData);
      toast.success("Webhook atualizado com sucesso.");
    } else {
      addWebhook({
        nome: formData.nome,
        url: formData.url,
        evento: formData.evento as WebhookEvento,
        retry_count: formData.retry_count,
        timeout_seconds: formData.timeout_seconds,
        ativo: formData.ativo,
      });
      toast.success("Webhook criado com sucesso.");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteWebhook(id);
    toast.success("Webhook removido.");
  };

  const handleToggleAtivo = (webhook: WebhookConfig) => {
    updateWebhook(webhook.id, { ativo: !webhook.ativo });
    toast.success(webhook.ativo ? "Webhook desativado." : "Webhook ativado.");
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copiado para a área de transferência.");
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getEventoLabel = (evento: string) => {
    return WEBHOOK_EVENTOS.find((e) => e.value === evento)?.label || evento;
  };

  return (
    <>
      <Card className="shadow-sm mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Novo Webhook
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure webhooks para receber notificações em sistemas externos quando eventos ocorrerem.
            Todos os payloads são assinados com HMAC-SHA256.
          </p>

          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum webhook configurado.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-medium">{wh.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getEventoLabel(wh.evento)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {wh.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[80px] truncate">
                            {showSecrets[wh.id] ? wh.secret.slice(0, 12) + "..." : "••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleShowSecret(wh.id)}
                          >
                            {showSecrets[wh.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopySecret(wh.secret)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={wh.ativo}
                          onCheckedChange={() => handleToggleAtivo(wh)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(wh)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(wh.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Webhook" : "Novo Webhook"}</DialogTitle>
            <DialogDescription>
              Configure o endpoint que receberá as notificações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Integração ERP"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>URL (HTTPS)</Label>
              <Input
                placeholder="https://seu-sistema.com/webhook"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Evento</Label>
              <Select
                value={formData.evento}
                onValueChange={(v) => setFormData({ ...formData, evento: v as WebhookEvento })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTOS.map((ev) => (
                    <SelectItem key={ev.value} value={ev.value}>
                      {ev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tentativas</Label>
                <Select
                  value={String(formData.retry_count)}
                  onValueChange={(v) => setFormData({ ...formData, retry_count: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timeout (s)</Label>
                <Select
                  value={String(formData.timeout_seconds)}
                  onValueChange={(v) => setFormData({ ...formData, timeout_seconds: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30, 45, 60].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
