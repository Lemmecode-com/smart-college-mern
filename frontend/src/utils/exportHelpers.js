import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { logger } from './logger';

/**
 * Draw a simple table manually in jsPDF without jspdf-autotable.
 * This avoids the jspdf v4 + jspdf-autotable v5 incompatibility.
 */
const drawPdfTable = (doc, columns, rows, startY, pageWidth) => {
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / columns.length;
  const rowHeight = 10;
  const headerHeight = 10;
  const fontSize = 11;
  const smallFontSize = 10;

  doc.setFontSize(fontSize);

  // Header background
  doc.setFillColor(26, 75, 109);
  doc.rect(margin, startY, usableWidth, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(smallFontSize);
  doc.setFont(undefined, 'bold');

  columns.forEach((col, index) => {
    const text = String(col.header || '');
    const x = margin + index * colWidth;
    const y = startY + headerHeight / 2;
    const cellText = doc.splitTextToSize(text, colWidth - 4);
    doc.text(cellText, x + 2, y, { baseline: 'middle', maxWidth: colWidth - 4 });
  });

  // Rows
  let currentY = startY + headerHeight;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  rows.forEach((row, rowIndex) => {
    if (currentY + rowHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      currentY = margin;
    }

    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, currentY, usableWidth, rowHeight, 'F');
    }

    columns.forEach((col, index) => {
      const value = row[col.dataKey] ?? row[col.key] ?? '';
      const text = value === null || value === undefined ? '' : String(value);
      const x = margin + index * colWidth;
      const y = currentY + rowHeight / 2;
      const cellText = doc.splitTextToSize(text, colWidth - 4);
      doc.text(cellText, x + 2, y, { baseline: 'middle', maxWidth: colWidth - 4 });
    });

    currentY += rowHeight;
  });

  return currentY;
};

/**
 * EXPORT TO PDF - Using jsPDF (manual table drawing, no jspdf-autotable)
 * @param {string} title - Report title
 * @param {Array} columns - Table columns [{header: 'Name', dataKey: 'name'}]
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const usableWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(26, 75, 109);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(String(title || 'Report'), usableWidth);
    doc.text(titleLines, margin, 16);

    // Timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 22);

    // Table
    const startY = 26;
    drawPdfTable(doc, columns, rows, startY, pageWidth);

    // Save
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

    // Set column widths
    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key || col.dataKey,
      width: 20,
    }));

    // Add title at top first
    worksheet.insertRow(1, [title]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);

    // Add timestamp second
    worksheet.insertRow(2, [`Generated on: ${new Date().toLocaleString()}`]);
    const timestampRow = worksheet.getRow(2);
    timestampRow.font = { italic: true, size: 10 };
    worksheet.mergeCells(`A2:${String.fromCharCode(65 + columns.length - 1)}2`);

    // Style header row at row 3
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

    // Add data rows starting at row 4
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

    // Generate buffer and save
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
