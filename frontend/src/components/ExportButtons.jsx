import { useState, useContext, useEffect } from "react";
import { FaFilePdf, FaFileExcel, FaDownload, FaSpinner, FaLock } from "react-icons/fa";
import { exportToPDF, exportToExcel } from "../utils/exportHelpers";
import { toast } from "react-toastify";
import { AuthContext } from "../auth/AuthContext";
import { getGeneralSettings } from "../api/generalSettings";

/**
 * Reusable Export Buttons Component (#583)
 * Enforces institution allowDataExport policy (allowed, restricted, disabled).
 *
 * @param {string} title - Report title for PDF header
 * @param {Array} columns - Column definitions [{header: 'Name', key: 'name'}]
 * @param {Array} data - Data to export (can be array or async function that returns array)
 * @param {string} filename - Base filename (without extension)
 * @param {boolean} showPDF - Show PDF button (default: true)
 * @param {boolean} showExcel - Show Excel button (default: true)
 * @param {string} [allowDataExport] - Explicit policy ('allowed' | 'restricted' | 'disabled')
 * @param {string} [userRole] - Explicit user role override
 * @param {boolean} [hideWhenDisabled=false] - Hide buttons entirely when export is blocked
 */
export default function ExportButtons({
  title = "Report",
  columns = [],
  pdfColumns,
  excelColumns,
  data = [],
  filename = "report",
  showPDF = true,
  showExcel = true,
  allowDataExport: propExportPolicy,
  userRole: propUserRole,
  hideWhenDisabled = false,
}) {
  const [exporting, setExporting] = useState(null); // 'pdf', 'excel', or null
  const auth = useContext(AuthContext);
  const currentUserRole = propUserRole || auth?.user?.role;
  const [policy, setPolicy] = useState(propExportPolicy || null);

  useEffect(() => {
    if (propExportPolicy) {
      setPolicy(propExportPolicy);
      return;
    }

    let isMounted = true;
    if (currentUserRole !== "SUPER_ADMIN" && !policy) {
      getGeneralSettings()
        .then((res) => {
          if (isMounted && res?.allowDataExport) {
            setPolicy(res.allowDataExport);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [propExportPolicy, currentUserRole, policy]);

  // Compute export permissions
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";
  const effectivePolicy = policy || "restricted";

  let isAllowed = true;
  let disabledReason = "";

  if (!isSuperAdmin) {
    if (effectivePolicy === "disabled") {
      isAllowed = false;
      disabledReason = "Data export is disabled by your institution policy.";
    } else if (effectivePolicy === "restricted") {
      const privilegedRoles = ["COLLEGE_ADMIN", "PRINCIPAL", "SUPER_ADMIN"];
      if (!privilegedRoles.includes(currentUserRole)) {
        isAllowed = false;
        disabledReason = "Data export is restricted to administrators and principals only.";
      }
    }
  }

  if (!isAllowed && hideWhenDisabled) {
    return null;
  }

  const handleExport = async (format) => {
    if (!isAllowed) {
      toast.error(disabledReason || "Data export is not permitted.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setExporting(format);

    try {
      // Fetch fresh data if data is a function, otherwise use provided data
      let exportData = data;
      if (typeof data === "function") {
        exportData = data(); // Call the function (can be sync or async)
        // If it returns a promise, wait for it
        if (exportData && typeof exportData.then === "function") {
          exportData = await exportData;
        }
      }

      if (!exportData || exportData.length === 0) {
        toast.warning("No data to export!", {
          position: "top-right",
          autoClose: 3000,
        });
        setExporting(null);
        return;
      }

      let result;
      const timestamp = new Date().toISOString().split("T")[0];

      switch (format) {
        case "pdf":
          result = await exportToPDF(
            title,
            pdfColumns || columns,
            exportData,
            `${filename}_${timestamp}.pdf`,
          );
          break;
        case "excel":
          result = await exportToExcel(
            title,
            excelColumns || columns,
            exportData,
            `${filename}_${timestamp}.xlsx`,
          );
          break;
        default:
          result = { success: false, message: "Unknown export format" };
      }

      if (result.success) {
        toast.success(result.message, {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        toast.error(result.message, {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      toast.error(serverMsg || "Export failed. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setExporting(null);
    }
  };

  const buttonStyle = {
    ...exportButtonStyle,
    ...(isAllowed ? {} : { opacity: 0.5, cursor: "not-allowed" }),
  };

  return (
    <div
      className="export-buttons erp-actions-stack-mobile"
      style={{ display: "flex", gap: "0.5rem" }}
    >
      {showPDF && (
        <button
          className={`btn-export btn-export-pdf ${exporting === "pdf" ? "exporting" : ""}`}
          onClick={() => handleExport("pdf")}
          disabled={!isAllowed || exporting !== null}
          title={!isAllowed ? disabledReason : "Export to PDF"}
          style={buttonStyle}
        >
          {exporting === "pdf" ? (
            <>
              <FaSpinner className="spin-icon" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              {!isAllowed ? <FaLock /> : <FaFilePdf />}
              <span>PDF</span>
            </>
          )}
        </button>
      )}

      {showExcel && (
        <button
          className={`btn-export btn-export-excel ${exporting === "excel" ? "exporting" : ""}`}
          onClick={() => handleExport("excel")}
          disabled={!isAllowed || exporting !== null}
          title={!isAllowed ? disabledReason : "Export to Excel"}
          style={buttonStyle}
        >
          {exporting === "excel" ? (
            <>
              <FaSpinner className="spin-icon" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              {!isAllowed ? <FaLock /> : <FaFileExcel />}
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
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.5rem 1rem",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.875rem",
  transition: "all 0.2s ease",
  backgroundColor: "#f8f9fa",
  color: "black",
};

// Add CSS styles for export buttons
if (typeof document !== "undefined") {
  const style = document.createElement("style");
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
    color: white;
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
}
