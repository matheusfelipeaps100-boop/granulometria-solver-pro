import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layers, Info } from "lucide-react";
import { useSieves } from "@/hooks/api/useSieves";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SievesTab() {
  const { sieves, isLoading } = useSieves();

  return (
    <Card className="shadow-sm mt-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Especificações de Peneiras (ABNT NBR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground w-full md:w-3/4">
          Conjunto de peneiras homologadas pelo sistema no banco de dados central para os ensaios granulométricos. A série Normal é a principal exigência da norma para o cálculo do Módulo de Finura (MF), enquanto as peneiras Intermediárias ajudam no detalhamento da curva.  
        </p>

        <Alert className="bg-primary/5 text-primary border-primary/20 max-w-4xl">
          <Info className="h-4 w-4 shrink-0" />
          <AlertDescription>
            Como o Granulometria Solver Pro roda em nuvem, as aberturas nominais das peneiras seguem os padrões globais da ABNT. Estas peneiras já estão salvas automaticamente no servidor (read-only).
          </AlertDescription>
        </Alert>

        <div className="rounded-md border mt-6 overflow-hidden overflow-x-auto max-w-4xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold w-[120px] text-center">Nº Ordem</TableHead>
                <TableHead className="font-bold">Abertura Nominal (mm)</TableHead>
                <TableHead className="font-bold">Nome da Peneira</TableHead>
                <TableHead className="font-bold">Série Nominal (MF)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span>Carregando peneiras do servidor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sieves.map((sieve) => (
                  <TableRow key={sieve.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {sieve.ordem}
                    </TableCell>
                    <TableCell className="font-mono font-medium py-3">
                      {sieve.abertura_mm} mm
                    </TableCell>
                    <TableCell className="py-3">
                      {sieve.nome}
                    </TableCell>
                    <TableCell className="py-3">
                      {sieve.usa_no_mf ? (
                        <span className="font-bold text-primary text-xs uppercase tracking-wider">Normal</span>
                      ) : (
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Intermediária</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
              
              {!isLoading && sieves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhuma peneira carregada. Entre em contato com o suporte.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
