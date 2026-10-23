import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import {
  validateFeeStructure,
  splitEqually,
  mapBackendError,
} from "../../../utils/validateFeeStructure";

import {
  FaMoneyBillWave,
  FaLayerGroup,
  FaUsers,
  FaPlus,
  FaTrash,
  FaSave,
  FaUniversity,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSyncAlt,
  FaSpinner,
  FaInfoCircle,
  FaCalendarAlt,
  FaRupeeSign,
  FaListOl,
  FaPercentage,
  FaFileInvoice,
  FaClock,
  FaBolt
} from "react-icons/fa";

export default function CreateFeeStructure() {
  const { user } = useContext(AuthContext);

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [department_id, setDepartmentId] = useState("");
  const [course_id, setCourseId] = useState("");
  const [category, setCategory] = useState("");
  const [totalFee, setTotalFee] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formErrorSummary, setFormErrorSummary] = useState(null);

  // Statutory fee component fields
  const [tuitionFee, setTuitionFee] = useState("");
  const [labFee, setLabFee] = useState("");
  const [sportsFee, setSportsFee] = useState("");
  const [libraryFee, setLibraryFee] = useState("");

  const numTuition = Number(tuitionFee) || 0;
  const numLab = Number(labFee) || 0;
  const numSports = Number(sportsFee) || 0;
  const numLibrary = Number(libraryFee) || 0;

  const hasStatutoryBreakdown =
    numTuition > 0 || numLab > 0 || numSports > 0 || numLibrary > 0;

  const totalBaseAmount = numTuition + numLab + numSports + numLibrary;
  const tuitionGst = 0;
  const labGst = Math.round(numLab * 0.18 * 100) / 100;
  const sportsGst = Math.round(numSports * 0.18 * 100) / 100;
  const libraryGst = 0;

  const totalGstAmount = Math.round((tuitionGst + labGst + sportsGst + libraryGst) * 100) / 100;
  const grossCalculatedTotal = Math.round((totalBaseAmount + totalGstAmount) * 100) / 100;

  useEffect(() => {
    if (hasStatutoryBreakdown) {
      setTotalFee(grossCalculatedTotal > 0 ? grossCalculatedTotal.toString() : "");
    }
  }, [hasStatutoryBreakdown, grossCalculatedTotal]);

  const [installments, setInstallments] = useState([
    { name: "Installment 1", amount: "", dueDate: "", order: 1 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data || []);
      } catch {
        setDepartments([]);
      }
    };
    if (user && (user.role === "COLLEGE_ADMIN" || user.role === "ACCOUNTANT")) {
      loadDepartments();
    }
  }, [user]);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  const loadCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      // Handle different API response formats
      const coursesData = Array.isArray(res.data?.courses) ? res.data.courses :
                          Array.isArray(res.data) ? res.data : [];
      setCourses(coursesData);
    } catch {
      setCourses([]);
    }
  };

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "ACCOUNTANT") return <Navigate to="/dashboard" />;

  /* ================= INSTALLMENTS & VALIDATION ================= */
  const addInstallment = () => {
    const nextOrder = installments.length + 1;
    setInstallments([
      ...installments,
      { name: `Installment ${nextOrder}`, amount: "", dueDate: "", order: nextOrder },
    ]);
  };

  const removeInstallment = (index) => {
    const nextInst = installments.filter((_, i) => i !== index);
    setInstallments(nextInst);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.installmentTotal;
      if (next.installments) {
        delete next.installments;
      }
      return next;
    });
  };

  const clearFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const scrollToFirstError = (fieldName) => {
    if (!fieldName) return;
    setTimeout(() => {
      const element = document.querySelector(`[data-field="${fieldName}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof element.focus === "function") {
          element.focus();
        }
      }
    }, 100);
  };

  const handleInstallmentChange = (index, field, value) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    setInstallments(updated);

    // Clear field-specific error
    if (fieldErrors.installments?.[index]?.[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (next.installments?.[index]) {
          const row = { ...next.installments[index] };
          delete row[field];
          if (Object.keys(row).length === 0) {
            const nextInst = { ...next.installments };
            delete nextInst[index];
            if (Object.keys(nextInst).length === 0) {
              delete next.installments;
            } else {
              next.installments = nextInst;
            }
          } else {
            next.installments = { ...next.installments, [index]: row };
          }
        }
        return next;
      });
    }

    // Auto-clear installmentTotal error if amount changed and now matches
    if (field === "amount" && fieldErrors.installmentTotal) {
      const newSum = updated.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      if (Math.abs(newSum - Number(totalFee)) < 0.01) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.installmentTotal;
          return next;
        });
      }
    }
  };

  const handleSplitEqually = () => {
    if (!totalFee || Number(totalFee) <= 0 || installments.length === 0) return;
    const splitAmounts = splitEqually(totalFee, installments.length);
    const updated = installments.map((inst, idx) => ({
      ...inst,
      amount: splitAmounts[idx] !== undefined ? String(splitAmounts[idx]) : inst.amount,
    }));
    setInstallments(updated);

    // Clear installmentTotal and all amount errors
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.installmentTotal;
      if (next.installments) {
        const nextInst = { ...next.installments };
        Object.keys(nextInst).forEach((k) => {
          if (nextInst[k]?.amount) {
            const row = { ...nextInst[k] };
            delete row.amount;
            if (Object.keys(row).length === 0) {
              delete nextInst[k];
            } else {
              nextInst[k] = row;
            }
          }
        });
        if (Object.keys(nextInst).length === 0) {
          delete next.installments;
        } else {
          next.installments = nextInst;
        }
      }
      return next;
    });
  };

  /* ================= TOTAL CHECK ================= */
  const installmentSum = Math.round(
    installments.reduce((sum, i) => sum + Number(i.amount || 0), 0) * 100
  ) / 100;

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setFormErrorSummary(null);

    const validation = validateFeeStructure(
      {
        department_id,
        course_id,
        category,
        totalFee,
        installments,
      },
      { requireDepartment: true, isEdit: false }
    );

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormErrorSummary(validation.summaryMessage);
      scrollToFirstError(validation.firstErrorField);
      return;
    }

    setFieldErrors({});

    try {
      setLoading(true);

      await api.post("/fees/structure", {
        course_id,
        category,
        tuitionFee: numTuition,
        labFee: numLab,
        sportsFee: numSports,
        libraryFee: numLibrary,
        totalFee: Number(totalFee),
        installments: installments.map((i, idx) => ({
          name: String(i.name).trim(),
          amount: Number(i.amount),
          dueDate: i.dueDate,
          order: i.order || idx + 1,
        })),
      });

      setSuccess("Fee structure created successfully");
      setDepartmentId("");
      setCourseId("");
      setCategory("");
      setTotalFee("");
      setTuitionFee("");
      setLabFee("");
      setSportsFee("");
      setLibraryFee("");
      setInstallments([{ name: "Installment 1", amount: "", dueDate: "", order: 1 }]);
      setCourses([]);

    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error creating fee structure:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        const backendErr = mapBackendError(err);
        if (Object.keys(backendErr.errors).length > 0) {
          setFieldErrors(backendErr.errors);
          setFormErrorSummary(backendErr.message);
          scrollToFirstError(backendErr.field);
        } else {
          setError(backendErr.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-container" style={{ paddingTop: "0.5rem" }}>
      {error && typeof error === 'object' && !loading && (
        <ApiError
          title="Fee Structure Creation Error"
          message={error.message}
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          onGoBack={() => window.history.back()}
        />
      )}
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Fee Management", path: "/fees" },
          { label: "Create Fee Structure" }
        ]}
      />

        {/* HEADER */}
        <PageHeader
          icon={FaMoneyBillWave}
          title="Create Fee Structure"
          subtitle="Configure course-wise & category-based fee system with flexible installments"
          actions={
            <button
              
              onClick={() => window.history.back()}
                  style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
            >
              <FaArrowLeft className="erp-btn-icon" />
              <span>Back to Fees</span>
            </button>
          }
        />
      {/* ALERTS */}
      {formErrorSummary && (
        <div className="erp-alert erp-alert-danger animate-slide-in" role="alert">
          <div className="erp-alert-icon">
            <FaExclamationTriangle className="shake" />
          </div>
          <div className="erp-alert-content">
            <strong>Validation Error:</strong> {formErrorSummary}
          </div>
          <button
            type="button"
            className="erp-alert-close"
            onClick={() => setFormErrorSummary(null)}
          >
            ×
          </button>
        </div>
      )}

      {error && typeof error === 'string' && (
        <div className="erp-alert erp-alert-danger animate-slide-in" role="alert">
          <div className="erp-alert-icon">
            <FaExclamationTriangle className="shake" />
          </div>
          <div className="erp-alert-content">
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="erp-alert-close"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="erp-alert erp-alert-success animate-slide-in">
          <div className="erp-alert-icon">
            <FaCheckCircle className="pulse" />
          </div>
          <div className="erp-alert-content">
            <strong>Success!</strong> {success}
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="erp-form-card animate-fade-in">
        <div className="erp-form-header">
          <div className="erp-form-title">
            <FaFileInvoice className="erp-form-icon" />
            <h3>Fee Structure Configuration</h3>
          </div>
          <div className="erp-form-subtitle">
            Fill in all required fields marked with <span className="required">*</span>. Ensure installment amounts match total fee.
          </div>
        </div>

        <form className="erp-form">
          {/* BASIC INFO SECTION */}
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaUniversity className="erp-section-icon" />
              Academic Details
            </h4>
            
            <div className="erp-row">
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label" htmlFor="field-department">
                    <FaUniversity className="erp-label-icon" />
                    Department <span className="required">*</span>
                  </label>
                  <select
                    id="field-department"
                    data-field="department_id"
                    className={`erp-select ${fieldErrors.department_id ? "erp-input-error" : ""}`}
                    value={department_id}
                    aria-invalid={Boolean(fieldErrors.department_id)}
                    aria-describedby={fieldErrors.department_id ? "err-dept" : undefined}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setCourseId("");
                      loadCourses(e.target.value);
                      clearFieldError("department_id");
                    }}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.code && `(${d.code})`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.department_id ? (
                    <div id="err-dept" className="erp-field-error" role="alert">
                      <FaExclamationTriangle /> {fieldErrors.department_id}
                    </div>
                  ) : (
                    <div className="erp-hint-text">
                      <FaInfoCircle className="erp-hint-icon" />
                      Select the academic department
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label" htmlFor="field-course">
                    <FaLayerGroup className="erp-label-icon" />
                    Course <span className="required">*</span>
                  </label>
                  <select
                    id="field-course"
                    data-field="course_id"
                    className={`erp-select ${fieldErrors.course_id ? "erp-input-error" : ""}`}
                    value={course_id}
                    aria-invalid={Boolean(fieldErrors.course_id)}
                    aria-describedby={fieldErrors.course_id ? "err-course" : undefined}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      clearFieldError("course_id");
                    }}
                    disabled={!department_id}
                  >
                    <option value="">-- Select Course --</option>
                    {Array.isArray(courses) && courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.course_id ? (
                    <div id="err-course" className="erp-field-error" role="alert">
                      <FaExclamationTriangle /> {fieldErrors.course_id}
                    </div>
                  ) : (
                    <div className="erp-hint-text">
                      <FaInfoCircle className="erp-hint-icon" />
                      Course must be selected after department
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label" htmlFor="field-category">
                    <FaUsers className="erp-label-icon" />
                    Category <span className="required">*</span>
                  </label>
                  <select
                    id="field-category"
                    data-field="category"
                    className={`erp-select ${fieldErrors.category ? "erp-input-error" : ""}`}
                    value={category}
                    aria-invalid={Boolean(fieldErrors.category)}
                    aria-describedby={fieldErrors.category ? "err-cat" : undefined}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      clearFieldError("category");
                    }}
                  >
                    <option value="">-- Select Category --</option>
                    <option>GEN</option>
                    <option>OBC</option>
                    <option>SC</option>
                    <option>ST</option>
                    <option>EWS</option>
                  </select>
                  {fieldErrors.category ? (
                    <div id="err-cat" className="erp-field-error" role="alert">
                      <FaExclamationTriangle /> {fieldErrors.category}
                    </div>
                  ) : (
                    <div className="erp-hint-text">
                      <FaInfoCircle className="erp-hint-icon" />
                      Student reservation category
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label" htmlFor="field-totalFee">
                    <FaRupeeSign className="erp-label-icon" />
                    Total Fee <span className="required">*</span>
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text">
                      <FaRupeeSign />
                    </span>
                    <input
                      id="field-totalFee"
                      type="number"
                      data-field="totalFee"
                      className={`erp-input ${fieldErrors.totalFee ? "erp-input-error" : ""}`}
                      value={totalFee}
                      aria-invalid={Boolean(fieldErrors.totalFee)}
                      aria-describedby={fieldErrors.totalFee ? "err-totalFee" : undefined}
                      onChange={(e) => {
                        setTotalFee(e.target.value);
                        clearFieldError("totalFee");
                      }}
                      placeholder="Enter total fee amount"
                      readOnly={hasStatutoryBreakdown}
                      style={hasStatutoryBreakdown ? { backgroundColor: "#f8fafc", cursor: "not-allowed" } : {}}
                    />
                  </div>
                  {fieldErrors.totalFee ? (
                    <div id="err-totalFee" className="erp-field-error" role="alert">
                      <FaExclamationTriangle /> {fieldErrors.totalFee}
                    </div>
                  ) : (
                    <div className="erp-hint-text">
                      <FaInfoCircle className="erp-hint-icon" />
                      {hasStatutoryBreakdown
                        ? "Auto-calculated from statutory fee components + GST"
                        : "Sum of all installment amounts must equal this value"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STATUTORY FEE COMPONENTS & GST BREAKDOWN */}
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaPercentage className="erp-section-icon" />
              Fee Types & Statutory GST Breakdown
            </h4>
            <p className="section-description">
              Enter individual component fees below. GST is automatically calculated based on statutory rates (Tuition 0%, Lab 18%, Sports 18%, Library 0%).
            </p>

            <div className="erp-row">
              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaRupeeSign className="erp-label-icon" />
                    Tuition Fee (0% GST - Exempt)
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text"><FaRupeeSign /></span>
                    <input
                      type="number"
                      className="erp-input"
                      value={tuitionFee}
                      onChange={(e) => setTuitionFee(e.target.value)}
                      placeholder="e.g. 50000"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaRupeeSign className="erp-label-icon" />
                    Lab Fee (18% GST)
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text"><FaRupeeSign /></span>
                    <input
                      type="number"
                      className="erp-input"
                      value={labFee}
                      onChange={(e) => setLabFee(e.target.value)}
                      placeholder="e.g. 10000"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaRupeeSign className="erp-label-icon" />
                    Sports Fee (18% GST)
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text"><FaRupeeSign /></span>
                    <input
                      type="number"
                      className="erp-input"
                      value={sportsFee}
                      onChange={(e) => setSportsFee(e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaRupeeSign className="erp-label-icon" />
                    Library Fee (0% GST - Exempt)
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text"><FaRupeeSign /></span>
                    <input
                      type="number"
                      className="erp-input"
                      value={libraryFee}
                      onChange={(e) => setLibraryFee(e.target.value)}
                      placeholder="e.g. 2000"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW OF GST AND TOTAL */}
            {hasStatutoryBreakdown && (
              <div
                style={{
                  background: "#f0f7ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "16px",
                  marginTop: "16px",
                }}
              >
                <h5 style={{ margin: "0 0 12px 0", color: "#1e40af", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaFileInvoice /> Live GST & Total Fee Preview
                </h5>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Base Fee (Pre-tax)</span>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>₹{totalBaseAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Total GST</span>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#2563eb" }}>₹{totalGstAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Gross Total (Base + GST)</span>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>₹{grossCalculatedTotal.toLocaleString("en-IN")}</div>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#475569", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                  <strong>Tax Breakdown:</strong> Tuition (0%): ₹0 | Lab (18%): ₹{labGst.toLocaleString("en-IN")} | Sports (18%): ₹{sportsGst.toLocaleString("en-IN")} | Library (0%): ₹0
                </div>
              </div>
            )}
          </div>

          {/* INSTALLMENTS SECTION */}
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaListOl className="erp-section-icon" />
              Payment Installments
            </h4>
            <p className="section-description">
              Add multiple payment installments with due dates. Total must match the fee amount above.
            </p>
            
            {installments.map((i, index) => {
              const instErr = fieldErrors.installments?.[index] || {};
              const nameErrId = `err-inst-${index}-name`;
              const amountErrId = `err-inst-${index}-amount`;
              const dueErrId = `err-inst-${index}-due`;

              return (
                <div className="installment-row" key={index}>
                  <div className="erp-row">
                    <div className="erp-col-4">
                      <div className="erp-form-group">
                        <label className="erp-label">
                          <FaPercentage className="erp-label-icon" />
                          Installment Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          data-field={`installments[${index}].name`}
                          className={`erp-input ${instErr.name ? "erp-input-error" : ""}`}
                          placeholder={`Installment ${index + 1} name`}
                          value={i.name}
                          aria-invalid={Boolean(instErr.name)}
                          aria-describedby={instErr.name ? nameErrId : undefined}
                          onChange={(e) =>
                            handleInstallmentChange(index, "name", e.target.value)
                          }
                        />
                        {instErr.name && (
                          <div id={nameErrId} className="erp-field-error" role="alert">
                            <FaExclamationTriangle /> {instErr.name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="erp-col-3">
                      <div className="erp-form-group">
                        <label className="erp-label">
                          <FaRupeeSign className="erp-label-icon" />
                          Amount (₹) <span className="required">*</span>
                        </label>
                        <div className="erp-input-group">
                          <span className="erp-input-group-text">
                            <FaRupeeSign />
                          </span>
                          <input
                            type="number"
                            data-field={`installments[${index}].amount`}
                            className={`erp-input ${instErr.amount ? "erp-input-error" : ""}`}
                            placeholder="Amount"
                            value={i.amount}
                            aria-invalid={Boolean(instErr.amount)}
                            aria-describedby={instErr.amount ? amountErrId : undefined}
                            onChange={(e) =>
                              handleInstallmentChange(index, "amount", e.target.value)
                            }
                          />
                        </div>
                        {instErr.amount && (
                          <div id={amountErrId} className="erp-field-error" role="alert">
                            <FaExclamationTriangle /> {instErr.amount}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="erp-col-3">
                      <div className="erp-form-group">
                        <label className="erp-label">
                          <FaCalendarAlt className="erp-label-icon" />
                          Due Date <span className="required">*</span>
                        </label>
                        <div className="erp-input-group">
                          <span className="erp-input-group-text">
                            <FaCalendarAlt />
                          </span>
                          <input
                            type="date"
                            data-field={`installments[${index}].dueDate`}
                            className={`erp-input ${instErr.dueDate ? "erp-input-error" : ""}`}
                            value={i.dueDate}
                            min={new Date().toISOString().split("T")[0]}
                            aria-invalid={Boolean(instErr.dueDate)}
                            aria-describedby={instErr.dueDate ? dueErrId : undefined}
                            onChange={(e) =>
                              handleInstallmentChange(index, "dueDate", e.target.value)
                            }
                          />
                        </div>
                        {instErr.dueDate && (
                          <div id={dueErrId} className="erp-field-error" role="alert">
                            <FaExclamationTriangle /> {instErr.dueDate}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="erp-col-2 d-flex align-items-end pb-3">
                      {installments.length > 1 && (
                        <button
                          type="button"
                          className="erp-btn erp-btn-danger erp-btn-icon-only"
                          onClick={() => removeInstallment(index)}
                          title="Remove installment"
                        >
                          <FaTrash className="shake" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="add-installment-btn-container" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="erp-btn erp-btn-outline-primary add-installment-btn"
                onClick={addInstallment}
              >
                <FaPlus className="erp-btn-icon pulse" />
                <span>Add Installment</span>
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-outline-secondary"
                onClick={handleSplitEqually}
                disabled={!totalFee || Number(totalFee) <= 0 || installments.length === 0}
                title="Distribute total fee evenly among installments"
                style={{
                  background: "#f8fafc",
                  border: "2px solid #cbd5e1",
                  color: "#334155",
                  fontWeight: 600,
                  borderRadius: "10px",
                }}
              >
                <FaBolt className="erp-btn-icon" style={{ color: "#d97706" }} />
                <span>Split Equally</span>
              </button>
            </div>
            
            {(() => {
              const numTotal = Number(totalFee) || 0;
              const isMatch = numTotal > 0 && Math.abs(installmentSum - numTotal) < 0.01;
              const diff = Math.round((numTotal - installmentSum) * 100) / 100;

              return (
                <div className="installment-total-card" data-field="installmentTotal">
                  <div className="installment-total-label">
                    <FaListOl className="total-icon" />
                    <span>Installment Total:</span>
                  </div>
                  <div className={`installment-total-amount ${
                    isMatch
                      ? "match installment-total-ok"
                      : numTotal > 0
                      ? "mismatch installment-total-bad"
                      : ""
                  }`}>
                    <FaRupeeSign className="rupee-icon" />
                    {installmentSum.toLocaleString("en-IN")} / ₹{numTotal.toLocaleString("en-IN")}
                    {isMatch && (
                      <span className="match-indicator installment-total-ok">✓ Matches Total</span>
                    )}
                    {!isMatch && numTotal > 0 && diff > 0 && (
                      <span className="mismatch-indicator installment-total-bad">Remaining: ₹{diff.toLocaleString("en-IN")}</span>
                    )}
                    {!isMatch && numTotal > 0 && diff < 0 && (
                      <span className="mismatch-indicator installment-total-bad">Exceeds by: ₹{Math.abs(diff).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                  {fieldErrors.installmentTotal && (
                    <div className="erp-field-error installment-error-banner" role="alert">
                      <FaExclamationTriangle /> {fieldErrors.installmentTotal}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* FORM ACTIONS */}
          <div className="erp-form-footer">
            <div className="erp-footer-left">
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-lg"
                onClick={() => window.history.back()}
              >
                <FaArrowLeft className="erp-btn-icon" />
                <span>Cancel</span>
              </button>
            </div>
            <div className="erp-footer-right">
              <button
                type="button"
                className="erp-btn erp-btn-primary erp-btn-lg erp-btn-shadow"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="erp-btn-icon spin" />
                    <span>Creating Structure...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="erp-btn-icon pulse" />
                    <span>Create Fee Structure</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STYLES */}
      <style>{`
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }


        .erp-alert {
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          animation: slideIn 0.5s ease;
        }
        
        .erp-alert-danger {
          background: rgba(244, 67, 54, 0.1);
          border-left: 4px solid #F44336;
          color: #F44336;
        }
        
        .erp-alert-success {
          background: rgba(76, 175, 80, 0.1);
          border-left: 4px solid #4CAF50;
          color: #4CAF50;
        }
        
        .erp-alert-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .erp-alert-content {
          flex: 1;
        }
        
        .erp-alert-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          color: inherit;
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .erp-form-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-form-header {
          padding: 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
        }
        
        .erp-form-title {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .erp-form-icon {
          color: #1a4b6d;
          font-size: 1.5rem;
        }
        
        .erp-form-title h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }
        
        .erp-form-subtitle {
          font-size: 0.9rem;
          color: #666;
        }
        
        .erp-form {
          padding: 2rem;
        }
        
        .erp-form-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .erp-form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .erp-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a4b6d;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f2f5;
        }
        
        .erp-section-icon {
          color: #1a4b6d;
        }
        
        .section-description {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        
        .erp-row {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.5rem;
        }
        
        .erp-col-12 { grid-column: span 12; }
        .erp-col-6 { grid-column: span 6; }
        .erp-col-4 { grid-column: span 4; }
        .erp-col-3 { grid-column: span 3; }
        .erp-col-2 { grid-column: span 2; }
        
        @media (max-width: 768px) {
          .erp-col-12,
          .erp-col-6,
          .erp-col-4,
          .erp-col-3,
          .erp-col-2 {
            grid-column: span 12;
          }
        }
        
        .erp-form-group {
          margin-bottom: 1.5rem;
        }
        
        .erp-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
          margin-bottom: 0.75rem;
        }
        
        .erp-label-icon {
          color: #1a4b6d;
          font-size: 1rem;
        }
        
        .required {
          color: #F44336;
          margin-left: 0.25rem;
        }
        
        .erp-input,
        .erp-select {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          color: #2c3e50;
          background: white;
          transition: all 0.3s ease;
          outline: none;
        }
        
        .erp-input:focus,
        .erp-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
          transform: translateY(-1px);
        }
        
        .erp-input-group {
          position: relative;
          display: flex;
          align-items: stretch;
        }
        
        .erp-input-group-text {
          display: flex;
          align-items: center;
          padding: 0.875rem 1.25rem;
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 10px 0 0 10px;
          color: #6c757d;
          font-weight: 500;
          border-right: none;
        }
        
        .erp-input-group .erp-input {
          border-radius: 0 10px 10px 0;
          border-left: none;
        }
        
        .erp-hint-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #1a4b6d;
        }
        
        .erp-hint-icon {
          font-size: 0.875rem;
        }
        
        /* INSTALLMENTS STYLING */
        .installment-row {
          background: #f9fbfd;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid #eef2f7;
          transition: all 0.3s ease;
        }
        
        .installment-row:hover {
          background: #f0f5ff;
          border-color: #d4e1ff;
          transform: translateX(3px);
        }
        
        .add-installment-btn-container {
          margin: 1.5rem 0;
          display: flex;
          justify-content: center;
        }
        
        .add-installment-btn {
          background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
          color: white;
          border: none;
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(67, 160, 71, 0.4);
        }
        
        .add-installment-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(67, 160, 71, 0.5);
        }
        
        .installment-total-card {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.35);
        }
        
        .installment-total-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .total-icon {
          font-size: 1.5rem;
          background: rgba(255, 255, 255, 0.15);
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .installment-total-amount {
          font-size: 1.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .rupee-icon {
          font-size: 1.4rem;
          animation: float 3s ease-in-out infinite;
        }
        
        .mismatch {
          color: #FF9800;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .match {
          color: #4CAF50;
        }
        
        .mismatch-indicator {
          background: rgba(255, 152, 0, 0.2);
          color: #e68a00;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-left: 1rem;
          animation: shake 0.5s ease-in-out;
        }
        
        .match-indicator {
          background: rgba(76, 175, 80, 0.2);
          color: #4CAF50;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-left: 1rem;
        }
        
        /* FORM FOOTER */
        .erp-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          margin-top: 2rem;
          border-radius: 0 0 16px 16px;
        }
        
        .erp-footer-left,
        .erp-footer-right {
          display: flex;
          gap: 1rem;
        }
        
        .erp-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        
        .erp-btn-icon {
          font-size: 1.125rem;
        }
        
        .erp-btn-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26, 75, 109, 0.4);
        }
        
        .erp-btn-secondary {
          background: white;
          color: #1a4b6d;
          border: 2px solid #e9ecef;
        }
        
        .erp-btn-secondary:hover {
          border-color: #1a4b6d;
          background: #f8f9fa;
          transform: translateY(-2px);
        }
        
        .erp-btn-danger {
          background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
          color: white;
          padding: 0.75rem;
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }
        
        .erp-btn-danger:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
        }
        
        .erp-btn-outline-primary {
          background: transparent;
          color: #1a4b6d;
          border: 2px dashed #1a4b6d;
        }
        
        .erp-btn-icon-only {
          padding: 0;
          width: 40px;
          height: 40px;
          justify-content: center;
        }
        
        .erp-btn-lg {
          padding: 1rem 2rem;
          font-size: 1.05rem;
        }
        
        .erp-btn-shadow {
          box-shadow: 0 4px 16px rgba(26, 75, 109, 0.3);
        }
        
        .erp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .blink {
          animation: blink 1.5s infinite;
        }
        
        .blink-pulse {
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 15px rgba(26, 75, 109, 0.5);
        }
        
        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        .animate-slide-in {
          animation: slideIn 0.5s ease;
        }
        
/* ================= RESPONSIVE DESIGN ================= */

/* TABLET */
@media (min-width: 769px) and (max-width: 991px) {

  .erp-container {
    padding: 1.25rem;
  }

  /* Banner */
  .erp-page-header {
    padding: 1.5rem 1.75rem;
    min-height: 155px;
    border-radius: 16px;
    gap: 1.25rem;
  }

  .erp-header-content {
    gap: 1rem;
    min-width: 0;
  }

  .erp-header-icon {
    width: 54px;
    height: 54px;
    min-width: 54px;
    font-size: 1.55rem;
    border-radius: 13px;
  }

  .erp-page-title {
    font-size: 1.55rem;
    line-height: 1.2;
  }

  .erp-page-subtitle {
    font-size: 0.92rem;
    line-height: 1.5;
    max-width: 520px;
  }

  .erp-header-actions .erp-btn {
    padding: 0.7rem 1rem;
    white-space: nowrap;
  }

  /* Form */
  .erp-form-header {
    padding: 1.5rem;
  }

  .erp-form {
    padding: 1.5rem;
  }

  .erp-form-title h3 {
    font-size: 1.35rem;
  }

  .erp-section-title {
    font-size: 1.15rem;
  }

  .erp-input,
  .erp-select {
    padding: 0.8rem 1rem;
  }

  /* Installments */
  .installment-row {
    padding: 1rem;
  }

  .erp-form-footer {
    padding: 1.5rem;
  }
}


/* MOBILE */
@media (max-width: 768px) {

  .erp-container {
    padding: 0.75rem;
  }

  /* ================= HEADER / BANNER ================= */

  .erp-page-header {
    padding: 1.25rem;
    border-radius: 16px;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .erp-header-content {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    width: 100%;
  }

  .erp-header-icon {
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 12px;
    font-size: 1.35rem;
    flex-shrink: 0;
  }

  .erp-header-text {
    min-width: 0;
    flex: 1;
  }

  .erp-page-title {
    font-size: 1.4rem;
    line-height: 1.2;
    margin: 0;
  }

  .erp-page-subtitle {
    font-size: 0.86rem;
    line-height: 1.5;
    margin-top: 0.45rem;
  }

  /* Back button */
  .erp-header-actions {
    width: 100%;
    margin-top: 0.15rem;
  }

  .erp-header-actions .erp-btn {
    width: 100%;
    min-height: 46px;
    justify-content: center;
    padding: 0.7rem 1rem;
    border-radius: 10px;
  }


  /* ================= ALERTS ================= */

  .erp-alert {
    padding: 0.85rem 1rem;
    gap: 0.7rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .erp-alert-icon {
    font-size: 1.2rem;
  }


  /* ================= FORM CARD ================= */

  .erp-form-card {
    border-radius: 16px;
  }

  .erp-form-header {
    padding: 1.25rem;
  }

  .erp-form-title {
    align-items: flex-start;
    gap: 0.7rem;
    margin-bottom: 0.6rem;
  }

  .erp-form-icon {
    font-size: 1.35rem;
    margin-top: 0.2rem;
    flex-shrink: 0;
  }

  .erp-form-title h3 {
    font-size: 1.25rem;
    line-height: 1.3;
  }

  .erp-form-subtitle {
    font-size: 0.84rem;
    line-height: 1.55;
  }

  .erp-form {
    padding: 1.25rem;
  }


  /* ================= SECTIONS ================= */

  .erp-form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .erp-section-title {
    font-size: 1.05rem;
    gap: 0.6rem;
    margin-bottom: 1.1rem;
    padding-bottom: 0.65rem;
  }

  .section-description {
    font-size: 0.84rem;
    line-height: 1.55;
    margin-bottom: 1.1rem;
  }


  /* ================= FORM FIELDS ================= */

  .erp-row {
    gap: 0;
  }

  .erp-form-group {
    margin-bottom: 1.1rem;
  }

  .erp-label {
    font-size: 0.88rem;
    margin-bottom: 0.55rem;
  }

  .erp-input,
  .erp-select {
    min-height: 46px;
    padding: 0.7rem 0.9rem;
    font-size: 0.9rem;
    border-radius: 9px;
  }

  .erp-input-group-text {
    padding: 0.7rem 0.9rem;
  }

  .erp-hint-text {
    font-size: 0.76rem;
    line-height: 1.4;
    padding: 0.5rem 0.65rem;
  }


  /* ================= INSTALLMENTS ================= */

  .installment-row {
    padding: 0.9rem;
    border-radius: 11px;
    margin-bottom: 0.8rem;
  }

  .add-installment-btn-container {
    margin: 1.1rem 0;
  }

  .add-installment-btn {
    width: 100%;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }


  /* ================= TOTAL CARD ================= */

  .installment-total-card {
    padding: 1.1rem;
    border-radius: 13px;
    flex-direction: column;
    text-align: center;
    gap: 0.7rem;
  }

  .installment-total-label {
    font-size: 0.9rem;
  }

  .total-icon {
    width: 36px;
    height: 36px;
    font-size: 1.2rem;
  }

  .installment-total-amount {
    font-size: 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .mismatch-indicator,
  .match-indicator {
    font-size: 0.72rem;
    margin-left: 0;
  }


  /* ================= FOOTER ================= */

  .erp-form-footer {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    margin-top: 1.5rem;
  }

  .erp-footer-left,
  .erp-footer-right {
    width: 100%;
  }

  .erp-btn {
    width: 100%;
    justify-content: center;
    min-height: 46px;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .erp-btn-lg {
    padding: 0.8rem 1rem;
    font-size: 0.92rem;
  }
}


/* SMALL MOBILE */
@media (max-width: 480px) {

  .erp-container {
    padding: 0.6rem;
  }

  /* Banner becomes compact */
  .erp-page-header {
    padding: 1rem;
    border-radius: 14px;
    gap: 0.8rem;
  }

  .erp-header-content {
    gap: 0.75rem;
  }

  .erp-header-icon {
    width: 44px;
    height: 44px;
    min-width: 44px;
    font-size: 1.2rem;
    border-radius: 11px;
  }

  .erp-page-title {
    font-size: 1.25rem;
  }

  .erp-page-subtitle {
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .erp-header-actions .erp-btn {
    min-height: 44px;
    font-size: 0.88rem;
  }


  /* Form */
  .erp-form-header {
    padding: 1rem;
  }

  .erp-form {
    padding: 1rem;
  }

  .erp-form-title {
    gap: 0.6rem;
  }

  .erp-form-icon {
    font-size: 1.2rem;
  }

  .erp-form-title h3 {
    font-size: 1.15rem;
  }

  .erp-form-subtitle {
    font-size: 0.78rem;
  }

  .erp-section-title {
    font-size: 1rem;
  }

  .erp-label {
    font-size: 0.84rem;
  }

  .erp-input,
  .erp-select {
    min-height: 44px;
    font-size: 0.86rem;
  }

  .erp-hint-text {
    font-size: 0.72rem;
  }


  /* Installment total */
  .installment-total-card {
    padding: 1rem;
  }

  .installment-total-amount {
    font-size: 1.35rem;
  }
}

.erp-input-error {
  border-color: #ef4444 !important;
  background-color: #fffbfa !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
}

.erp-field-error {
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.installment-total-ok {
  color: #10b981 !important;
}

.installment-total-bad {
  color: #ef4444 !important;
}

.installment-error-banner {
  margin-top: 10px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.88rem;
  color: #b91c1c;
}

.required {
  color: #ef4444;
  margin-left: 2px;
  font-weight: bold;
}
      `}</style>
    </div>
  );
}