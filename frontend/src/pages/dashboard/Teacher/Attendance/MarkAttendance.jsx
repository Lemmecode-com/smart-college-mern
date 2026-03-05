import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import { toast } from "react-toastify";
import AttendanceToggle from "../../../../components/AttendanceToggle";
import ConfirmModal from "../../../../components/ConfirmModal";

import {
  FaUsers,
  FaSave,
  FaBookOpen,
  FaEdit,
  FaLock,
  FaCheckCircle,
  FaSearch,
  FaCheck,
  FaTimes,
  FaUndo,
  FaInfoCircle
} from "react-icons/fa";

export default function MarkAttendance() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [attendance, setAttendance] = useState({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false); // Loading state for students
  
  // NEW: Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  
  // NEW: Mark All state
  const [markAllStatus, setMarkAllStatus] = useState(null); // 'PRESENT', 'ABSENT', or null

  // NEW: Undo state
  const [previousAttendance, setPreviousAttendance] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef(null); // Use ref instead of state for timer

  // NEW: Unmarked students confirmation
  const [showUnmarkedConfirm, setShowUnmarkedConfirm] = useState(false);
  const [unmarkedCount, setUnmarkedCount] = useState(0);

  // NEW: Close session confirmation
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= CLEANUP ON UNMOUNT ================= */
  useEffect(() => {
    return () => {
      // Clear any pending timers on unmount
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  /* ================= FETCH SESSIONS ================= */
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/attendance/sessions");
        setSessions(res.data.sessions || []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        const message = err.response?.data?.message || err.message || "Failed to load sessions";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  /* ================= LOAD STUDENTS ================= */
  const loadStudents = async (sessionId) => {
    setLoadingStudents(true); // Start loading
    setError("");
    setStudents([]);
    setAttendance({});
    setAttendanceSaved(false);
    setSearchTerm("");
    setMarkAllStatus(null);
    setPreviousAttendance(null);
    setShowUndo(false);

    const session = sessions.find((s) => s._id === sessionId);
    if (!session?.course_id) {
      setLoadingStudents(false);
      return;
    }

    try {
      const res = await api.get(
        `/attendance/students?course_id=${session.course_id}`
      );

      const list = res.data || [];

      // Set students
      setStudents(list);

      // Create and set attendance map directly (no setTimeout needed)
      const initial = {};
      list.forEach((s) => {
        initial[s._id] = "PRESENT";
      });
      setAttendance(initial);

    } catch (err) {
      console.error("Failed to load students:", err);
      setError("Failed to load students");
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false); // Stop loading
    }
  };

  /* ================= MARK STATUS ================= */
  const handleStatusChange = (studentId, status) => {
    setAttendance((prev) => {
      const updated = { ...prev, [studentId]: status };
      return updated;
    });
  };

  /* ================= MARK ALL ================= */
  const handleMarkAll = (status) => {
    // Save current state for undo
    setPreviousAttendance({ ...attendance });
    setShowUndo(true);

    // Mark all students
    const allMarked = {};
    students.forEach((s) => {
      allMarked[s._id] = status;
    });
    setAttendance(allMarked);
    setMarkAllStatus(status);

    // Auto-hide undo after 5 seconds
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setShowUndo(false);
      setPreviousAttendance(null);
    }, 5000);
  };

  /* ================= UNDO ================= */
  const handleUndo = () => {
    if (previousAttendance) {
      setAttendance(previousAttendance);
      setPreviousAttendance(null);
      setShowUndo(false);
      setMarkAllStatus(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      toast.info("Changes undone", {
        position: "top-right",
        autoClose: 2000
      });
    }
  };

  /* ================= CLEAR SEARCH ================= */
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  /* ================= FILTERED STUDENTS ================= */
  const filteredStudents = students.filter((student) =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= ATTENDANCE COUNT ================= */
  const attendanceCount = {
    present: Object.values(attendance).filter((s) => s === "PRESENT").length,
    absent: Object.values(attendance).filter((s) => s === "ABSENT").length,
    total: students.length
  };

  /* ================= SAVE ATTENDANCE (ONLY ONCE) ================= */
  const handleSaveAttendance = async () => {
    // Validation 1: Check if session is selected
    if (!selectedSession) {
      toast.error("Please select a session first");
      return;
    }

    // Validation 2: Check for unmarked students (only if not already confirmed)
    if (!showUnmarkedConfirm) {
      const unmarkedStudents = students.filter(s => !attendance[s._id]);
      
      if (unmarkedStudents.length > 0) {
        setUnmarkedCount(unmarkedStudents.length);
        setShowUnmarkedConfirm(true);
        return;
      }
    }

    // Reset confirm state if shown
    if (showUnmarkedConfirm) {
      setShowUnmarkedConfirm(false);
      setUnmarkedCount(0);
    }

    setSaving(true);
    setError("");

    const payload = {
      attendance: Object.entries(attendance).map(
        ([student_id, status]) => ({ student_id, status })
      )
    };

    try {
      await api.post(
        `/attendance/sessions/${selectedSession}/mark-attendance`,
        payload
      );

      setAttendanceSaved(true);
      setShowUndo(false);
      setPreviousAttendance(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

      toast.success("Attendance saved successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });

    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 500) {
        setAttendanceSaved(true);
        setError("Attendance already saved. Use Edit option.");
        toast.warning("Attendance already saved for this session. Use Edit to modify.", {
          position: "top-right",
          autoClose: 5000
        });
      } else {
        setError("Failed to save attendance");
        toast.error("Failed to save attendance. Please try again.", {
          position: "top-right",
          autoClose: 5000
        });
      }
    } finally {
      setSaving(false);
    }
  };

  /* ================= CLOSE SESSION ================= */
  const handleCloseSession = () => {
    setShowCloseConfirm(true);
  };

  const confirmCloseSession = () => {
    setShowCloseConfirm(false);
    navigate(`/session/close/${selectedSession}`);
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading..." />;
  }

return (
  <div className="container-fluid px-3 px-md-4">

    {/* ================= PAGE HEADER ================= */}
    <div className="page-header mb-4">
      <div className="d-flex align-items-center gap-3">
        <div className="icon-box">
          <FaUsers />
        </div>
        <div>
          <h3 className="mb-1 fw-bold">Mark Attendance</h3>
          <p className="text-muted mb-0">
            Select session → students auto load → mark → save
          </p>
        </div>
      </div>
    </div>

    {/* ================= ALERTS ================= */}
    {error && (
      <div className="alert alert-danger text-center mb-4" role="alert">
        {error}
      </div>
    )}

    {attendanceSaved && (
      <div className="alert alert-success text-center mb-4" role="alert">
        Attendance already saved for this session.
        Use <strong>Edit</strong> to modify.
      </div>
    )}

    {/* ================= ARIA LIVE REGION ================= */}
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {loadingStudents && "Loading students..."}
      {students.length > 0 && !loadingStudents && `Showing ${filteredStudents.length} of ${students.length} students. Present: ${attendanceCount.present}, Absent: ${attendanceCount.absent}`}
      {attendanceSaved && "Attendance saved successfully"}
    </div>

    {/* ================= UNDO BANNER ================= */}
    {showUndo && previousAttendance && (
      <div className="alert alert-info d-flex justify-content-between align-items-center mb-4">
        <span>
          <FaUndo className="me-2" />
          Changes made! Want to undo?
        </span>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleUndo}
        >
          <FaUndo className="me-1" />
          Undo
        </button>
      </div>
    )}

    {/* ================= UNMARKED STUDENTS CONFIRMATION ================= */}
    <ConfirmModal
      isOpen={showUnmarkedConfirm}
      onClose={() => {
        setShowUnmarkedConfirm(false);
        setUnmarkedCount(0);
      }}
      onConfirm={handleSaveAttendance}
      title="Unmarked Students"
      message={`${unmarkedCount} student(s) are unmarked. Are you sure you want to save attendance anyway?`}
      type="warning"
      confirmText="Save Anyway"
      cancelText="Go Back"
    />

    {/* ================= CLOSE SESSION CONFIRMATION ================= */}
    <ConfirmModal
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
      onConfirm={confirmCloseSession}
      title="Close Session"
      message="Are you sure you want to close this attendance session? This action cannot be undone."
      type="danger"
      confirmText="Close Session"
      cancelText="Cancel"
    />

    {/* ================= SESSION SELECT ================= */}
    <div className="card section-card mb-4">
      <div className="card-body">
        <label className="form-label fw-semibold mb-2" htmlFor="session-select">
          <FaBookOpen className="me-2 text-primary" />
          Attendance Session
        </label>

        <select
          id="session-select"
          className="form-select"
          value={selectedSession}
          onChange={(e) => {
            const sessionId = e.target.value;
            setSelectedSession(sessionId);
            if (sessionId) loadStudents(sessionId);
          }}
          aria-label="Select attendance session"
          aria-describedby="session-help"
        >
          <option value="">-- Select Lecture Session --</option>
          {sessions
            .filter((s) => s.status === "OPEN") // Only show OPEN sessions
            .map((s) => (
              <option key={s._id} value={s._id}>
                {new Date(s.lectureDate).toLocaleDateString()} | Lecture {s.lectureNumber}
              </option>
            ))}
          {sessions.filter((s) => s.status === "OPEN").length === 0 && (
            <option disabled>No open sessions available</option>
          )}
        </select>
        
        <small id="session-help" className="text-muted mt-2 d-block">
          <FaInfoCircle className="me-1" />
          {sessions.filter((s) => s.status === "OPEN").length === 0 
            ? "No open sessions found. Create a new session or edit an existing one." 
            : `Found ${sessions.filter((s) => s.status === "OPEN").length} open session(s)`}
        </small>
      </div>
    </div>

    {/* ================= STUDENT TABLE ================= */}
    {students.length > 0 && (
      <div className="card section-card">
        <div className="card-body p-0">

          {/* Loading State */}
          {loadingStudents && (
            <div className="py-5">
              <Loading size="md" text="Loading students..." />
            </div>
          )}

          {/* Table Header with Search and Mark All */}
          <div className={`table-header px-4 py-3 ${loadingStudents ? 'd-none' : ''}`}>
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <h5 className="fw-bold mb-0">Student Attendance</h5>
              </div>
              
              {/* Search */}
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0" aria-hidden="true">
                    <FaSearch className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search students by name or email"
                    aria-describedby="search-help"
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                    >
                      <FaTimes aria-hidden="true" />
                    </button>
                  )}
                </div>
                <small id="search-help" className="visually-hidden">
                  Type to filter students by name or email address
                </small>
              </div>

              {/* Attendance Summary */}
              <div className="col-md-4">
                <div className="d-flex gap-2 justify-content-md-end">
                  <span className="badge bg-success bg-opacity-10 text-success px-3 py-2">
                    <FaCheck className="me-1" />
                    Present: {attendanceCount.present}
                  </span>
                  <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2">
                    <FaTimes className="me-1" />
                    Absent: {attendanceCount.absent}
                  </span>
                  <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2">
                    Total: {attendanceCount.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Mark All Buttons */}
            <div className="row g-2 mt-3">
              <div className="col-12">
                <div className="d-flex gap-2 flex-wrap">
                  <span className="text-muted small align-self-center" id="mark-all-label">Mark All:</span>
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => handleMarkAll("PRESENT")}
                    disabled={attendanceSaved || markAllStatus === "PRESENT"}
                    aria-label="Mark all students as present"
                    aria-pressed={markAllStatus === "PRESENT"}
                    aria-describedby="mark-all-label"
                  >
                    <FaCheck className="me-1" aria-hidden="true" />
                    Present
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleMarkAll("ABSENT")}
                    disabled={attendanceSaved || markAllStatus === "ABSENT"}
                    aria-label="Mark all students as absent"
                    aria-pressed={markAllStatus === "ABSENT"}
                    aria-describedby="mark-all-label"
                  >
                    <FaTimes className="me-1" aria-hidden="true" />
                    Absent
                  </button>
                  {showUndo && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleUndo}
                      aria-label="Undo last mark all action"
                    >
                      <FaUndo className="me-1" aria-hidden="true" />
                      Undo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table align-middle mb-0" role="grid" aria-label="Student attendance table">
              <thead className="table-dark">
                <tr>
                  <th scope="col" aria-label="Row number">#</th>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col" className="text-center" aria-label="Attendance status">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <FaSearch className="me-2" aria-hidden="true" />
                      No students found matching "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, i) => (
                    <tr key={s._id} aria-label={`Student row for ${s.fullName}`}>
                      <td>{i + 1}</td>
                      <td className="fw-semibold">{s.fullName}</td>
                      <td className="text-muted">{s.email}</td>
                      <td className="text-center">
                        <AttendanceToggle
                          studentId={s._id}
                          status={attendance[s._id]}
                          onStatusChange={handleStatusChange}
                          disabled={attendanceSaved}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ================= ACTION FOOTER ================= */}
          <div className="action-footer px-4 py-3">
            <div className="row g-2">
              <div className="col-md-4">
                <button
                  className="btn btn-success w-100"
                  onClick={handleSaveAttendance}
                  disabled={saving || attendanceSaved}
                  aria-label="Save attendance for all students"
                  aria-busy={saving}
                >
                  <FaSave className="me-2" aria-hidden="true" />
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>

              <div className="col-md-4">
                <button
                  className="btn btn-warning w-100"
                  onClick={() =>
                    navigate(`/attendance/sessions/${selectedSession}/edit`)
                  }
                  disabled={!selectedSession}
                  aria-label="Edit attendance for selected session"
                >
                  <FaEdit className="me-2" aria-hidden="true" />
                  Edit Attendance
                </button>
              </div>

              <div className="col-md-4">
                <button
                  className="btn btn-danger w-100"
                  onClick={handleCloseSession}
                  disabled={!selectedSession}
                  aria-label="Close attendance session permanently"
                >
                  <FaLock className="me-2" aria-hidden="true" />
                  Close Session
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    )}

    {/* ================= PAGE STYLES ================= */}
    <style>{`
      .page-header {
        background: linear-gradient(180deg, #0f3a4a, #134952);
        color: white;
        padding: 20px 24px;
        border-radius: 14px;
      }

      .icon-box {
        width: 46px;
        height: 46px;
        background: rgba(255,255,255,0.15);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .section-card {
        border-radius: 16px;
        border: none;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      }

      .table-header {
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
      }

      .action-footer {
        background: #f8f9fa;
        border-top: 1px solid #dee2e6;
      }

      .input-group-text {
        border-radius: 8px 0 0 8px;
      }

      .form-control.border-start-0 {
        border-radius: 0 8px 8px 0;
      }

      .form-control.border-start-0:focus {
        border-left: 1px solid #86b7fe;
      }

      .badge {
        font-weight: 600;
        border-radius: 8px;
      }

      @media (max-width: 768px) {
        .page-header {
          padding: 16px;
        }
        
        .table-header .row.g-3 {
          flex-direction: column;
        }
        
        .table-header .col-md-4 {
          width: 100%;
        }
        
        .d-flex.gap-2.flex-wrap {
          justify-content: center !important;
        }
      }
    `}</style>

  </div>
);

}