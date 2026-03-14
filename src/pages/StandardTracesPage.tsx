import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/useAppStore";
import { hasActionPermission } from "@/lib/permissions";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

const mockTraces = [
  { nome: "DNA Bloco Estrutural 14x19x39 4MPa", tipo: "bloco_estrutural", resistencia: "4,0 MPa", mf: "3,483", ativo: true },
  { nome: "DNA Bloco Vedação 14x19x39 3MPa", tipo: "bloco_vedacao", resistencia: "3,0 MPa", mf: "3,712", ativo: true },
  { nome: "DNA Paver H8 35MPa", tipo: "paver", resistencia: "35,0 MPa", mf: "3,198", ativo: true },
  { nome: "DNA Bloco Estrutural Ótimo", tipo: "bloco_estrutural", resistencia: "4,0 MPa", mf: "3,227", ativo: true },
];

const StandardTracesPage = () => {
  const currentUserRole = useAppStore((s) => s.currentUserRole);
  const standardTraces = useAppStore((s) => s.standardTraces);
  
  const canCreate = hasActionPermission(currentUserRole, "material:create");

  // Combine mock traces with saved traces
  const allTraces = [
    ...mockTraces,
    ...standardTraces.map(t => ({
      nome: t.nome,
      tipo: t.tipo_produto,
      resistencia: `${t.resistencia_alvo} MPa`,
      mf: "—", // MF can be calculated later
      ativo: true,
      isSaved: true,
    }))
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Traços Padrão</h1>
          <p className="text-sm text-muted-foreground">DNAs e curvas de referência</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Traço Padrão
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar traço..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo Produto</TableHead>
                <TableHead>Resistência Alvo</TableHead>
                <TableHead>MF</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTraces.map((t, index) => (
                <TableRow key={`${t.nome}-${index}`} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {t.nome}
                    {'isSaved' in t && t.isSaved && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Novo</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{t.tipo.replace("_", " ")}</TableCell>
                  <TableCell className="font-mono">{t.resistencia}</TableCell>
                  <TableCell className="font-mono">{t.mf}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.ativo ? "aprovado" : "arquivado"} />
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

export default StandardTracesPage;
