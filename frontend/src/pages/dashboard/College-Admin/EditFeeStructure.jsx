import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
  FaCheckCircle,
  FaExclamationTriangle,
  FaBolt
} from "react-icons/fa";

export default function EditFeeStructure() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [department_id, setDepartmentId] = useState("");
  const [course_id, setCourseId] = useState("");
  const [category, setCategory] = useState("");
  const [totalFee, setTotalFee] = useState("");
  const [installments, setInstallments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= LOAD ================= */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feeRes, deptRes] = await Promise.all([
        api.get(`/fees/structure/${id}`),
        api.get("/departments"),
      ]);

      const fee = feeRes.data;

      setCategory(fee.category);
      setTotalFee(fee.totalFee);
      setInstallments(fee.installments);

      setDepartmentId(fee.course_id?.department_id);
      setCourseId(fee.course_id?._id);

      setDepartments(deptRes.data || []);

      if (fee.course_id?.department_id) {
        loadCourses(fee.course_id.department_id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load fee structure details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOAD COURSES ================= */
  const loadCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch {
      setCourses([]);
      setError("Failed to load courses for selected department");
    }
  };

  /* ================= HANDLERS ================= */
  const addInstallment = () =>
    setInstallments([...installments, { name: "", amount: "", dueDate: "" }]);

  const removeInstallment = (i) =>
    setInstallments(installments.filter((_, index) => index !== i));

  const handleInstallmentChange = (i, field, value) => {
    const updated = [...installments];
    updated[i][field] = value;
    setInstallments(updated);
  };

  const installmentSum = installments.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  /* ================= UPDATE ================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!course_id || !category || !totalFee) {
      setError("Please fill all required fields: Course, Category, and Total Fee");
      return;
    }

    if (installmentSum !== Number(totalFee)) {
      setError(`Installment total (₹${installmentSum}) must exactly match Total Fee (₹${totalFee})`);
      return;
    }

    try {
      setSaving(true);

      await api.put(`/fees/structure/${id}`, {
        course_id,
        category,
        totalFee: Number(totalFee),
        installments: installments.map((installment) => ({
          ...installment,
          amount: Number(installment.amount),
        })),
      });

      setSuccess("Fee structure updated successfully!");
      setTimeout(() => navigate("/fees/list"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update fee structure. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted fw-medium">Loading fee structure details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* ================= HEADER BAR ================= */}
      <div className="d-flex align-items-center justify-content-between mb-4 animate-fade-in">
        <div className="d-flex align-items-center gap-3">
          <button 
            onClick={() => navigate("/fees/list")}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 shadow-sm hover-lift"
          >
            <FaArrowLeft /> Back to List
          </button>
          <div className="d-flex align-items-center gap-3">
            <div className="icon-container bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
              <FaMoneyBillWave className="pulse-icon" size={28} />
            </div>
            <div>
              <h1 className="h3 fw-bold mb-0 text-dark">Edit Fee Structure</h1>
              <p className="text-muted mb-0">Update course fee details and payment schedule</p>
            </div>
          </div>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            onClick={() => navigate("/fees/list")}
            className="btn btn-light border px-4 py-2 d-flex align-items-center gap-2 hover-lift"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving || installmentSum !== Number(totalFee)}
            className={`btn px-4 py-2 d-flex align-items-center gap-2 transition-all ${
              saving 
                ? "btn-secondary" 
                : installmentSum === Number(totalFee) 
                  ? "btn-success hover-lift" 
                  : "btn-outline-success disabled"
            }`}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Updating...
              </>
            ) : (
              <>
                <FaSave size={18} /> Update Fee Structure
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= ALERTS ================= */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center alert-dismissible fade show animate-slide-down" role="alert">
          <FaExclamationTriangle className="me-2" size={20} />
          <div><strong>Error:</strong> {error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success d-flex align-items-center alert-dismissible fade show animate-slide-down" role="alert">
          <FaCheckCircle className="me-2" size={20} />
          <div><strong>Success!</strong> {success}</div>
          <button type="button" className="btn-close" onClick={() => setSuccess("")}></button>
        </div>
      )}

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-4">
        {/* LEFT COLUMN - FORM */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in-up">
            <div className="card-header bg-gradient-primary text-white py-4">
              <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                <FaLayerGroup /> Fee Structure Details
              </h2>
            </div>
            <div className="card-body p-4">
              {/* COURSE SELECTION */}
              <div className="mb-4 pb-3 border-bottom">
                <h3 className="h6 fw-bold text-uppercase text-muted mb-3">Course Selection</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Department <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <FaUniversity className="text-primary" />
                      </span>
                      <select
                        className="form-select border-start-0 ps-0 shadow-none"
                        value={department_id}
                        onChange={(e) => {
                          setDepartmentId(e.target.value);
                          setCourseId("");
                          loadCourses(e.target.value);
                        }}
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Course <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <FaLayerGroup className="text-primary" />
                      </span>
                      <select
                        className="form-select border-start-0 ps-0 shadow-none"
                        value={course_id}
                        onChange={(e) => setCourseId(e.target.value)}
                        disabled={!department_id}
                      >
                        <option value="">-- Select Course --</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* FEE DETAILS */}
              <div className="mb-4 pb-3 border-bottom">
                <h3 className="h6 fw-bold text-uppercase text-muted mb-3">Fee Configuration</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Category <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <FaUsers className="text-primary" />
                      </span>
                      <select
                        className="form-select border-start-0 ps-0 shadow-none"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">-- Select Category --</option>
                        <option>GEN</option>
                        <option>OBC</option>
                        <option>SC</option>
                        <option>ST</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-dark">Total Fee (₹) <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">₹</span>
                      <input
                        type="number"
                        className="form-control border-start-0 ps-0 shadow-none"
                        placeholder="Enter total fee amount"
                        value={totalFee}
                        onChange={(e) => setTotalFee(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* INSTALLMENTS */}
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-bold text-uppercase text-muted mb-0">Payment Schedule</h3>
                  <button 
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 hover-lift"
                    onClick={addInstallment}
                  >
                    <FaPlus size={12} /> Add Installment
                  </button>
                </div>
                
                {installments.length === 0 ? (
                  <div className="alert alert-info text-center py-4 mb-0">
                    <FaMoneyBillWave className="mb-2" size={32} />
                    <p className="mb-0">No installments added yet. Click "Add Installment" to create payment schedule.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th width="35%">Installment Name</th>
                          <th width="25%">Amount (₹)</th>
                          <th width="30%">Due Date</th>
                          <th width="10%" className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((inst, idx) => (
                          <tr 
                            key={idx} 
                            className="animate-fade-in"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                          >
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm shadow-none border"
                                placeholder="e.g., Semester Fee"
                                value={inst.name}
                                onChange={(e) => handleInstallmentChange(idx, "name", e.target.value)}
                              />
                            </td>
                            <td>
                              <div className="input-group input-group-sm">
                                <span className="input-group-text bg-light border-end-0">₹</span>
                                <input
                                  type="number"
                                  className="form-control border-start-0 ps-1 shadow-none"
                                  placeholder="0"
                                  value={inst.amount}
                                  onChange={(e) => handleInstallmentChange(idx, "amount", e.target.value)}
                                  min="0"
                                />
                              </div>
                            </td>
                            <td>
                              <input
                                type="date"
                                className="form-control form-control-sm shadow-none border"
                                value={inst.dueDate?.substring(0, 10)}
                                onChange={(e) => handleInstallmentChange(idx, "dueDate", e.target.value)}
                              />
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-danger d-flex align-items-center justify-content-center shadow-sm hover-lift"
                                onClick={() => removeInstallment(idx)}
                                title="Remove installment"
                              >
                                <FaTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SUMMARY */}
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: "20px" }}>
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="card-header bg-gradient-success text-white py-3">
                <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaMoneyBillWave /> Summary
                </h2>
              </div>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                  <span className="text-muted">Total Fee</span>
                  <span className="h5 fw-bold text-success">₹{Number(totalFee).toLocaleString() || '0'}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                  <span className="text-muted">Installments Total</span>
                  <span className={`h5 fw-bold ${
                    installmentSum === Number(totalFee) 
                      ? "text-success" 
                      : "text-danger animate-shake"
                  }`}>
                    ₹{installmentSum.toLocaleString()}
                  </span>
                </div>
                
                <div className="d-flex justify-content-between mb-4">
                  <span className="text-muted">Installments Count</span>
                  <span className="fw-bold text-primary">{installments.length}</span>
                </div>
                
                <div className="alert alert-warning border-0 bg-warning bg-opacity-10 py-3 mb-4">
                  <div className="d-flex align-items-start gap-2">
                    <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                    <p className="mb-0 small">
                      <strong>Important:</strong> Installment total must exactly match Total Fee amount to save changes.
                    </p>
                  </div>
                </div>
                
                <div className="d-grid gap-2">
                  <button 
                    onClick={handleSubmit}
                    disabled={saving || installmentSum !== Number(totalFee)}
                    className={`btn ${
                      installmentSum === Number(totalFee) 
                        ? "btn-success btn-lg" 
                        : "btn-outline-success btn-lg disabled"
                    } d-flex align-items-center justify-content-center gap-2 py-3`}
                  >
                    <FaSave size={20} /> 
                    {saving ? "Updating..." : "Save Changes"}
                  </button>
                  
                  <button 
                    onClick={() => navigate("/fees/list")}
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                  >
                    <FaArrowLeft /> Cancel Editing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes lift {
          to { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
        }
        
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-fade-in-up { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.3s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        
        .pulse-icon { animation: pulse 2s infinite; }
        
        .bg-gradient-primary {
          background: linear-gradient(120deg, #1a4b6d 0%, #0f3a4a 100%);
        }
        
        .bg-gradient-success {
          background: linear-gradient(120deg, #1e6f5c 0%, #155447 100%);
        }
        
        .icon-container {
          width: 56px;
          height: 56px;
          box-shadow: 0 4px 12px rgba(26, 75, 109, 0.35);
        }
        
        .form-control:focus, 
        .form-select:focus {
          border-color: #4d90a5;
          box-shadow: 0 0 0 0.2rem rgba(77, 144, 165, 0.25);
        }
        
        .input-group-text {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: #495057;
        }
        
        .table tr:hover td {
          background-color: rgba(248, 249, 250, 0.7);
        }
        
        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
        
        @media (max-width: 992px) {
          .sticky-top {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}