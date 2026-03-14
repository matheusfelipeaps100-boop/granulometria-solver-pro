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
import { useAppStore, type StoredAnalysis, type ProductionBatch } from "@/store/useAppStore";
import { hasActionPermission } from "@/lib/permissions";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

const ProductionPage = () => {
  const currentUserRole = useAppStore((s) => s.currentUserRole);
  const analyses = useAppStore((s) => s.analyses);
  const batches = useAppStore((s) => s.batches);
  const releasedAnalyses = analyses.filter((a) => a.status === "liberado_producao");

  const canRegister = hasActionPermission(currentUserRole, "batch:create");

  const [viewAnalysis, setViewAnalysis] = useState<StoredAnalysis | null>(null);
  const [registerAnalysis, setRegisterAnalysis] = useState<StoredAnalysis | null>(null);

  const handleExportPDF = (analysis: StoredAnalysis) => {
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
                {releasedAnalyses.map((analysis) => {
                  const batch = getBatchForAnalysis(analysis.id);
                  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo_analise)?.label ?? "—";
                  return (
                    <TableRow key={analysis.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-mono">{analysis.codigo}</p>
                            <p className="font-medium text-foreground">{analysis.nome}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{tipoLabel}</TableCell>
                      <TableCell>
                        {batch ? (
                          <StatusBadge status={batch.status} />
                        ) : (
                          <StatusBadge status="liberado_producao" />
                        )}
                      </TableCell>
                      <TableCell>
                        {batch ? (
                          <span className="font-mono text-sm">{batch.batch_code}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {batch ? (
                          <div className="flex gap-1">
                            {batch.rupture_schedules.map((s) => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {s.idade_dias}d
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setViewAnalysis(analysis)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!batch && canRegister && (
                            <Button variant="ghost" size="icon" title="Registrar Produção" onClick={() => setRegisterAnalysis(analysis)}>
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" title="Exportar PDF" onClick={() => handleExportPDF(analysis)}>
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
