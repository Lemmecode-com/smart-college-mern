import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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

  const [installments, setInstallments] = useState([
    { name: "", amount: "", dueDate: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

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
    loadDepartments();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  const loadCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch {
      setCourses([]);
    }
  };

  /* ================= INSTALLMENTS ================= */
  const addInstallment = () => {
    setInstallments([...installments, { name: "", amount: "", dueDate: "" }]);
  };

  const removeInstallment = (index) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleInstallmentChange = (index, field, value) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
  };

  /* ================= TOTAL CHECK ================= */
  const installmentSum = installments.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!department_id || !course_id || !category || !totalFee) {
      setError("All fields are required");
      return;
    }

    if (installmentSum !== Number(totalFee)) {
      setError("Installments total must equal Total Fee");
      return;
    }

    try {
      setLoading(true);

      await api.post("/fees/structure", {
        course_id,
        category,
        totalFee: Number(totalFee),
        installments: installments.map((i) => ({
          name: i.name,
          amount: Number(i.amount),
          dueDate: i.dueDate
        }))
      });

      setSuccess("Fee structure created successfully");
      setDepartmentId("");
      setCourseId("");
      setCategory("");
      setTotalFee("");
      setInstallments([{ name: "", amount: "", dueDate: "" }]);
      setCourses([]);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to create structure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/fees">Fee Management</a></li>
          <li className="breadcrumb-item active" aria-current="page">Create Fee Structure</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaMoneyBillWave />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Create Fee Structure</h1>
            <p className="erp-page-subtitle">
              Configure course-wise & category-based fee system with flexible installments
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => window.history.back()}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Fees</span>
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="erp-alert erp-alert-danger animate-slide-in">
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
                  <label className="erp-label">
                    <FaUniversity className="erp-label-icon" />
                    Department <span className="required">*</span>
                  </label>
                  <select
                    className="erp-select"
                    value={department_id}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setCourseId("");
                      loadCourses(e.target.value);
                    }}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.code && `(${d.code})`}
                      </option>
                    ))}
                  </select>
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Select the academic department
                  </div>
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaLayerGroup className="erp-label-icon" />
                    Course <span className="required">*</span>
                  </label>
                  <select
                    className="erp-select"
                    value={course_id}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={!department_id}
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Course must be selected after department
                  </div>
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUsers className="erp-label-icon" />
                    Category <span className="required">*</span>
                  </label>
                  <select
                    className="erp-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">-- Select Category --</option>
                    <option>GEN</option>
                    <option>OBC</option>
                    <option>SC</option>
                    <option>ST</option>
                    <option>EWS</option>
                  </select>
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Student reservation category
                  </div>
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaRupeeSign className="erp-label-icon" />
                    Total Fee <span className="required">*</span>
                  </label>
                  <div className="erp-input-group">
                    <span className="erp-input-group-text">
                      <FaRupeeSign />
                    </span>
                    <input
                      type="number"
                      className="erp-input"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      placeholder="Enter total fee amount"
                    />
                  </div>
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Sum of all installment amounts must equal this value
                  </div>
                </div>
              </div>
            </div>
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
            
            {installments.map((i, index) => (
              <div className="installment-row" key={index}>
                <div className="erp-row">
                  <div className="erp-col-4">
                    <div className="erp-form-group">
                      <label className="erp-label">
                        <FaPercentage className="erp-label-icon" />
                        Installment Name
                      </label>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder={`Installment ${index + 1} name`}
                        value={i.name}
                        onChange={(e) =>
                          handleInstallmentChange(index, "name", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="erp-col-3">
                    <div className="erp-form-group">
                      <label className="erp-label">
                        <FaRupeeSign className="erp-label-icon" />
                        Amount
                      </label>
                      <div className="erp-input-group">
                        <span className="erp-input-group-text">
                          <FaRupeeSign />
                        </span>
                        <input
                          type="number"
                          className="erp-input"
                          placeholder="Amount"
                          value={i.amount}
                          onChange={(e) =>
                            handleInstallmentChange(index, "amount", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="erp-col-3">
                    <div className="erp-form-group">
                      <label className="erp-label">
                        <FaCalendarAlt className="erp-label-icon" />
                        Due Date
                      </label>
                      <div className="erp-input-group">
                        <span className="erp-input-group-text">
                          <FaCalendarAlt />
                        </span>
                        <input
                          type="date"
                          className="erp-input"
                          value={i.dueDate}
                          onChange={(e) =>
                            handleInstallmentChange(index, "dueDate", e.target.value)
                          }
                        />
                      </div>
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
            ))}
            
            <div className="add-installment-btn-container">
              <button
                type="button"
                className="erp-btn erp-btn-outline-primary add-installment-btn"
                onClick={addInstallment}
              >
                <FaPlus className="erp-btn-icon pulse" />
                <span>Add Installment</span>
              </button>
            </div>
            
            <div className="installment-total-card">
              <div className="installment-total-label">
                <FaListOl className="total-icon" />
                <span>Installment Total:</span>
              </div>
              <div className={`installment-total-amount ${
                installmentSum > 0 && installmentSum !== Number(totalFee) 
                  ? 'mismatch' 
                  : installmentSum === Number(totalFee) 
                  ? 'match' 
                  : ''
              }`}>
                <FaRupeeSign className="rupee-icon" />
                {installmentSum.toLocaleString()}
                {installmentSum > 0 && installmentSum !== Number(totalFee) && (
                  <span className="mismatch-indicator">≠ Total Fee</span>
                )}
                {installmentSum === Number(totalFee) && (
                  <span className="match-indicator">✓ Matches Total</span>
                )}
              </div>
            </div>
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
      <style jsx>{`
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-breadcrumb {
          background: transparent;
          padding: 0;
          margin-bottom: 1.5rem;
        }
        
        .breadcrumb {
          background: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .breadcrumb-item a {
          color: #1a4b6d;
          text-decoration: none;
        }
        
        .breadcrumb-item a:hover {
          text-decoration: underline;
        }
        
        .erp-page-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
        }
        
        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }
        
        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }
        
        .erp-header-actions .erp-btn {
          background: white;
          color: #1a4b6d;
          border: none;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        
        .erp-header-actions .erp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
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
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }
          
          .erp-page-header {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .erp-header-actions {
            width: 100%;
            margin-top: 0.5rem;
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .erp-form-header,
          .erp-form {
            padding: 1.5rem;
          }
          
          .erp-form-footer {
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
          }
          
          .erp-footer-left,
          .erp-footer-right {
            width: 100%;
            justify-content: center;
          }
          
          .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .installment-total-card {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .installment-total-label,
          .installment-total-amount {
            justify-content: center;
          }
        }
        
        @media (max-width: 480px) {
          .erp-section-title {
            font-size: 1.1rem;
          }
          
          .erp-label {
            font-size: 0.9rem;
          }
          
          .erp-input,
          .erp-select {
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
          }
          
          .erp-btn-lg {
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }
          
          .installment-total-amount {
            font-size: 1.5rem;
          }
          
          .erp-form-title h3 {
            font-size: 1.35rem;
          }
        }
      `}</style>
    </div>
  );
}