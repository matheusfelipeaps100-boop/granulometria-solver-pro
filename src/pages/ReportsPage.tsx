import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Search, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const mockReports = [
  { tipo: "Final", lote: "LOTE-2026-001", produto: "Bloco Estrutural", data: "08/03/2026", status: "aprovado" as const },
  { tipo: "Final", lote: "LOTE-2026-002", produto: "Paver H8", data: "06/03/2026", status: "aprovado_com_ressalva" as const },
  { tipo: "Traço", lote: "ANL-2026-012", produto: "Paver H8 35MPa", data: "07/03/2026", status: "aprovado" as const },
];

const ReportsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Relatórios de controle tecnológico</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar relatório..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Lote / Análise</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReports.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.tipo}</TableCell>
                  <TableCell className="font-mono text-sm">{r.lote}</TableCell>
                  <TableCell>{r.produto}</TableCell>
                  <TableCell>{r.data}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
