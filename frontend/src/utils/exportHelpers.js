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

// Helper: compute cumulative left x-offset for column at `index`
const colX = (colWidths, index) => colWidths.slice(0, index).reduce((s, w) => s + w, 0);

const drawPdfHeader = (doc, columns, colWidths, startY, margin, usableWidth, fontAvailable) => {
  // Use a slightly smaller font for headers so long labels stay single-line
  const fontSize = 9.5;
  const cellPaddingX = 3;
  const headerPaddingY = 3.5;
  const lineHeightFactor = 1.3;

  // Cap header height to a single-line height (headers must NOT wrap to multiple lines)
  const singleLineH = fontSize * lineHeightFactor + headerPaddingY * 2;
  const headerHeight = singleLineH;

  doc.setFillColor(26, 75, 109);
  doc.rect(margin, startY, usableWidth, headerHeight, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.rect(margin, startY, usableWidth, headerHeight, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  setPdfFont(doc, fontAvailable, 'bold');

  columns.forEach((col, index) => {
    const align = col.align || 'left';
    // Use cumulative offset so columns never overlap
    const colLeft = margin + colX(colWidths, index);
    let x;
    if (align === 'center') x = colLeft + colWidths[index] / 2;
    else if (align === 'right') x = colLeft + colWidths[index] - cellPaddingX;
    else x = colLeft + cellPaddingX;

    // Truncate header text to fit in one line if needed
    const maxW = colWidths[index] - cellPaddingX * 2;
    const text = String(col.header || '');
    const y = startY + headerHeight / 2;
    doc.text(text, x, y, { align: align || 'left', baseline: 'middle', maxWidth: maxW });
  });

  return startY + headerHeight;
};

/**
 * Draw a full table. Returns the Y position after the last row.
 * @param {object} doc jsPDF instance
 * @param {Array}  columns column definitions
 * @param {Array}  rows    data rows
 * @param {number} startY  top Y to start drawing
 * @param {number} pageWidth full page width in mm
 * @param {object} fontAvailable {regular, bold}
 * @param {object} [opts] optional flags: { forceNewPage: boolean }
 */
const drawPdfTable = (doc, columns, rows, startY, pageWidth, fontAvailable, opts = {}) => {
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  // Interpret col.width as a percentage (0-100). Normalise so they always sum to usableWidth.
  let rawWidths = columns.map(col => {
    if (typeof col.width === 'number' && col.width > 0) {
      // Treat values > 100 as raw mm, ≤ 100 as percent
      return col.width <= 100 ? col.width : col.width;
    }
    return 100 / columns.length; // equal share
  });

  // If all widths are expressed as percentages (≤100 each) normalise their sum to 100
  const rawSum = rawWidths.reduce((a, b) => a + b, 0);
  const colWidths = rawWidths.map(w => (w / rawSum) * usableWidth);

  // Safety: make sure total == usableWidth (floating point drift)
  const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
  if (Math.abs(totalColWidth - usableWidth) > 0.01 && colWidths.length > 0) {
    colWidths[colWidths.length - 1] += usableWidth - totalColWidth;
  }

  const fontSize = 10;      // 10pt body text
  const cellPaddingX = 2.5; // horizontal padding
  const cellPaddingY = 2;   // vertical padding
  const lineHeightFactor = 1.35;
  const minRowHeight = fontSize * lineHeightFactor + cellPaddingY * 2;
  const bottomMargin = 14;
  const availableHeight = doc.internal.pageSize.getHeight() - bottomMargin;

  // ── Orphan-header guard ───────────────────────────────────────────────────
  // Estimate the height the table header will consume
  const headerFontSize = 9.5;
  const headerH = headerFontSize * 1.3 + 3.5 * 2; // matches drawPdfHeader constants
  // Estimate a typical row height (single line)
  const estimatedRowH = minRowHeight;
  // If forced (caller says so) OR if fewer than 2 rows fit after the header,
  // start on a fresh page.
  const remainingAfterHeader = availableHeight - startY - headerH;
  if (opts.forceNewPage || remainingAfterHeader < estimatedRowH * 2) {
    doc.addPage();
    startY = margin;
  }
  // ─────────────────────────────────────────────────────────────────────────

  let currentY = drawPdfHeader(doc, columns, colWidths, startY, margin, usableWidth, fontAvailable);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(fontSize);

  rows.forEach((row, rowIndex) => {
    // Pre-compute wrapped lines for every cell — use index directly (O(1))
    const cellLinesList = [];
    let maxLines = 1;

    columns.forEach((col, colIdx) => {
      const value = row[col.dataKey] ?? row[col.key] ?? '';
      const text = value === null || value === undefined ? '' : String(value);
      const maxW = colWidths[colIdx] - cellPaddingX * 2;
      const lines = doc.splitTextToSize(text, maxW);
      cellLinesList.push(lines);
      if (lines.length > maxLines) maxLines = lines.length;
    });

    let rowHeight = maxLines * fontSize * lineHeightFactor + cellPaddingY * 2;
    rowHeight = Math.max(rowHeight, minRowHeight);

    // Page break: never split a row
    if (currentY + rowHeight > availableHeight) {
      doc.addPage();
      currentY = margin;
      currentY = drawPdfHeader(doc, columns, colWidths, currentY, margin, usableWidth, fontAvailable);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(fontSize);
    }

    const rowY = currentY;
    currentY += rowHeight;

    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(235, 240, 248);
      doc.rect(margin, rowY, usableWidth, rowHeight, 'F');
    }

    doc.setDrawColor(180, 190, 210);
    doc.setLineWidth(0.2);
    doc.rect(margin, rowY, usableWidth, rowHeight, 'S');

    // Draw cell text using cumulative column x offsets
    columns.forEach((col, index) => {
      const lines = cellLinesList[index];
      const align = col.align || 'left';
      const colLeft = margin + colX(colWidths, index);
      let x;
      if (align === 'center') x = colLeft + colWidths[index] / 2;
      else if (align === 'right') x = colLeft + colWidths[index] - cellPaddingX;
      else x = colLeft + cellPaddingX;

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
export const exportToPDF = async (title, columns, rows, filename = 'report.pdf', options = {}) => {
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

    // Title block: 18pt title at top=14. Leave 8mm gap below before metadata.
    const TITLE_H = 8; // approximate height of 18pt title line
    let currentY = 14 + TITLE_H + 2; // y-baseline after the title

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    setPdfFont(doc, fontAvailable, 'normal');

    if (options && options.filterMetadata) {
      // Wrap filter metadata text (can be long)
      const filterLines = doc.splitTextToSize(String(options.filterMetadata), usableWidth);
      doc.text(filterLines, margin, currentY, { baseline: 'top' });
      currentY += filterLines.length * 9 * 0.352 + 3; // approx mm per line at 9pt
    }
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, currentY, { baseline: 'top' });
    currentY += 9 * 0.352 + 6; // gap before first section

    const pageH = doc.internal.pageSize.getHeight();
    const SECTION_TITLE_H = 6;   // font size 12pt ≈ ~4.2mm + some padding
    const MIN_SECTION_GAP = 16;  // minimum space required to start a section

    if (options && options.sections && Array.isArray(options.sections) && options.sections.length > 0) {
      options.sections.forEach((sec, idx) => {
        // Between sections: add a gap of 10mm (not for the very first)
        if (idx > 0) {
          currentY += 10;
        }

        // Estimate total height of this section (header + all rows at minRowHeight)
        const secBodyFontSize = 10;
        const secMinRowH = secBodyFontSize * 1.35 + 2 * 2;
        const secHeaderH = 9.5 * 1.3 + 3.5 * 2;
        const secTitleH = sec.title ? SECTION_TITLE_H + 3 : 0;
        const secRows = (sec.rows || []).length;
        const estimatedSecH = secTitleH + secHeaderH + secRows * secMinRowH;

        // If the entire section fits on the remaining page, keep it there.
        // Otherwise, if there isn't even room for title + header + 2 rows, go to new page.
        const remainingOnPage = pageH - 14 - currentY;
        const minNeeded = secTitleH + secHeaderH + secMinRowH * 2;
        const forceNewPage = remainingOnPage < minNeeded;

        if (sec.title) {
          if (forceNewPage) {
            doc.addPage();
            currentY = 14;
          }
          doc.setFontSize(12);
          doc.setTextColor(26, 75, 109);
          setPdfFont(doc, fontAvailable, 'bold');
          doc.text(String(sec.title), margin, currentY, { baseline: 'top' });
          currentY += SECTION_TITLE_H + 3; // 3mm gap between title and table
        }

        // Pass forceNewPage=false here because we already handled the page break above.
        // The orphan guard inside drawPdfTable will still fire if the header alone
        // won't fit on the remaining space (e.g. no title but header near bottom).
        currentY = drawPdfTable(
          doc, sec.columns || [], sec.rows || [], currentY, pageWidth, fontAvailable,
          { forceNewPage: !sec.title && forceNewPage }
        );
      });
    } else {
      drawPdfTable(doc, columns, rows, currentY, pageWidth, fontAvailable);
    }

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
 * @param {Object} options - Optional { filterMetadata: string, sheets: [{ name, title, columns, rows }] }
 */
export const exportToExcel = async (title, columns, rows, filename = 'report.xlsx', options = {}) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NOVAA ERP';
    workbook.created = new Date();

    if (options && options.sheets && Array.isArray(options.sheets) && options.sheets.length > 0) {
      options.sheets.forEach((sheetConfig) => {
        const worksheet = workbook.addWorksheet(sheetConfig.name || 'Sheet');
        const sheetCols = sheetConfig.columns || [];
        const sheetRows = sheetConfig.rows || [];
        const colCount = Math.max(sheetCols.length, 4);
        // Build end column letter, handling >26 columns with two-letter notation
        const endLetter = colCount <= 26
          ? String.fromCharCode(64 + colCount)
          : String.fromCharCode(64 + Math.floor((colCount - 1) / 26)) +
            String.fromCharCode(64 + ((colCount - 1) % 26) + 1);

        // ── Row 1: Sheet title ───────────────────────────────────────────────
        worksheet.addRow([sheetConfig.title || title]);
        worksheet.mergeCells(`A1:${endLetter}1`);
        const tRow = worksheet.getRow(1);
        tRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        tRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A4B6D' } };
        tRow.alignment = { horizontal: 'center', vertical: 'middle' };
        tRow.height = 28;

        // ── Row 2: Filter metadata (wrap so full text is always visible) ─────
        const filterText = options.filterMetadata || '';
        worksheet.addRow([filterText]);
        worksheet.mergeCells(`A2:${endLetter}2`);
        const mRow = worksheet.getRow(2);
        mRow.font = { italic: true, size: 9, color: { argb: 'FF334155' } };
        mRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        // wrapText ensures long filter strings are visible without truncation
        mRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        mRow.height = 30; // slightly taller to accommodate wrapped text

        // ── Row 3: Generated on timestamp ────────────────────────────────────
        worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.mergeCells(`A3:${endLetter}3`);
        const gRow = worksheet.getRow(3);
        gRow.font = { italic: true, size: 8.5, color: { argb: 'FF64748B' } };
        gRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        gRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        gRow.height = 18;

        // ── Row 4: Column headers ─────────────────────────────────────────────
        if (sheetCols.length > 0) {
          // Set column widths (must be set before addRow for keys to work)
          worksheet.columns = sheetCols.map((c) => ({
            key: c.key || c.dataKey,
            width: c.width || 22,
          }));

          const headerRow = worksheet.addRow(sheetCols.map((c) => c.header));
          headerRow.height = 24;
          headerRow.eachCell((cell, colNumber) => {
            const colDef = sheetCols[colNumber - 1];
            const isPercent = colDef && colDef.isPercent;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E3746' } };
            cell.alignment = {
              horizontal: isPercent ? 'right' : (colDef && colDef.align) || 'left',
              vertical: 'middle',
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });

          // ── Data rows (start at row 5) ──────────────────────────────────────
          const dataRows = sheetRows.length > 0
            ? sheetRows
            : [{ [sheetCols[0].key || sheetCols[0].dataKey]: sheetConfig.emptyMessage || 'No data' }];
          const isEmpty = sheetRows.length === 0;

          dataRows.forEach((r, rIdx) => {
            const rValues = sheetCols.map((c) => {
              const key = c.key || c.dataKey;
              const raw = r[key];
              if (isEmpty) return rIdx === 0 && c === sheetCols[0] ? (sheetConfig.emptyMessage || 'No data') : '';
              // For percent columns: store as decimal fraction so Excel numFmt '0%' renders correctly
              // e.g. 75 → 0.75 with numFmt '0%' shows "75%"; 'N/A' stays as text
              if (c.isPercent && typeof raw === 'number') {
                return raw / 100;
              }
              // Row-level _pct flag: value is already pre-divided (e.g. Summary avg rate)
              return raw ?? '';
            });
            const dRow = worksheet.addRow(rValues);
            dRow.height = 20;
            const isEven = rIdx % 2 === 0;

            dRow.eachCell((cell, colNumber) => {
              const colDef = sheetCols[colNumber - 1];
              const isPercent = colDef && colDef.isPercent;
              // Row-level percent: applies to any value cell when row has _pct:true
              const isRowPct = r._pct && typeof cell.value === 'number';
              cell.font = { size: 9.5 };
              cell.alignment = {
                horizontal: (isPercent || isRowPct) ? 'right' : (colDef && colDef.align) || 'left',
                vertical: 'middle',
              };
              // Apply percent number format when column or row is flagged
              if ((isPercent && typeof cell.value === 'number') || isRowPct) {
                cell.numFmt = '0%';
              }
              if (!isEven && !isEmpty) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
              }
              cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } },
              };
            });
          });
        }
      });
    } else {
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

      const metaText = options && options.filterMetadata
        ? `${options.filterMetadata} | Generated: ${new Date().toLocaleString()}`
        : `Generated on: ${new Date().toLocaleString()}`;
      worksheet.insertRow(2, [metaText]);
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
    }

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
