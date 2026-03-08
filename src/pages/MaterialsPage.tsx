import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const mockMaterials = [
  { nome: "Areia de Cava BMW", tipo: "areia_fina", fornecedor: "BMW", mf: "2,699", ativo: true },
  { nome: "Pó de Pedra Britasul", tipo: "po_pedra", fornecedor: "Britasul", mf: "2,721", ativo: true },
  { nome: "Brita Britasul", tipo: "brita", fornecedor: "Britasul", mf: "6,559", ativo: true },
  { nome: "Areia de Rio Rafael", tipo: "areia_grossa", fornecedor: "Rafael", mf: "2,905", ativo: true },
  { nome: "Pó de Pedra 1 Rafael", tipo: "po_pedra", fornecedor: "Rafael", mf: "3,178", ativo: true },
  { nome: "Granilha 01 Duro", tipo: "granilha", fornecedor: "Duro", mf: "4,723", ativo: true },
  { nome: "Granilha 02 Duro", tipo: "granilha", fornecedor: "Duro", mf: "5,017", ativo: true },
  { nome: "Pó de Pedra Fino Duro", tipo: "po_pedra", fornecedor: "Duro", mf: "1,840", ativo: true },
  { nome: "Brita 00 Duro", tipo: "brita", fornecedor: "Duro", mf: "7,068", ativo: true },
];

const MaterialsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materiais</h1>
          <p className="text-sm text-muted-foreground">Cadastro de materiais e curvas granulométricas</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Material
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar material..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>MF</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMaterials.map((m) => (
                <TableRow key={m.nome} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{m.nome}</TableCell>
                  <TableCell className="capitalize">{m.tipo.replace("_", " ")}</TableCell>
                  <TableCell>{m.fornecedor}</TableCell>
                  <TableCell className="font-mono">{m.mf}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.ativo ? "aprovado" : "arquivado"} />
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

export default MaterialsPage;
