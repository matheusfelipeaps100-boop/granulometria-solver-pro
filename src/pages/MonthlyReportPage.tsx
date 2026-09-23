import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, RefreshCw, Save, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

import { useAnalyses } from "@/hooks/api/useAnalyses";
import { useOrganization } from "@/hooks/api/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useMaterials, Material } from "@/hooks/api/useMaterials";
import { useMonthlyReport, useRuptureSchedulesWithTests } from "@/hooks/api/useMonthlyReports";
import { generateElementPDF } from "@/lib/pdf-generator";
import { generateMonthlyReportExcel } from "@/lib/excel-generator";
import { TIPOS_ANALISE } from "@/lib/analysis-data";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function ymPrefix(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function inPeriod(dateStr: string | null | undefined, ano: number, mes: number) {
  if (!dateStr) return false;
  return dateStr.slice(0, 7) === ymPrefix(ano, mes);
}

interface PeriodSummary {
  totalAnalises: number;
  totalEnsaios: number;
  produtosDistintos: number;
  conformes: number;
  naoConformes: number;
  analisesPorProduto: { produto: string; quantidade: number; status: string }[];
  resistenciaPorProduto: {
    produto: string;
    ensaios: number;
    media: number | null;
    minimo: number | null;
    maximo: number | null;
    meta: number | null;
    situacao: string;
  }[];
  naoConformidades: { descricao: string; data: string }[];
  naoRealizados: { descricao: string; data: string }[];
  marcasCimento: { marca: string; quantidade: number }[];
  marcasAditivo: { marca: string; quantidade: number }[];
}

function buildSummary(
  ano: number,
  mes: number,
  analyses: ReturnType<typeof useAnalyses>["analyses"],
  batches: any[],
  schedules: any[],
  cimentoBrands: Material[],
  aditivoBrands: Material[]
): PeriodSummary {
  const analisesPeriodo = analyses.filter((a) => inPeriod(a.data_analise || a.created_at, ano, mes));

  // C — análises por produto
  const porProduto = new Map<string, { quantidade: number; statusCount: Record<string, number> }>();
  analisesPeriodo.forEach((a) => {
    const produtoLabel = a.produto || TIPOS_ANALISE.find((t) => t.value === a.tipo)?.label || a.tipo || "—";
    const entry = porProduto.get(produtoLabel) ?? { quantidade: 0, statusCount: {} };
    entry.quantidade += 1;
    entry.statusCount[a.status] = (entry.statusCount[a.status] ?? 0) + 1;
    porProduto.set(produtoLabel, entry);
  });
  const analisesPorProduto = Array.from(porProduto.entries()).map(([produto, v]) => ({
    produto,
    quantidade: v.quantidade,
    status: Object.entries(v.statusCount)
      .map(([s, c]) => `${s} (${c})`)
      .join(", "),
  }));

  // D/F — testes de resistência no período (via schedule.data_executada)
  const testesPeriodo: { produto: string; test: any; schedule: any }[] = [];
  schedules.forEach((s: any) => {
    if (!inPeriod(s.data_executada, ano, mes)) return;
    const produto = s.batch?.analyses?.produto || s.batch?.analyses?.tipo || "—";
    (s.tests || []).forEach((t: any) => testesPeriodo.push({ produto, test: t, schedule: s }));
  });

  const resistenciaMap = new Map<string, { ensaios: any[]; metas: number[] }>();
  testesPeriodo.forEach(({ produto, test }) => {
    const entry = resistenciaMap.get(produto) ?? { ensaios: [], metas: [] };
    entry.ensaios.push(test);
    if (test.meta_mpa != null) entry.metas.push(test.meta_mpa);
    resistenciaMap.set(produto, entry);
  });

  const resistenciaPorProduto = Array.from(resistenciaMap.entries()).map(([produto, v]) => {
    const medias = v.ensaios.map((t) => t.media_mpa).filter((n) => n != null) as number[];
    const mins = v.ensaios.map((t) => t.min_mpa).filter((n) => n != null) as number[];
    const maxs = v.ensaios.map((t) => t.max_mpa).filter((n) => n != null) as number[];
    const naoConformesProduto = v.ensaios.filter((t) => t.status === "nao_conforme").length;
    return {
      produto,
      ensaios: v.ensaios.length,
      media: medias.length ? Math.round((medias.reduce((s, n) => s + n, 0) / medias.length) * 100) / 100 : null,
      minimo: mins.length ? Math.min(...mins) : null,
      maximo: maxs.length ? Math.max(...maxs) : null,
      meta: v.metas.length ? Math.round((v.metas.reduce((s, n) => s + n, 0) / v.metas.length) * 100) / 100 : null,
      situacao: naoConformesProduto === 0 ? "Conforme" : `${naoConformesProduto} não conforme(s)`,
    };
  });

  const totalEnsaios = testesPeriodo.length;
  const conformes = testesPeriodo.filter((t) => t.test.status === "conforme").length;
  const naoConformes = testesPeriodo.filter((t) => t.test.status === "nao_conforme").length;

  // F — não conformidades (ensaios + lotes reprovados/com ressalva)
  const naoConformidades: { descricao: string; data: string }[] = [];
  testesPeriodo
    .filter((t) => t.test.status === "nao_conforme")
    .forEach(({ produto, schedule }) => {
      naoConformidades.push({
        descricao: `Rompimento não conforme — ${produto} (lote ${schedule.batch?.batch_code ?? "—"})`,
        data: schedule.data_executada?.slice(0, 10) ?? "—",
      });
    });
  batches
    .filter((b: any) => inPeriod(b.produced_at, ano, mes) && ["reprovado", "aprovado_com_ressalva"].includes(b.status))
    .forEach((b: any) => {
      naoConformidades.push({
        descricao: `Lote ${b.batch_code} — ${b.status === "reprovado" ? "reprovado" : "aprovado com ressalva"}${b.notas ? `: ${b.notas}` : ""}`,
        data: b.produced_at?.slice(0, 10) ?? "—",
      });
    });

  // Ensaios não realizados por falta de expediente — informativo, fora da
  // contagem de não conformidades e das médias/mínimos/máximos.
  const naoRealizados: { descricao: string; data: string }[] = [];
  schedules
    .filter((s: any) => s.status === "sem_expediente" && inPeriod(s.data_executada, ano, mes))
    .forEach((s: any) => {
      const produto = s.batch?.analyses?.produto || s.batch?.analyses?.tipo || "—";
      naoRealizados.push({
        descricao: `Ensaio não realizado (sem expediente) — ${produto} (lote ${s.batch?.batch_code ?? "—"}, ${s.idade_dias} dias)${s.motivo_nao_realizado ? `: ${s.motivo_nao_realizado}` : ""}`,
        data: s.data_executada?.slice(0, 10) ?? "—",
      });
    });

  // G — marcas de cimento/aditivo usadas no período
  const cimentoCount = new Map<string, number>();
  const aditivoCount = new Map<string, number>();
  analisesPeriodo.forEach((a: any) => {
    const cimentoId = a.formData?.cimento_marca_id;
    const aditivoId = a.formData?.aditivo_marca_id;
    if (cimentoId) cimentoCount.set(cimentoId, (cimentoCount.get(cimentoId) ?? 0) + 1);
    if (aditivoId) aditivoCount.set(aditivoId, (aditivoCount.get(aditivoId) ?? 0) + 1);
  });
  const marcasCimento = Array.from(cimentoCount.entries()).map(([id, quantidade]) => ({
    marca: cimentoBrands.find((b) => b.id === id)?.nome ?? "Marca removida",
    quantidade,
  }));
  const marcasAditivo = Array.from(aditivoCount.entries()).map(([id, quantidade]) => ({
    marca: aditivoBrands.find((b) => b.id === id)?.nome ?? "Marca removida",
    quantidade,
  }));

  return {
    totalAnalises: analisesPeriodo.length,
    totalEnsaios,
    produtosDistintos: porProduto.size,
    conformes,
    naoConformes,
    analisesPorProduto,
    resistenciaPorProduto,
    naoConformidades,
    naoRealizados,
    marcasCimento,
    marcasAditivo,
  };
}

function ComparativoLinha({ label, atual, anterior }: { label: string; atual: number; anterior: number }) {
  const diff = atual - anterior;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{anterior} → {atual}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
    </div>
  );
}

const MonthlyReportPage = () => {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { analyses, isLoading: loadingAnalyses } = useAnalyses();
  const { data: schedules = [], isLoading: isLoadingSchedules } = useRuptureSchedulesWithTests();
  const { organization } = useOrganization();
  const { profile } = useAuth();
  const { materials: dbMaterials } = useMaterials();
  const cimentoBrands = useMemo(() => dbMaterials.filter((m) => m.tipo === "cimento"), [dbMaterials]);
  const aditivoBrands = useMemo(
    () => dbMaterials.filter((m) => m.tipo === "aditivo" || m.nome.toLowerCase().includes("aditivo")),
    [dbMaterials]
  );
  const { report, saveConclusao, isSaving } = useMonthlyReport(ano, mes);

  const [conclusaoDraft, setConclusaoDraft] = useState<string | null>(null);
  const conclusaoValue = conclusaoDraft ?? report?.conclusao ?? "";

  // batches só existem indiretamente via schedules[].batch — reconstrói lista única
  const batches = useMemo(() => {
    const map = new Map<string, any>();
    schedules.forEach((s: any) => {
      if (s.batch) map.set(s.batch.id, s.batch);
    });
    return Array.from(map.values());
  }, [schedules]);

  const isLoading = loadingAnalyses || isLoadingSchedules;

  const summaryAtual = useMemo(
    () => buildSummary(ano, mes, analyses, batches, schedules, cimentoBrands, aditivoBrands),
    [ano, mes, analyses, batches, schedules, cimentoBrands, aditivoBrands]
  );

  const { anoAnterior, mesAnterior } = mes === 1 ? { anoAnterior: ano - 1, mesAnterior: 12 } : { anoAnterior: ano, mesAnterior: mes - 1 };
  const summaryAnterior = useMemo(
    () => buildSummary(anoAnterior, mesAnterior, analyses, batches, schedules, cimentoBrands, aditivoBrands),
    [anoAnterior, mesAnterior, analyses, batches, schedules, cimentoBrands, aditivoBrands]
  );

  const periodoLabel = `${MONTHS[mes - 1]}/${ano}`;

  const handleSalvarConclusao = async () => {
    try {
      await saveConclusao(conclusaoValue);
      toast.success("Conclusão do mês salva.");
    } catch {
      toast.error("Erro ao salvar conclusão.");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateElementPDF(reportRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_mensal_${ano}-${String(mes).padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      await generateMonthlyReportExcel({
        periodoLabel,
        resumo: [
          { label: "Total de Análises", valor: summaryAtual.totalAnalises },
          { label: "Total de Ensaios de Resistência", valor: summaryAtual.totalEnsaios },
          { label: "Produtos Acompanhados", valor: summaryAtual.produtosDistintos },
          { label: "Resultados Conformes", valor: summaryAtual.conformes },
          { label: "Resultados Não Conformes", valor: summaryAtual.naoConformes },
        ],
        analisesPorProduto: summaryAtual.analisesPorProduto,
        resistenciaPorProduto: summaryAtual.resistenciaPorProduto,
        naoConformidades: summaryAtual.naoConformidades,
        naoRealizados: summaryAtual.naoRealizados,
        marcasCimento: summaryAtual.marcasCimento,
        marcasAditivo: summaryAtual.marcasAditivo,
        conclusao: conclusaoValue,
      });
      toast.success("Excel gerado com sucesso.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar Excel.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12 text-primary">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório Mensal de Controle de Qualidade</h1>
          <p className="text-sm text-muted-foreground">Resumo gerencial do período para reuniões de direção</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-9 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleExportPDF} disabled={generatingPdf}>
            {generatingPdf ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-background p-1">
        {/* A — Identificação */}
        <Card data-pdf-avoid-break>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold">{organization?.nome ?? "—"}</h2>
                <p className="text-sm text-muted-foreground">Relatório Mensal de Controle de Qualidade</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p><strong className="text-foreground">Período:</strong> {periodoLabel}</p>
                <p><strong className="text-foreground">Responsável:</strong> {profile?.nome ?? "—"}</p>
                <p><strong className="text-foreground">Emitido em:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B — Resumo do mês */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-pdf-avoid-break>
          {[
            { label: "Análises", valor: summaryAtual.totalAnalises },
            { label: "Ensaios de Resistência", valor: summaryAtual.totalEnsaios },
            { label: "Produtos Acompanhados", valor: summaryAtual.produtosDistintos },
            { label: "Conformes", valor: summaryAtual.conformes },
            { label: "Não Conformes", valor: summaryAtual.naoConformes },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-black">{c.valor}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* C — Análises realizadas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Análises Realizadas</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryAtual.analisesPorProduto.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground italic py-6">Sem dados no período.</TableCell></TableRow>
                ) : summaryAtual.analisesPorProduto.map((r) => (
                  <TableRow key={r.produto}>
                    <TableCell className="font-medium">{r.produto}</TableCell>
                    <TableCell>{r.quantidade}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* D — Resultados de resistência */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados de Resistência</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Ensaios</TableHead>
                  <TableHead>Média (MPa)</TableHead>
                  <TableHead>Mín (MPa)</TableHead>
                  <TableHead>Máx (MPa)</TableHead>
                  <TableHead>Meta (MPa)</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryAtual.resistenciaPorProduto.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground italic py-6">Sem ensaios registrados no período.</TableCell></TableRow>
                ) : summaryAtual.resistenciaPorProduto.map((r) => (
                  <TableRow key={r.produto}>
                    <TableCell className="font-medium">{r.produto}</TableCell>
                    <TableCell>{r.ensaios}</TableCell>
                    <TableCell>{r.media ?? "—"}</TableCell>
                    <TableCell>{r.minimo ?? "—"}</TableCell>
                    <TableCell>{r.maximo ?? "—"}</TableCell>
                    <TableCell>{r.meta ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.situacao === "Conforme" ? "secondary" : "destructive"}>{r.situacao}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* E — Granulometria */}
        <Card>
          <CardHeader><CardTitle className="text-base">Granulometria</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <strong>{summaryAtual.analisesPorProduto.reduce((s, r) => s + r.quantidade, 0)}</strong> análise(s) granulométrica(s) registrada(s) no período.
            </p>
            <p className="text-xs text-muted-foreground">
              O detalhamento por peneira (dentro/fora da faixa) está disponível no relatório técnico de cada análise individual. A consolidação agregada dentro/fora de faixa não está disponível nesta versão do relatório mensal, pois os limites normativos usados em cada análise não ficam persistidos para reprocessamento posterior — evitando qualquer número aproximado ou inventado aqui.
            </p>
          </CardContent>
        </Card>

        {/* F — Não conformidades */}
        <Card>
          <CardHeader><CardTitle className="text-base">Não Conformidades / Pontos de Atenção</CardTitle></CardHeader>
          <CardContent>
            {summaryAtual.naoConformidades.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma ocorrência registrada no período.</p>
            ) : (
              <ul className="space-y-2">
                {summaryAtual.naoConformidades.map((n, i) => (
                  <li key={i} className="text-sm flex items-start justify-between gap-4 border-b pb-2 last:border-0">
                    <span>{n.descricao}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{n.data}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ensaios não realizados (sem expediente) — informativo, não conta como não conformidade */}
        {summaryAtual.naoRealizados.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ensaios Não Realizados (Sem Expediente)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Rompimentos que não puderam ser executados por falta de expediente no laboratório (fins de semana/feriados). Não entram nas médias nem na contagem de não conformidades acima.
              </p>
              <ul className="space-y-2">
                {summaryAtual.naoRealizados.map((n, i) => (
                  <li key={i} className="text-sm flex items-start justify-between gap-4 border-b pb-2 last:border-0">
                    <span>{n.descricao}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{n.data}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* G — Cimento e aditivo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Cimento e Aditivo Utilizados</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Cimento</p>
              {summaryAtual.marcasCimento.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma marca registrada no período.</p>
              ) : (
                <ul className="space-y-1">
                  {summaryAtual.marcasCimento.map((m) => (
                    <li key={m.marca} className="text-sm flex justify-between"><span>{m.marca}</span><span className="font-medium">{m.quantidade}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Aditivo</p>
              {summaryAtual.marcasAditivo.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma marca registrada no período.</p>
              ) : (
                <ul className="space-y-1">
                  {summaryAtual.marcasAditivo.map((m) => (
                    <li key={m.marca} className="text-sm flex justify-between"><span>{m.marca}</span><span className="font-medium">{m.quantidade}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparativo mês anterior */}
        <Card>
          <CardHeader><CardTitle className="text-base">Comparativo com o Mês Anterior ({MONTHS[mesAnterior - 1]}/{anoAnterior})</CardTitle></CardHeader>
          <CardContent>
            <ComparativoLinha label="Análises" atual={summaryAtual.totalAnalises} anterior={summaryAnterior.totalAnalises} />
            <ComparativoLinha label="Ensaios de resistência" atual={summaryAtual.totalEnsaios} anterior={summaryAnterior.totalEnsaios} />
            <ComparativoLinha label="Conformes" atual={summaryAtual.conformes} anterior={summaryAnterior.conformes} />
            <ComparativoLinha label="Não conformes" atual={summaryAtual.naoConformes} anterior={summaryAnterior.naoConformes} />
          </CardContent>
        </Card>

        {/* H — Conclusão técnica */}
        <Card data-pdf-avoid-break>
          <CardHeader><CardTitle className="text-base">Conclusão Técnica</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Principais resultados, pontos de atenção, ações realizadas e recomendações para o próximo período."
              className="min-h-[120px]"
              value={conclusaoValue}
              onChange={(e) => setConclusaoDraft(e.target.value)}
            />
            <Button size="sm" className="gap-1.5" onClick={handleSalvarConclusao} disabled={isSaving}>
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Conclusão
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonthlyReportPage;
