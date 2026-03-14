import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Search, FileText, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "react-router-dom";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

const ReportsPage = () => {
  const batches = useAppStore((s) => s.batches);
  const analyses = useAppStore((s) => s.analyses);
  const navigate = useNavigate();

  const reportItems = batches.map((b) => {
    const analysis = analyses.find((a) => a.id === b.analysis_id);
    const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis?.tipo_analise)?.label || analysis?.tipo_analise || "—";
    
    return {
      id: b.id,
      tipo: "Controle Tecnológico",
      lote: b.batch_code,
      produto: tipoLabel,
      data: b.produced_at.split("T")[0].split("-").reverse().join("/"),
      status: b.status,
    };
  }).sort((a, b) => b.lote.localeCompare(a.lote));

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
