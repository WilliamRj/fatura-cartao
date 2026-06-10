import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/lib/data';
import type { ApiGasto } from '@/lib/api/types';
import type { Fatura } from '@/lib/data';

export function generatePDFReport(
  fatura: Fatura | null,
  gastos: ApiGasto[],
  responsavelFiltro: string | 'todos' = 'todos'
) {
  const doc = new jsPDF();
  
  // Title
  let title = 'Relatório de Gastos';
  if (fatura) {
    title += ` - ${fatura.mesReferencia}`;
  }
  if (responsavelFiltro !== 'todos') {
    title += ` (Responsável: ${responsavelFiltro})`;
  }

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Filter and process the data based on the selected 'responsavel'
  let gastosProcessados: (ApiGasto & { valorParte: number; porcentagem?: number })[] = [];

  if (responsavelFiltro === 'todos') {
    gastosProcessados = gastos.map((gasto) => ({
      ...gasto,
      valorParte: gasto.valor,
    }));
  } else {
    gastosProcessados = gastos.reduce((acc, gasto) => {
      let percentual = 0;
      let valorParte = 0;

      if (gasto.divisoes && gasto.divisoes.length > 0) {
        const divisao = gasto.divisoes.find(d => d.responsavel === responsavelFiltro);
        if (divisao) {
          valorParte = divisao.valor;
          percentual = gasto.valor > 0 ? (divisao.valor / gasto.valor) * 100 : 0;
        }
      } else if (gasto.responsavel === responsavelFiltro) {
        percentual = 100;
        valorParte = gasto.valor;
      }

      if (valorParte > 0) {
        acc.push({
          ...gasto,
          valorParte,
          porcentagem: percentual
        });
      }

      return acc;
    }, [] as typeof gastosProcessados);
  }

  // Sort by date
  gastosProcessados.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // Calculate totals
  const totalValor = gastosProcessados.reduce((acc, g) => acc + g.valorParte, 0);

  // Summary section
  doc.setFontSize(12);
  doc.text(`Total de Lançamentos: ${gastosProcessados.length}`, 14, 32);
  doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 14, 38);

  // Table Data preparation
  const tableData = gastosProcessados.map(g => {
    let responsavelText = g.responsavel;
    if (g.divisoes && g.divisoes.length > 0) {
      responsavelText = 'Dividido';
    }

    let valorText = formatCurrency(g.valor);
    if (responsavelFiltro !== 'todos' && g.valorParte !== g.valor) {
      valorText = `${formatCurrency(g.valorParte)} (${g.porcentagem?.toFixed(0)}% de ${formatCurrency(g.valor)})`;
    }

    return [
      formatDate(g.data),
      g.estabelecimento,
      g.categoria,
      responsavelFiltro === 'todos' ? responsavelText : '',
      g.parcela || '-',
      valorText
    ];
  });

  const columns = [
    'Data', 
    'Estabelecimento', 
    'Categoria', 
    responsavelFiltro === 'todos' ? 'Responsável' : '', 
    'Parcela', 
    'Valor'
  ].filter(Boolean) as string[];

  const rows = tableData.map(row => {
    if (responsavelFiltro !== 'todos') {
      // Remove the 'responsavelText' from the row if filtering by specific person
      return [row[0], row[1], row[2], row[4], row[5]];
    }
    return row;
  });

  autoTable(doc, {
    startY: 45,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
  });

  // Export
  const fileName = `Relatorio_${fatura?.mesReferencia?.replace(/\s/g, '_') || 'Gastos'}${responsavelFiltro !== 'todos' ? `_${responsavelFiltro}` : ''}.pdf`;
  doc.save(fileName);
}
