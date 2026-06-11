"use client";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Fatura, Gasto } from "@/lib/data";

type ReportScope = "todos" | string;

type ReportExpense = Gasto & {
  allocatedValue: number;
  allocationLabel: string;
  originalValue: number;
};

const COLORS = {
  primary: [49, 46, 129] as [number, number, number],
  primarySoft: [238, 242, 255] as [number, number, number],
  text: [24, 24, 27] as [number, number, number],
  muted: [82, 82, 91] as [number, number, number],
  border: [212, 212, 216] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function date(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value || "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getReportExpenses(gastos: Gasto[], scope: ReportScope): ReportExpense[] {
  return gastos
    .flatMap((gasto) => {
      const originalValue = Number(gasto.valor) || 0;

      if (scope === "todos") {
        const allocationLabel =
          gasto.divisoes && gasto.divisoes.length > 0
            ? gasto.divisoes
                .map((division) => `${division.responsavel}: ${currency(Number(division.valor) || 0)}`)
                .join(" | ")
            : gasto.responsavel || "Nao definido";

        return [{
          ...gasto,
          allocatedValue: originalValue,
          allocationLabel,
          originalValue,
        }];
      }

      if (gasto.divisoes && gasto.divisoes.length > 0) {
        const division = gasto.divisoes.find((item) => item.responsavel === scope);
        if (!division) return [];

        const allocatedValue = Number(division.valor) || 0;
        const percentage = originalValue > 0
          ? (allocatedValue / originalValue) * 100
          : 0;

        return [{
          ...gasto,
          allocatedValue,
          allocationLabel: `${percentage.toFixed(1)}% de ${currency(originalValue)}`,
          originalValue,
        }];
      }

      if (gasto.responsavel !== scope) return [];

      return [{
        ...gasto,
        allocatedValue: originalValue,
        allocationLabel: "100% do gasto",
        originalValue,
      }];
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

function getResponsibleTotals(gastos: Gasto[]) {
  const totals = new Map<string, number>();

  gastos.forEach((gasto) => {
    if (gasto.divisoes && gasto.divisoes.length > 0) {
      gasto.divisoes.forEach((division) => {
        totals.set(
          division.responsavel,
          (totals.get(division.responsavel) || 0) + (Number(division.valor) || 0),
        );
      });
      return;
    }

    const responsible = gasto.responsavel || "Nao definido";
    totals.set(responsible, (totals.get(responsible) || 0) + (Number(gasto.valor) || 0));
  });

  return [...totals.entries()]
    .map(([responsible, value]) => ({ responsible, value }))
    .sort((a, b) => b.value - a.value);
}

function parseInstallment(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!current || !total || current > total) return null;

  return { current, total };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function generatePDFReport(
  fatura: Fatura | null,
  gastos: Gasto[],
  scope: ReportScope = "todos",
): Promise<boolean> {
  if (!fatura) {
    console.error("Nao ha fatura selecionada para exportacao.");
    return false;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const expenses = getReportExpenses(gastos || [], scope);
    const installmentExpenses = expenses
      .map((expense) => ({ expense, installment: parseInstallment(expense.parcela) }))
      .filter((item): item is {
        expense: ReportExpense;
        installment: { current: number; total: number };
      } => item.installment !== null);

    const splitCount = expenses.filter(
      (expense) => expense.divisoes && expense.divisoes.length > 0,
    ).length;
    const total = expenses.reduce((sum, expense) => sum + expense.allocatedValue, 0);
    const scopeLabel = scope === "todos" ? "Todos os responsaveis" : scope;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Relatorio da fatura", 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${fatura.mesReferencia} | ${scopeLabel}`, 14, 22);

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.text(
      `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date())}`,
      pageWidth - 14,
      22,
      { align: "right" },
    );

    const metrics = [
      { label: "Total atribuido", value: currency(total) },
      { label: "Lancamentos", value: expenses.length.toString() },
      { label: "Parcelamentos", value: installmentExpenses.length.toString() },
      { label: "Gastos divididos", value: splitCount.toString() },
    ];

    metrics.forEach((metric, index) => {
      const x = 14 + index * 69;
      doc.setFillColor(...COLORS.primarySoft);
      doc.roundedRect(x, 38, 62, 22, 2, 2, "F");
      doc.setTextColor(...COLORS.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(metric.label, x + 4, 45);
      doc.setTextColor(...COLORS.text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(metric.value, x + 4, 55);
    });

    const summaryY = 70;

    if (scope === "todos") {
      const responsibleTotals = getResponsibleTotals(gastos || []);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Resumo por responsavel", 14, summaryY);

      autoTable(doc, {
        startY: summaryY + 4,
        head: [["Responsavel", "Valor atribuido"]],
        body: responsibleTotals.map((item) => [
          item.responsible,
          currency(item.value),
        ]),
        theme: "grid",
        margin: { left: 14, right: 152 },
        styles: { fontSize: 9, cellPadding: 2.5, textColor: COLORS.text },
        headStyles: {
          fillColor: COLORS.primary,
          textColor: COLORS.white,
          fontStyle: "bold",
        },
        columnStyles: { 1: { halign: "right" } },
      });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.muted);
      doc.text(
        "Valores divididos exibem apenas a parte atribuida ao responsavel selecionado.",
        14,
        summaryY,
      );
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.text);
    doc.text("Parcelamentos da selecao", 159, summaryY);

    autoTable(doc, {
      startY: summaryY + 4,
      head: [["Estabelecimento", "Parcela", "Valor", "Restante"]],
      body: installmentExpenses.length > 0
        ? installmentExpenses.map(({ expense, installment }) => [
            expense.estabelecimento,
            `${installment.current}/${installment.total}`,
            currency(expense.allocatedValue),
            currency(expense.allocatedValue * (installment.total - installment.current)),
          ])
        : [["Nenhum parcelamento", "-", "-", "-"]],
      theme: "grid",
      margin: { left: 159, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.2, textColor: COLORS.text },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });

    doc.addPage("a4", "landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.text);
    doc.text("Detalhamento dos gastos", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${fatura.mesReferencia} | ${scopeLabel}`, 14, 23);

    const detailHead = scope === "todos"
      ? [["Data", "Estabelecimento", "Categoria", "Responsavel / divisao", "Parcela", "Valor"]]
      : [["Data", "Estabelecimento", "Categoria", "Participacao", "Parcela", "Sua parte", "Original"]];

    const detailBody = expenses.length > 0
      ? expenses.map((expense) => {
          const common = [
            date(expense.data),
            expense.estabelecimento,
            expense.categoria,
            expense.allocationLabel,
            expense.parcela || "-",
            currency(expense.allocatedValue),
          ];

          return scope === "todos"
            ? common
            : [...common, currency(expense.originalValue)];
        })
      : [[
          "-",
          "Nenhum gasto encontrado para esta selecao",
          "-",
          "-",
          "-",
          currency(0),
          ...(scope === "todos" ? [] : [currency(0)]),
        ]];

    autoTable(doc, {
      startY: 29,
      head: detailHead,
      body: detailBody,
      theme: "striped",
      margin: { left: 14, right: 14, bottom: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        overflow: "linebreak",
        textColor: COLORS.text,
        lineColor: COLORS.border,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: scope === "todos"
        ? {
            0: { cellWidth: 20 },
            1: { cellWidth: 55 },
            2: { cellWidth: 35 },
            3: { cellWidth: 91 },
            4: { cellWidth: 20, halign: "center" },
            5: { cellWidth: 34, halign: "right" },
          }
        : {
            0: { cellWidth: 20 },
            1: { cellWidth: 52 },
            2: { cellWidth: 32 },
            3: { cellWidth: 55 },
            4: { cellWidth: 19, halign: "center" },
            5: { cellWidth: 33, halign: "right" },
            6: { cellWidth: 33, halign: "right" },
          },
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...COLORS.border);
      doc.line(14, 198, pageWidth - 14, 198);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text("Cartao Inteligente", 14, 203);
      doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 14, 203, {
        align: "right",
      });
    }

    const scopeSuffix = scope === "todos" ? "completa" : safeFileName(scope);
    const fileName = `Relatorio_${safeFileName(fatura.mesReferencia)}_${scopeSuffix}.pdf`;
    downloadBlob(doc.output("blob"), fileName);

    return true;
  } catch (error: unknown) {
    console.error("Erro na geracao do PDF:", error);
    return false;
  }
}
