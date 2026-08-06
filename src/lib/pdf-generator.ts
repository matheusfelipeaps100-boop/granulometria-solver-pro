// =============================================================================
// PDF Generator — Client-side usando jsPDF
// Baseado no PRD v3.0 — Seção 7 (Geração de PDF)
// =============================================================================

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { calcCombinedCurve, calcDosage } from "./granulometry-engine";
import {
  PENEIRAS_PADRAO,
  TIPOS_ANALISE,
  ANALISTAS,
  type AnalysisFormData,
} from "./analysis-data";

interface PDFOptions {
  limitesDna?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>;
  dnaNome?: string;
}

export function generateAnalysisPDF(data: AnalysisFormData, options?: PDFOptions): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const addText = (text: string, x: number, yPos: number, opts?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    doc.setFontSize(opts?.size ?? 10);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(30, 30, 30);
    doc.text(text, x, yPos);
  };

  const addLine = (yPos: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  const checkNewPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
  };

  // ── HEADER ──
  doc.setFillColor(153, 27, 27); // primary red
  doc.rect(0, 0, pageWidth, 28, "F");
  addText("GRANULOMETRIA SOLVER PRO", margin, 12, { size: 16, bold: true, color: [255, 255, 255] });
  addText("Relatório de Análise Técnica", margin, 19, { size: 10, color: [255, 220, 220] });
  addText(data.codigo, pageWidth - margin, 12, { size: 12, bold: true, color: [255, 255, 255] });
  doc.text(data.codigo, pageWidth - margin, 12, { align: "right" });
  y = 36;

  // ── STATUS BADGE ──
  doc.setFillColor(34, 139, 34);
  doc.roundedRect(margin, y, 30, 7, 2, 2, "F");
  addText("APROVADO", margin + 4, y + 5, { size: 8, bold: true, color: [255, 255, 255] });
  addText(`Data: ${data.data}`, margin + 36, y + 5, { size: 9 });
  y += 14;

  // ── IDENTIFICAÇÃO ──
  addText("1. IDENTIFICAÇÃO", margin, y, { size: 12, bold: true, color: [153, 27, 27] });
  y += 2;
  addLine(y);
  y += 6;

  const tipoLabel = TIPOS_ANALISE.find((t) => t.value === data.tipo_analise)?.label ?? "—";
  const analistaLabel = ANALISTAS.find((a) => a.id === data.analista)?.nome ?? "—";

  const idFields = [
    ["Nome", data.nome],
    ["Código", data.codigo],
    ["Tipo", tipoLabel],
    ["Analista", analistaLabel],
    ["Unidade", data.unidade || "—"],
    ["Produto", data.produto_nome || "—"],
    ["Resistência", `${data.resistencia_prevista} MPa`],
  ];

  idFields.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? margin : margin + contentWidth / 2;
    addText(`${label}:`, col, y, { size: 9, bold: true });
    addText(String(value), col + 28, y, { size: 9 });
    if (i % 2 === 1 || i === idFields.length - 1) y += 6;
  });

  y += 4;

  // ── GRANULOMETRIA ──
  checkNewPage(60);
  addText("2. CURVA GRANULOMÉTRICA", margin, y, { size: 12, bold: true, color: [153, 27, 27] });
  y += 2;
  addLine(y);
  y += 6;

  const dnaLimites = options?.limitesDna;
  const curveResults = data.materiais_selecionados.length > 0
    ? calcCombinedCurve(data.materiais_selecionados, dnaLimites)
    : [];

  if (curveResults.length > 0) {
    // Table header
    const colWidths = [30, 25, 25, 25, 25, 25];
    const headers = ["Peneira", "% Comb.", "% Acum.", "Lim. Min", "Lim. Max", "Status"];
    
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 1, contentWidth, 7, "F");
    
    let xPos = margin;
    headers.forEach((h, i) => {
      addText(h, xPos + 2, y + 4, { size: 8, bold: true });
      xPos += colWidths[i];
    });
    y += 8;

    curveResults.forEach((r) => {
      checkNewPage(7);
      const peneira = PENEIRAS_PADRAO.find((p) => p.sieve_id === r.sieve_id)?.label ?? "";
      const row = [
        peneira,
        (r.pct_combinado * 100).toFixed(2) + "%",
        (r.pct_acumulado * 100).toFixed(2) + "%",
        r.limite_min !== undefined ? (r.limite_min * 100).toFixed(1) + "%" : "—",
        r.limite_max !== undefined ? (r.limite_max * 100).toFixed(1) + "%" : "—",
        r.fora_da_faixa ? "FORA" : "OK",
      ];

      if (r.fora_da_faixa) {
        doc.setFillColor(255, 240, 240);
        doc.rect(margin, y - 3, contentWidth, 6, "F");
      }

      xPos = margin;
      row.forEach((cell, i) => {
        const color: [number, number, number] | undefined = 
          i === 5 && r.fora_da_faixa ? [220, 50, 50] : 
          i === 5 ? [34, 139, 34] : undefined;
        addText(cell, xPos + 2, y + 1, { size: 8, color });
        xPos += colWidths[i];
      });
      y += 6;
    });
  }

  y += 6;

  // ── DOSAGEM ──
  checkNewPage(50);
  addText("3. DOSAGEM E MATERIAIS POR BATELADA", margin, y, { size: 12, bold: true, color: [153, 27, 27] });
  y += 2;
  addLine(y);
  y += 6;

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
    // Summary cards
    const summaryItems = [
      ["Consumo Cimento", `${dosageResult.consumo_cimento_batelada} kg`],
      ["Água / Batelada", `${dosageResult.agua_batelada} L`],
      ["Massa Total", `${dosageResult.massa_total_batelada} kg`],
      ["Traço Final", dosageResult.traco_final],
    ];

    summaryItems.forEach(([label, value], i) => {
      const col = margin + (i % 4) * (contentWidth / 4);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(col, y, contentWidth / 4 - 2, 14, 2, 2, "F");
      addText(label, col + 3, y + 5, { size: 7, color: [120, 120, 120] });
      addText(String(value), col + 3, y + 11, { size: 10, bold: true });
    });
    y += 20;

    // Materials table
    checkNewPage(30);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 1, contentWidth, 7, "F");
    addText("Material", margin + 2, y + 4, { size: 8, bold: true });
    addText("Quantidade", pageWidth - margin - 2, y + 4, { size: 8, bold: true });
    doc.text("Quantidade", pageWidth - margin - 2, y + 4, { align: "right" });
    y += 8;

    // Cimento
    addText("Cimento", margin + 2, y + 1, { size: 9, bold: true });
    addText(`${dosageResult.consumo_cimento_batelada} kg`, pageWidth - margin - 2, y + 1, { size: 9 });
    doc.text(`${dosageResult.consumo_cimento_batelada} kg`, pageWidth - margin - 2, y + 1, { align: "right" });
    y += 6;

    dosageResult.materiais_batelada.forEach((m) => {
      checkNewPage(7);
      addText(m.nome, margin + 2, y + 1, { size: 9 });
      addText(`${m.kg} kg`, pageWidth - margin - 2, y + 1, { size: 9 });
      doc.text(`${m.kg} kg`, pageWidth - margin - 2, y + 1, { align: "right" });
      y += 6;
    });

    addText("Água", margin + 2, y + 1, { size: 9 });
    addText(`${dosageResult.agua_batelada} L`, pageWidth - margin - 2, y + 1, { size: 9 });
    doc.text(`${dosageResult.agua_batelada} L`, pageWidth - margin - 2, y + 1, { align: "right" });
    y += 6;
  }

  y += 8;

  // ── RESUMO TÉCNICO ──
  checkNewPage(30);
  addText("4. RESUMO TÉCNICO", margin, y, { size: 12, bold: true, color: [153, 27, 27] });
  y += 2;
  addLine(y);
  y += 6;

  const resumo = [
    ["Tipo de Análise", tipoLabel],
    ["Resistência Prevista", `${data.resistencia_prevista} MPa`],
    ["Traço Final", dosageResult?.traco_final ?? "—"],
    ["Analista Responsável", analistaLabel],
    ["DNA Selecionado", options?.dnaNome ?? "Nenhum"],
    ["Volume Batelada", `${(data.volume_m3 * 1000).toFixed(0)} L`],
  ];

  resumo.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? margin : margin + contentWidth / 2;
    addText(`${label}:`, col, y, { size: 9, bold: true });
    addText(String(value), col + 40, y, { size: 9 });
    if (i % 2 === 1 || i === resumo.length - 1) y += 6;
  });

  y += 10;

  // ── OBSERVAÇÕES ──
  if (data.observacoes) {
    checkNewPage(20);
    addText("Observações:", margin, y, { size: 9, bold: true });
    y += 5;
    const lines = doc.splitTextToSize(data.observacoes, contentWidth);
    addText("", margin, y, { size: 9 });
    doc.text(lines, margin, y);
    y += lines.length * 5;
  }

  // ── FOOTER ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    addLine(pageH - 14);
    addText("Granulometria Solver Pro — Relatório gerado automaticamente", margin, pageH - 8, { size: 7, color: [150, 150, 150] });
    addText(`Página ${i} de ${pageCount}`, pageWidth - margin, pageH - 8, { size: 7, color: [150, 150, 150] });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageH - 8, { align: "right" });
  }

  // Download
  doc.save(`${data.codigo}_relatorio.pdf`);
}

/**
 * Gera um PDF capturando fielmente um elemento DOM já renderizado
 * (usado no Laudo Técnico do lote, que tem layout/print styling próprios
 * em QualityReportPage — evita duplicar campos em um template separado).
 * Retorna o Blob para upload (ex.: Supabase Storage) em vez de forçar
 * download direto.
 */
export async function generateElementPDF(element: HTMLElement): Promise<Blob> {
  // Captura o elemento como imagem (fielmente igual ao que aparece na tela,
  // incluindo gráficos SVG do recharts) e depois fatia em páginas A4.
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    doc.addPage();
    doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return doc.output("blob");
}
