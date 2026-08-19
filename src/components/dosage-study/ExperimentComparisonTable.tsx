import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExperimentStatusBadge } from "./ExperimentStatusBadge";
import {
  relacaoAC,
  kgCimentoPorM3,
  calcularIndicadoresWetCast,
  META_RESISTENCIA_24H_MPA,
  type WetCastExperiment,
} from "@/lib/wet-cast-optimizer";
import { cn } from "@/lib/utils";

interface Props {
  experimentos: WetCastExperiment[]; // reais (EXPERIMENTO_REAL)
  custoCimentoTon: number;
  custoAditivoLt: number;
}

/**
 * Compara os experimentos reais (A/B/...) lado a lado — nunca escolhe um
 * como "vencedor" automaticamente, só mostra os indicadores.
 */
export function ExperimentComparisonTable({ experimentos, custoCimentoTon, custoAditivoLt }: Props) {
  if (experimentos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Nenhum experimento real cadastrado ainda.
      </p>
    );
  }

  const [ref1, ref2] = experimentos;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-black uppercase">Indicador</TableHead>
            {experimentos.map((e) => (
              <TableHead key={e.codigo} className="text-right text-xs font-black uppercase">
                {e.codigo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground">Status</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right">
                <ExperimentStatusBadge status={e.status} />
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Cimento (kg/bat.)</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right font-bold">{e.cimento_kg.toFixed(0)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Água (L/bat.)</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right font-bold">{e.agua_kg.toFixed(0)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Aditivo (kg/bat.)</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right font-bold">{e.aditivo_kg.toFixed(3)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Relação a/c</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right font-bold">{relacaoAC(e).toFixed(3)}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Cimento (kg/m³)</TableCell>
            {experimentos.map((e) => (
              <TableCell key={e.codigo} className="text-right font-bold">{kgCimentoPorM3(e).toFixed(0)}</TableCell>
            ))}
          </TableRow>
          {experimentos.map((e) => e.materiais).flat().length > 0 &&
            experimentos[0].materiais.length > 0 &&
            Array.from(new Set(experimentos.flatMap((e) => e.materiais.map((m) => m.material_id)))).map((materialId) => {
              const nome = experimentos.flatMap((e) => e.materiais).find((m) => m.material_id === materialId)?.nome ?? materialId;
              return (
                <TableRow key={materialId}>
                  <TableCell className="text-muted-foreground pl-4">{nome} (kg/bat.)</TableCell>
                  {experimentos.map((e) => {
                    const mat = e.materiais.find((m) => m.material_id === materialId);
                    return (
                      <TableCell key={e.codigo} className="text-right">
                        {mat ? mat.proporcao_kg.toFixed(0) : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          <TableRow className="border-t-2">
            <TableCell className="text-muted-foreground font-bold">
              Resistência real 24h (MPa)
            </TableCell>
            {experimentos.map((e) => (
              <TableCell
                key={e.codigo}
                className={cn(
                  "text-right font-black",
                  (e.resultado_resistencia_mpa ?? 0) >= META_RESISTENCIA_24H_MPA ? "text-emerald-700" : "text-destructive"
                )}
              >
                {e.resultado_resistencia_mpa != null ? e.resultado_resistencia_mpa.toFixed(1) : "—"}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Custo/m³ (R$)</TableCell>
            {experimentos.map((e) => {
              const ind = calcularIndicadoresWetCast(e, custoCimentoTon, custoAditivoLt, ref1, ref2);
              return (
                <TableCell key={e.codigo} className="text-right font-bold">
                  R$ {ind.custoM3.toFixed(2)}
                </TableCell>
              );
            })}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Custo por MPa (24h)</TableCell>
            {experimentos.map((e) => {
              const ind = calcularIndicadoresWetCast(e, custoCimentoTon, custoAditivoLt, ref1, ref2);
              return (
                <TableCell key={e.codigo} className="text-right font-bold">
                  {ind.custoPorMpa24h != null ? `R$ ${ind.custoPorMpa24h.toFixed(2)}` : "—"}
                </TableCell>
              );
            })}
          </TableRow>
          {!experimentos.every((e) => e.usar_na_calibragem !== false) && (
            <TableRow>
              <TableCell className="text-muted-foreground">Uso na calibragem</TableCell>
              {experimentos.map((e) => (
                <TableCell key={e.codigo} className="text-right text-[11px]">
                  {e.usar_na_calibragem === false ? (
                    <span className="text-amber-700" title={e.motivo_exclusao_calibragem}>
                      Excluído (causa conhecida)
                    </span>
                  ) : (
                    "Incluído"
                  )}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
