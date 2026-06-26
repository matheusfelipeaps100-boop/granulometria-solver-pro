import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { getDefaultDateFilter, isInDateRange, formatPeriodLabel } from "@/lib/dateFilter";
import type { DateFilter } from "@/lib/dateFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, Unlock, AlertTriangle, ClipboardList, Eye, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useRuptures } from "@/hooks/api/useRuptures";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import { hasActionPermission } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { ScheduleStatus } from "@/hooks/api/useRuptures";

const statusColor: Record<ScheduleStatus, string> = {
  pendente: "border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100",
  em_andamento: "border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100",
  concluido: "border-green-400 text-green-700 bg-green-50 hover:bg-green-100",
  atrasado: "border-destructive text-destructive bg-red-50 hover:bg-red-100",
  ignorado: "border-muted text-muted-foreground bg-muted/20 opacity-50 cursor-not-allowed",
};

const dueTodayColor = "border-sky-400 text-sky-700 bg-sky-50 hover:bg-sky-100";

const RupturesPage = () => {
  const { schedules, isLoadingSchedules, releaseEarly, isReleasing, exemptFromTesting, isExempting } = useRuptures();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const canCompleteRupture = profile ? hasActionPermission(profile.role, "rupture:complete") : false;
  const canReleaseEarlyPermission = profile ? hasActionPermission(profile.role, "rupture:early_release") : false;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());
  
  // States of early release modal
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [batchToRelease, setBatchToRelease] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseAnalyst, setReleaseAnalyst] = useState("");

  // States of exempt from testing modal
  const [exemptModalOpen, setExemptModalOpen] = useState(false);
  const [batchToExempt, setBatchToExempt] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Enrich and group by batch
  const groupedBatches = useMemo(() => {
    const batched: Record<string, any> = {};

    schedules.forEach((s) => {
      const bId = s.batch_id;
      if (!batched[bId]) {
        batched[bId] = {
          batch: s.batch,
          analysis: s.batch?.analyses,
          schedules: []
        };
      }
      
      let status = s.status;
      if (s.status === "pendente" && s.data_prevista < today) {
        status = "atrasado" as ScheduleStatus;
      }
      batched[bId].schedules.push({ ...s, status });
    });

    return Object.values(batched);
  }, [schedules, today]);

  // All schedules flat (for stats)
  const allSchedules = useMemo(
    () => groupedBatches.flatMap((g) => g.schedules),
    [groupedBatches]
  );

  // Batch-level status
  const batchStatus = (schedules: any[], currentStatus: string) => {
    if (currentStatus === "aprovado_sem_ensaio") return "aprovado_sem_ensaio";
    if (currentStatus === "liberado_antecipado") return "liberado_antecipado";
    if (schedules.every((s) => s.status === "concluido" || s.status === "ignorado")) return "concluido";
    const atrasados = schedules.filter((s) => s.status === "atrasado");
    if (atrasados.length > 0) {
      const maxAtrasadoDias = Math.max(...atrasados.map((s) => s.idade_dias));
      const hasLaterConcluido = schedules.some(
        (s) => s.status === "concluido" && s.idade_dias > maxAtrasadoDias
      );
      if (!hasLaterConcluido) return "atrasado";
    }
    if (schedules.some((s) => s.status === "em_andamento" || s.status === "concluido")) return "em_andamento";
    return "pendente";
  };

  // Filter
  const filtered = useMemo(() => {
    return groupedBatches.filter((g) => {
      if (!isInDateRange(g.batch?.produced_at, dateFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchLote = g.batch?.batch_code?.toLowerCase().includes(q);
        const matchProduto = (g.analysis?.nome ?? "").toLowerCase().includes(q);
        if (!matchLote && !matchProduto) return false;
      }
      if (filterStatus !== "all") {
        const computed = batchStatus(g.schedules, g.batch?.status ?? "");
        if (computed !== filterStatus) return false;
      }
      return true;
    });
  }, [groupedBatches, search, filterStatus, dateFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: allSchedules.length,
    pendentes: allSchedules.filter((s) => s.status === "pendente").length,
    atrasados: allSchedules.filter((s) => s.status === "atrasado").length,
    concluidos: allSchedules.filter((s) => s.status === "concluido").length,
  }), [allSchedules]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleReleaseSubmit = async () => {
    if (!batchToRelease || !releaseReason || !releaseAnalyst) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    try {
      await releaseEarly({
        batchId: batchToRelease,
        motivo: `${releaseAnalyst}: ${releaseReason}`
      });
      
      toast.success("Lote liberado antecipadamente com sucesso!");
      setReleaseModalOpen(false);
      setBatchToRelease(null);
      setReleaseReason("");
      setReleaseAnalyst("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao liberar lote");
    }
  };

  const handleExemptSubmit = async () => {
    if (!batchToExempt) return;
    try {
      await exemptFromTesting({ batchId: batchToExempt });
      toast.success("Produto aprovado sem ensaio.");
      setExemptModalOpen(false);
      setBatchToExempt(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao isentar de ensaio");
    }
  };

  const batchReleasingObj = useMemo(() => {
    if (!batchToRelease) return null;
    return (groupedBatches as any[]).find(g => (g.batch as any).id === batchToRelease);
  }, [batchToRelease, groupedBatches]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rompimentos</h1>
        <p className="text-sm text-muted-foreground">Cronograma e ensaios de rompimento</p>
      </div>

      {/* Stats */}
      {(allSchedules.length > 0 || isLoadingSchedules) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {isLoadingSchedules ? "..." : stats.total}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.atrasados}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.concluidos}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por lote ou produto..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="aprovado_sem_ensaio">Aprovado</SelectItem>
                <SelectItem value="liberado_antecipado">Aprovado Antecipado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
              {filtered.length} lote{filtered.length !== 1 ? "s" : ""} — {formatPeriodLabel(dateFilter)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {groupedBatches.length === 0
                  ? "Nenhum rompimento agendado"
                  : "Nenhum resultado encontrado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {groupedBatches.length === 0
                  ? "Quando um lote de produção for registrado, os rompimentos aparecerão aqui."
                  : "Tente ajustar os filtros."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ANÁLISE / TRAÇO</TableHead>
                  <TableHead>LOTE</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rompimentos</TableHead>
                  <TableHead>Data Produção</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ batch, analysis, schedules }) => {
                  const overallStatus = batchStatus(schedules, batch.status);
                  // Sort schedules by idade_dias
                  const sorted = [...schedules].sort((a, b) => a.idade_dias - b.idade_dias);

                  const canReleaseEarly = overallStatus === "pendente" || overallStatus === "em_andamento" || overallStatus === "atrasado";

                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">{analysis?.codigo ?? ""}</p>
                            <p className="font-medium text-foreground">
                              {analysis?.produto ?? analysis?.nome ?? "—"}
                            </p>
                            {analysis?.tipo && (
                              <p className="text-xs text-muted-foreground">
                                {TIPOS_ANALISE.find(t => t.value === analysis.tipo)?.label ?? analysis.tipo}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{batch.batch_code}</TableCell>
                      <TableCell>
                        <StatusBadge status={overallStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sorted.map((s) => {
                            const isDueToday = s.status === "pendente" && s.data_prevista === today;
                            const chipColor = isDueToday ? dueTodayColor : statusColor[s.status];
                            const statusLabel = isDueToday ? "hoje" : s.status;
                            return (
                              <button
                                  key={s.id}
                                  disabled={s.status === 'ignorado'}
                                  onClick={() => {
                                    if (s.status === 'ignorado') return;
                                    if (s.status === 'concluido' || canCompleteRupture) {
                                      navigate(`/ruptures/${s.id}`);
                                    } else {
                                      toast.error("Você não tem permissão para realizar rompimentos.");
                                    }
                                  }}
                                  className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors ${chipColor} ${s.status !== 'ignorado' && (canCompleteRupture || s.status === 'concluido') ? 'cursor-pointer' : 'cursor-default'}`}
                                  title={canCompleteRupture || s.status === 'concluido' ? `${s.idade_dias}d — ${statusLabel} — ${formatDate(s.data_prevista)}` : "Visualização restrita"}
                                >
                                  {s.idade_dias}d
                                </button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(batch.produced_at.split("T")[0])}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-1">
                          {canReleaseEarlyPermission && canReleaseEarly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isExempting}
                              onClick={() => {
                                setBatchToExempt((batch as any).id);
                                setExemptModalOpen(true);
                              }}
                              className="text-success hover:text-success hover:bg-success/10 gap-2 font-bold"
                              title="Aprovar sem ensaio"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {isExempting ? "..." : "Isentar"}
                            </Button>
                          )}
                          {canReleaseEarlyPermission && canReleaseEarly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isReleasing}
                              onClick={() => {
                                setBatchToRelease((batch as any).id);
                                setReleaseModalOpen(true);
                              }}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-2 font-bold"
                              title="Liberar Lote Antecipadamente"
                            >
                              <Unlock className="h-4 w-4" />
                              {isReleasing ? "..." : "Liberar"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const target = [...sorted].reverse().find(s => s.status === 'concluido') ?? sorted[0];
                              navigate(`/ruptures/${target.id}`);
                            }}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Isentar de Ensaio */}
      <Dialog open={exemptModalOpen} onOpenChange={setExemptModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" /> Isentar de Ensaio
            </DialogTitle>
            <DialogDescription>
              Confirma que este produto não requer ensaio de rompimento?
              Todos os agendamentos serão cancelados e o lote ficará com status <strong>Aprovado</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setExemptModalOpen(false); setBatchToExempt(null); }}>
              Cancelar
            </Button>
            <Button
              disabled={isExempting}
              className="bg-success hover:bg-success/90 text-white"
              onClick={handleExemptSubmit}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {isExempting ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Liberação Antecipada */}
      <Dialog open={releaseModalOpen} onOpenChange={setReleaseModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Unlock className="h-5 w-5" /> Liberar Lote Antecipadamente
            </DialogTitle>
            <DialogDescription>
              Você está prestes a aprovar e liberar este traço para produção antes de concluir o ciclo de cura de 28 dias.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-3 mt-2">
             <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
             <div className="text-sm text-amber-800">
               <p className="font-bold">Atenção: Ação Técnica Irreversível</p>
               <p className="mt-1 leading-snug">
                 Ao confirmar, os ensaios futuros serão ignorados e este lote constará como <strong>aprovado com ressalva</strong> em todos os relatórios oficiais.
               </p>
             </div>
          </div>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lote</Label>
                <p className="text-sm font-black">{batchReleasingObj?.batch.batch_code}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Produto / Análise</Label>
                <p className="text-sm font-semibold">{batchReleasingObj?.analysis?.nome || "—"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aprovação por (Responsável) *</Label>
              <Input
                value={releaseAnalyst}
                onChange={(e) => setReleaseAnalyst(e.target.value)}
                placeholder="Nome do responsável pela aprovação"
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo Técnico da Liberação *</Label>
              <Textarea 
                placeholder="Ex: Cura a vapor acelerada obteve 110% do fck esperado no 3º dia de ensaio. Aprovado o fluxo." 
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseModalOpen(false)} disabled={isReleasing}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleReleaseSubmit} disabled={isReleasing}>
              {isReleasing ? "Liberando..." : "Confirmar Liberação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RupturesPage;
