import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Eye, Trash2, ArrowLeft, Plus, Save, Square, Layers, LayoutPanelTop } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGranulometryPresets, type GranulometryPreset } from "@/hooks/api/useGranulometryPresets";
import { StepGranulometry } from "@/components/analysis/StepGranulometry";
import { createEmptyAnalysis, TIPOS_ANALISE, getConfigMisturador, type AnalysisFormData } from "@/lib/analysis-data";
import { calcCombinedCurve } from "@/lib/granulometry-engine";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { getDefaultDateFilter, isInDateRange, formatPeriodLabel, type DateFilter } from "@/lib/dateFilter";

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcMFPreset(preset: GranulometryPreset): string {
  if (!preset.materiais || preset.materiais.length === 0) return "—";
  try {
    const totalKg = preset.materiais.reduce((s, m) => s + (m.proporcao_kg ?? 0), 0);
    if (totalKg === 0) return "—";
    const inputs = preset.materiais.map((m) => ({
      ...m,
      proporcao_pct: (m.proporcao_kg ?? 0) / totalKg,
    }));
    const results = calcCombinedCurve(inputs);
    if (results.length === 0) return "—";
    const MF_SIEVES = [0.15, 0.3, 0.6, 1.2, 2.4, 4.8];
    const mfSum = results
      .filter((r) => MF_SIEVES.includes(r.abertura_mm))
      .reduce((s, r) => s + r.pct_acumulado, 0);
    return (Math.round(mfSum * 10000) / 10000).toFixed(2);
  } catch {
    return "—";
  }
}

function tipoLabel(tipo?: string) {
  return TIPOS_ANALISE.find((t) => t.value === tipo)?.label ?? "Bloco Estrutural";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// Grupos de tipo (mesmo padrão do StepIdentification)
const GRUPOS = [
  { group: "BLOCOS", defaultTipo: "bloco_estrutural", icon: Square, sub: "Padrão + Estrutural" },
  { group: "PAVERS", defaultTipo: "paver",            icon: Layers,          sub: "Base + Face" },
  { group: "LAJES",  defaultTipo: "laje",             icon: LayoutPanelTop,  sub: "Piso / Estrutural" },
] as const;

// ── Componente principal ──────────────────────────────────────────────────────

type Mode = "list" | "view" | "new";

export default function GranulometriaPage() {
  const { presets, isLoading, createPreset, isCreating, deletePreset } = useGranulometryPresets();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("list");

  // Reseta para a lista sempre que o usuário navega para /granulometria pelo sidebar
  useEffect(() => {
    setMode("list");
    setSelected(null);
  }, [location.key]);
  const [selected, setSelected] = useState<GranulometryPreset | null>(null);

  // Estado local para nova granulometria
  const [newData, setNewData] = useState<AnalysisFormData>({ ...createEmptyAnalysis(), tipo_analise: "" });
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Filtros da lista
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateFilter());

  // Modal de exclusão
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; preset: GranulometryPreset | null }>({
    open: false, preset: null,
  });

  const filtered = useMemo(() => {
    return presets.filter((p) => {
      const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase());
      const matchTipo = filterTipo === "all" || (p.tipo_analise ?? "bloco_estrutural") === filterTipo;
      const matchDate = isInDateRange(p.created_at, dateFilter);
      return matchSearch && matchTipo && matchDate;
    });
  }, [presets, search, filterTipo, dateFilter]);

  const handleConfirmDelete = async () => {
    if (!deleteModal.preset) return;
    try {
      await deletePreset(deleteModal.preset.id);
      toast.success("Granulometria excluída com sucesso!");
    } catch {
      toast.error("Erro ao excluir granulometria.");
    } finally {
      setDeleteModal({ open: false, preset: null });
    }
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    try {
      await createPreset({
        nome: saveName.trim(),
        materiais: newData.materiais_selecionados,
        dna_selecionado: newData.dna_selecionado,
        limites_curva: newData.limites_curva,
        tipo_analise: newData.tipo_analise,
      });
      toast.success("Granulometria salva com sucesso!");
      setSaveModal(false);
      setSaveName("");
      setMode("list");
    } catch {
      toast.error("Erro ao salvar granulometria.");
    }
  };

  const startNew = () => {
    setNewData({ ...createEmptyAnalysis(), tipo_analise: "" });
    setSaveName("");
    setMode("new");
  };

  // ── Vista VISUALIZAR ──
  if (mode === "view" && selected) {
    const fakeData: AnalysisFormData = {
      ...createEmptyAnalysis(),
      tipo_analise: (selected.tipo_analise as AnalysisFormData["tipo_analise"]) || "bloco_estrutural",
      materiais_selecionados: selected.materiais,
      dna_selecionado: selected.dna_selecionado ?? "",
      limites_curva: selected.limites_curva ?? [],
    };
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setMode("list"); setSelected(null); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{selected.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {tipoLabel(selected.tipo_analise)} · {formatDate(selected.created_at)}
              </p>
            </div>
          </div>
        </div>
        <StepGranulometry data={fakeData} onChange={() => {}} readOnly />
      </div>
    );
  }

  // ── Vista NOVA GRANULOMETRIA ──
  if (mode === "new") {
    const activeGroup = GRUPOS.find((g) => g.defaultTipo === newData.tipo_analise ||
      (g.group === "BLOCOS" && (newData.tipo_analise === "bloco_estrutural" || newData.tipo_analise === "bloco_vedacao")) ||
      (g.group === "PAVERS" && (newData.tipo_analise === "paver" || newData.tipo_analise === "cp"))
    )?.group ?? null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setMode("list")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nova Granulometria</h1>
              <p className="text-sm text-muted-foreground">Preencha a tabela e salve para consultar depois</p>
            </div>
          </div>
          {newData.tipo_analise && newData.materiais_selecionados.length > 0 && (
            <Button onClick={() => { setSaveName(""); setSaveModal(true); }} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar Granulometria
            </Button>
          )}
        </div>

        {/* Seletor de tipo */}
        {!newData.tipo_analise ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="mb-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Selecione o tipo de produto
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {GRUPOS.map(({ group, defaultTipo, icon: Icon, sub }) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setNewData((d) => ({
                      ...d,
                      tipo_analise: defaultTipo as AnalysisFormData["tipo_analise"],
                      volume_m3: getConfigMisturador(defaultTipo).volume_m3,
                    }))}
                    className="group relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-border bg-card p-6 transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-border bg-muted group-hover:border-primary/40">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black tracking-wider">{group}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Chip do tipo selecionado com opção de trocar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tipo:</span>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {activeGroup}
              </span>
              <button
                type="button"
                onClick={() => setNewData((d) => ({ ...d, tipo_analise: "", materiais_selecionados: [] }))}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Trocar
              </button>
            </div>
            <StepGranulometry
              data={newData}
              onChange={(updates) => setNewData((d) => ({ ...d, ...updates }))}
            />
          </>
        )}

        {/* Modal de salvar */}
        <Dialog open={saveModal} onOpenChange={setSaveModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Salvar Granulometria</DialogTitle>
              <DialogDescription>Dê um nome para identificar esta granulometria.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome
              </Label>
              <Input
                autoFocus
                placeholder="Ex.: Semana 28 — Padrão Bloco"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && saveName.trim()) handleSave(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSaveModal(false)}>Cancelar</Button>
              <Button size="sm" disabled={!saveName.trim() || isCreating} onClick={handleSave}>
                <Save className="h-3 w-3 mr-1" /> Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Vista LISTA ──
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Granulometria</h1>
          <p className="text-sm text-muted-foreground">Consulte e compare granulometrias registradas</p>
        </div>
        <Button onClick={startNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Granulometria
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {TIPOS_ANALISE.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
              {filtered.length} granulometria{filtered.length !== 1 ? "s" : ""} — {formatPeriodLabel(dateFilter)}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>MF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {presets.length === 0
                        ? "Nenhuma granulometria salva ainda. Clique em \"Nova Granulometria\" para começar."
                        : "Nenhuma granulometria encontrada."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{tipoLabel(p.tipo_analise)}</TableCell>
                      <TableCell>{p.materiais?.length ?? 0} material(is)</TableCell>
                      <TableCell className="font-mono">{calcMFPreset(p)}</TableCell>
                      <TableCell>{formatDate(p.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8" title="Visualizar"
                            onClick={() => { setSelected(p); setMode("view"); }}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8" title="Excluir"
                            onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, preset: p }); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal confirmação de exclusão */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir Granulometria
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteModal.preset?.nome}</strong>?{" "}
              <span className="text-destructive">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
