import { formatCurrency, formatDate } from '@/lib/data';
import type { ApiGasto } from '@/lib/api/types';
import type { Fatura } from '@/lib/data';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generatePDFReport(
  fatura: Fatura | null,
  gastos: ApiGasto[],
  responsavelFiltro: string | 'todos' = 'todos'
): Promise<boolean> {
  try {
    const doc = new jsPDF();

    const safeGastos = gastos || [];
    
    // Título
    let title = 'Relatório de Gastos';
    if (fatura && fatura.mesReferencia) {
      title += ` - ${fatura.mesReferencia}`;
    }
    if (responsavelFiltro !== 'todos') {
      title += ` (Responsável: ${responsavelFiltro})`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Filtrar e processar os dados baseados no responsável
    let gastosProcessados: (ApiGasto & { valorParte: number; porcentagem?: number })[] = [];

    if (responsavelFiltro === 'todos') {
      gastosProcessados = safeGastos.map((gasto) => ({
        ...gasto,
        valorParte: Number(gasto.valor) || 0,
      }));
    } else {
      gastosProcessados = safeGastos.reduce((acc, gasto) => {
        let percentual = 0;
        let valorParte = 0;
        const gastoValor = Number(gasto.valor) || 0;

        if (gasto.divisoes && gasto.divisoes.length > 0) {
          const divisao = gasto.divisoes.find(d => d.responsavel === responsavelFiltro);
          if (divisao) {
            valorParte = Number(divisao.valor) || 0;
            percentual = gastoValor > 0 ? (valorParte / gastoValor) * 100 : 0;
          }
        } else if (gasto.responsavel === responsavelFiltro) {
          percentual = 100;
          valorParte = gastoValor;
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

    // Ordenar por data
    gastosProcessados.sort((a, b) => {
      const dateA = a.data ? new Date(a.data).getTime() : 0;
      const dateB = b.data ? new Date(b.data).getTime() : 0;
      return dateA - dateB;
    });

    // Calcular totais
    const totalValor = gastosProcessados.reduce((acc, g) => acc + (g.valorParte || 0), 0);

    // Resumo
    doc.setFontSize(12);
    doc.text(`Total de Lançamentos: ${gastosProcessados.length}`, 14, 32);
    doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 14, 38);

    // Preparação dos dados da tabela
    const tableData = gastosProcessados.map(g => {
      let responsavelText = g.responsavel || '-';
      if (g.divisoes && g.divisoes.length > 0) {
        responsavelText = 'Dividido';
      }

      const gastoValor = Number(g.valor) || 0;
      let valorText = formatCurrency(gastoValor);
      
      if (responsavelFiltro !== 'todos' && g.valorParte !== gastoValor) {
        valorText = `${formatCurrency(g.valorParte)} (${g.porcentagem?.toFixed(0)}% de ${formatCurrency(gastoValor)})`;
      }

      return [
        g.data ? formatDate(g.data) : '-',
        g.estabelecimento || '-',
        g.categoria || '-',
        responsavelFiltro === 'todos' ? responsavelText : '', // Índice 3
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
        // Remover a coluna de 'Responsável' (índice 3) pois ela fica vazia quando filtrado
        return row.filter((_, index) => index !== 3);
      }
      return row;
    });

    if (autoTable) {
      autoTable(doc, {
        startY: 45,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
      });
    } else {
      console.warn("jspdf-autotable plugin not correctly loaded, outputting raw data");
      doc.text("Erro ao carregar layout da tabela. Dados brutos:", 14, 50);
      let y = 60;
      rows.forEach(r => {
        doc.text(r.join(" | "), 14, y);
        y += 10;
      });
    }

    // Exportação
    const mesRef = fatura && fatura.mesReferencia ? fatura.mesReferencia.replace(/\s/g, '_') : 'Gastos';
    const respRef = responsavelFiltro !== 'todos' ? `_${responsavelFiltro}` : '';
    const fileName = `Relatorio_${mesRef}${respRef}.pdf`;
    
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Erro completo na geração do PDF:", error);
    return false;
  }
}
