import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { logger } from './logger';

const arrayBufferToBase64 = async (buffer) => {
  const blob = new Blob([buffer]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

let regularBase64 = null;
let boldBase64 = null;

const loadUnicodeFontBase64 = async () => {
  if (regularBase64 && boldBase64) return;

  const [reg, bold] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load NotoSans-Regular.ttf');
        return r.arrayBuffer();
      })
      .then(arrayBufferToBase64),
    fetch('/fonts/NotoSans-Bold.ttf')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load NotoSans-Bold.ttf');
        return r.arrayBuffer();
      })
      .then(arrayBufferToBase64),
  ]);

  regularBase64 = reg;
  boldBase64 = bold;
};

const registerUnicodeFont = async (doc) => {
  let regularAdded = false;
  let boldAdded = false;

  try {
    await loadUnicodeFontBase64();

    try {
      doc.addFileToVFS('NotoSans-Regular.ttf', regularBase64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      regularAdded = true;
    } catch (e) {
      logger.warn('Failed to register NotoSans Regular font:', e);
    }

    try {
      doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      boldAdded = true;
    } catch (e) {
      logger.warn('Failed to register NotoSans Bold font:', e);
    }
  } catch (error) {
    logger.warn('Failed to load Unicode font files for PDF export:', error);
  }

  return { regular: regularAdded, bold: boldAdded };
};

const setPdfFont = (doc, fontAvailable, style) => {
  const styleKey = style === 'bold' ? 'bold' : 'regular';
  if (fontAvailable[styleKey]) {
    doc.setFont('NotoSans', style);
  } else {
    doc.setFont(undefined, style);
  }
};

const drawPdfHeader = (doc, columns, colWidths, startY, margin, usableWidth, fontAvailable) => {
  const fontSize = 10;
  const cellPaddingX = 3;
  const cellPaddingY = 3;
  const headerPaddingY = 4;
  const lineHeightFactor = 1.35;

  let headerHeight = 0;
  columns.forEach((col, index) => {
    const lines = doc.splitTextToSize(String(col.header || ''), colWidths[index] - cellPaddingX * 2);
    const h = lines.length * fontSize * lineHeightFactor + headerPaddingY * 2;
    if (h > headerHeight) headerHeight = h;
  });
  headerHeight = Math.max(headerHeight, fontSize * lineHeightFactor + headerPaddingY * 2);

  doc.setFillColor(26, 75, 109);
  doc.rect(margin, startY, usableWidth, headerHeight, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.rect(margin, startY, usableWidth, headerHeight, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  setPdfFont(doc, fontAvailable, 'bold');

  columns.forEach((col, index) => {
    const text = String(col.header || '');
    const lines = doc.splitTextToSize(text, colWidths[index] - cellPaddingX * 2);
    const align = col.align || 'left';
    let x = margin + index * colWidths[index];
    if (align === 'center') x += colWidths[index] / 2;
    else if (align === 'right') x += colWidths[index] - cellPaddingX;
    else x += cellPaddingX;

    const y = startY + headerHeight / 2;
    doc.text(lines, x, y, { align: align || 'left', baseline: 'middle', maxWidth: colWidths[index] - cellPaddingX * 2 });
  });

  return startY + headerHeight;
};

const drawPdfTable = (doc, columns, rows, startY, pageWidth, fontAvailable) => {
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  const colWidths = columns.map(col => {
    if (typeof col.width === 'number') {
      const pct = col.width <= 100 ? col.width / 100 : 0;
      return usableWidth * pct;
    }
    return usableWidth / columns.length;
  });

  const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
  if (Math.abs(totalColWidth - usableWidth) > 0.1 && colWidths.length > 0) {
    colWidths[colWidths.length - 1] += usableWidth - totalColWidth;
  }

  const fontSize = 10;
  const cellPaddingX = 3;
  const cellPaddingY = 2.5;
  const lineHeightFactor = 1.35;
  const minRowHeight = fontSize * lineHeightFactor + cellPaddingY * 2;
  const bottomMargin = 14;

  let currentY = drawPdfHeader(doc, columns, colWidths, startY, margin, usableWidth, fontAvailable);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fontSize);

  const availableHeight = doc.internal.pageSize.getHeight() - bottomMargin;

  rows.forEach((row, rowIndex) => {
    const cellLinesList = [];
    let maxLines = 1;

    columns.forEach((col, index) => {
      const value = row[col.dataKey] ?? row[col.key] ?? '';
      const text = value === null || value === undefined ? '' : String(value);
      const lines = doc.splitTextToSize(text, colWidths[index] - cellPaddingX * 2);
      cellLinesList.push(lines);
      if (lines.length > maxLines) maxLines = lines.length;
    });

    let rowHeight = maxLines * fontSize * lineHeightFactor + cellPaddingY * 2;
    rowHeight = Math.max(rowHeight, minRowHeight);

    let rowY;

    if (currentY + rowHeight > availableHeight) {
      doc.addPage();
      currentY = margin;
      currentY = drawPdfHeader(doc, columns, colWidths, currentY, margin, usableWidth, fontAvailable);
      doc.setTextColor(0, 0, 0);
      rowY = currentY;
    } else {
      rowY = currentY;
      currentY += rowHeight;
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(235, 240, 248);
      doc.rect(margin, rowY, usableWidth, rowHeight, 'F');
    }

    doc.setDrawColor(180, 190, 210);
    doc.setLineWidth(0.3);
    doc.rect(margin, rowY, usableWidth, rowHeight, 'S');

    columns.forEach((col, index) => {
      const value = row[col.dataKey] ?? row[col.key] ?? '';
      const text = value === null || value === undefined ? '' : String(value);
      const lines = cellLinesList[index];
      const align = col.align || 'left';
      let x = margin + index * colWidths[index];
      if (align === 'center') x += colWidths[index] / 2;
      else if (align === 'right') x += colWidths[index] - cellPaddingX;
      else x += cellPaddingX;

      const y = rowY + rowHeight / 2;
      setPdfFont(doc, fontAvailable, 'normal');
      doc.text(lines, x, y, { align: align || 'left', baseline: 'middle', maxWidth: colWidths[index] - cellPaddingX * 2 });
    });
  });

  return currentY;
};

/**
 * EXPORT TO PDF - Using jsPDF (manual table drawing, no jspdf-autotable)
 * @param {string} title - Report title
 * @param {Array} columns - Table columns [{header: 'Name', dataKey: 'name', width: 15, align: 'left'}]
 * @param {Array} rows - Table data [{name: 'John', value: 100}]
 * @param {string} filename - Output filename
 */
export const exportToPDF = async (title, columns, rows, filename = 'report.pdf') => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const fontAvailable = await registerUnicodeFont(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const usableWidth = pageWidth - margin * 2;

    doc.setFontSize(18);
    doc.setTextColor(26, 75, 109);
    setPdfFont(doc, fontAvailable, 'bold');
    doc.text(String(title || 'Report'), margin, 14, { baseline: 'top', maxWidth: usableWidth });

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    setPdfFont(doc, fontAvailable, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 23);

    const startY = 30;
    drawPdfTable(doc, columns, rows, startY, pageWidth, fontAvailable);

    doc.save(filename);

    return { success: true, message: 'PDF exported successfully!' };
  } catch (error) {
    logger.error('PDF export failed:', error);
    return { success: false, message: 'Failed to export PDF', error };
  }
};

/**
 * EXPORT TO EXCEL - Using ExcelJS
 * @param {string} title - Report title
 * @param {Array} columns - Table columns [{header: 'Name', key: 'name'}]
 * @param {Array} rows - Table data [{name: 'John', value: 100}]
 * @param {string} filename - Output filename
 */
export const exportToExcel = async (title, columns, rows, filename = 'report.xlsx') => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key || col.dataKey,
      width: 20,
    }));

    worksheet.insertRow(1, [title]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);

    worksheet.insertRow(2, [`Generated on: ${new Date().toLocaleString()}`]);
    const timestampRow = worksheet.getRow(2);
    timestampRow.font = { italic: true, size: 10 };
    worksheet.mergeCells(`A2:${String.fromCharCode(65 + columns.length - 1)}2`);

    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A4B6D' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    rows.forEach((row, index) => {
      const worksheetRow = worksheet.getRow(index + 4);
      columns.forEach((col) => {
        const cell = worksheetRow.getCell(col.key || col.dataKey);
        const value = row[col.key || col.dataKey];
        cell.value = value === null || value === undefined ? '' : value;

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, filename);

    return { success: true, message: 'Excel exported successfully!' };
  } catch (error) {
    logger.error('Excel export failed:', error);
    return { success: false, message: 'Failed to export Excel', error };
  }
};

/**
 * EXPORT CHART AS IMAGE - Using html2canvas
 * @param {string} elementId - DOM element ID to capture
 * @param {string} filename - Output filename
 */
export const exportChartAsImage = async (elementId, filename = 'chart.png') => {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const element = document.getElementById(elementId);

    if (!element) {
      return { success: false, message: 'Chart element not found' };
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    });

    return { success: true, message: 'Chart exported successfully!' };
  } catch (error) {
    logger.error('Chart export failed:', error);
    return { success: false, message: 'Failed to export chart', error };
  }
};

/**
 * FORMAT CURRENCY for reports (Indian Rupee)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * FORMAT PERCENTAGE
 */
export const formatPercentage = (value) => {
  return `${(typeof value === 'number' ? value : 0).toFixed(1)}%`;
};

/**
 * GET STATUS COLOR for reports
 */
export const getStatusColor = (status) => {
  const colors = {
    PAID: '#28a745',
    PARTIAL: '#ffc107',
    DUE: '#dc3545',
    APPROVED: '#28a745',
    PENDING: '#ffc107',
    REJECTED: '#dc3545',
    PRESENT: '#28a745',
    ABSENT: '#dc3545',
  };
  return colors[status] || '#6c757d';
};
