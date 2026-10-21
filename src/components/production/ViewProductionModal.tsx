import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { TIPOS_ANALISE, formatIdadeRompimento } from "@/lib/analysis-data";
import type { StoredAnalysis, ProductionBatch } from "@/store/useAppStore";
import type { DBProductionBatch } from "@/hooks/api/useProduction";
import { useMemo, useState } from "react";
import { useProduction } from "@/hooks/api/useProduction";
import { useTechnicalSettings } from "@/hooks/api/useTechnicalSettings";
import { useAuth } from "@/hooks/useAuth";
import { hasActionPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ViewRuptureResultModal } from "../rupture/ViewRuptureResultModal";

interface ViewProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: StoredAnalysis;
  batch: DBProductionBatch | null;
}

export function ViewProductionModal({ open, onOpenChange, analysis, batch }: ViewProductionModalProps) {
  const [selectedRupture, setSelectedRupture] = useState<any | null>(null);
  const [showRuptureResult, setShowRuptureResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const [isEditingPista, setIsEditingPista] = useState(false);
  const [editedPista, setEditedPista] = useState({ pista: "", fios: "3", comprimento: "", volume: "", perda: "" });
  const {
    deleteBatch, updateBatchCode, updateBatchDate, updateBatchPista,
    isDeleting, isUpdatingBatchCode, isUpdatingBatchDate, isUpdatingPista,
  } = useProduction();
  const { settings } = useTechnicalSettings();
  const { profile } = useAuth();
  const canEditBatchCode = profile?.role ? hasActionPermission(profile.role, "batch:edit_code") : false;
  // Quem registra o lote também corrige a concretagem da pista depois
  const canEditPista = profile?.role ? hasActionPermission(profile.role, "batch:create") : false;

  const handleSaveBatchDate = async () => {
    if (!batch || !editedDate) return;
    const newIso = new Date(editedDate).toISOString();
    if (newIso === new Date(batch.produced_at).toISOString()) {
      setIsEditingDate(false);
      return;
    }
    try {
      await updateBatchDate({ id: batch.id, produced_at: newIso });
      toast.success("Data de produção atualizada com sucesso!");
      setIsEditingDate(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar data de produção", { description: err?.message });
    }
  };

  const toNum = (v: string) => Number(v.replace(",", "."));

  // Mesma regra do registro do lote: % perda = metros de perda ÷ comprimento da pista
  const calcPerdaPct = (metros: number, comp: number) => {
    if (!(comp > 0)) return 0;
    return Math.min(100, Math.max(0, Math.round((metros / comp) * 10000) / 100));
  };
  const previewPerdaPct = calcPerdaPct(toNum(editedPista.perda) || 0, toNum(editedPista.comprimento) || 0);

  const startEditPista = () => {
    if (!batch) return;
    setEditedPista({
      pista: batch.pista ?? "",
      fios: String(batch.fios ?? 3),
      comprimento: batch.comprimento_pista_m != null ? String(batch.comprimento_pista_m) : "",
      volume: batch.volume_concreto_m3 != null ? String(batch.volume_concreto_m3) : "",
      perda: String(batch.metros_perda ?? 0),
    });
    setIsEditingPista(true);
  };

  const handleSaveBatchPista = async () => {
    if (!batch) return;
    const comp = toNum(editedPista.comprimento);
    const volume = toNum(editedPista.volume);
    const metros = toNum(editedPista.perda || "0");
    if (!editedPista.pista.trim()) {
      toast.error("Informe a pista");
      return;
    }
    if (!(comp > 0)) {
      toast.error("Informe o comprimento da pista");
      return;
    }
    if (!(volume > 0)) {
      toast.error("Informe o volume de concreto produzido (m³)");
      return;
    }
    if (isNaN(metros) || metros < 0) {
      toast.error("Informe um valor de perda válido.");
      return;
    }
    if (metros > comp) {
      toast.error("Metros de perda não pode ser maior que o comprimento da pista");
      return;
    }
    const perda_pct = calcPerdaPct(metros, comp);
    try {
      await updateBatchPista({
        id: batch.id,
        pista: editedPista.pista.trim(),
        fios: Number(editedPista.fios),
        comprimento_pista_m: comp,
        volume_concreto_m3: volume,
        metros_perda: metros,
        perda_pct,
        aproveitamento_pct: Math.round((100 - perda_pct) * 100) / 100,
      });
      toast.success("Concretagem da pista atualizada com sucesso!");
      setIsEditingPista(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar concretagem da pista", { description: err?.message });
    }
  };

  const handleSaveBatchCode = async () => {
    if (!batch) return;
    const trimmed = editedCode.trim();
    if (!trimmed) {
      toast.error("O código do lote não pode ficar vazio.");
      return;
    }
    if (trimmed === batch.batch_code) {
      setIsEditingCode(false);
      return;
    }
    try {
      await updateBatchCode({ id: batch.id, batch_code: trimmed });
      toast.success("Código do lote atualizado com sucesso!");
      setIsEditingCode(false);
    } catch (err: any) {
      toast.error("Erro ao atualizar código do lote", { description: err?.message });
    }
  };

  if (!analysis) return null;
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === analysis.tipo_analise)?.label ?? "—";

  // Receita calculada diretamente dos dados da análise, sem calcDosage
  const recipe = useMemo(() => {
    if (!batch) return null;
    const fd = analysis.formData;
    const volProdL = batch.volume_produzido; // Litros
    const volOrigL = (fd.volume_m3 || 0.55) * 1000; // Litros
    const scale = volOrigL > 0 ? volProdL / volOrigL : 1;

    const cimento_kg = (fd.consumo_alvo_m3 || 0) * scale;
    const agua_l = cimento_kg * (fd.relacao_ac || 0);
    const materiais = (fd.materiais_selecionados ?? []).map((m: any) => ({
      nome: m.nome,
      kg: Math.round((m.proporcao_kg ?? 0) * scale * 10) / 10,
    }));
    const aditivos_ml = Math.round((fd.aditivos_ml || 0) * scale * 10) / 10;

    return {
      consumo_cimento_batelada: Math.round(cimento_kg * 100) / 100,
      agua_batelada: Math.round(agua_l * 100) / 100,
      materiais_batelada: materiais,
      aditivos_batelada_ml: aditivos_ml,
    };
  }, [analysis, batch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes  {analysis.codigo}</DialogTitle>
        </DialogHeader>

        {/* Botão de exclusão de lote */}
        {batch && (
          <div className="flex justify-end mb-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
            >
              Excluir Lote
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-foreground">Análise</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Código:</span> <strong>{analysis.codigo}</strong></div>
              <div><span className="text-muted-foreground">Nome:</span> {analysis.nome}</div>
              <div>
                <span className="text-muted-foreground">Produto:</span>{" "}
                <strong>{analysis.produto ?? "—"}</strong>
                {analysis.produto && (
                  <span className="text-xs text-muted-foreground ml-1">({tipoLabel})</span>
                )}
              </div>
              <div><span className="text-muted-foreground">Resistência:</span> {analysis.resistencia_prevista} MPa</div>
              <div><span className="text-muted-foreground">Data:</span> {analysis.data_analise ? new Date(analysis.data_analise + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <StatusBadge status={analysis.status} />
              </div>
            </div>
            {analysis.formData.materiais_selecionados.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Materiais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.formData.materiais_selecionados.map((m) => (
                    <Badge key={m.material_id} variant="outline" className="text-xs">
                      {m.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {batch ? (
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <h4 className="font-semibold text-foreground">Lote de Produção</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Lote:</span>
                  {isEditingCode ? (
                    <>
                      <Input
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        className="h-7 w-40 text-sm"
                        autoFocus
                        disabled={isUpdatingBatchCode}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSaveBatchCode}
                        disabled={isUpdatingBatchCode}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setIsEditingCode(false)}
                        disabled={isUpdatingBatchCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <strong>{batch.batch_code}</strong>
                      {canEditBatchCode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditedCode(batch.batch_code);
                            setIsEditingCode(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Data Produção:</span>
                  {isEditingDate ? (
                    <>
                      <Input
                        type="datetime-local"
                        value={editedDate}
                        onChange={(e) => setEditedDate(e.target.value)}
                        className="h-7 w-48 text-sm"
                        autoFocus
                        disabled={isUpdatingBatchDate}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleSaveBatchDate}
                        disabled={isUpdatingBatchDate}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setIsEditingDate(false)}
                        disabled={isUpdatingBatchDate}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <strong>{new Date(batch.produced_at).toLocaleString("pt-BR")}</strong>
                      {canEditBatchCode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            const d = new Date(batch.produced_at);
                            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                            setEditedDate(local.toISOString().slice(0, 16));
                            setIsEditingDate(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {!batch.pista && (
                  <>
                    <div><span className="text-muted-foreground">Operador:</span> {batch.operador_nome}</div>
                    <div><span className="text-muted-foreground">Máquina:</span> {batch.maquina}</div>
                    <div><span className="text-muted-foreground">Volume:</span> {batch.volume_produzido} L</div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <StatusBadge status={batch.status} />
                    </div>
                  </>
                )}
              </div>

              {/* Lote de laje: dados em destaque */}
              {batch.pista && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Operador</p>
                      <p className="font-bold text-sm mt-1 truncate">{batch.operador_nome}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Máquina</p>
                      <p className="font-bold text-sm mt-1 truncate">{batch.maquina}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Status</p>
                      <div className="mt-1"><StatusBadge status={batch.status} /></div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 w-1/3 min-w-[8rem]">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Volume da Batelada</p>
                    <p className="font-black text-lg mt-1">
                      {batch.volume_produzido} <span className="text-xs font-bold text-muted-foreground">L</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <h4 className="font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">
                      Concretagem da Pista
                      {!isEditingPista && batch.comprimento_pista_m != null && (
                        <span className="normal-case tracking-normal font-medium"> · comprimento {String(batch.comprimento_pista_m).replace(".", ",")} m</span>
                      )}
                    </h4>
                    {canEditPista && !isEditingPista && (
                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs" onClick={startEditPista}>
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                    )}
                  </div>
                  {isEditingPista ? (
                    <div className="rounded-lg border border-primary p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Pista *</Label>
                          <Input
                            value={editedPista.pista}
                            onChange={(e) => setEditedPista((p) => ({ ...p, pista: e.target.value }))}
                            placeholder="Ex: Pista A"
                            className="h-8"
                            autoFocus
                            disabled={isUpdatingPista}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fios *</Label>
                          <Select
                            value={editedPista.fios}
                            onValueChange={(v) => setEditedPista((p) => ({ ...p, fios: v }))}
                            disabled={isUpdatingPista}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[3, 4, 5, 7].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n} fios</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Comprimento da Pista (m) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedPista.comprimento}
                            onChange={(e) => setEditedPista((p) => ({ ...p, comprimento: e.target.value }))}
                            className="h-8"
                            disabled={isUpdatingPista}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Volume de Concreto (m³) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={editedPista.volume}
                            onChange={(e) => setEditedPista((p) => ({ ...p, volume: e.target.value }))}
                            className="h-8"
                            disabled={isUpdatingPista}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Metros de Perda (m)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedPista.perda}
                            onChange={(e) => setEditedPista((p) => ({ ...p, perda: e.target.value }))}
                            className="h-8"
                            disabled={isUpdatingPista}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingPista(false)} disabled={isUpdatingPista}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveBatchPista} disabled={isUpdatingPista} className="gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Pista</p>
                      <p className="font-black text-xl mt-1">{batch.pista}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Fios</p>
                      <p className="font-black text-xl mt-1">{batch.fios ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Concreto</p>
                      <p className="font-black text-xl mt-1">
                        {batch.volume_concreto_m3 ?? "—"}
                        {batch.volume_concreto_m3 != null && (
                          <span className="text-xs font-bold text-muted-foreground"> m³</span>
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Perda</p>
                      <p className="font-black text-xl mt-1">
                        {(batch.metros_perda ?? 0).toFixed(2).replace(".", ",")}
                        <span className="text-xs font-bold text-muted-foreground"> m</span>
                      </p>
                    </div>
                  </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">% Perda</p>
                      <p className="font-black text-2xl mt-1 text-red-600">
                        {(isEditingPista ? previewPerdaPct : batch.perda_pct ?? 0).toFixed(2).replace(".", ",")}
                        <span className="text-xs font-bold"> %</span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">% Aproveitamento</p>
                      <p className="font-black text-2xl mt-1 text-green-600">
                        {(isEditingPista ? 100 - previewPerdaPct : batch.aproveitamento_pct ?? 100).toFixed(2).replace(".", ",")}
                        <span className="text-xs font-bold"> %</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {recipe && (
                <div className="pt-2">
                  <h4 className="font-semibold text-foreground mb-2 text-xs uppercase tracking-wider">Receita Utilizada</h4>
                  <div className="rounded-md border bg-muted/20 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left py-1 px-3 font-bold">Material</th>
                          <th className="text-right py-1 px-3 font-bold">Peso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-1 px-3">Cimento</td>
                          <td className="py-1 px-3 text-right font-black">{recipe.consumo_cimento_batelada.toFixed(2)} kg</td>
                        </tr>
                        {recipe.materiais_batelada.map((m) => (
                          <tr key={m.nome}>
                            <td className="py-1 px-3 text-muted-foreground">{m.nome}</td>
                            <td className="py-1 px-3 text-right font-bold">{m.kg.toFixed(2)} kg</td>
                          </tr>
                        ))}
                        {recipe.aditivos_batelada_ml > 0 && (
                          <tr>
                            <td className="py-1 px-3 text-muted-foreground">Aditivo</td>
                            <td className="py-1 px-3 text-right font-bold">{recipe.aditivos_batelada_ml.toFixed(1)} mL</td>
                          </tr>
                        )}
                        <tr className="text-blue-600 dark:text-blue-400">
                          <td className="py-1 px-3">Água</td>
                          <td className="py-1 px-3 text-right font-black">{recipe.agua_batelada.toFixed(2)} L</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h4 className="font-semibold text-foreground pt-2">Cronograma de Rompimentos</h4>
              <div className="grid grid-cols-4 gap-2">
                {batch.rupture_schedules?.map((s) => {
                  const isConcluido = s.status === "concluido";
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isConcluido) {
                          setSelectedRupture(s);
                          setShowRuptureResult(true);
                        }
                      }}
                      disabled={!isConcluido}
                      className={cn(
                        "rounded-md border p-2 text-center transition-all",
                        isConcluido 
                          ? "hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-95 shadow-sm" 
                          : "opacity-80 cursor-default"
                      )}
                    >
                      <p className="text-lg font-bold text-foreground">{formatIdadeRompimento(s.idade_dias, analysis.tipo_analise)}</p>
                      <p className="text-[10px] text-muted-foreground">{s.data_prevista}</p>
                      <StatusBadge status={s.status} className="mt-1 h-4 text-[9px]" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhum lote registrado ainda. Clique em "Registrar Produção" para criar.
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Excluir Lote</DialogTitle>
            </DialogHeader>
            <div className="py-2">Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Cancelar</Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={async () => {
                  if (!batch) return;
                  try {
                    await deleteBatch(batch.id);
                    toast.success("Lote excluído com sucesso!");
                    setConfirmDelete(false);
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error("Erro ao excluir lote", { description: err?.message });
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ViewRuptureResultModal
        open={showRuptureResult}
        onOpenChange={setShowRuptureResult}
        schedule={selectedRupture}
        analysis={analysis}
        settings={settings}
      />
    </Dialog>
  );
}