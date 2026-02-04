import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaSave,
  FaArrowLeft,
  FaCheckCircle,
  FaInfoCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUsers,
  FaCalendarAlt,
  FaToggleOn,
  FaToggleOff,
  FaBookOpen,
  FaSync,
  FaTimes,
  FaExclamationTriangle,
  FaSpinner,
  FaMagic,
  FaKeyboard,
  FaCopy,
  FaCheck,
  FaUndo
} from "react-icons/fa";

export default function EditDepartment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "ACADEMIC",
    status: "ACTIVE",
    programsOffered: [],
    startYear: "",
    sanctionedFacultyCount: "",
    sanctionedStudentIntake: ""
  });

  const [originalData, setOriginalData] = useState(null);
  const [isAutoCode, setIsAutoCode] = useState(false); // Start in manual mode for edit
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [touched, setTouched] = useState({});

  /* ================= AUTO-GENERATE CODE LOGIC ================= */
  const generateCode = (name) => {
    if (!name.trim()) return "";
    
    const words = name
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    if (words.length === 0) return "";
    
    let code = words[0].substring(0, 3).toUpperCase();
    
    if (words.length > 1) {
      code += words[1].charAt(0).toUpperCase();
    } else if (words[0].length > 3) {
      code += words[0].charAt(3).toUpperCase();
    }
    
    while (code.length < 3) {
      code += "X";
    }
    
    return code.substring(0, 6);
  };

  /* ================= AUTO-UPDATE CODE WHEN NAME CHANGES (IN AUTO MODE) ================= */
  useEffect(() => {
    if (isAutoCode && formData.name) {
      const newCode = generateCode(formData.name);
      setFormData(prev => ({ ...prev, code: newCode }));
    }
  }, [formData.name, isAutoCode]);

  /* ================= FETCH DEPARTMENT ================= */
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const res = await api.get(`/departments/${id}`);
        const data = res.data;
        
        // Set form data
        setFormData({
          name: data.name || "",
          code: data.code || "",
          type: data.type || "ACADEMIC",
          status: data.status || "ACTIVE",
          programsOffered: Array.isArray(data.programsOffered) ? data.programsOffered : [],
          startYear: data.startYear?.toString() || "",
          sanctionedFacultyCount: data.sanctionedFacultyCount?.toString() || "",
          sanctionedStudentIntake: data.sanctionedStudentIntake?.toString() || ""
        });
        
        // Save original data for reset
        setOriginalData(data);
        
        // Determine if current code matches auto-generated
        const autoCode = generateCode(data.name || "");
        setIsAutoCode(data.code === autoCode);
      } catch (err) {
        console.error("Error fetching department:", err);
        setError("Failed to load department data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [id]);

  /* ================= COPY CODE HANDLER ================= */
  const copyCode = () => {
    if (formData.code) {
      navigator.clipboard.writeText(formData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ================= TOGGLE CODE MODE ================= */
  const toggleCodeMode = () => {
    if (isAutoCode) {
      // Switching to manual - keep current value
      setIsAutoCode(false);
    } else {
      // Switching to auto - regenerate from current name
      setIsAutoCode(true);
      if (formData.name) {
        const newCode = generateCode(formData.name);
        setFormData(prev => ({ ...prev, code: newCode }));
      }
    }
  };

  /* ================= RESET TO ORIGINAL ================= */
  const resetForm = () => {
    if (originalData) {
      setFormData({
        name: originalData.name || "",
        code: originalData.code || "",
        type: originalData.type || "ACADEMIC",
        status: originalData.status || "ACTIVE",
        programsOffered: Array.isArray(originalData.programsOffered) ? originalData.programsOffered : [],
        startYear: originalData.startYear?.toString() || "",
        sanctionedFacultyCount: originalData.sanctionedFacultyCount?.toString() || "",
        sanctionedStudentIntake: originalData.sanctionedStudentIntake?.toString() || ""
      });
      
      const autoCode = generateCode(originalData.name || "");
      setIsAutoCode(originalData.code === autoCode);
      setError("");
      setSuccess("");
      setTouched({});
    }
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setTouched({ ...touched, [name]: true });
  };

  const handleCheckbox = (program) => {
    setFormData((prev) => ({
      ...prev,
      programsOffered: prev.programsOffered.includes(program)
        ? prev.programsOffered.filter((p) => p !== program)
        : [...prev.programsOffered, program]
    }));
    setTouched({ ...touched, programsOffered: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Basic validation
    if (!formData.name || !formData.code || formData.programsOffered.length === 0) {
      setError("Please fill all required fields marked with *");
      setSaving(false);
      return;
    }

    try {
      await api.put(`/departments/${id}`, {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programsOffered: formData.programsOffered,
        startYear: Number(formData.startYear),
        sanctionedFacultyCount: Number(formData.sanctionedFacultyCount),
        sanctionedStudentIntake: Number(formData.sanctionedStudentIntake)
      });

      setSuccess("Department updated successfully!");
      
      setTimeout(() => {
        navigate("/departments");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ================= VALIDATION ================= */
  const getError = (field) => {
    if (!touched[field]) return null;
    if (field === 'name' && !formData.name) return "Department name is required";
    if (field === 'code' && !formData.code) return "Department code is required";
    if (field === 'programsOffered' && formData.programsOffered.length === 0) return "Select at least one program";
    return null;
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading Department Data...</h5>
                <p className="text-muted small">Fetching department details from server</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= TOP NAVIGATION ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <button 
            onClick={() => navigate("/departments")}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Back to Departments"
          >
            <FaArrowLeft size={16} /> Back
          </button>
          
          <div className="d-flex align-items-center gap-3">
            <div className="form-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaBuilding size={28} />
            </div>
            <div>
              <h1 className="h4 h3-md fw-bold mb-1 text-dark">Edit Department</h1>
              <p className="text-muted mb-0 small">
                <FaGraduationCap className="me-1" />
                Update department configuration and details
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Department Edit Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>
          
          <button 
            onClick={resetForm}
            className="btn btn-outline-warning d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Reset to Original Values"
          >
            <FaUndo size={16} /> Reset
          </button>
          
          <button 
            onClick={() => navigate("/departments")}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
          >
            <FaTimes size={16} /> Cancel
          </button>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Department Edit Guide</h6>
              <ul className="mb-0 small ps-3">
                <li><strong>Department Name *</strong>: Update the official department name</li>
                <li><strong>Department Code *</strong>: 
                  <ul className="mt-1 mb-0 ps-3">
                    <li>💡 <strong>Auto Mode</strong>: Code auto-updates when name changes (click "Auto" button)</li>
                    <li>⌨️ <strong>Manual Mode</strong>: Enter custom code (click "Manual" button)</li>
                    <li>Max 6 uppercase characters</li>
                  </ul>
                </li>
                <li><strong>Programs Offered *</strong>: Update academic programs offered by this department</li>
                <li><strong>Capacity</strong>: Adjust faculty count and student intake numbers</li>
                <li>Click "Reset" to revert all changes to original values</li>
              </ul>
              <button 
                onClick={() => setShowHelp(false)} 
                className="btn btn-sm btn-outline-info mt-2 px-3"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ALERTS ================= */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center alert-dismissible fade show mb-3 mb-md-4 animate-slide-down" role="alert">
          <FaExclamationTriangle className="me-2 flex-shrink-0" size={20} />
          <div><strong>Error:</strong> {error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success d-flex align-items-center alert-dismissible fade show mb-3 mb-md-4 animate-slide-down" role="alert">
          <FaCheckCircle className="me-2 flex-shrink-0" size={20} />
          <div><strong>Success!</strong> {success}</div>
          <button type="button" className="btn-close" onClick={() => setSuccess("")}></button>
        </div>
      )}

      {/* ================= FORM CARD ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up">
        <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
          <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
            <FaBuilding /> Department Configuration
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="card-body p-3 p-md-4">
            {/* BASIC INFO SECTION */}
            <div className="section-group mb-4">
              <h3 className="section-title">
                <FaGraduationCap className="me-2" /> Basic Information
              </h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-semibold d-flex align-items-center gap-1">
                      Department Name <span className="text-danger">*</span>
                    </label>
                    <div className="input-with-icon">
                      <FaGraduationCap className="input-icon text-primary" />
                      <input
                        type="text"
                        className={`form-control ${touched.name && !formData.name ? 'is-invalid' : ''}`}
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={() => setTouched({...touched, name: true})}
                        placeholder="e.g., Computer Science Engineering"
                        required
                        autoFocus
                      />
                    </div>
                    {getError('name') && <div className="invalid-feedback d-block">{getError('name')}</div>}
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      Official full name of the department
                    </small>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-semibold d-flex align-items-center justify-content-between">
                      <span>
                        Department Code <span className="text-danger">*</span>
                        <FaInfoCircle 
                          className="ms-1 text-primary cursor-help" 
                          size={14} 
                          title="Toggle between auto-generate and manual entry"
                        />
                      </span>
                      <div className="code-mode-toggle">
                        <button
                          type="button"
                          className={`btn btn-sm ${isAutoCode ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={toggleCodeMode}
                          title={isAutoCode ? "Switch to manual entry" : "Switch to auto-generate"}
                        >
                          {isAutoCode ? (
                            <>
                              <FaMagic className="me-1 blink" /> Auto
                            </>
                          ) : (
                            <>
                              <FaKeyboard className="me-1" /> Manual
                            </>
                          )}
                        </button>
                      </div>
                    </label>
                    <div className="input-group input-with-icon">
                      <span className="input-group-text bg-light border-end-0">
                        <FaBookOpen className="text-primary" />
                      </span>
                      <input
                        type="text"
                        className={`form-control ${touched.code && !formData.code ? 'is-invalid' : ''}`}
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        onBlur={() => setTouched({...touched, code: true})}
                        placeholder={isAutoCode ? "Auto-generated..." : "e.g., CSE"}
                        disabled={isAutoCode}
                        required
                        maxLength="6"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={copyCode}
                        disabled={!formData.code}
                        title="Copy code"
                      >
                        {copied ? (
                          <FaCheck className="text-success" size={14} />
                        ) : (
                          <FaCopy size={14} />
                        )}
                      </button>
                    </div>
                    {getError('code') && <div className="invalid-feedback d-block">{getError('code')}</div>}
                    <small className="form-text text-muted mt-1">
                      {isAutoCode ? (
                        <>
                          <FaMagic className="me-1 blink-slow" /> 
                          Auto-generated from department name. 
                          {formData.name && formData.code && (
                            <span className="ms-1">
                              Current: <strong className="text-primary">{formData.code}</strong>
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <FaKeyboard className="me-1" /> 
                          Manual entry mode. Max 6 uppercase characters.
                        </>
                      )}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* CONFIGURATION SECTION */}
            <div className="section-group mb-4">
              <h3 className="section-title">
                <FaToggleOn className="me-2" /> Configuration
              </h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-semibold">Department Type</label>
                    <div className="input-with-icon">
                      <FaGraduationCap className="input-icon text-muted" />
                      <select
                        className="form-select"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                      >
                        <option value="ACADEMIC">Academic Department</option>
                        <option value="ADMINISTRATIVE">Administrative Department</option>
                      </select>
                    </div>
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      Academic departments offer courses and programs
                    </small>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label fw-semibold">Status</label>
                    <div className="input-with-icon">
                      <FaToggleOn className="input-icon text-success" />
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      {formData.status === "ACTIVE" 
                        ? "Department is operational and visible" 
                        : "Department is temporarily disabled"}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* PROGRAMS SECTION */}
            <div className="section-group mb-4">
              <h3 className="section-title">
                <FaBookOpen className="me-2" /> Programs Offered
              </h3>
              <div className="alert alert-warning border-0 bg-warning bg-opacity-10 p-3 mb-3">
                <div className="d-flex align-items-start gap-2">
                  <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                  <small>Select all academic programs this department offers. At least one selection is required.</small>
                </div>
              </div>
              <div className="programs-grid">
                {["UG", "PG", "Diploma", "PhD"].map((program) => (
                  <div 
                    key={program} 
                    className={`program-card ${formData.programsOffered.includes(program) ? 'active' : ''}`}
                    onClick={() => handleCheckbox(program)}
                  >
                    <div className="form-check d-flex align-items-center gap-2 mb-0">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={formData.programsOffered.includes(program)}
                        onChange={() => {}} 
                        id={`program-${program}`}
                      />
                      <label className="form-check-label fw-semibold mb-0" htmlFor={`program-${program}`}>
                        {program}
                      </label>
                    </div>
                    <small className="text-muted mt-1">
                      {program === "UG" && "Undergraduate (B.Tech, B.Sc)"}
                      {program === "PG" && "Postgraduate (M.Tech, M.Sc)"}
                      {program === "Diploma" && "Diploma Programs"}
                      {program === "PhD" && "Doctoral Programs"}
                    </small>
                  </div>
                ))}
              </div>
              {getError('programsOffered') && (
                <div className="text-danger mt-2 small">
                  <FaExclamationTriangle className="me-1" />
                  {getError('programsOffered')}
                </div>
              )}
            </div>

            {/* CAPACITY SECTION */}
            <div className="section-group">
              <h3 className="section-title">
                <FaUsers className="me-2" /> Capacity Details
              </h3>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label fw-semibold d-flex align-items-center gap-1">
                      Start Year
                    </label>
                    <div className="input-with-icon">
                      <FaCalendarAlt className="input-icon text-muted" />
                      <input
                        type="number"
                        className="form-control"
                        name="startYear"
                        value={formData.startYear}
                        onChange={handleChange}
                        placeholder="e.g., 2010"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      Year department was established
                    </small>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label fw-semibold d-flex align-items-center gap-1">
                      Sanctioned Faculty
                    </label>
                    <div className="input-with-icon">
                      <FaChalkboardTeacher className="input-icon text-primary" />
                      <input
                        type="number"
                        className="form-control"
                        name="sanctionedFacultyCount"
                        value={formData.sanctionedFacultyCount}
                        onChange={handleChange}
                        placeholder="e.g., 25"
                        min="0"
                      />
                    </div>
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      Approved faculty positions
                    </small>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label className="form-label fw-semibold d-flex align-items-center gap-1">
                      Student Intake
                    </label>
                    <div className="input-with-icon">
                      <FaUsers className="input-icon text-success" />
                      <input
                        type="number"
                        className="form-control"
                        name="sanctionedStudentIntake"
                        value={formData.sanctionedStudentIntake}
                        onChange={handleChange}
                        placeholder="e.g., 120"
                        min="0"
                      />
                    </div>
                    <small className="form-text text-muted mt-1">
                      <FaInfoCircle className="me-1" size={12} />
                      Annual student admission capacity
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= FORM FOOTER ================= */}
          <div className="card-footer bg-light py-3 d-flex flex-column flex-md-row justify-content-between gap-2">
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2 hover-lift"
                onClick={() => navigate("/departments")}
              >
                <FaArrowLeft /> Back to List
              </button>
              
              <button
                type="button"
                className="btn btn-outline-warning d-flex align-items-center gap-2 px-4 py-2 hover-lift"
                onClick={resetForm}
              >
                <FaUndo /> Reset Changes
              </button>
            </div>
            
            <button
              type="submit"
              className="btn btn-success d-flex align-items-center gap-2 px-4 py-2 pulse-button"
              disabled={saving || !formData.name || !formData.code || formData.programsOffered.length === 0}
            >
              {saving ? (
                <>
                  <FaSpinner className="spin-icon" /> Saving...
                </>
              ) : (
                <>
                  <FaSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaBuilding className="me-1" />
                  Department Edit Form | Smart College ERP
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  Fields marked with <span className="text-danger">*</span> are required | 
                  <span className="ms-1">
                    <FaMagic className="me-1 blink-slow" /> 
                    Toggle code mode with Auto/Manual button
                  </span>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button 
                className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                onClick={() => setShowHelp(true)}
              >
                <FaInfoCircle size={12} /> Show Help
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
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
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(26, 75, 109, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes lift {
          to { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .blink { animation: blink 1.5s infinite; }
        .blink-slow { animation: blink 2.5s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }
        .pulse-button { position: relative; overflow: hidden; }
        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        .pulse-button:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        @keyframes ripple {
          0% { transform: scale(0, 0); opacity: 0.5; }
          100% { transform: scale(100, 100); opacity: 0; }
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .form-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .section-group {
          padding: 1.5rem;
          background: rgba(248, 250, 249, 0.7);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }
        .section-group:hover {
          background: rgba(241, 245, 249, 0.9);
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
        }

        .input-with-icon {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.6;
        }
        .form-control, .form-select {
          padding-left: 2.75rem !important;
        }

        .code-mode-toggle {
          display: flex;
          align-items: center;
        }
        .code-mode-toggle .btn {
          transition: all 0.3s ease;
          padding: 0.25rem 0.5rem;
        }
        .code-mode-toggle .btn:hover {
          transform: translateY(-1px);
        }

        .programs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .program-card {
          padding: 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
        }
        .program-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }
        .program-card.active {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .program-card.active .form-check-label {
          color: #1e40af;
          font-weight: 600;
        }

        .card-footer {
          border-top: 1px solid #e2e8f0;
        }

        .cursor-help {
          cursor: help;
        }

        @media (max-width: 768px) {
          .programs-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
          .form-logo-container {
            width: 50px;
            height: 50px;
          }
          .section-title {
            font-size: 1rem;
          }
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
          .code-mode-toggle {
            width: 100%;
            justify-content: flex-end;
            margin-top: 0.5rem;
          }
        }

        @media (max-width: 576px) {
          .programs-grid {
            grid-template-columns: 1fr;
          }
          .form-logo-container {
            width: 45px;
            height: 45px;
          }
          .input-group .form-control {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}