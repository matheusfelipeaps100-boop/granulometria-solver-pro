// =============================================================================
// Excel Generator — Client-side usando exceljs
// Espelha o conteúdo do pdf-generator.ts, reaproveitando os mesmos cálculos
// (calcCombinedCurve, calcDosage) para manter os números idênticos ao PDF.
// =============================================================================

import * as ExcelJSNamespace from "exceljs";
import { calcCombinedCurve, calcDosage } from "./granulometry-engine";
import { PENEIRAS_PADRAO, TIPOS_ANALISE, type AnalysisFormData } from "./analysis-data";

// O bundle de browser do exceljs expõe `Workbook` como propriedade nomeada,
// sem `default` — o interop do bundler pode entregar o módulo de formas
// diferentes (`{ Workbook }` direto ou `{ default: { Workbook } }`), então
// resolvemos os dois casos aqui em vez de confiar num import default fixo.
const ExcelJS: typeof ExcelJSNamespace =
  (ExcelJSNamespace as any).default ?? ExcelJSNamespace;

type Workbook = ExcelJSNamespace.Workbook;

interface ExcelOptions {
  limitesDna?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
}

async function downloadWorkbook(workbook: Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateAnalysisExcel(data: AnalysisFormData, options?: ExcelOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";

  // ── Sheet: Identificação ──
  const identSheet = workbook.addWorksheet("Identificação");
  identSheet.columns = [{ width: 24 }, { width: 40 }];
  [
    ["Código", data.codigo],
    ["Nome", data.nome],
    ["Tipo", tipoLabel],
    ["Produto", data.produto_nome || "—"],
    ["Data", data.data],
    ["Resistência Prevista (MPa)", data.resistencia_prevista],
    ["Unidade", data.unidade || "—"],
    ["Observações", data.observacoes || "—"],
  ].forEach((row) => identSheet.addRow(row));
  identSheet.getColumn(1).font = { bold: true };

  // ── Sheet: Granulometria ──
  const curveSheet = workbook.addWorksheet("Granulometria");
  curveSheet.columns = [
    { header: "Peneira", width: 14 },
    { header: "% Combinado", width: 14 },
    { header: "% Acumulado", width: 14 },
    { header: "Limite Mín.", width: 14 },
    { header: "Limite Máx.", width: 14 },
    { header: "Status", width: 12 },
  ];
  curveSheet.getRow(1).font = { bold: true };

  const curveResults = data.materiais_selecionados.length > 0
    ? calcCombinedCurve(data.materiais_selecionados, options?.limitesDna)
    : [];

  curveResults.forEach((r) => {
    const peneira = PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "";
    curveSheet.addRow([
      peneira,
      r.pct_combinado,
      r.pct_acumulado,
      r.limite_min ?? null,
      r.limite_max ?? null,
      r.fora_da_faixa ? "FORA" : "OK",
    ]);
  });
  curveSheet.getColumn(2).numFmt = "0.00%";
  curveSheet.getColumn(3).numFmt = "0.00%";
  curveSheet.getColumn(4).numFmt = "0.0%";
  curveSheet.getColumn(5).numFmt = "0.0%";

  // ── Sheet: Dosagem ──
  const dosageSheet = workbook.addWorksheet("Dosagem");
  dosageSheet.columns = [{ width: 24 }, { width: 20 }];

  const dosageResult = data.materiais_selecionados.length > 0
    ? calcDosage({
        relacao_cimento: data.relacao_cimento,
        relacao_ac: data.relacao_ac,
        consumo_alvo_m3: data.consumo_alvo_m3,
        volume_m3: data.volume_m3,
        densidade_cimento: data.densidade_cimento,
        proporcoes_materiais: data.materiais_selecionados.map((m) => ({
          nome: m.nome,
          proporcao_kg: m.proporcao_kg,
          proporcao_pct: m.proporcao_pct,
          densidade: m.densidade,
        })),
        aditivos_ml: data.aditivos_ml,
      })
    : null;

  if (dosageResult) {
    dosageSheet.addRow(["Item", "Quantidade na Batelada"]);
    dosageSheet.getRow(1).font = { bold: true };
    dosageSheet.addRow(["Cimento (kg)", dosageResult.consumo_cimento_batelada]);
    dosageResult.materiais_batelada.forEach((m) => {
      dosageSheet.addRow([m.nome, m.kg]);
    });
    dosageSheet.addRow(["Água (L)", dosageResult.agua_batelada]);
    dosageSheet.addRow(["Massa Total (kg)", dosageResult.massa_total_batelada]);
    dosageSheet.addRow(["Traço Final", dosageResult.traco_final]);
  } else {
    dosageSheet.addRow(["Sem materiais selecionados"]);
  }

  await downloadWorkbook(workbook, `${data.codigo}_relatorio.xlsx`);
}

interface DashboardHistoryRow {
  date: string;
  analyses: number;
  batches: number;
  ruptures: number;
}

interface DashboardAlertStatus {
  high: number;
  medium: number;
  low: number;
}

export async function generateDashboardExcel(
  history: DashboardHistoryRow[],
  alertStatus: DashboardAlertStatus
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const historySheet = workbook.addWorksheet("Histórico");
  historySheet.columns = [
    { header: "Data", width: 14 },
    { header: "Análises", width: 12 },
    { header: "Lotes", width: 12 },
    { header: "Rompimentos", width: 14 },
  ];
  historySheet.getRow(1).font = { bold: true };
  history.forEach((h) => {
    historySheet.addRow([h.date, h.analyses, h.batches, h.ruptures]);
  });

  const alertSheet = workbook.addWorksheet("Alertas");
  alertSheet.columns = [{ width: 32 }, { width: 14 }];
  alertSheet.addRow(["Rompimentos atrasados", alertStatus.high]);
  alertSheet.addRow(["Rompimentos pendentes (estimativa)", alertStatus.medium]);

  await downloadWorkbook(workbook, `dashboard_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export interface MonthlyReportExcelData {
  periodoLabel: string;
  resumo: { label: string; valor: string | number }[];
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
  marcasCimento: { marca: string; quantidade: number }[];
  marcasAditivo: { marca: string; quantidade: number }[];
  conclusao: string;
}

export async function generateMonthlyReportExcel(data: MonthlyReportExcelData): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const resumoSheet = workbook.addWorksheet("Resumo");
  resumoSheet.columns = [{ width: 32 }, { width: 20 }];
  resumoSheet.addRow(["Relatório Mensal de Controle de Qualidade"]);
  resumoSheet.addRow(["Período", data.periodoLabel]);
  resumoSheet.addRow([]);
  data.resumo.forEach((r) => resumoSheet.addRow([r.label, r.valor]));

  const analisesSheet = workbook.addWorksheet("Análises");
  analisesSheet.columns = [
    { header: "Produto", width: 24 },
    { header: "Quantidade", width: 14 },
    { header: "Status", width: 20 },
  ];
  analisesSheet.getRow(1).font = { bold: true };
  data.analisesPorProduto.forEach((r) => analisesSheet.addRow([r.produto, r.quantidade, r.status]));

  const resistenciaSheet = workbook.addWorksheet("Resistência");
  resistenciaSheet.columns = [
    { header: "Produto", width: 24 },
    { header: "Ensaios", width: 10 },
    { header: "Média (MPa)", width: 14 },
    { header: "Mín (MPa)", width: 12 },
    { header: "Máx (MPa)", width: 12 },
    { header: "Meta (MPa)", width: 12 },
    { header: "Situação", width: 16 },
  ];
  resistenciaSheet.getRow(1).font = { bold: true };
  data.resistenciaPorProduto.forEach((r) =>
    resistenciaSheet.addRow([r.produto, r.ensaios, r.media, r.minimo, r.maximo, r.meta, r.situacao])
  );

  const naoConfSheet = workbook.addWorksheet("Não Conformidades");
  naoConfSheet.columns = [{ header: "Ocorrência", width: 60 }, { header: "Data", width: 14 }];
  naoConfSheet.getRow(1).font = { bold: true };
  if (data.naoConformidades.length === 0) {
    naoConfSheet.addRow(["Nenhuma ocorrência registrada no período", ""]);
  } else {
    data.naoConformidades.forEach((n) => naoConfSheet.addRow([n.descricao, n.data]));
  }

  const marcasSheet = workbook.addWorksheet("Cimento e Aditivo");
  marcasSheet.columns = [{ width: 24 }, { width: 14 }];
  marcasSheet.addRow(["Marcas de Cimento", ""]);
  marcasSheet.getRow(1).font = { bold: true };
  data.marcasCimento.forEach((m) => marcasSheet.addRow([m.marca, m.quantidade]));
  marcasSheet.addRow([]);
  marcasSheet.addRow(["Marcas de Aditivo", ""]);
  data.marcasAditivo.forEach((m) => marcasSheet.addRow([m.marca, m.quantidade]));

  const conclusaoSheet = workbook.addWorksheet("Conclusão");
  conclusaoSheet.columns = [{ width: 100 }];
  conclusaoSheet.addRow([data.conclusao || "—"]);

  await downloadWorkbook(workbook, `relatorio_mensal_${data.periodoLabel.replace("/", "-")}.xlsx`);
}
