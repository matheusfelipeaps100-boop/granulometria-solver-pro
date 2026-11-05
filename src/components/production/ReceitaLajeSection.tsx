import { useMemo, useState } from "react";
import { Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProduction, type DBProductionBatch, type ReceitaRealItem } from "@/hooks/api/useProduction";
import { useMaterials } from "@/hooks/api/useMaterials";
import type { StoredAnalysis } from "@/hooks/api/useAnalyses";
import { getConfigMisturador } from "@/lib/analysis-data";
import { buildReceitaLaje, fmtReceita as fmt, massaTraco, parseNumReceita as parseNum } from "@/lib/receita-laje";

interface Props {
  analysis: StoredAnalysis;
  batch: DBProductionBatch;
  canEdit: boolean;
}

/** Receita de 1 traço + receita real da pista, nos detalhes do lote de laje. */
export function ReceitaLajeSection({ analysis, batch, canEdit }: Props) {
  const { updateBatchReceitaReal, isUpdatingReceitaReal } = useProduction();
  const { materials: dbMaterials } = useMaterials();
  const [editing, setEditing] = useState(false);
  const [numTracos, setNumTracos] = useState("1");
  const [reais, setReais] = useState<Record<string, string>>({});

  const receita = useMemo(() => {
    const acoDb = dbMaterials.find((m) => m.id === analysis.formData.aco_material_id);
    return buildReceitaLaje(analysis.formData, acoDb);
  }, [analysis, dbMaterials]);

  const totalTraco = massaTraco(receita, (i) => i.previsto);
  const capacidade = getConfigMisturador(analysis.tipo ?? "laje").capacidade_kg;
  const salva = batch.receita_real && batch.receita_real.length > 0 ? batch.receita_real : null;

  const nTracos = Math.max(1, Math.floor(Number(numTracos) || 1));
  const linhas = useMemo(
    () =>
      receita.map((i) => {
        const previsto = i.previsto * nTracos;
        const real = parseNum(reais[i.key] ?? "");
        return {
          ...i,
          previsto,
          real,
          dif: real != null ? real - previsto : null,
          custo: real != null && i.custoUnit > 0 ? real * i.custoUnit : null,
        };
      }),
    [receita, nTracos, reais]
  );
  const temReal = linhas.some((i) => i.real != null);
  const totalPrevisto = massaTraco(linhas, (i) => i.previsto);
  const totalInformado = massaTraco(linhas, (i) => i.real ?? i.previsto);
  const custoTotal = linhas.reduce((s, i) => s + (i.custo ?? 0), 0);

  const startEdit = () => {
    const n = batch.num_tracos ?? 1;
    setNumTracos(String(n));
    // Preenche com o que já foi salvo (casando pelo nome do material)
    const inicial: Record<string, string> = {};
    for (const i of receita) {
      const salvo = salva?.find((r) => r.material === i.material);
      if (salvo?.real != null) inicial[i.key] = String(salvo.real);
    }
    setReais(inicial);
    setEditing(true);
  };

  const save = async () => {
    try {
      await updateBatchReceitaReal({
        id: batch.id,
        num_tracos: nTracos,
        receita_real: temReal || nTracos > 1
          ? linhas.map<ReceitaRealItem>((i) => ({
              material: i.material,
              unidade: i.unidade,
              previsto: Math.round(i.previsto * 100) / 100,
              real: i.real,
              custo: i.custo != null ? Math.round(i.custo * 100) / 100 : null,
            }))
          : null,
      });
      toast.success("Receita real atualizada com sucesso!");
      setEditing(false);
    } catch (err: any) {
      toast.error("Erro ao salvar a receita real", { description: err?.message });
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Receita Utilizada</h4>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={startEdit}>
            <Pencil className="h-3 w-3" />
            {salva ? "Editar receita real" : "Informar receita real"}
          </Button>
        )}
      </div>

      {/* Receita prevista de 1 traço */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left py-1.5 px-3 font-black uppercase">Material</th>
              <th className="text-right py-1.5 px-3 font-black uppercase">Qtd. por traço</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {receita.map((i) => (
              <tr key={i.key} className={i.key === "agua" ? "bg-blue-50/30 dark:bg-blue-950/20" : undefined}>
                <td className={
                  i.key === "agua"
                    ? "py-1.5 px-3 font-bold text-blue-600 dark:text-blue-400"
                    : i.destaque ? "py-1.5 px-3 font-bold" : "py-1.5 px-3 text-muted-foreground"
                }>
                  {i.material}
                </td>
                <td className="py-1.5 px-3 text-right font-bold">
                  {fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}{" "}
                  <span className="text-[10px] text-muted-foreground">{i.unidade}</span>
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-black">
              <td className="py-2 px-3 uppercase">Total do traço</td>
              <td className="py-2 px-3 text-right text-sm">{fmt(totalTraco)} kg</td>
            </tr>
          </tbody>
        </table>
      </div>
      {totalTraco > capacidade && (
        <p className="text-[10px] text-destructive font-bold">
          ⚠️ ATENÇÃO: massa de 1 traço excede a capacidade de {capacidade} kg do misturador!
        </p>
      )}

      {/* Edição da receita real */}
      {editing && (
        <div className="space-y-2 rounded-lg border border-primary p-3">
          <div className="flex items-end justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Informe a soma de todos os traços da pista. Os números em cinza são o previsto; deixe em branco o que não quiser informar.
            </p>
            <div className="space-y-1 shrink-0">
              <Label htmlFor="view-num-tracos" className="text-[10px] font-bold text-muted-foreground uppercase">Nº de traços</Label>
              <Input
                id="view-num-tracos"
                type="number"
                min="1"
                step="1"
                value={numTracos}
                onChange={(e) => setNumTracos(e.target.value)}
                className="w-20 h-8 text-right"
                disabled={isUpdatingReceitaReal}
              />
            </div>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left py-1.5 px-2 font-black uppercase">Material</th>
                  <th className="text-right py-1.5 px-2 font-black uppercase">Previsto</th>
                  <th className="text-right py-1.5 px-2 font-black uppercase">Real</th>
                  <th className="text-right py-1.5 px-2 font-black uppercase">Dif.</th>
                  <th className="text-right py-1.5 px-2 font-black uppercase">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {linhas.map((i) => (
                  <tr key={i.key}>
                    <td className={i.destaque ? "py-1 px-2 font-bold" : "py-1 px-2 text-muted-foreground"}>{i.material}</td>
                    <td className="py-1 px-2 text-right whitespace-nowrap">
                      {fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}{" "}
                      <span className="text-[10px] text-muted-foreground">{i.unidade}</span>
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={reais[i.key] ?? ""}
                          placeholder={fmt(i.previsto, i.unidade === "mL" ? 1 : 2)}
                          onChange={(e) => setReais((r) => ({ ...r, [i.key]: e.target.value }))}
                          className="w-20 h-7 text-xs text-right placeholder:text-muted-foreground/50"
                          disabled={isUpdatingReceitaReal}
                        />
                        <span className="inline-block w-5 text-[10px] text-muted-foreground">{i.unidade}</span>
                      </div>
                    </td>
                    <td className={
                      i.dif == null || Math.abs(i.dif) < 0.005
                        ? "py-1 px-2 text-right text-muted-foreground"
                        : i.dif > 0 ? "py-1 px-2 text-right font-bold text-destructive" : "py-1 px-2 text-right font-bold text-blue-600"
                    }>
                      {i.dif == null ? "—" : `${i.dif > 0 ? "+" : ""}${fmt(i.dif)}`}
                    </td>
                    <td className="py-1 px-2 text-right whitespace-nowrap">
                      {i.custo == null ? <span className="text-muted-foreground">—</span> : `R$ ${fmt(i.custo)}`}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-black">
                  <td className="py-2 px-2 uppercase">Total da mistura</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">{fmt(totalPrevisto)} kg</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">{temReal ? `${fmt(totalInformado)} kg` : "—"}</td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    {temReal ? `${totalInformado - totalPrevisto > 0 ? "+" : ""}${fmt(totalInformado - totalPrevisto)}` : "—"}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">{custoTotal > 0 ? `R$ ${fmt(custoTotal)}` : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isUpdatingReceitaReal}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={isUpdatingReceitaReal} className="gap-1">
              <Check className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Receita real já salva */}
      {!editing && salva && (
        <div className="space-y-2">
          <h4 className="font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">
            Receita Real Utilizada
            <span className="normal-case tracking-normal font-medium"> · {batch.num_tracos ?? 1} traço(s)</span>
          </h4>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left py-1 px-3 font-bold">Material</th>
                  <th className="text-right py-1 px-3 font-bold">Previsto</th>
                  <th className="text-right py-1 px-3 font-bold">Real</th>
                  <th className="text-right py-1 px-3 font-bold">Dif.</th>
                  <th className="text-right py-1 px-3 font-bold">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salva.map((i) => {
                  const casas = i.unidade === "mL" ? 1 : 2;
                  const dif = i.real != null ? i.real - i.previsto : null;
                  return (
                    <tr key={i.material}>
                      <td className="py-1 px-3">{i.material}</td>
                      <td className="py-1 px-3 text-right text-muted-foreground whitespace-nowrap">{fmt(i.previsto, casas)} {i.unidade}</td>
                      <td className="py-1 px-3 text-right font-bold whitespace-nowrap">{i.real != null ? `${fmt(i.real, casas)} ${i.unidade}` : "—"}</td>
                      <td className={
                        dif == null || Math.abs(dif) < 0.005
                          ? "py-1 px-3 text-right text-muted-foreground"
                          : dif > 0 ? "py-1 px-3 text-right font-bold text-destructive" : "py-1 px-3 text-right font-bold text-blue-600"
                      }>
                        {dif == null ? "—" : `${dif > 0 ? "+" : ""}${fmt(dif, casas)}`}
                      </td>
                      <td className="py-1 px-3 text-right whitespace-nowrap">
                        {i.custo != null ? `R$ ${fmt(i.custo)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {salva.some((i) => i.custo != null) && (
                  <tr className="bg-muted/30 font-black">
                    <td className="py-1.5 px-3 uppercase" colSpan={4}>Custo total</td>
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      R$ {fmt(salva.reduce((s, i) => s + (i.custo ?? 0), 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!editing && !salva && (
        <p className="text-[11px] text-muted-foreground">Receita real não informada para este lote.</p>
      )}
    </div>
  );
}
