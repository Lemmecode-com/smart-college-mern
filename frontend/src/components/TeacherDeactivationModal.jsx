import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaExclamationTriangle,
  FaTimes,
  FaChalkboardTeacher,
  FaBookOpen,
  FaClock,
  FaCalendarCheck,
  FaUserCheck,
  FaSpinner,
  FaBuilding,
} from "react-icons/fa";
import api from "../api/axios";
import { toast } from "react-toastify";

/**
 * TeacherDeactivationModal
 *
 * Replacement teachers MUST be from the same DEPARTMENT AND same COURSE.
 */
export default function TeacherDeactivationModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  collegeId,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [reassignmentData, setReassignmentData] = useState(null);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [defaultTeacherId, setDefaultTeacherId] = useState("");
  const [subjectToTeacherMap, setSubjectToTeacherMap] = useState({});

  useEffect(() => {
    if (!isOpen || !teacherId) return;

    const fetchData = async () => {
      setFetchingData(true);
      try {
        const [reassignmentRes, teachersRes] = await Promise.all([
          api.get(`/teachers/${teacherId}/reassignment-data`),
          api.get(
            `/teachers/available-for-reassignment?excludeTeacherId=${teacherId}`,
          ),
        ]);

        const reassignmentPayload = reassignmentRes.data;
        const teachersPayload = teachersRes.data;

        setReassignmentData(reassignmentPayload);
        setAvailableTeachers(
          Array.isArray(teachersPayload) ? teachersPayload : [],
        );

        const subjects = reassignmentPayload.subjects || [];
        const teachers = Array.isArray(teachersPayload) ? teachersPayload : [];

        const initialMap = {};
        subjects.forEach((s) => {
          initialMap[s._id] = "";
        });
        setSubjectToTeacherMap(initialMap);

        if (teachers.length === 1) {
          setDefaultTeacherId(teachers[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load reassignment data");
        console.error(err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [isOpen, teacherId]);

  /**
   * Get eligible teachers for a specific subject.
   * Constraint: Same DEPARTMENT + Same COURSE.
   */
  const getEligibleTeachers = (subject) => {
    if (!subject) return [];

    const subjectDeptId = String(
      subject.department_id?._id || subject.department_id,
    );
    const subjectCourseId = String(subject.course_id?._id || subject.course_id);

    return availableTeachers.filter((t) => {
      // 1. Check Department Match
      const teacherDeptId = String(t.department_id?._id || t.department_id);
      if (teacherDeptId !== subjectDeptId) return false;

      // 2. Check Course Match
      if (!t.courses || !Array.isArray(t.courses)) return false;

      const teacherCourseIds = t.courses.map((c) => String(c._id || c));
      return teacherCourseIds.includes(subjectCourseId);
    });
  };

  const handleSubjectTeacherChange = (subjectId, newTeacherId) => {
    setSubjectToTeacherMap((prev) => ({
      ...prev,
      [subjectId]: newTeacherId,
    }));
  };

  const handleDefaultTeacherChange = (teacherId) => {
    setDefaultTeacherId(teacherId);
  };

  const handleSubmit = async () => {
    if (!defaultTeacherId) {
      toast.error("Please select a default teacher for reassignment");
      return;
    }

    const finalSubjectMap = {};
    Object.entries(subjectToTeacherMap).forEach(([subjectId, tid]) => {
      if (tid) {
        finalSubjectMap[subjectId] = tid;
      }
    });

    setLoading(true);
    try {
      await api.put(`/teachers/${teacherId}/deactivate-with-reassignment`, {
        defaultTeacherId,
        subjectToTeacherMap: finalSubjectMap,
      });

      toast.success(
        `Teacher "${teacherName}" deactivated and resources reassigned`,
        {
          position: "top-right",
          autoClose: 4000,
        },
      );

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to deactivate teacher. Please try again.";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubjectStats = () => {
    const total = Object.keys(subjectToTeacherMap).length;
    const assigned = Object.values(subjectToTeacherMap).filter(
      (t) => t !== "",
    ).length;
    return { total, assigned, remaining: total - assigned };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="teacher-deactivation-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "20px",
              maxWidth: "750px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                padding: "2rem",
                textAlign: "center",
                position: "relative",
              }}
            >
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <FaTimes style={{ color: "#64748b" }} />
              </button>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                style={{
                  width: "80px",
                  height: "80px",
                  margin: "0 auto 1rem",
                  background: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                }}
              >
                <FaExclamationTriangle
                  style={{ width: "40px", height: "40px", color: "#dc3545" }}
                />
              </motion.div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                Deactivate Teacher & Reassign Resources
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#64748b",
                  fontSize: "0.95rem",
                }}
              >
                {teacherName} has assigned subjects. Reassign them before
                deactivation.
              </p>
            </div>

            {/* BODY */}
            <div style={{ padding: "1.5rem 2rem", overflowY: "auto", flex: 1 }}>
              {fetchingData ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    color: "#64748b",
                  }}
                >
                  <FaSpinner
                    className="spin-animation"
                    style={{ fontSize: "2rem", marginBottom: "1rem" }}
                  />
                  <p>Loading reassignment data...</p>
                </div>
              ) : (
                <>
                  {/* CONSTRAINT NOTICE */}
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "2px solid #fbbf24",
                      borderRadius: "10px",
                      padding: "0.75rem 1rem",
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <FaExclamationTriangle
                      style={{
                        color: "#f59e0b",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <strong style={{ color: "#92400e", fontSize: "0.9rem" }}>
                        Department & Course Constraint
                      </strong>
                      <p
                        style={{
                          margin: "0.25rem 0 0 0",
                          fontSize: "0.8rem",
                          color: "#78350f",
                          lineHeight: 1.5,
                        }}
                      >
                        Replacement teachers must be from the{" "}
                        <strong>same department</strong> and assigned to the{" "}
                        <strong>same course</strong> as each subject. Only
                        eligible teachers are shown.
                      </p>
                    </div>
                  </div>

                  {/* DEFAULT TEACHER SELECTOR */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: "0.75rem",
                        fontSize: "0.95rem",
                      }}
                    >
                      <FaUserCheck style={{ color: "#1a4b6d" }} /> Default
                      Replacement Teacher{" "}
                      <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <p
                      style={{
                        margin: "0 0 0.75rem 0",
                        fontSize: "0.85rem",
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      This teacher will receive all subjects not explicitly
                      assigned below. Must match department and courses.
                    </p>
                    <select
                      value={defaultTeacherId}
                      onChange={(e) =>
                        handleDefaultTeacherChange(e.target.value)
                      }
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "2px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        backgroundColor: "white",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      <option value="">-- Select Default Teacher --</option>
                      {availableTeachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.employeeId}) — {t.designation} —{" "}
                          {t.department_id?.name || "No Dept"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SUBJECT REASSIGNMENT LIST */}
                  {reassignmentData?.subjects?.length > 0 && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "1rem",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "#1e293b",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FaBookOpen style={{ color: "#1a4b6d" }} /> Subject
                          Reassignment
                          {getSubjectStats().remaining > 0 && (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              {getSubjectStats().remaining} unassigned
                            </span>
                          )}
                        </h4>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {reassignmentData.subjects.map((subject) => {
                          const eligibleTeachers = getEligibleTeachers(subject);
                          const hasNoEligible = eligibleTeachers.length === 0;

                          return (
                            <div
                              key={subject._id}
                              style={{
                                background: hasNoEligible ? "#fef2f2" : "white",
                                border: `2px solid ${hasNoEligible ? "#fca5a5" : "#e2e8f0"}`,
                                borderRadius: "10px",
                                padding: "1rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: "1rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: "200px" }}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      marginBottom: "0.25rem",
                                    }}
                                  >
                                    {subject.name}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "1rem",
                                      fontSize: "0.8rem",
                                      color: "#64748b",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span>
                                      <FaBookOpen
                                        style={{
                                          marginRight: "0.25rem",
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                      {subject.code}
                                    </span>
                                    <span>
                                      <FaCalendarCheck
                                        style={{
                                          marginRight: "0.25rem",
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                      Sem {subject.semester}
                                    </span>
                                    <span>
                                      <FaChalkboardTeacher
                                        style={{
                                          marginRight: "0.25rem",
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                      {subject.course_id?.name || "N/A"}
                                    </span>
                                    <span
                                      style={{
                                        color: "#1a4b6d",
                                        fontWeight: 600,
                                      }}
                                    >
                                      <FaBuilding
                                        style={{
                                          marginRight: "0.25rem",
                                          fontSize: "0.7rem",
                                        }}
                                      />
                                      {subject.department_id?.name || "No Dept"}
                                    </span>
                                  </div>
                                  {(() => {
                                    const subjectSlots =
                                      reassignmentData.slots?.filter(
                                        (s) =>
                                          s.subject_id?._id === subject._id,
                                      ) || [];
                                    const subjectSessions =
                                      reassignmentData.sessions?.filter(
                                        (s) =>
                                          s.subject_id?._id === subject._id,
                                      ) || [];
                                    if (
                                      subjectSlots.length > 0 ||
                                      subjectSessions.length > 0
                                    ) {
                                      return (
                                        <div
                                          style={{
                                            marginTop: "0.5rem",
                                            fontSize: "0.75rem",
                                            color: "#94a3b8",
                                            display: "flex",
                                            gap: "0.75rem",
                                          }}
                                        >
                                          {subjectSlots.length > 0 && (
                                            <span>
                                              <FaClock
                                                style={{
                                                  marginRight: "0.2rem",
                                                }}
                                              />
                                              {subjectSlots.length} slot
                                              {subjectSlots.length !== 1
                                                ? "s"
                                                : ""}
                                            </span>
                                          )}
                                          {subjectSessions.length > 0 && (
                                            <span>
                                              <FaCalendarCheck
                                                style={{
                                                  marginRight: "0.2rem",
                                                }}
                                              />
                                              {subjectSessions.length} session
                                              {subjectSessions.length !== 1
                                                ? "s"
                                                : ""}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {hasNoEligible && (
                                    <div
                                      style={{
                                        marginTop: "0.5rem",
                                        fontSize: "0.8rem",
                                        color: "#dc2626",
                                        fontWeight: 600,
                                      }}
                                    >
                                      ⚠ No eligible teachers in this
                                      department/course. This subject cannot be
                                      reassigned.
                                    </div>
                                  )}
                                </div>

                                <select
                                  value={subjectToTeacherMap[subject._id] || ""}
                                  onChange={(e) =>
                                    handleSubjectTeacherChange(
                                      subject._id,
                                      e.target.value,
                                    )
                                  }
                                  disabled={loading || hasNoEligible}
                                  style={{
                                    padding: "0.6rem 0.75rem",
                                    border: `2px solid ${hasNoEligible ? "#fca5a5" : "#e2e8f0"}`,
                                    borderRadius: "8px",
                                    fontSize: "0.85rem",
                                    backgroundColor: hasNoEligible
                                      ? "#fef2f2"
                                      : "white",
                                    minWidth: "220px",
                                    cursor:
                                      loading || hasNoEligible
                                        ? "not-allowed"
                                        : "pointer",
                                    opacity: loading || hasNoEligible ? 0.6 : 1,
                                  }}
                                >
                                  <option value="">Use default teacher</option>
                                  {eligibleTeachers.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {t.name} ({t.employeeId})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUMMARY */}
                  {reassignmentData && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        background: "#f0f9ff",
                        border: "2px solid #bae6fd",
                        borderRadius: "10px",
                        padding: "1rem",
                      }}
                    >
                      <h5
                        style={{
                          margin: "0 0 0.5rem 0",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: "#0369a1",
                        }}
                      >
                        Reassignment Summary
                      </h5>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            Subjects
                          </div>
                          <div
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "#1a4b6d",
                            }}
                          >
                            {reassignmentData.subjects?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            Timetable Slots
                          </div>
                          <div
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "#1a4b6d",
                            }}
                          >
                            {reassignmentData.slots?.length || 0}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            Future Sessions
                          </div>
                          <div
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "#1a4b6d",
                            }}
                          >
                            {reassignmentData.sessions?.length || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: "1rem",
              }}
            >
              <button
                onClick={onClose}
                disabled={loading || fetchingData}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "white",
                  color: "#64748b",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: loading || fetchingData ? "not-allowed" : "pointer",
                  opacity: loading || fetchingData ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || fetchingData || !defaultTeacherId}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  border: "none",
                  borderRadius: "12px",
                  background:
                    loading || fetchingData || !defaultTeacherId
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #dc3545 0%, #b91c1c 100%)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor:
                    loading || fetchingData || !defaultTeacherId
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    loading || fetchingData || !defaultTeacherId
                      ? "none"
                      : "0 4px 15px rgba(220, 53, 69, 0.3)",
                }}
              >
                {loading ? (
                  <span>
                    <FaSpinner
                      className="spin-animation"
                      style={{ marginRight: "0.5rem" }}
                    />
                    Reassigning...
                  </span>
                ) : (
                  "Deactivate & Reassign"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
