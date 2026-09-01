import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { getExams } from "../../../api/exam";
import { getStudentRoster, saveMarks } from "../../../api/marks";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaLayerGroup,
  FaGraduationCap,
  FaEdit,
  FaArrowLeft,
  FaSave,
  FaUsers,
} from "react-icons/fa";
import { motion } from "framer-motion";

const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
};

const styles = `
.marks-entry {
  --me-bg: #f4f7fa;
  --me-navy-950: #06192c;
  --me-navy-900: #0c2b47;
  --me-navy-800: #123a5e;
  --me-navy-700: #1a4a73;
  --me-cyan-600: #0e93ab;
  --me-cyan-500: #17aecb;
  --me-cyan-50: #e7f7fa;
  --me-amber-600: #b6790d;
  --me-amber-500: #e8a531;
  --me-amber-50: #fdf1de;
  --me-green-600: #1f8a5f;
  --me-green-500: #2aa876;
  --me-green-50: #e5f6ee;
  --me-red-500: #e5484d;
  --me-red-50: #fdecec;
  --me-slate-900: #1d2733;
  --me-slate-600: #55677c;
  --me-slate-400: #8695a7;
  --me-slate-200: #dfe6ec;
  --me-slate-100: #eef2f6;

  background: var(--me-bg);
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--me-slate-900);
}

.marks-entry .me-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--me-slate-100);
  box-shadow: 0 4px 18px rgba(12, 43, 71, 0.08);
  overflow: hidden;
}
.marks-entry .me-card-header {
  background: linear-gradient(135deg, var(--me-navy-900), var(--me-navy-700));
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.marks-entry .me-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}
.marks-entry .me-card-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--me-cyan-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.marks-entry .me-card-title {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  overflow-wrap: anywhere;
}
.marks-entry .me-card-body { padding: 1.75rem; }

.marks-entry .form-label {
  font-weight: 600;
  color: var(--me-slate-900);
  margin-bottom: 0.4rem;
  font-size: 0.88rem;
}
.marks-entry .form-select,
.marks-entry .form-input {
  border: 1px solid var(--me-slate-200);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-size: 0.92rem;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.marks-entry .form-select:focus,
.marks-entry .form-input:focus {
  outline: none;
  border-color: var(--me-cyan-500);
  box-shadow: 0 0 0 3px rgba(23, 174, 203, 0.12);
}

.marks-entry .table-card {
  border: 1px solid var(--me-slate-100);
  border-radius: 12px;
  overflow: hidden;
}
.marks-entry table { margin-bottom: 0; }
.marks-entry thead th {
  background: var(--me-slate-100);
  color: var(--me-navy-900);
  font-weight: 600;
  font-size: 0.82rem;
  border-bottom: 2px solid var(--me-cyan-500) !important;
  padding: 0.8rem 1rem;
  white-space: nowrap;
}
.marks-entry tbody td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--me-slate-100);
  font-size: 0.88rem;
}
.marks-entry tbody tr { transition: background 0.12s ease; }
.marks-entry tbody tr:hover { background: var(--me-cyan-50); }
.marks-entry tbody tr:last-child td { border-bottom: none; }

.marks-entry .btn-me-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--me-navy-900), var(--me-navy-700));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.marks-entry .btn-me-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 174, 203, 0.28);
  background: linear-gradient(135deg, var(--me-navy-800), var(--me-cyan-600));
}
.marks-entry .btn-me-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.marks-entry .btn-me-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  color: var(--me-navy-800);
  border: 1px solid var(--me-slate-200);
  border-radius: 10px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.marks-entry .btn-me-outline:hover {
  border-color: var(--me-navy-700);
  background: var(--me-slate-100);
}

.marks-entry .alert-me {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}
.marks-entry .alert-me-warning { background: var(--me-amber-50); color: var(--me-amber-600); border-color: rgba(232, 165, 49, 0.3); }
.marks-entry .alert-me-danger { background: var(--me-red-50); color: var(--me-red-500); border-color: rgba(229, 72, 77, 0.25); }
.marks-entry .alert-me svg { margin-top: 0.15rem; flex-shrink: 0; }

.marks-entry .badge-me {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
.marks-entry .badge-theory { background: rgba(12, 43, 71, 0.08); color: var(--me-navy-800); }
.marks-entry .badge-practical { background: var(--me-cyan-50); color: var(--me-cyan-600); }
.marks-entry .badge-composite { background: var(--me-amber-50); color: var(--me-amber-600); }
.marks-entry .badge-default { background: var(--me-slate-100); color: var(--me-slate-600); }
.marks-entry .badge-pass { background: var(--me-green-50); color: var(--me-green-600); }
.marks-entry .badge-fail { background: var(--me-red-50); color: var(--me-red-500); }
.marks-entry .badge-incomplete { background: var(--me-amber-50); color: var(--me-amber-600); }

@media (max-width: 640px) {
  .marks-entry .me-card-body { padding: 1.25rem; }
  .marks-entry .btn-me-primary,
  .marks-entry .btn-me-outline { width: 100%; justify-content: center; }
}
`;

export default function MarksEntry() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [roster, setRoster] = useState(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [marksMap, setMarksMap] = useState({});

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoadingExams(true);
        const data = await getExams();
        const examsList = Array.isArray(data) ? data : data.data || [];
        setExams(examsList);
      } catch (err) {
        logger.error("Error fetching exams:", err);
        setError("Failed to load exams. Please try again.");
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  const selectedExam = exams.find((e) => String(e._id) === String(selectedExamId));
  const subjects = selectedExam?.subjects || [];

  const getSubjectBadgeClass = (type) => {
    const variants = {
      THEORY: "badge-theory",
      PRACTICAL: "badge-practical",
      COMPOSITE: "badge-composite",
    };
    return `badge-me ${variants[type] || "badge-default"}`;
  };

  const handleExamChange = (e) => {
    const examId = e.target.value;
    setSelectedExamId(examId);
    setSelectedSubjectId("");
    setRoster(null);
    setMarksMap({});
    setError(null);
    setSaveError(null);
  };

  const handleSubjectChange = async (e) => {
    const subjectId = e.target.value;
    setSelectedSubjectId(subjectId);
    setMarksMap({});
    setSaveError(null);

    if (!subjectId || !selectedExamId) {
      setRoster(null);
      return;
    }

    try {
      setLoadingRoster(true);
      setError(null);
      const data = await getStudentRoster({
        examId: selectedExamId,
        subjectId,
      });

      const rosterData = data?.data || data;
      setRoster(rosterData);

      const initialMarks = {};
      for (const entry of (rosterData?.roster || [])) {
        if (entry.marks) {
          initialMarks[String(entry.studentId)] = {
            internalMarks: entry.marks.internalMarks ?? "",
            externalMarks: entry.marks.externalMarks ?? "",
          };
        } else {
          initialMarks[String(entry.studentId)] = {
            internalMarks: "",
            externalMarks: "",
          };
        }
      }
      setMarksMap(initialMarks);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load student roster.";
      setError(message);
      setRoster(null);
      logger.error("Error fetching roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleMarksChange = (studentId, field, value) => {
    setMarksMap((prev) => ({
      ...prev,
      [String(studentId)]: {
        ...prev[String(studentId)],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedExamId || !selectedSubjectId) {
      toast.warning("Please select an exam and subject first.");
      return;
    }

    const marksPayload = [];
    for (const entry of roster?.roster || []) {
      const studentMarks = marksMap[String(entry.studentId)] || {};
      marksPayload.push({
        studentId: entry.studentId,
        internalMarks:
          studentMarks.internalMarks !== "" ? Number(studentMarks.internalMarks) : null,
        externalMarks:
          studentMarks.externalMarks !== "" ? Number(studentMarks.externalMarks) : null,
      });
    }

    try {
      setSaving(true);
      setSaveError(null);
      await saveMarks({
        examId: selectedExamId,
        subjectId: selectedSubjectId,
        marks: marksPayload,
      });
      toast.success("Marks saved successfully");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save marks.";
      setSaveError(message);
      toast.error(message);
      logger.error("Error saving marks:", err);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="marks-entry container-fluid p-4">
        <style>{styles}</style>
        <Breadcrumb items={[{ label: "Marks Entry", path: "/teacher/marks-entry" }]} />
        <div className="fallback-wrap" style={{ maxWidth: 560, margin: "2rem auto" }}>
          <div className="alert-me alert-me-danger mb-3">
            <FaEdit />
            {error}
          </div>
          <button className="btn-me-outline" onClick={() => navigate("/teacher/dashboard")}>
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="marks-entry container-fluid p-4">
      <style>{styles}</style>

      <Breadcrumb items={[{ label: "Teacher Dashboard", path: "/teacher/dashboard" }, { label: "Marks Entry" }]} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="me-card mt-3"
      >
        <div className="me-card-header">
          <div className="me-card-header-left">
            <div className="me-card-header-icon">
              <FaEdit />
            </div>
            <h4 className="me-card-title">Marks Entry</h4>
          </div>
        </div>
        <div className="me-card-body">
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Exam</label>
              <select
                className="form-select"
                value={selectedExamId}
                onChange={handleExamChange}
                disabled={loadingExams}
              >
                <option value="">Select Exam</option>
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.name} ({exam.academicYear})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={handleSubjectChange}
                disabled={!selectedExamId || loadingRoster}
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => {
                  const subjectId = sub.subject?._id || sub.subject;
                  const subjectName = sub.subject?.name || sub.subject;
                  const subjectType = sub.subjectType || "N/A";
                  return (
                    <option key={subjectId} value={subjectId}>
                      {subjectName} [{subjectType}]
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedExam && selectedSubjectId && (
            <div className="d-flex flex-wrap gap-3 mb-3">
              <span className="badge-me" style={{ background: "var(--me-slate-100)", color: "var(--me-slate-600)" }}>
                <FaBookOpen />
                {selectedExam.course_id?.name || "N/A"}
              </span>
              <span className="badge-me" style={{ background: "var(--me-cyan-50)", color: "var(--me-cyan-600)" }}>
                <FaGraduationCap />
                Semester {selectedExam.semester}
              </span>
              {roster && (
                <>
                  <span className="badge-me" style={{ background: "var(--me-green-50)", color: "var(--me-green-600)" }}>
                    <FaUsers />
                    {roster.totalStudents} Students
                  </span>
                  <span className="badge-me" style={{ background: "var(--me-amber-50)", color: "var(--me-amber-600)" }}>
                    {roster.markedCount} Marked
                  </span>
                </>
              )}
            </div>
          )}

          {saveError && (
            <div className="alert-me alert-me-danger mb-3">
              <FaEdit />
              {saveError}
            </div>
          )}

          {loadingRoster ? (
            <Loading message="Loading student roster..." />
          ) : roster && roster.roster && roster.roster.length > 0 ? (
            <>
              <div className="table-card table-responsive">
                <table className="table">
                   <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Enrollment No.</th>
                        <th>Internal Marks</th>
                        {(roster.subjectType === "THEORY" || roster.subjectType === "COMPOSITE") && (
                          <th>External Marks</th>
                        )}
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                  <tbody>
                    {roster.roster.map((entry, index) => (
                      <tr key={entry.studentId}>
                        <td>{index + 1}</td>
                        <td>{entry.fullName}</td>
                        <td>{entry.enrollmentNumber || entry.rollNumber || "N/A"}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ maxWidth: 120 }}
                            min="0"
                            max={roster.internalMaxMarks ?? undefined}
                            placeholder={roster.internalMaxMarks !== undefined ? `Max ${roster.internalMaxMarks}` : "0"}
                            value={marksMap[String(entry.studentId)]?.internalMarks ?? ""}
                            onChange={(e) =>
                              handleMarksChange(entry.studentId, "internalMarks", e.target.value)
                            }
                          />
                        </td>
                         {(roster.subjectType === "THEORY" || roster.subjectType === "COMPOSITE") && (
                           <td>
                             <input
                               type="number"
                               className="form-input"
                               style={{ maxWidth: 120 }}
                               min="0"
                               max={roster.externalMaxMarks ?? undefined}
                               placeholder={roster.externalMaxMarks !== undefined ? `Max ${roster.externalMaxMarks}` : "0"}
                               value={marksMap[String(entry.studentId)]?.externalMarks ?? ""}
                               onChange={(e) =>
                                 handleMarksChange(entry.studentId, "externalMarks", e.target.value)
                               }
                             />
                           </td>
                         )}
                         <td>
                           {entry.calculation?.totalMarks ?? "-"}
                         </td>
                         <td>
                           {entry.calculation?.status ? (
                             <span
                               className={`badge-me ${
                                 entry.calculation.status === "PASS"
                                   ? "badge-pass"
                                   : entry.calculation.status === "FAIL"
                                   ? "badge-fail"
                                   : "badge-incomplete"
                               }`}
                             >
                               {entry.calculation.status}
                             </span>
                           ) : (
                             <span className="badge-me badge-incomplete">INCOMPLETE</span>
                           )}
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between mt-4">
                <button
                  className="btn-me-outline"
                  onClick={() => navigate("/teacher/dashboard")}
                >
                  <FaArrowLeft />
                  Back
                </button>
                <button
                  className="btn-me-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaSave />
                  {saving ? "Saving..." : "Save Marks"}
                </button>
              </div>
            </>
          ) : selectedSubjectId ? (
            <div className="alert-me alert-me-warning">
              <FaUsers />
              No students found for the selected exam and subject.
            </div>
          ) : (
            <div className="alert-me alert-me-warning">
              <FaBookOpen />
              Select an exam and subject to view the student roster.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
