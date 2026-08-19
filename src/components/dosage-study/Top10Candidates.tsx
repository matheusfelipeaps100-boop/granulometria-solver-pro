import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relacaoAC, kgCimentoPorM3, custoPorM3, type WetCastExperiment } from "@/lib/wet-cast-optimizer";
import { Save } from "lucide-react";

interface Props {
  candidatos: WetCastExperiment[]; // já ordenados por score (melhor primeiro)
  custoCimentoTon: number;
  custoAditivoLt: number;
  onSalvar?: (candidato: WetCastExperiment) => void;
  salvando?: boolean;
}

/**
 * Top 10 candidatos gerados — nunca rotulados como "traço ideal", só como
 * estimativa a confirmar por ensaio real (ver confianca_estimativa/status).
 */
export function Top10Candidates({ candidatos, custoCimentoTon, custoAditivoLt, onSalvar, salvando }: Props) {
  const top10 = candidatos.slice(0, 10);

  if (top10.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhum candidato gerado ainda. Clique em "Gerar Candidatos" acima.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-black uppercase">#</TableHead>
            <TableHead className="text-xs font-black uppercase">Código</TableHead>
            <TableHead className="text-right text-xs font-black uppercase">Cimento (kg/m³)</TableHead>
            <TableHead className="text-right text-xs font-black uppercase">a/c</TableHead>
            <TableHead className="text-right text-xs font-black uppercase">Resist. Estimada (24h)</TableHead>
            <TableHead className="text-right text-xs font-black uppercase">Custo/m³</TableHead>
            <TableHead className="text-right text-xs font-black uppercase">Score</TableHead>
            {onSalvar && <TableHead className="text-right text-xs font-black uppercase">Ação</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {top10.map((c, i) => (
            <TableRow key={c.codigo}>
              <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
              <TableCell className="text-right font-bold">{kgCimentoPorM3(c).toFixed(0)}</TableCell>
              <TableCell className="text-right">{relacaoAC(c).toFixed(3)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="font-bold">{(c.resistencia_estimada_mpa ?? 0).toFixed(1)} MPa</span>
                  <span className="text-[9px] uppercase text-amber-700">estimada — não validada</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-bold">R$ {custoPorM3(c, custoCimentoTon, custoAditivoLt).toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{(c.score ?? 0).toFixed(1)}</TableCell>
              {onSalvar && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {c.extrapolacao && (
                      <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300">extrapola</Badge>
                    )}
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" disabled={salvando} onClick={() => onSalvar(c)}>
                      <Save className="h-3 w-3" /> Salvar
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
