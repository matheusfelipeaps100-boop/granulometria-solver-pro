import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Search, FileText, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProduction } from "@/hooks/api/useProduction";
import { useNavigate } from "react-router-dom";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

const ReportsPage = () => {
  const { batches, isLoadingBatches } = useProduction();
  const navigate = useNavigate();

  const reportItems = batches.map((b) => {
    const analysis = b.analyses;
    const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis?.tipo)?.label || analysis?.tipo || "—";
    
    return {
      id: b.id,
      tipo: "Controle Tecnológico",
      lote: b.batch_code,
      produto: tipoLabel,
      data: new Date(b.produced_at).toLocaleDateString("pt-BR"),
      status: b.status,
    };
  }).sort((a, b) => b.lote.localeCompare(a.lote));

  if (isLoadingBatches) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12 text-primary">
          <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Certificados de Qualidade e Controle Tecnológico</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por Lote ou Produto..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Lote de Produção</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Data Produção</TableHead>
                <TableHead>Status Lote</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportItems.length > 0 ? (
                reportItems.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/reports/batch/${r.id}`)}>
                    <TableCell className="font-medium flex items-center gap-2">
                       <FileText className="h-3 w-3 text-muted-foreground" />
                       {r.tipo}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">{r.lote}</TableCell>
                    <TableCell>{r.produto}</TableCell>
                    <TableCell>{r.data}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2">
                         Ver Certificado
                         <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                    Nenhum certificado de qualidade disponível para os lotes atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
