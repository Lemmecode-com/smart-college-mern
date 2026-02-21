import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * EXPORT TO PDF - Using jsPDF + autoTable
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
      format: 'a4'
    });

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(26, 75, 109); // #1a4b6d
    doc.text(title, 14, 20);

    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Convert rows to autoTable format
    const tableColumnDefs = columns.map(col => col.header);
    const tableRows = rows.map(row =>
      columns.map(col => {
        const value = row[col.dataKey] ?? row[col.key] ?? '';
        // Handle 0 and false values explicitly
        return value === null || value === undefined ? '' : String(value);
      })
    );

    // Generate table
    autoTable(doc, {
      head: [tableColumnDefs],
      body: tableRows,
      startY: 35,
      theme: 'striped',
      headStyles: {
        fillColor: [26, 75, 109], // #1a4b6d
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { top: 35 }
    });

    // Save the PDF
    doc.save(filename);
    
    return { success: true, message: 'PDF exported successfully!' };
  } catch (error) {
    console.error('PDF export error:', error);
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
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key || col.dataKey,
      width: 20
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A4B6D' } // #1a4b6d
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    rows.forEach((row, index) => {
      const worksheetRow = worksheet.getRow(index + 2);
      columns.forEach(col => {
        const cell = worksheetRow.getCell(col.key || col.dataKey);
        const value = row[col.key || col.dataKey];
        // Handle 0 and false values explicitly - don't convert to empty string
        cell.value = value === null || value === undefined ? '' : value;

        // Add borders
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Add title at top
    worksheet.insertRow(1, [title]);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);

    // Add timestamp
    const timestampRow = worksheet.insertRow(3, [`Generated on: ${new Date().toLocaleString()}`]);
    timestampRow.font = { italic: true, size: 10 };
    worksheet.mergeCells(`A3:${String.fromCharCode(65 + columns.length - 1)}3`);

    // Generate buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, filename);

    return { success: true, message: 'Excel exported successfully!' };
  } catch (error) {
    console.error('Excel export error:', error);
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
      scale: 2 // Higher quality
    });

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    });

    return { success: true, message: 'Chart exported successfully!' };
  } catch (error) {
    console.error('Chart export error:', error);
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
    maximumFractionDigits: 0
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
    ABSENT: '#dc3545'
  };
  return colors[status] || '#6c757d';
};
