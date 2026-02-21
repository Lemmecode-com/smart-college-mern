import { useState } from 'react';
import { FaFilePdf, FaFileExcel, FaDownload, FaSpinner } from 'react-icons/fa';
import { exportToPDF, exportToExcel } from '../utils/exportHelpers';
import { toast } from 'react-toastify';

/**
 * Reusable Export Buttons Component
 * @param {string} title - Report title for PDF header
 * @param {Array} columns - Column definitions [{header: 'Name', key: 'name'}]
 * @param {Array} data - Data to export (can be array or async function that returns array)
 * @param {string} filename - Base filename (without extension)
 * @param {boolean} showPDF - Show PDF button (default: true)
 * @param {boolean} showExcel - Show Excel button (default: true)
 */
export default function ExportButtons({
  title = 'Report',
  columns = [],
  data = [],
  filename = 'report',
  showPDF = true,
  showExcel = true
}) {
  const [exporting, setExporting] = useState(null); // 'pdf', 'excel', or null

  const handleExport = async (format) => {
    setExporting(format);

    try {
      // Fetch fresh data if data is a function, otherwise use provided data
      let exportData = data;
      if (typeof data === 'function') {
        exportData = await data();
      }

      if (!exportData || exportData.length === 0) {
        toast.warning('No data to export!', {
          position: 'top-right',
          autoClose: 3000
        });
        setExporting(null);
        return;
      }

      let result;
      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'pdf':
          result = await exportToPDF(
            title,
            columns,
            exportData,
            `${filename}_${timestamp}.pdf`
          );
          break;
        case 'excel':
          result = await exportToExcel(
            title,
            columns,
            exportData,
            `${filename}_${timestamp}.xlsx`
          );
          break;
        default:
          result = { success: false, message: 'Unknown export format' };
      }

      if (result.success) {
        toast.success(result.message, {
          position: 'top-right',
          autoClose: 3000
        });
      } else {
        toast.error(result.message, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.', {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {showPDF && (
        <button
          className={`btn-export btn-export-pdf ${exporting === 'pdf' ? 'exporting' : ''}`}
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          title="Export to PDF"
          style={exportButtonStyle}
        >
          {exporting === 'pdf' ? (
            <>
              <FaSpinner className="spin-icon" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FaFilePdf />
              <span>PDF</span>
            </>
          )}
        </button>
      )}

      {showExcel && (
        <button
          className={`btn-export btn-export-excel ${exporting === 'excel' ? 'exporting' : ''}`}
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
          title="Export to Excel"
          style={exportButtonStyle}
        >
          {exporting === 'excel' ? (
            <>
              <FaSpinner className="spin-icon" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <FaFileExcel />
              <span>Excel</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Button styling
const exportButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '500',
  fontSize: '0.875rem',
  transition: 'all 0.2s ease',
  backgroundColor: '#f8f9fa',
  color: '#495057'
};

// Add CSS styles for export buttons
const style = document.createElement('style');
style.textContent = `
  .btn-export {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    background-color: #f8f9fa;
    color: #495057;
  }

  .btn-export:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .btn-export-pdf:hover:not(:disabled) {
    background-color: #dc3545;
    color: white;
  }

  .btn-export-excel:hover:not(:disabled) {
    background-color: #28a745;
    color: white;
  }

  .btn-export:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-export.exporting {
    background-color: #6c757d;
    color: white;
  }

  .spin-icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
