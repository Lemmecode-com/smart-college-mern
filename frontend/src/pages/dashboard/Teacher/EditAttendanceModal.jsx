import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import { FaCheckCircle, FaExclamationTriangle, FaTimes, FaUsers, FaSearch, FaUndo, FaSave, FaUserCheck, FaUserTimes, FaChevronLeft } from "react-icons/fa";
import Loading from "../../../components/Loading";

export default function EditAttendanceModal() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  /* ================= LOAD STUDENTS ================= */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const [studentsRes, sessionRes] = await Promise.all([
          api.get(`/attendance/sessions/${sessionId}/students`),
          api.get(`/attendance/sessions/${sessionId}`)
        ]);
        
        setStudents(studentsRes.data);
        setSessionInfo(sessionRes.data);
        
        // Pre-fill with existing attendance
        const existingAttendance = {};
        studentsRes.data.forEach(student => {
          if (student.attendanceStatus) {
            existingAttendance[student._id] = student.attendanceStatus;
          }
        });
        setAttendance(existingAttendance);
      } catch (err) {
        toast.error("Failed to load students", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [sessionId]);

  /* ================= UNSAVED CHANGES WARNING ================= */
  const handleBeforeUnload = useCallback((e) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  }, [hasChanges]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  /* ================= ESCAPE KEY ================= */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !saving) {
        handleBack();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [saving]);

  /* ================= MARK ALL ================= */
  const markAll = (status) => {
    const newAttendance = {};
    students.forEach(s => {
      newAttendance[s._id] = status;
    });
    setAttendance(newAttendance);
    setHasChanges(true);
    
    toast.success(
      status === 'PRESENT' 
        ? '✅ Marked all students as Present' 
        : status === 'ABSENT'
        ? '✅ Marked all students as Absent'
        : '✅ Cleared all attendance',
      { autoClose: 2000 }
    );
  };

  /* ================= UPDATE SINGLE ================= */
  const updateAttendance = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
    setHasChanges(true);
  };

  /* ================= FILTERED STUDENTS ================= */
  const filteredStudents = students.filter(student =>
    student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= MARKED COUNT ================= */
  const markedCount = Object.keys(attendance).filter(key => attendance[key]).length;
  const progressPercent = students.length > 0 ? Math.round((markedCount / students.length) * 100) : 0;

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    const unmarked = students.filter(s => !attendance[s._id]);
    
    if (unmarked.length > 0) {
      const confirmed = window.confirm(
        `${unmarked.length} student(s) not marked. Do you want to continue anyway?`
      );
      if (!confirmed) return;
    }

    setSaving(true);

    const payload = {
      attendance: Object.keys(attendance).map((id) => ({
        student_id: id,
        status: attendance[id]
      }))
    };

    try {
      const res = await api.put(
        `/attendance/sessions/${sessionId}/edit`,
        payload
      );

      toast.success(res.data.message || "Attendance updated successfully", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });
      
      setHasChanges(false);
      setClosing(true);
      setTimeout(() => {
        navigate(`/attendance/session/${sessionId}`);
      }, 300);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    } finally {
      setSaving(false);
    }
  };

  /* ================= HANDLE BACK ================= */
  const handleBack = () => {
    if (hasChanges) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) return;
    }
    setClosing(true);
    setTimeout(() => {
      navigate(`/attendance/session/${sessionId}`);
    }, 300);
  };

  if (loading) return <Loading size="sm" text="Loading students..." />;

  return (
    <div 
      className={`modal-overlay ${closing ? 'closing' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleBack()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal-container attendance-modal ${closing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="modal-header-custom">
          <div className="modal-title-wrapper">
            <button
              type="button"
              className="back-btn"
              onClick={handleBack}
              disabled={saving}
              aria-label="Go back"
            >
              <FaChevronLeft />
            </button>
            <div>
              <h5 id="modal-title" className="modal-title">Edit Attendance</h5>
              <p className="modal-subtitle">
                {sessionInfo?.lectureTitle || `Session ${sessionId}`} • {students.length} students
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleBack}
            disabled={saving}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-custom">
          {/* Quick Actions */}
          <div className="quick-actions-bar">
            <div className="quick-actions-left">
              <span className="quick-actions-label">Quick Mark:</span>
              <button
                type="button"
                className="quick-btn quick-btn-present"
                onClick={() => markAll('PRESENT')}
                disabled={saving}
              >
                <FaUserCheck />
                <span>All Present</span>
              </button>
              <button
                type="button"
                className="quick-btn quick-btn-absent"
                onClick={() => markAll('ABSENT')}
                disabled={saving}
              >
                <FaUserTimes />
                <span>All Absent</span>
              </button>
              <button
                type="button"
                className="quick-btn quick-btn-clear"
                onClick={() => markAll('')}
                disabled={saving}
              >
                <FaUndo />
                <span>Clear All</span>
              </button>
            </div>
            <div className="progress-info">
              <span className="progress-text">
                Marked: {markedCount}/{students.length} ({progressPercent}%)
              </span>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by student name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search students"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Students List */}
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th className="col-index">#</th>
                  <th className="col-student">Student</th>
                  <th className="col-status">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="empty-state">
                      <FaUsers className="empty-icon" />
                      <p>No students found</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr 
                      key={student._id} 
                      className={`student-row ${attendance[student._id] ? 'marked' : ''} ${attendance[student._id] === 'PRESENT' ? 'present' : attendance[student._id] === 'ABSENT' ? 'absent' : ''}`}
                    >
                      <td className="cell-index">{index + 1}</td>
                      <td className="cell-student">
                        <div className="student-avatar">
                          {student.profilePhoto ? (
                            <img src={student.profilePhoto} alt={student.fullName} />
                          ) : (
                            <span>{student.fullName?.charAt(0) || 'S'}</span>
                          )}
                        </div>
                        <div className="student-info">
                          <div className="student-name">{student.fullName}</div>
                          <div className="student-roll">{student.rollNumber || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="cell-status">
                        <div className="attendance-buttons">
                          <button
                            type="button"
                            className={`attendance-btn present ${attendance[student._id] === 'PRESENT' ? 'active' : ''}`}
                            onClick={() => updateAttendance(student._id, 'PRESENT')}
                            title="Mark Present"
                            aria-label={`Mark ${student.fullName} as present`}
                          >
                            <FaCheckCircle />
                          </button>
                          <button
                            type="button"
                            className={`attendance-btn absent ${attendance[student._id] === 'ABSENT' ? 'active' : ''}`}
                            onClick={() => updateAttendance(student._id, 'ABSENT')}
                            title="Mark Absent"
                            aria-label={`Mark ${student.fullName} as absent`}
                          >
                            <FaTimesCircle />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer-custom">
          <button
            type="button"
            className="btn btn-secondary-custom"
            onClick={handleBack}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary-custom"
            onClick={handleSubmit}
            disabled={saving || markedCount === 0}
          >
            {saving ? (
              <>
                <span className="spinner spinner-sm"></span>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <FaSave className="btn-icon" />
                <span>Update Attendance</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        /* ================= MODAL OVERLAY ================= */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 58, 74, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.3s ease;
        }

        .modal-overlay.closing {
          animation: fadeOut 0.3s ease forwards;
        }

        /* ================= MODAL CONTAINER ================= */
        .modal-container {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(15, 58, 74, 0.4), 0 0 0 1px rgba(61, 181, 230, 0.2);
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        .modal-container.closing {
          animation: slideDown 0.3s ease forwards;
        }

        /* ================= MODAL HEADER ================= */
        .modal-header-custom {
          padding: 1.5rem;
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .modal-title-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.3s ease;
        }

        .back-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateX(-4px);
        }

        .back-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .modal-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .modal-close-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .modal-close-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: rotate(90deg);
        }

        .modal-close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ================= MODAL BODY ================= */
        .modal-body-custom {
          padding: 0;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* QUICK ACTIONS BAR */
        .quick-actions-bar {
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
          border-bottom: 1px solid rgba(61, 181, 230, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .quick-actions-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .quick-actions-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f3a4a;
        }

        .quick-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .quick-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .quick-btn-present {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%);
          color: #10b981;
        }

        .quick-btn-present:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.35) 100%);
          transform: translateY(-2px);
        }

        .quick-btn-absent {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.25) 100%);
          color: #ef4444;
        }

        .quick-btn-absent:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.35) 100%);
          transform: translateY(-2px);
        }

        .quick-btn-clear {
          background: linear-gradient(135deg, rgba(108, 117, 125, 0.15) 0%, rgba(108, 117, 125, 0.25) 100%);
          color: #6c757d;
        }

        .quick-btn-clear:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(108, 117, 125, 0.25) 0%, rgba(108, 117, 125, 0.35) 100%);
          transform: translateY(-2px);
        }

        /* PROGRESS INFO */
        .progress-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f3a4a;
          white-space: nowrap;
        }

        .progress-bar-container {
          width: 150px;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(61, 181, 230, 0.4);
        }

        /* SEARCH BAR */
        .search-bar {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
        }

        .search-icon {
          color: #9ca3af;
          font-size: 1.1rem;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #3db5e6;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.12);
        }

        .search-clear {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .search-clear:hover {
          background: #f3f4f6;
          color: #ef4444;
        }

        /* STUDENTS TABLE */
        .students-table-container {
          flex: 1;
          overflow-y: auto;
        }

        .students-table {
          width: 100%;
          border-collapse: collapse;
        }

        .students-table thead {
          position: sticky;
          top: 0;
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
          z-index: 10;
        }

        .students-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .students-table tbody tr {
          border-bottom: 1px solid #f3f4f6;
          transition: all 0.2s ease;
        }

        .students-table tbody tr:hover {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
        }

        .students-table tbody tr.marked {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.08) 100%);
        }

        .students-table td {
          padding: 1rem 1.25rem;
        }

        .col-index {
          width: 60px;
          text-align: center;
        }

        .cell-index {
          text-align: center;
          font-weight: 600;
          color: #6b7280;
        }

        .col-student {
          width: auto;
        }

        .cell-student {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .student-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .student-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .student-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .student-roll {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .col-status {
          width: 140px;
        }

        .cell-status {
          text-align: center;
        }

        .attendance-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .attendance-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 2px solid #e5e7eb;
          background: white;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: all 0.3s ease;
        }

        .attendance-btn:hover {
          transform: scale(1.1);
        }

        .attendance-btn.present {
          color: #10b981;
          border-color: #10b981;
        }

        .attendance-btn.present:hover,
        .attendance-btn.present.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .attendance-btn.absent {
          color: #ef4444;
          border-color: #ef4444;
        }

        .attendance-btn.absent:hover,
        .attendance-btn.absent.active {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #9ca3af;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0;
          font-size: 1rem;
        }

        /* ================= MODAL FOOTER ================= */
        .modal-footer-custom {
          padding: 1.25rem 1.5rem;
          background: #f8f9fa;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary-custom {
          background: #e5e7eb;
          color: #6b7280;
        }

        .btn-secondary-custom:hover:not(:disabled) {
          background: #d1d5db;
          transform: translateY(-2px);
        }

        .btn-primary-custom {
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-primary-custom:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .btn-icon {
          font-size: 1.1rem;
        }

        /* SPINNER */
        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .spinner-sm {
          width: 16px;
          height: 16px;
          border-width: 2px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ================= ANIMATIONS ================= */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0.75rem;
            align-items: flex-end;
          }

          .modal-container {
            max-height: 95vh;
            border-radius: 20px 20px 0 0;
          }

          .modal-header-custom {
            padding: 1.25rem;
          }

          .modal-title {
            font-size: 1.1rem;
          }

          .modal-subtitle {
            font-size: 0.8rem;
          }

          .quick-actions-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .quick-actions-left {
            justify-content: center;
          }

          .progress-info {
            justify-content: center;
          }

          .progress-bar-container {
            width: 120px;
          }

          .students-table th,
          .students-table td {
            padding: 0.75rem 0.5rem;
          }

          .student-avatar {
            width: 36px;
            height: 36px;
            font-size: 1rem;
          }

          .attendance-btn {
            width: 36px;
            height: 36px;
            font-size: 1.1rem;
          }

          .modal-footer-custom {
            padding: 1rem 1.25rem;
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}