/**
 * useExport — Exportar dashboard a PDF o Excel
 *
 * Dependencias necesarias (instalar una sola vez):
 *   npm install html2canvas jspdf xlsx
 */
import { useCallback, useState } from 'react';
import { useFinance } from '../context/FinanceContext';

// ── lazy loaders (no aumentan el bundle inicial) ──────────────
const loadHtml2Canvas = () => import('html2canvas').then((m) => m.default);
const loadJsPDF       = () => import('jspdf').then((m) => m.default);
const loadXLSX        = () => import('xlsx');

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export function useExport() {
  const {
    rows, ingreso, totalMes, ahorroMes, pctGastos, pctCarro,
    activeMonthLabel, cardsCargos, cards,
  } = useFinance();

  const [exportingPdf,   setExportingPdf]   = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ── PDF: captura el elemento con id="dashboard-export-area" ──
  const exportPDF = useCallback(async (elementId = 'dashboard-export-area') => {
    setExportingPdf(true);
    try {
      const [html2canvas, jsPDF] = await Promise.all([loadHtml2Canvas(), loadJsPDF()]);

      const el = document.getElementById(elementId);
      if (!el) { console.error(`Elemento #${elementId} no encontrado`); return; }

      const canvas = await html2canvas(el, {
        scale: 2,                  // alta resolución
        useCORS: true,
        backgroundColor: '#0a1628', // fondo oscuro del dashboard
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });

      const pdfW  = pdf.internal.pageSize.getWidth();
      const pdfH  = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const imgW  = canvas.width  * ratio;
      const imgH  = canvas.height * ratio;
      const offX  = (pdfW - imgW) / 2;
      const offY  = (pdfH - imgH) / 2;

      pdf.addImage(imgData, 'PNG', offX, offY, imgW, imgH);
      pdf.save(`FinanzasPro_${activeMonthLabel.replace(/\s/g, '_')}.pdf`);
    } catch (e) {
      console.error('Error exportando PDF:', e);
    } finally {
      setExportingPdf(false);
    }
  }, [activeMonthLabel]);

  // ── Excel: genera un .xlsx con 3 hojas ────────────────────────
  const exportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const XLSX = await loadXLSX();

      const wb = XLSX.utils.book_new();

      // ── Hoja 1: Resumen mensual ──────────────────────────────
      const resumenData = [
        ['RESUMEN MENSUAL — ' + activeMonthLabel.toUpperCase()],
        [],
        ['Concepto', 'Valor'],
        ['Ingreso mensual',   fmt(ingreso)],
        ['Total gastos',      fmt(totalMes)],
        ['Ahorro estimado',   fmt(ahorroMes)],
        ['% gastado',         pctGastos + '%'],
        ['% abono carro',     pctCarro + '%'],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [{ wch: 28 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // ── Hoja 2: Tabla de gastos por semana ───────────────────
      const editableRows = rows.filter((r) => r.editable);

      const headers = ['Categoría', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Total mes', '% Ingreso'];

      // ✅ Leer orden desde rows: categorías editables → tarjetas (sumable) → total
      const sumableRows = rows.filter((r) => r.editable || r.sumable);
      const tableData = sumableRows.map((r) => {
        const total = (Number(r.s1)||0) + (Number(r.s2)||0) + (Number(r.s3)||0) + (Number(r.s4)||0);
        const pct   = ingreso > 0 ? ((total / ingreso) * 100).toFixed(1) + '%' : '—';
        return [
          r.categoria || r.id,
          Number(r.s1) || 0,
          Number(r.s2) || 0,
          Number(r.s3) || 0,
          Number(r.s4) || 0,
          total,
          pct,
        ];
      });

      // Fila de totales desde la row 'total' (ya calculada en contexto)
      const totalRow = rows.find((r) => r.id === 'total');
      if (totalRow) {
        const tS1 = Number(totalRow.s1)||0, tS2 = Number(totalRow.s2)||0;
        const tS3 = Number(totalRow.s3)||0, tS4 = Number(totalRow.s4)||0;
        tableData.push(['TOTAL GASTOS', tS1, tS2, tS3, tS4, tS1+tS2+tS3+tS4, pctGastos + '%']);
      }

      const wsTabla = XLSX.utils.aoa_to_sheet([
        ['TABLA DE GASTOS — ' + activeMonthLabel.toUpperCase()],
        [],
        headers,
        ...tableData,
      ]);
      wsTabla['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsTabla, 'Gastos por semana');

      // ── Hoja 3: Tarjetas de crédito ──────────────────────────
      if (cards && cards.length > 0) {
        const cardHeaders = ['Tarjeta', 'Compra', 'Monto total', 'Meses', 'Cuota mensual', 'Fecha compra'];
        const cardRows = [];
        cards.forEach((card) => {
          (card.compras || []).forEach((compra) => {
            const meses  = Number(compra.meses) || 1;
            const cuota  = (Number(compra.monto) || 0) / meses;
            cardRows.push([
              card.nombre || card.id,
              compra.descripcion || '—',
              Number(compra.monto) || 0,
              meses,
              Math.round(cuota * 100) / 100,
              compra.fecha || '—',
            ]);
          });
        });

        if (cardRows.length > 0) {
          const wsTarjetas = XLSX.utils.aoa_to_sheet([
            ['TARJETAS DE CRÉDITO — ' + activeMonthLabel.toUpperCase()],
            [],
            cardHeaders,
            ...cardRows,
          ]);
          wsTarjetas['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 14 }];
          XLSX.utils.book_append_sheet(wb, wsTarjetas, 'Tarjetas');
        }
      }

      XLSX.writeFile(wb, `FinanzasPro_${activeMonthLabel.replace(/\s/g, '_')}.xlsx`);
    } catch (e) {
      console.error('Error exportando Excel:', e);
    } finally {
      setExportingExcel(false);
    }
  }, [rows, ingreso, totalMes, ahorroMes, pctGastos, pctCarro, activeMonthLabel, cardsCargos, cards]);

  return { exportPDF, exportExcel, exportingPdf, exportingExcel };
}