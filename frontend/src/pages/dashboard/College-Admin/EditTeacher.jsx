import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaChalkboardTeacher,
  FaArrowLeft,
  FaSave,
  FaUpload,
  FaFileAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTrash
} from "react-icons/fa";

export default function EditTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

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

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [assignedCourses, setAssignedCourses] = useState([]);
  const [newCourse, setNewCourse] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [documents, setDocuments] = useState({
    aadhaarCard: null,
    panCard: null,
    degreeCertificate: null,
    passportPhoto: null,
  });
  const [removedDocuments, setRemovedDocuments] = useState([]);
  const [documentErrors, setDocumentErrors] = useState({});
  const [existingDocuments, setExistingDocuments] = useState([]);

  const DOCUMENT_TYPES = [
    { type: 'aadhaarCard', label: 'Aadhaar Card', maxSizeMB: 2 },
    { type: 'panCard', label: 'PAN Card', maxSizeMB: 2 },
    { type: 'degreeCertificate', label: 'Degree Certificate', maxSizeMB: 5 },
    { type: 'passportPhoto', label: 'Passport Photo', maxSizeMB: 2 },
  ];

  /* ================= LOAD TEACHER + DEPARTMENTS ================= */
  const loadData = async () => {
    try {
      const [teacherRes, deptRes] = await Promise.all([
        api.get(`/teachers/${id}`),
        api.get("/departments")
      ]);

      const t = teacherRes.data?.teacher || teacherRes.data;

      setExistingDocuments(t.documents || []);

      setFormData({
        name: t.name || "",
        email: t.email || "",
        employeeId: t.employeeId || "",
        designation: t.designation || "",
        qualification: t.qualification || "",
        experienceYears: t.experienceYears || "",
        department_id: t.department_id?._id || t.department_id || ""
      });

      setAssignedCourses(Array.isArray(t.courses) ? t.courses : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.departments || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Failed to load teacher data";

      logger.error("Error fetching teacher:", statusCode, errorCode);
      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      return;
    }

    api.get(`/courses/department/${formData.department_id}`)
      .then(res => {
        const coursesData = Array.isArray(res.data?.courses) ? res.data.courses :
                            Array.isArray(res.data) ? res.data : [];
        setCourses(coursesData);
      })
      .catch(() => setCourses([]));
  }, [formData.department_id]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addCourseToTeacher = () => {
    if (!newCourse) return;

    if (!assignedCourses.includes(newCourse)) {
      setAssignedCourses([...assignedCourses, newCourse]);
    }

    setNewCourse("");
  };

  const handleDocumentChange = (type, file) => {
    const config = DOCUMENT_TYPES.find(d => d.type === type);
    const maxSize = (config?.maxSizeMB || 2) * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!file) {
      setDocuments(prev => ({ ...prev, [type]: null }));
      setDocumentErrors(prev => ({ ...prev, [type]: '' }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setDocumentErrors(prev => ({ ...prev, [type]: 'Only PDF, JPG, JPEG, PNG files are allowed' }));
      setDocuments(prev => ({ ...prev, [type]: null }));
      return;
    }

    if (file.size > maxSize) {
      setDocumentErrors(prev => ({ ...prev, [type]: `File size must be less than ${config?.maxSizeMB || 2}MB` }));
      setDocuments(prev => ({ ...prev, [type]: null }));
      return;
    }

    setDocuments(prev => ({ ...prev, [type]: file }));
    setDocumentErrors(prev => ({ ...prev, [type]: '' }));
  };

  const removeDocument = (type) => {
    setDocuments(prev => ({ ...prev, [type]: null }));
    if (!removedDocuments.includes(type)) {
      setRemovedDocuments(prev => [...prev, type]);
    }
    setDocumentErrors(prev => ({ ...prev, [type]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("email", formData.email.trim());
      fd.append("employeeId", formData.employeeId.trim());
      fd.append("designation", formData.designation.trim());
      fd.append("qualification", formData.qualification.trim());
      fd.append("experienceYears", String(formData.experienceYears));
      fd.append("department_id", formData.department_id);
      fd.append("courses", JSON.stringify(assignedCourses));
      fd.append("removedDocuments", JSON.stringify(removedDocuments));

      for (const [type, file] of Object.entries(documents)) {
        if (file) {
          fd.append(type, file);
        }
      }

      await api.put(`/teachers/${id}`, fd);

      navigate("/teachers");
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating teacher:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        setError(err.response?.data?.message || "Update failed");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading teacher details..." />;
  }

  if (error && typeof error === 'object') {
    return (
      <ApiError
        title="Teacher Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={loadData}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="container-fluid">
      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaChalkboardTeacher className="blink me-2" />
          Edit Teacher
        </h3>
        <p className="opacity-75 mb-0">
          Update faculty details
        </p>
      </div>

      {error && typeof error === 'string' && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">
            <div className="row g-3">

              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Email" name="email" value={formData.email} onChange={handleChange} />
              <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} />
              <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
              <Input label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} />
              <Input label="Experience (Years)" name="experienceYears" value={formData.experienceYears} onChange={handleChange} />

              {/* Department */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Department</label>
                <select
                  className="form-select"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ADD COURSE */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Add Course</label>
                <select
                  className="form-select"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {courses
                    .filter(c => !assignedCourses.includes(c._id))
                    .map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mt-2"
                  onClick={addCourseToTeacher}
                  disabled={!newCourse}
                >
                  Add Course
                </button>
              </div>

              {/* ASSIGNED COURSES */}
              <div className="col-md-12">
                <label className="form-label fw-semibold">Assigned Courses</label>
                <select
                  className="form-select"
                  multiple
                  value={assignedCourses}
                  onChange={(e) =>
                    setAssignedCourses(
                      Array.from(e.target.selectedOptions).map(o => o.value)
                    )
                  }
                >
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Hold Ctrl / Cmd to remove courses
                </small>
              </div>

              {/* ================= DOCUMENT UPLOAD ================= */}
              <div className="col-12 mt-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold text-primary">
                      <FaFileAlt className="me-2" />
                      Uploaded Documents
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      {DOCUMENT_TYPES.map((doc) => {
                        const existingDoc = existingDocuments.find(d => d.documentType === doc.type);
                        const hasNewFile = documents[doc.type];
                        const isRemoved = removedDocuments.includes(doc.type);

                        return (
                          <div className="col-md-6" key={doc.type}>
                            <label className="form-label fw-semibold">{doc.label}</label>
                            {existingDoc && !hasNewFile && !isRemoved ? (
                              <div className="border rounded p-3 d-flex align-items-center justify-content-between" style={{ background: '#f8fafc' }}>
                                <div className="d-flex align-items-center gap-2">
                                  <FaCheckCircle style={{ color: '#28a745' }} />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{existingDoc.originalName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                      {(existingDoc.size / 1024).toFixed(1)} KB • {existingDoc.mimetype.split('/')[1].toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                                <div className="d-flex gap-2">
                                  <a
                                    href={`${api.defaults.baseURL}/api/documents/${existingDoc.documentId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline-primary"
                                    title="Preview"
                                  >
                                    Preview
                                  </a>
                                  <a
                                    href={`${api.defaults.baseURL}/api/documents/${existingDoc.documentId}?download=true`}
                                    className="btn btn-sm btn-outline-success"
                                    title="Download"
                                  >
                                    Download
                                  </a>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeDocument(doc.type)}
                                    title="Remove"
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => document.getElementById(`edit-upload-${doc.type}`).click()}
                                style={{
                                  border: `2px dashed ${documentErrors[doc.type] ? '#dc3545' : '#dee2e6'}`,
                                  borderRadius: '8px',
                                  padding: '1.5rem',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  background: hasNewFile ? 'rgba(16, 185, 129, 0.04)' : '#fff',
                                  minHeight: '100px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                <input
                                  id={`edit-upload-${doc.type}`}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleDocumentChange(doc.type, e.target.files[0] || null)}
                                  style={{ display: 'none' }}
                                />
                                {hasNewFile ? (
                                  <>
                                    <FaCheckCircle style={{ color: '#28a745' }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{hasNewFile.name}</span>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                      {(hasNewFile.size / 1024).toFixed(1)} KB
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <FaUpload style={{ color: '#1a4b6d', opacity: 0.5 }} />
                                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Click to upload</span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                      PDF, JPG, PNG — max {doc.maxSizeMB}MB
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                            {documentErrors[doc.type] && (
                              <div style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                {documentErrors[doc.type]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/teachers")}
            >
              <FaArrowLeft className="me-1" />
              Cancel
            </button>

            <button
              className="btn btn-primary px-4 rounded-pill"
              disabled={saving}
            >
              <FaSave className="me-1" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
        }
        .blink {
          animation: blink 1.5s infinite;
        }
        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
      `}</style>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}
