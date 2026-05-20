import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye, ClipboardList, FileEdit, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { ViewProductionModal } from "@/components/production/ViewProductionModal";
import { RegisterProductionModal } from "@/components/production/RegisterProductionModal";
import { useAuth } from "@/hooks/useAuth";
import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useProduction, type DBProductionBatch } from "@/hooks/api/useProduction";
import { hasActionPermission } from "@/lib/permissions";
import { TIPOS_ANALISE } from "@/lib/analysis-data";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";

const ProductionPage = () => {
  const { profile } = useAuth();
  const { analyses } = useAnalyses();
  const { batches } = useProduction();
  // Filtros
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const releasedAnalyses = analyses.filter((a) => a.status === "liberado_producao");

  // Opções de status possíveis
  const statusOptions = [
    { value: "", label: "Todos" },
    { value: "aguardando_rompimentos", label: "Aguardando Rompimentos" },
    { value: "aprovado", label: "Aprovado" },
    { value: "aprovado_antecipado", label: "Aprovado Antecipado" },
    { value: "reprovado", label: "Reprovado" },
    { value: "liberado_producao", label: "Liberado Produção" },
  ];

  // Filtragem dos lotes
  const filteredBatches = batches.filter((batch) => {
    const matchesBatch = batchFilter ? batch.batch_code?.toLowerCase().includes(batchFilter.toLowerCase()) : true;
    const matchesStatus = statusFilter ? batch.status === statusFilter : true;
    return matchesBatch && matchesStatus;
  });

  const canRegister = profile ? hasActionPermission(profile.role, "batch:create") : false;

  const [viewAnalysis, setViewAnalysis] = useState<StoredAnalysis | null>(null);
  const [registerAnalysis, setRegisterAnalysis] = useState<StoredAnalysis | null>(null);

  const handleExportPDF = (analysis: any) => {
    toast.success("PDF exportado com sucesso!", {
      description: `Relatório de produção ${analysis.codigo} baixado`,
    });
  };

  const getBatchForAnalysis = (analysisId: string) => batches.find((b) => b.analysis_id === analysisId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Produção</h1>
            <p className="text-sm text-muted-foreground">Análises liberadas para produção e lotes registrados.</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast.info("Lista atualizada")}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1">Filtrar por Lote</label>
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm w-40"
            placeholder="Buscar lote..."
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Status</label>
          <select
            className="border rounded px-2 py-1 text-sm w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {releasedAnalyses.length === 0 && batches.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma análise liberada</h3>
            <p className="text-sm text-muted-foreground">
              Quando uma análise for aprovada e liberada para produção no wizard, ela aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">ANÁLISE / TRAÇO</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>LOTE</TableHead>
                  <TableHead>ROMPIMENTOS</TableHead>
                  <TableHead className="text-right pr-6">AÇÃO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Análises liberadas aguardando registro de lote */}
                {releasedAnalyses
                  .filter((a) => !batches.some((b) => b.analysis_id === a.id))
                  .map((analysis) => {
                    const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo)?.label ?? "—";
                    return (
                      <TableRow key={`pending-${analysis.id}`} className="bg-primary/5 border-l-4 border-l-primary">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-mono">{analysis.codigo}</p>
                              <p className="font-medium text-foreground">{analysis.nome}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{analysis.produto ?? tipoLabel}</div>
                          {analysis.produto && (
                            <div className="text-xs text-muted-foreground">{tipoLabel}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status="liberado_producao" />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground italic">Aguardando registro</span>
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="text-right pr-6">
                          {canRegister && (
                            <Button size="sm" className="gap-1 text-xs" onClick={() => setRegisterAnalysis(analysis)}>
                              <Calendar className="h-3 w-3" />
                              Registrar Lote
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {/* Lotes já registrados */}
                {filteredBatches.map((batch) => {
                  const analysis = analyses.find((a) => a.id === batch.analysis_id);
                  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis?.tipo)?.label ?? "—";
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">{analysis?.codigo ?? "—"}</p>
                            <p className="font-medium text-foreground">{analysis?.nome ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{analysis?.produto ?? tipoLabel}</div>
                        {analysis?.produto && (
                          <div className="text-xs text-muted-foreground">{tipoLabel}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={batch.status} />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{batch.batch_code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {batch.rupture_schedules?.map((s) => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              {s.idade_dias}d
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setViewAnalysis(analysis)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Exportar PDF" onClick={() => handleExportPDF(analysis)}>
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {releasedAnalyses.length === 0 && filteredBatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lote encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl bg-foreground/90 p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
          <span className="text-background text-lg">!</span>
        </div>
        <div>
          <p className="font-semibold text-background">Dica Operacional</p>
          <p className="text-sm text-muted/80">
            Análises liberadas aparecem aqui automaticamente. Clique em registrar para criar o lote e agendar os 4 rompimentos (1, 3, 7 e 28 dias).
          </p>
        </div>
      </div>

      {/* Modals */}
      {viewAnalysis && (
        <ViewProductionModal
          open={!!viewAnalysis}
          onOpenChange={(o) => !o && setViewAnalysis(null)}
          analysis={viewAnalysis}
          batch={getBatchForAnalysis(viewAnalysis.id) ?? null}
        />
      )}
      <RegisterProductionModal
        open={!!registerAnalysis}
        onOpenChange={(o) => !o && setRegisterAnalysis(null)}
        analysis={registerAnalysis}
      />
    </div>
  );
};

export default ProductionPage;
