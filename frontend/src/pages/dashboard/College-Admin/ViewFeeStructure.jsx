import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { exportToPDF, exportToExcel } from "../../../utils/exportHelpers";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import {
  FaMoneyBillWave,
  FaLayerGroup,
  FaUsers,
  FaArrowLeft,
  FaDownload,
  FaFilePdf,
  FaFileExcel,
  FaCalendarAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUserEdit,
  FaChartPie,
  FaArrowUp,
  FaShieldAlt,
  FaBolt
} from "react-icons/fa";

/* ================= DESIGN SYSTEM CONSTANTS ================= */
const COLORS = {
  // Primary palette (matching sidebar)
  primary: {
    dark: '#0f3a4a',
    main: '#134952',
    light: '#1a5a6a',
    accent: '#4fc3f7',
    glow: 'rgba(79, 195, 247, 0.4)'
  },
  // Secondary palette
  secondary: {
    teal: '#0d9488',
    cyan: '#06b6d4',
    blue: '#3b82f6'
  },
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  // Glass effects
  glass: {
    light: 'rgba(255, 255, 255, 0.95)',
    medium: 'rgba(255, 255, 255, 0.85)',
    dark: 'rgba(15, 58, 74, 0.95)'
  }
};

const USER_ROLES = {
  COLLEGE_ADMIN: 'COLLEGE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
};

const EXPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel'
};

const FEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft'
};

const STATUS_CONFIG = {
  [FEE_STATUS.ACTIVE]: { label: 'Active', color: COLORS.success, bg: 'rgba(16, 185, 129, 0.1)' },
  [FEE_STATUS.INACTIVE]: { label: 'Inactive', color: COLORS.gray[500], bg: 'rgba(107, 114, 128, 0.1)' },
  [FEE_STATUS.DRAFT]: { label: 'Draft', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)' }
};

const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect to server. Please check your internet connection.',
  NOT_FOUND: 'Fee structure not found. It may have been deleted or the URL is incorrect.',
  UNAUTHORIZED: 'You do not have permission to view this fee structure.',
  SERVER: 'Server error occurred. Please try again later.',
  INVALID_ID: 'Invalid fee structure ID. Please check the URL.',
  LOAD_FAILED: 'Failed to load fee structure',
  EXPORT_FAILED: 'Export failed. Please try again.'
};

const HTTP_ERROR_MAP = {
  400: ERROR_MESSAGES.INVALID_ID,
  401: ERROR_MESSAGES.UNAUTHORIZED,
  403: ERROR_MESSAGES.UNAUTHORIZED,
  404: ERROR_MESSAGES.NOT_FOUND,
  500: ERROR_MESSAGES.SERVER,
  502: ERROR_MESSAGES.NETWORK,
  503: ERROR_MESSAGES.NETWORK
};

const VALIDATION_PATTERNS = {
  MONGO_OBJECT_ID: /^[0-9a-fA-F]{24}$/
};

/* ================= UTILITY FUNCTIONS ================= */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

const isValidObjectId = (id) => {
  return VALIDATION_PATTERNS.MONGO_OBJECT_ID.test(id);
};

const calculateInstallmentSum = (installments) => {
  if (!Array.isArray(installments)) return 0;
  return installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
};

const getRelativeTime = (dateString) => {
  if (!dateString) return { text: 'N/A', type: 'normal' };
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} days overdue`, type: 'overdue' };
  } else if (diffDays === 0) {
    return { text: 'Due today', type: 'today' };
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, type: 'soon' };
  } else {
    return { text: formatDate(dateString), type: 'normal' };
  }
};

/* ================= REUSABLE COMPONENTS ================= */

// Stat Card Component - Enterprise Design
function StatCard({ icon, label, value, subValue, color = 'primary', trend }) {
  const colorMap = {
    primary: { bg: 'rgba(15, 58, 74, 0.08)', color: COLORS.primary.main, icon: COLORS.primary.accent },
    success: { bg: 'rgba(16, 185, 129, 0.08)', color: COLORS.success, icon: COLORS.success },
    warning: { bg: 'rgba(245, 158, 11, 0.08)', color: COLORS.warning, icon: COLORS.warning },
    danger: { bg: 'rgba(239, 68, 68, 0.08)', color: COLORS.danger, icon: COLORS.danger },
    info: { bg: 'rgba(59, 130, 246, 0.08)', color: COLORS.info, icon: COLORS.info },
    teal: { bg: 'rgba(13, 148, 136, 0.08)', color: COLORS.secondary.teal, icon: COLORS.secondary.teal }
  };

  const theme = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-card-enterprise">
      <div className="stat-card-body">
        <div className="stat-card-icon" style={{ backgroundColor: theme.bg, color: theme.icon }}>
          {icon}
        </div>
        <div className="stat-card-content">
          <div className="stat-card-label">{label}</div>
          <div className="stat-card-value" style={{ color: theme.color }}>{value}</div>
          {subValue && <div className="stat-card-sub">{subValue}</div>}
          {trend && (
            <div className={`stat-card-trend ${trend > 0 ? 'trend-up' : 'trend-down'}`}>
              <FaArrowUp className="trend-icon" />
              <span>{Math.abs(trend)}% from last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[FEE_STATUS.DRAFT];
  return (
    <span 
      className="status-badge-enterprise"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span className="status-dot" style={{ backgroundColor: config.color }}></span>
      {config.label}
    </span>
  );
}

// Info Row Component
function InfoRow({ icon, label, value, iconColor = COLORS.primary.accent }) {
  return (
    <div className="info-row-enterprise">
      <div className="info-row-icon" style={{ color: iconColor }}>
        {icon}
      </div>
      <div className="info-row-content">
        <div className="info-row-label">{label}</div>
        <div className="info-row-value">{value || '-'}</div>
      </div>
    </div>
  );
}

// Installment Card Component (for mobile)
function InstallmentCard({ installment, index, isOverdue }) {
  const relativeTime = getRelativeTime(installment.dueDate);
  
  return (
    <div className={`installment-card-mobile ${isOverdue ? 'overdue' : ''}`}>
      <div className="installment-card-header">
        <div className="installment-number">{index + 1}</div>
        <div className="installment-name">{installment.name}</div>
        {isOverdue && (
          <span className="overdue-badge">
            <FaExclamationTriangle className="me-1" />
            Overdue
          </span>
        )}
      </div>
      
      <div className="installment-card-body">
        <div className="installment-field">
          <span className="field-label">Amount</span>
          <span className="field-value amount">{formatCurrency(installment.amount)}</span>
        </div>
        <div className="installment-field">
          <span className="field-label">Due Date</span>
          <span className={`field-value ${relativeTime.type === 'overdue' ? 'overdue' : relativeTime.type === 'soon' ? 'soon' : ''}`}>
            {relativeTime.text}
          </span>
        </div>
      </div>
    </div>
  );
}

// Installment Table Component
function InstallmentTable({ installments, totalFee, calculatedSum }) {
  const mismatch = Math.abs(totalFee - calculatedSum);
  const hasMismatch = mismatch > 0;

  if (!installments || installments.length === 0) {
    return (
      <div className="empty-state-enterprise">
        <div className="empty-state-icon">📋</div>
        <h5 className="empty-state-title">No Installments Found</h5>
        <p className="empty-state-description">This fee structure does not have any installments defined.</p>
      </div>
    );
  }

  return (
    <div className="installments-container">
      {hasMismatch && (
        <div className="validation-warning">
          <FaExclamationTriangle className="warning-icon" />
          <div className="warning-content">
            <strong>Fee Mismatch Detected</strong>
            <p className="warning-text">
              The sum of installments ({formatCurrency(calculatedSum)}) does not match the total fee ({formatCurrency(totalFee)}). 
              Difference: <strong>{formatCurrency(mismatch)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="table-responsive d-none d-md-block">
        <table className="table-enterprise" role="grid" aria-label="Fee installment breakdown">
          <caption className="visually-hidden">Fee installment breakdown showing installment name, amount, and due date</caption>
          <thead>
            <tr>
              <th scope="col" className="col-index">#</th>
              <th scope="col" className="col-name">Installment</th>
              <th scope="col" className="col-amount text-end">Amount</th>
              <th scope="col" className="col-due text-center">Due Date</th>
              <th scope="col" className="col-status text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment, index) => {
              const relativeTime = getRelativeTime(installment.dueDate);
              const isOverdue = relativeTime.type === 'overdue';
              
              return (
                <tr key={installment._id || index} className={isOverdue ? 'row-overdue' : ''}>
                  <td className="cell-index">{index + 1}</td>
                  <td className="cell-name">{installment.name}</td>
                  <td className="cell-amount text-end">{formatCurrency(installment.amount)}</td>
                  <td className="cell-due text-center">
                    <div className="due-date-primary">{formatDate(installment.dueDate)}</div>
                    {relativeTime.type !== 'normal' && (
                      <div className={`due-date-relative ${relativeTime.type}`}>
                        {relativeTime.text}
                      </div>
                    )}
                  </td>
                  <td className="cell-status text-center">
                    {isOverdue ? (
                      <span className="status-badge status-overdue">
                        <FaExclamationTriangle className="me-1" />
                        Overdue
                      </span>
                    ) : relativeTime.type === 'today' ? (
                      <span className="status-badge status-today">
                        <FaClock className="me-1" />
                        Due Today
                      </span>
                    ) : (
                      <span className="status-badge status-scheduled">
                        <FaCheckCircle className="me-1" />
                        Scheduled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="d-md-none">
        {installments.map((installment, index) => {
          const isOverdue = getRelativeTime(installment.dueDate).type === 'overdue';
          return (
            <InstallmentCard
              key={installment._id || index}
              installment={installment}
              index={index}
              isOverdue={isOverdue}
            />
          );
        })}
      </div>
    </div>
  );
}

// Skeleton Loader Component
function SkeletonLoader() {
  return (
    <div className="fee-structure-page">
      <div className="page-header-enterprise">
        <div className="skeleton skeleton-title" style={{ width: '280px', height: '36px' }}></div>
        <div className="skeleton skeleton-subtitle" style={{ width: '200px', height: '18px' }}></div>
      </div>

      <div className="stats-grid-enterprise">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card" style={{ height: '120px' }}></div>
        ))}
      </div>

      <div className="content-card-enterprise">
        <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '20px' }}></div>
        <div className="skeleton" style={{ width: '100%', height: '250px' }}></div>
      </div>
    </div>
  );
}

// Error Display Component
function ErrorDisplay({ error, onRetry }) {
  return (
    <div className="fee-structure-page">
      <div className="error-container-enterprise">
        <div className="error-card">
          <div className="error-icon-wrapper">
            <FaExclamationTriangle className="error-icon" />
          </div>
          <h3 className="error-title">Unable to Load Fee Structure</h3>
          <p className="error-message">{error}</p>
          {onRetry && (
            <button className="btn-retry-enterprise" onClick={onRetry}>
              <FaClock className="me-2" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function ViewFeeStructure() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [validationWarning, setValidationWarning] = useState(null);

  /* ================= SECURITY & VALIDATION ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== USER_ROLES.COLLEGE_ADMIN) return <Navigate to="/dashboard" replace />;

  const isIdValid = useMemo(() => {
    if (!id) return false;
    return isValidObjectId(id);
  }, [id]);

  /* ================= LOAD STRUCTURE ================= */
  const loadFeeStructure = useCallback(async () => {
    if (!isIdValid) {
      setError(ERROR_MESSAGES.INVALID_ID);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/fees/structure/${id}`);
      const feeData = res.data.feeStructure || res.data;
      setFee(feeData);

      if (feeData && feeData.installments) {
        const calculatedSum = calculateInstallmentSum(feeData.installments);
        const totalFee = Number(feeData.totalFee) || 0;
        if (Math.abs(calculatedSum - totalFee) > 0) {
          setValidationWarning({
            type: 'mismatch',
            message: `Installment sum (${formatCurrency(calculatedSum)}) doesn't match total fee (${formatCurrency(totalFee)})`
          });
        } else {
          setValidationWarning({
            type: 'valid',
            message: 'Fee calculation verified'
          });
        }
      }
    } catch (err) {
      console.error('Load error:', err);
      const status = err.response?.status;
      const specificError = HTTP_ERROR_MAP[status] || ERROR_MESSAGES.LOAD_FAILED;
      setError(specificError);
    } finally {
      setLoading(false);
    }
  }, [id, isIdValid]);

  useEffect(() => {
    loadFeeStructure();
  }, [loadFeeStructure]);

  /* ================= EXPORT HANDLERS ================= */
  const handleExport = useCallback(async (format) => {
    if (!fee) {
      toast.warning('No data to export!');
      return;
    }

    try {
      setExporting(true);
      
      const columns = [
        { header: 'Course', key: 'course' },
        { header: 'Category', key: 'category' },
        { header: 'Installment #', key: 'installmentNum' },
        { header: 'Installment Name', key: 'installmentName' },
        { header: 'Amount (₹)', key: 'amount' },
        { header: 'Due Date', key: 'dueDate' }
      ];

      const rows = fee.installments.map((inst, idx) => ({
        course: fee.course_id?.name || 'N/A',
        category: fee.category || 'N/A',
        installmentNum: idx + 1,
        installmentName: inst.name,
        amount: inst.amount,
        dueDate: formatDate(inst.dueDate)
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      const courseName = fee.course_id?.name?.replace(/\s+/g, '_') || 'unknown';
      const filename = `fee_structure_${courseName}_${timestamp}`;

      let result;
      switch (format) {
        case EXPORT_FORMATS.PDF:
          result = await exportToPDF(
            `Fee Structure: ${fee.course_id?.name || 'Unknown'}`,
            columns,
            rows,
            `${filename}.pdf`
          );
          break;
        case EXPORT_FORMATS.EXCEL:
          result = await exportToExcel(
            `Fee Structure: ${fee.course_id?.name || 'Unknown'}`,
            columns,
            rows,
            `${filename}.xlsx`
          );
          break;
        default:
          result = { success: false, message: 'Unknown format' };
      }

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || ERROR_MESSAGES.EXPORT_FAILED);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(ERROR_MESSAGES.EXPORT_FAILED);
    } finally {
      setExporting(false);
    }
  }, [fee]);

  const calculatedSum = useMemo(() => {
    return fee?.installments ? calculateInstallmentSum(fee.installments) : 0;
  }, [fee]);

  const installmentStats = useMemo(() => {
    if (!fee?.installments) return { total: 0, overdue: 0, upcoming: 0 };
    
    let overdue = 0;
    let upcoming = 0;
    const now = new Date();
    
    fee.installments.forEach(inst => {
      const dueDate = new Date(inst.dueDate);
      if (dueDate < now) {
        overdue++;
      } else {
        upcoming++;
      }
    });
    
    return {
      total: fee.installments.length,
      overdue,
      upcoming
    };
  }, [fee]);

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <SkeletonLoader />;
  }

  if (error && !fee) {
    return <ErrorDisplay error={error} onRetry={loadFeeStructure} />;
  }

  if (!fee) {
    return <ErrorDisplay error={ERROR_MESSAGES.NOT_FOUND} />;
  }

  return (
    <div className="fee-structure-page">
      {/* ================= PAGE HEADER ================= */}
      <div className="page-header-enterprise">
        <div className="header-content">
          <div className="header-branding">
            <div className="header-icon-wrapper">
              <FaMoneyBillWave className="header-icon" />
            </div>
            <div className="header-text">
              <h1 className="page-title">
                Fee Structure Details
              </h1>
              <p className="page-subtitle">
                Course-wise & category-based fee payment plan
              </p>
            </div>
          </div>
          
          <div className="header-actions">
            {fee.status && <StatusBadge status={fee.status} />}
            
            <div className="action-buttons">
              <div className="dropdown">
                <button
                  className="btn-export-enterprise dropdown-toggle"
                  type="button"
                  id="exportDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Export fee structure"
                  disabled={exporting}
                >
                  <FaDownload className="btn-icon" />
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
                <ul className="dropdown-menu dropdown-menu-enterprise" aria-labelledby="exportDropdown">
                  <li>
                    <button 
                      className="dropdown-item dropdown-item-enterprise" 
                      onClick={() => handleExport(EXPORT_FORMATS.PDF)}
                      disabled={exporting}
                    >
                      <FaFilePdf className="dropdown-icon pdf" />
                      <span>Export as PDF</span>
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item dropdown-item-enterprise" 
                      onClick={() => handleExport(EXPORT_FORMATS.EXCEL)}
                      disabled={exporting}
                    >
                      <FaFileExcel className="dropdown-icon excel" />
                      <span>Export as Excel</span>
                    </button>
                  </li>
                </ul>
              </div>

              <button
                className="btn-back-enterprise"
                onClick={() => navigate(-1)}
                aria-label="Go back to previous page"
              >
                <FaArrowLeft className="btn-icon" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient overlay */}
        <div className="header-gradient-overlay"></div>
      </div>

      {/* ================= VALIDATION ALERT ================= */}
      {validationWarning && (
        <div className={`validation-alert ${validationWarning.type}`}>
          <div className="alert-icon">
            {validationWarning.type === 'valid' ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}
          </div>
          <div className="alert-content">
            <strong>{validationWarning.type === 'valid' ? 'Verified' : 'Warning'}</strong>
            <span className="alert-message"> {validationWarning.message}</span>
          </div>
        </div>
      )}

      {/* ================= STATS GRID ================= */}
      <div className="stats-grid-enterprise">
        <StatCard
          icon={<FaLayerGroup />}
          label="Course"
          value={fee.course_id?.name || 'N/A'}
          color="primary"
        />
        <StatCard
          icon={<FaUsers />}
          label="Category"
          value={fee.category || 'N/A'}
          color="teal"
        />
        <StatCard
          icon={<FaMoneyBillWave />}
          label="Total Fee Amount"
          value={formatCurrency(fee.totalFee)}
          subValue={`${installmentStats.total} installment${installmentStats.total !== 1 ? 's' : ''}`}
          color="success"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Academic Year"
          value={fee.academicYear || '2025-2026'}
          color="info"
        />
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="content-grid-enterprise">
        {/* Left Column - Summary Info */}
        <div className="content-column">
          {/* Installment Summary Card */}
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaChartPie className="card-title-icon" />
                <h3 className="card-title">Installment Summary</h3>
              </div>
              <span className="card-badge">{installmentStats.total} Total</span>
            </div>
            
            <div className="card-body-enterprise">
              <div className="summary-stats">
                <div className="summary-stat-item">
                  <div className="stat-item-icon success">
                    <FaCheckCircle />
                  </div>
                  <div className="stat-item-content">
                    <div className="stat-item-label">Upcoming</div>
                    <div className="stat-item-value">{installmentStats.upcoming}</div>
                  </div>
                </div>
                
                <div className="summary-stat-item">
                  <div className="stat-item-icon danger">
                    <FaExclamationTriangle />
                  </div>
                  <div className="stat-item-content">
                    <div className="stat-item-label">Overdue</div>
                    <div className="stat-item-value">{installmentStats.overdue}</div>
                  </div>
                </div>
                
                <div className="summary-stat-item">
                  <div className="stat-item-icon primary">
                    <FaShieldAlt />
                  </div>
                  <div className="stat-item-content">
                    <div className="stat-item-label">Calculated</div>
                    <div className="stat-item-value">{formatCurrency(calculatedSum)}</div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="metadata-section">
                <InfoRow
                  icon={<FaUserEdit />}
                  label="Created On"
                  value={formatDate(fee.createdAt, { year: 'numeric', month: 'long', day: 'numeric' })}
                  iconColor={COLORS.primary.accent}
                />
                <InfoRow
                  icon={<FaClock />}
                  label="Last Updated"
                  value={formatDate(fee.updatedAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  iconColor={COLORS.secondary.cyan}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Installment Table */}
        <div className="content-column wide">
          <div className="content-card-enterprise">
            <div className="card-header-enterprise">
              <div className="card-title-wrapper">
                <FaBolt className="card-title-icon" />
                <h3 className="card-title">Payment Schedule</h3>
              </div>
              <span className="card-badge badge-primary">{installmentStats.total} Installments</span>
            </div>
            
            <div className="card-body-enterprise">
              <InstallmentTable 
                installments={fee.installments} 
                totalFee={Number(fee.totalFee) || 0}
                calculatedSum={calculatedSum}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= DESIGN SYSTEM CSS ================= */}
      <style>
        {`
        /* =====================================================
           ENTERPRISE DESIGN SYSTEM - Fee Structure Page
           Matching Sidebar Dark Teal Gradient Theme
           ===================================================== */
        
        .fee-structure-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        /* ================= PAGE HEADER ================= */
        .page-header-enterprise {
          position: relative;
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 50%, #1a5a6a 100%);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.24);
          overflow: hidden;
          border: 1px solid rgba(79, 195, 247, 0.15);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }
        
        .header-branding {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .header-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: rgba(79, 195, 247, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(79, 195, 247, 0.3);
          box-shadow: 0 4px 16px rgba(79, 195, 247, 0.2);
        }
        
        .header-icon {
          font-size: 1.75rem;
          color: #4fc3f7;
        }
        
        .header-text {
          color: #ffffff;
        }
        
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .page-subtitle {
          font-size: 0.9375rem;
          color: rgba(230, 242, 245, 0.85);
          margin: 0;
          font-weight: 400;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .action-buttons {
          display: flex;
          gap: 0.75rem;
        }
        
        /* Export Button */
        .btn-export-enterprise {
          background: rgba(255, 255, 255, 0.95);
          color: #0f3a4a;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .btn-export-enterprise:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          background: #ffffff;
        }
        
        .btn-export-enterprise:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Back Button */
        .btn-back-enterprise {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }
        
        .btn-back-enterprise:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .btn-icon {
          font-size: 0.875rem;
        }
        
        /* Dropdown */
        .dropdown-menu-enterprise {
          border: none;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
          padding: 0.5rem;
          margin-top: 0.5rem;
          background: #ffffff;
        }
        
        .dropdown-item-enterprise {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 0.875rem;
          color: #374151;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        
        .dropdown-item-enterprise:hover {
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.05) 0%, rgba(19, 73, 82, 0.05) 100%);
          color: #0f3a4a;
        }
        
        .dropdown-icon {
          font-size: 1rem;
        }
        
        .dropdown-icon.pdf { color: #ef4444; }
        .dropdown-icon.excel { color: #10b981; }
        
        /* Gradient Overlay */
        .header-gradient-overlay {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(79, 195, 247, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(79, 195, 247, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        
        /* ================= STATUS BADGE ================= */
        .status-badge-enterprise {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* ================= VALIDATION ALERT ================= */
        .validation-alert {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.9375rem;
          animation: slideIn 0.3s ease-out;
        }
        
        .validation-alert.valid {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.12) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #059669;
        }
        
        .validation-alert.mismatch {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.12) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #d97706;
        }
        
        .alert-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .alert-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .alert-message {
          font-weight: 400;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* ================= STATS GRID ================= */
        .stats-grid-enterprise {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        @media (max-width: 1200px) {
          .stats-grid-enterprise {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          }
        }
        
        .stat-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stat-card-enterprise:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }
        
        .stat-card-body {
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
        }
        
        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        
        .stat-card-enterprise:hover .stat-card-icon {
          transform: scale(1.1);
        }
        
        .stat-card-content {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .stat-card-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          white-space: nowrap;
        }

        .stat-card-value {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .stat-card-sub {
          font-size: 0.8125rem;
          color: #9ca3af;
          font-weight: 500;
          white-space: nowrap;
        }
        
        /* ================= CONTENT GRID ================= */
        .content-grid-enterprise {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
        }
        
        .content-column {
          min-width: 0;
        }
        
        .content-column.wide {
          grid-column: span 1;
        }
        
        /* ================= CONTENT CARD ================= */
        .content-card-enterprise {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        
        .card-header-enterprise {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.02) 0%, rgba(19, 73, 82, 0.02) 100%);
        }
        
        .card-title-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .card-title-icon {
          font-size: 1.125rem;
          color: #0f3a4a;
        }
        
        .card-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
        }
        
        .card-badge {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }
        
        .card-badge.badge-primary {
          background: linear-gradient(135deg, #4fc3f7 0%, #06b6d4 100%);
        }
        
        .card-body-enterprise {
          padding: 1.5rem;
        }
        
        /* ================= SUMMARY STATS ================= */
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .summary-stat-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        
        .stat-item-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        
        .stat-item-icon.success { 
          background: rgba(16, 185, 129, 0.1); 
          color: #10b981;
        }
        
        .stat-item-icon.danger { 
          background: rgba(239, 68, 68, 0.1); 
          color: #ef4444;
        }
        
        .stat-item-icon.primary { 
          background: rgba(15, 58, 74, 0.08); 
          color: #0f3a4a;
        }
        
        .stat-item-content {
          flex: 1;
          min-width: 0;
        }
        
        .stat-item-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .stat-item-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }
        
        /* ================= INFO ROW ================= */
        .info-row-enterprise {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 1rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .info-row-enterprise:last-child {
          border-bottom: none;
        }
        
        .info-row-icon {
          font-size: 1.125rem;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(79, 195, 247, 0.08);
          border-radius: 10px;
        }
        
        .info-row-content {
          flex: 1;
          min-width: 0;
        }
        
        .info-row-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .info-row-value {
          font-size: 0.9375rem;
          color: #111827;
          font-weight: 600;
        }
        
        .metadata-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px dashed #e5e7eb;
        }
        
        /* ================= TABLE ENTERPRISE ================= */
        .table-enterprise {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.9375rem;
        }
        
        .table-enterprise thead th {
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.8125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: none;
          white-space: nowrap;
        }
        
        .table-enterprise thead th:first-child {
          border-radius: 12px 0 0 0;
        }
        
        .table-enterprise thead th:last-child {
          border-radius: 0 12px 0 0;
        }
        
        .table-enterprise tbody tr {
          transition: all 0.2s ease;
        }
        
        .table-enterprise tbody tr:hover {
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.04) 0%, rgba(19, 73, 82, 0.04) 100%);
        }
        
        .table-enterprise tbody tr.row-overdue {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.08) 100%);
        }
        
        .table-enterprise tbody td {
          padding: 1.125rem 1.25rem;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          vertical-align: middle;
        }
        
        .cell-index {
          font-weight: 600;
          color: #6b7280;
          width: 60px;
        }
        
        .cell-name {
          font-weight: 600;
          color: #111827;
        }
        
        .cell-amount {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 1rem;
        }
        
        .due-date-primary {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        
        .due-date-relative {
          font-size: 0.8125rem;
          font-weight: 500;
        }
        
        .due-date-relative.overdue { color: #ef4444; }
        .due-date-relative.soon { color: #f59e0b; }
        .due-date-relative.today { color: #f59e0b; }
        
        /* Status Badges in Table */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .status-overdue {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        .status-today {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }
        
        .status-scheduled {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        
        /* ================= VALIDATION WARNING ================= */
        .validation-warning {
          display: flex;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.12) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease-out;
        }
        
        .warning-icon {
          font-size: 1.5rem;
          color: #d97706;
          flex-shrink: 0;
        }
        
        .warning-content {
          flex: 1;
        }
        
        .warning-text {
          margin: 0.5rem 0 0 0;
          color: #92400e;
          font-size: 0.9375rem;
          line-height: 1.5;
        }
        
        /* ================= EMPTY STATE ================= */
        .empty-state-enterprise {
          text-align: center;
          padding: 4rem 2rem;
        }
        
        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }
        
        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .empty-state-description {
          color: #6b7280;
          font-size: 0.9375rem;
          margin: 0;
        }
        
        /* ================= MOBILE INSTALLMENT CARD ================= */
        .installment-card-mobile {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          transition: all 0.2s ease;
        }
        
        .installment-card-mobile.overdue {
          border-color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.08) 100%);
        }
        
        .installment-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .installment-number {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9375rem;
          flex-shrink: 0;
        }
        
        .installment-name {
          flex: 1;
          font-weight: 600;
          color: #111827;
          font-size: 1rem;
        }
        
        .overdue-badge {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
        }
        
        .installment-card-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .installment-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        
        .field-label {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .field-value {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }
        
        .field-value.amount {
          color: #0f3a4a;
        }
        
        .field-value.overdue { color: #ef4444; }
        .field-value.soon { color: #f59e0b; }
        
        /* ================= SKELETON LOADER ================= */
        @keyframes skeleton-loading {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        .skeleton {
          background: linear-gradient(
            90deg,
            #f0f0f0 0%,
            #e0e0e0 50%,
            #f0f0f0 100%
          );
          background-size: 200px 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 12px;
        }
        
        .skeleton-card {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #f5f5f5 50%,
            #ffffff 100%
          );
          background-size: 200px 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }
        
        /* ================= ERROR CONTAINER ================= */
        .error-container-enterprise {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        .error-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 3rem 2rem;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
          border: 1px solid #e5e7eb;
        }
        
        .error-icon-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .error-icon {
          font-size: 2.5rem;
          color: #ef4444;
        }
        
        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.75rem;
        }
        
        .error-message {
          color: #6b7280;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        
        .btn-retry-enterprise {
          background: linear-gradient(135deg, #0f3a4a 0%, #134952 100%);
          color: #ffffff;
          border: none;
          padding: 0.875rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.3);
        }
        
        .btn-retry-enterprise:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.4);
        }
        
        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .content-grid-enterprise {
            grid-template-columns: 1fr;
          }
          
          .content-column.wide {
            grid-column: 1;
          }
        }
        
        @media (max-width: 768px) {
          .fee-structure-page {
            padding: 1rem;
          }
          
          .page-header-enterprise {
            padding: 1.5rem;
          }
          
          .header-content {
            flex-direction: column;
            gap: 1.5rem;
          }
          
          .header-branding {
            width: 100%;
          }
          
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          
          .page-title {
            font-size: 1.5rem;
          }
          
          .stats-grid-enterprise {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            width: 100%;
          }
          
          .btn-export-enterprise,
          .btn-back-enterprise {
            flex: 1;
            justify-content: center;
          }
          
          /* Better text wrapping for mobile stat cards */
          .stat-card-value {
            font-size: 1rem;
            word-break: break-word;
          }
          
          .stat-card-body {
            padding: 1.25rem;
          }
          
          .stat-card-icon {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
          }
        }
        
        /* ================= PRINT STYLES ================= */
        @media print {
          .page-header-enterprise,
          .btn-export-enterprise,
          .btn-back-enterprise,
          .dropdown,
          .no-print {
            display: none !important;
          }
          
          .fee-structure-page {
            background: white;
            padding: 0;
          }
          
          .content-card-enterprise {
            box-shadow: none;
            border: 1px solid #ddd;
          }
          
          .table-enterprise thead th {
            background: #0f3a4a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        `}
      </style>
    </div>
  );
}
