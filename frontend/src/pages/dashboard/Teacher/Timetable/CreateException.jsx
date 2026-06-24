/**
 * Create Exception Page
 * Standalone page for creating timetable exceptions (holidays, cancellations, etc.)
 */
import { useContext, useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import SearchableSelect from "../../../../components/SearchableSelect";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaUpload,
  FaChevronDown,
  FaExclamationTriangle,
  FaArrowLeft,
  FaDoorOpen,
  FaUser,
} from "react-icons/fa";
import { motion } from "framer-motion";

// Exception type display names
const EXCEPTION_TYPES = {
  HOLIDAY: "Holiday",
  CANCELLED: "Cancelled Class",
  EXTRA: "Extra/Makeup Class",
  RESCHEDULED: "Rescheduled Class",
  ROOM_CHANGE: "Room Change",
  TEACHER_CHANGE: "Teacher Change",
  SPECIAL_EVENT: "Special Event",
  EXAM: "Exam Schedule",
};

const MotionDiv = motion.div;
const MotionButton = motion.button;

export default function CreateException() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Get timetableId from URL params
  const timetableIdParam = searchParams.get("timetableId");

  const [formData, setFormData] = useState({
    exceptionDate: "",
    type: "HOLIDAY",
    reason: "",
    rescheduledTo: "",
    newRoom: "",
    substituteTeacher: "",
    extraSlot: {
      startTime: "",
      endTime: "",
      subject_id: "",
      teacher_id: "",
      room: "",
    },
  });

// Fetch timetables
   useEffect(() => {
    const fetchTimetables = async () => {
      try {
        const res = await api.get("/timetable");
        const timetablesList = res.data.timetables || [];
        setTimetables(timetablesList);

        // If timetableId is in URL, select it
        if (timetableIdParam) {
          const tt = timetablesList.find((t) => t._id === timetableIdParam);
          if (tt) {
            setSelectedTimetable(tt);
          } else if (timetablesList.length > 0) {
            setSelectedTimetable(timetablesList[0]);
          }
        } else if (timetablesList.length > 0) {
          setSelectedTimetable(timetablesList[0]);
        }
      } catch (err) {
        console.error("Failed to fetch timetables:", err);
        toast.error("Failed to load timetables");
      } finally {
        setLoading(false);
      }
    };

    fetchTimetables();
  }, [timetableIdParam]);

const fetchSubjectsForSearch = async (query) => {
     if (!selectedTimetable) return [];
     try {
       const res = await api.get(`/subjects/course/${selectedTimetable.course_id}`, {
         params: { search: query },
       });
       return (res.data || []).map((s) => ({
         value: s._id,
         label: `${s.code} - ${s.name}`,
       }));
     } catch (err) {
       console.error("Failed to fetch subjects:", err);
       return [];
     }
   };

const fetchTeachersForSearch = async (query) => {
     try {
       const res = await api.get(`/hod/teachers`, {
         params: { search: query },
       });
       return (res.data?.teachers || []).map((t) => ({
         value: t._id,
         label: `${t.name} (${t.employeeId})`,
       }));
     } catch {
       return [];
     }
   };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTimetable) {
      toast.error("Please select a timetable");
      return;
    }

    if (!formData.exceptionDate) {
      toast.error("Please select a date");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }

    // Validate type-specific fields
    if (formData.type === "EXTRA") {
      if (
        !formData.extraSlot.startTime ||
        !formData.extraSlot.endTime ||
        !formData.extraSlot.subject_id ||
        !formData.extraSlot.teacher_id
      ) {
        toast.error("Please fill in all extra slot details");
        return;
      }
      if (formData.extraSlot.startTime >= formData.extraSlot.endTime) {
        toast.error("Start time must be before end time");
        return;
      }
    }

    if (formData.type === "RESCHEDULED" && !formData.rescheduledTo) {
      toast.error("Please select a rescheduled date");
      return;
    }

    if (formData.type === "ROOM_CHANGE" && !formData.newRoom?.trim()) {
      toast.error("Please enter a new room");
      return;
    }

    if (formData.type === "TEACHER_CHANGE" && !formData.substituteTeacher) {
      toast.error("Please select a substitute teacher");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        exceptionDate: formData.exceptionDate,
        type: formData.type,
        reason: formData.reason,
      };

      // Add type-specific fields
      if (formData.type === "RESCHEDULED") {
        payload.rescheduledTo = formData.rescheduledTo;
      }

      if (formData.type === "EXTRA") {
        payload.extraSlot = formData.extraSlot;
      }

      if (formData.type === "ROOM_CHANGE") {
        payload.newRoom = formData.newRoom;
      }

      if (formData.type === "TEACHER_CHANGE") {
        payload.substituteTeacher = formData.substituteTeacher;
      }

      await api.post(
        `/timetable/${selectedTimetable._id}/exceptions`,
        payload,
      );

      toast.success("Exception request submitted for approval", {
        position: "top-right",
        autoClose: 3000,
      });

      // Navigate back to exception management
      setTimeout(() => {
        navigate("/timetable/exceptions", {
          state: { refresh: true },
        });
      }, 1000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to submit exception request";
      setError(errorMsg);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/timetable/exceptions");
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExtraSlotChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      extraSlot: {
        ...prev.extraSlot,
        [name]: value,
      },
    }));
  };

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading..." color="primary" />;
  }

  return (
    <div
      className="container-fluid p-0"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf2 100%)",
      }}
    >
      <ToastContainer position="top-right" theme="colored" />

      {/* Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="position-relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--sidebar-bg-gradient-start, #0f3a4a) 0%, var(--sidebar-bg-gradient-end, #0c2d3a) 100%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Background Pattern */}
        <div
          className="position-absolute top-0 end-0"
          style={{
            width: "400px",
            height: "100%",
            opacity: 0.03,
            background:
              "radial-gradient(circle at 70% 50%, var(--sidebar-accent, #3db5e6) 0%, transparent 70%)",
          }}
        />

        <div className="p-4 text-white position-relative">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="btn d-flex align-items-center justify-content-center border-0"
                style={{
                  width: "40px",
                  height: "40px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s ease",
                }}
                title="Go Back"
              >
                <FaArrowLeft />
              </MotionButton>
              <MotionDiv
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: "56px",
                  height: "56px",
                  background:
                    "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                  borderRadius: "12px",
                  fontSize: "1.5rem",
                  boxShadow: "0 4px 12px rgba(61, 181, 230, 0.3)",
                }}
              >
                <FaCalendarAlt />
              </MotionDiv>
              <div>
                <h3 className="fw-bold mb-1" style={{ letterSpacing: "0.5px" }}>
                  Create Exception
                </h3>
                <p className="mb-0 opacity-75" style={{ fontSize: "0.875rem" }}>
                  Add a holiday, cancellation, or special event
                </p>
              </div>
            </div>

            {/* Bulk Upload Button */}
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                navigate("/timetable/exceptions", {
                  state: { showBulkModal: true },
                })
              }
              className="btn d-flex align-items-center gap-2 fw-medium border-0"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2) !important",
                color: "white",
                borderRadius: "10px",
                padding: "0.6rem 1.2rem",
                backdropFilter: "blur(10px)",
                transition: "all 0.2s ease",
              }}
            >
              <FaUpload />
              <span>Bulk Upload</span>
            </MotionButton>
          </div>
        </div>
      </MotionDiv>

      {/* Form */}
      <div className="p-4">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card shadow-lg border-0"
              style={{
                borderRadius: "20px",
                background: "white",
                border: "none",
                overflow: "hidden",
              }}
            >
              <div className="card-body p-4">
                {error && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="alert alert-danger d-flex align-items-center mb-3 border-0"
                    role="alert"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "10px",
                      color: "#991b1b",
                    }}
                  >
                    <FaInfoCircle className="me-2" />
                    {error}
                  </MotionDiv>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Timetable Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark mb-2">
                      Timetable <span className="text-danger">*</span>
                    </label>
                    <div className="position-relative">
                      <select
                        className="form-select border-0"
                        value={selectedTimetable?._id || ""}
                        onChange={(e) => {
                          const tt = timetables.find(
                            (t) => t._id === e.target.value,
                          );
                          setSelectedTimetable(tt);
                        }}
                        required
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "0.85rem 3rem 0.85rem 1rem",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #e2e8f0",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="">Select a timetable...</option>
                        {timetables.map((tt) => (
                          <option key={tt._id} value={tt._id}>
                            {tt.name} (Sem {tt.semester})
                          </option>
                        ))}
                      </select>
                      <div
                        className="position-absolute top-50 end-0 translate-middle-y me-3 pointer-events-none"
                        style={{ color: "#64748b" }}
                      >
                        <FaChevronDown size={12} />
                      </div>
                    </div>
                  </div>

                  {/* Exception Type */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark mb-2">
                      Exception Type <span className="text-danger">*</span>
                    </label>
                    <div className="position-relative">
                      <select
                        className="form-select border-0"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "0.85rem 3rem 0.85rem 1rem",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #e2e8f0",
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          cursor: "pointer",
                        }}
                      >
                        {Object.entries(EXCEPTION_TYPES).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div
                        className="position-absolute top-50 end-0 translate-middle-y me-3 pointer-events-none"
                        style={{ color: "#64748b" }}
                      >
                        <FaChevronDown size={12} />
                      </div>
                    </div>
                  </div>

                  {/* Exception Date */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark mb-2">
                      Exception Date <span className="text-danger">*</span>
                    </label>
                    <div className="position-relative">
                      <input
                        type="date"
                        className="form-control border-0"
                        name="exceptionDate"
                        value={formData.exceptionDate}
                        onChange={handleChange}
                        required
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "0.85rem 1rem",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark mb-2">
                      Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control border-0"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Enter reason for this exception..."
                      required
                      style={{
                        background: "#f8fafc",
                        borderRadius: "12px",
                        padding: "0.85rem 1rem",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        border: "1px solid #e2e8f0",
                        resize: "vertical",
                      }}
                    />
                  </div>

{/* RESCHEDULED: Rescheduled Date */}
                  {formData.type === "RESCHEDULED" && (
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-4"
                    >
                      <label className="form-label fw-bold text-dark mb-2">
                        Rescheduled To <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control border-0"
                        name="rescheduledTo"
                        value={formData.rescheduledTo}
                        onChange={handleChange}
                        required
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "0.85rem 1rem",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                        }}
                      />
                    </MotionDiv>
                  )}

                  {/* ROOM_CHANGE: New Room Field */}
                  {formData.type === "ROOM_CHANGE" && (
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-4"
                    >
                      <label className="form-label fw-bold text-dark mb-2">
                        <FaDoorOpen className="me-2" />
                        New Room <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control border-0"
                        name="newRoom"
                        value={formData.newRoom}
                        onChange={handleChange}
                        placeholder="Enter new room number"
                        required
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "0.85rem 1rem",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                    </MotionDiv>
                  )}

                  {/* TEACHER_CHANGE: Substitute Teacher Dropdown */}
                  {formData.type === "TEACHER_CHANGE" && (
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-4"
                    >
                      <label className="form-label fw-bold text-dark mb-2">
                        <FaUser className="me-2" />
                        Substitute Teacher <span className="text-danger">*</span>
                      </label>
                      <SearchableSelect
                        value={formData.substituteTeacher}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            substituteTeacher: e.target.value,
                          }))
                        }
                        fetchOptions={fetchTeachersForSearch}
                        placeholder="Search teacher by name..."
                        aria-label="Select substitute teacher"
                        style={{ minHeight: "44px" }}
                      />
                    </MotionDiv>
                  )}

                  {/* EXTRA: Extra Slot Details */}
                  {formData.type === "EXTRA" && (
                    <MotionDiv
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mb-4 p-4 rounded"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                      }}
                    >
                      <h6
                        className="fw-bold mb-3"
                        style={{ color: "var(--sidebar-accent, #3db5e6)" }}
                      >
                        <FaCalendarAlt className="me-2" />
                        Extra Slot Details
                      </h6>

<div className="row g-3">
                         <div className="col-md-6">
                           <label className="form-label fw-medium text-dark mb-2">
                             Start Time <span className="text-danger">*</span>
                           </label>
                           <input
                             type="time"
                             className="form-control border-0"
                             name="startTime"
                             value={formData.extraSlot.startTime}
                             onChange={handleExtraSlotChange}
                             required
                             style={{
                               background: "white",
                               borderRadius: "10px",
                               padding: "0.75rem 0.85rem",
                               boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                               border: "1px solid #e2e8f0",
                               cursor: "pointer",
                             }}
                           />
                         </div>
                         <div className="col-md-6">
                           <label className="form-label fw-medium text-dark mb-2">
                             End Time <span className="text-danger">*</span>
                           </label>
                           <input
                             type="time"
                             className="form-control border-0"
                             name="endTime"
                             value={formData.extraSlot.endTime}
                             onChange={handleExtraSlotChange}
                             required
                             style={{
                               background: "white",
                               borderRadius: "10px",
                               padding: "0.75rem 0.85rem",
                               boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                               border: "1px solid #e2e8f0",
                               cursor: "pointer",
                             }}
                           />
                         </div>
                         <div className="col-md-6">
                           <label className="form-label fw-medium text-dark mb-2">
                             Subject <span className="text-danger">*</span>
                           </label>
<SearchableSelect
                         value={formData.extraSlot.subject_id}
                         onChange={handleExtraSlotChange}
                         fetchOptions={fetchSubjectsForSearch}
                         placeholder="Search subject..."
                         aria-label="Select subject"
                         name="subject_id"
                         style={{ minHeight: "44px" }}
                       />
                         </div>
                         <div className="col-md-6">
                           <label className="form-label fw-medium text-dark mb-2">
                             Teacher <span className="text-danger">*</span>
                           </label>
<SearchableSelect
                              value={formData.extraSlot.teacher_id}
                              onChange={handleExtraSlotChange}
                              fetchOptions={fetchTeachersForSearch}
                              placeholder="Search teacher..."
                              aria-label="Select teacher"
                              name="teacher_id"
                              style={{ minHeight: "44px" }}
                            />
                         </div>
                         <div className="col-12">
                           <label className="form-label fw-medium text-dark mb-2">
                             Room (Optional)
                           </label>
                           <input
                             type="text"
                             className="form-control border-0"
                             name="room"
                             value={formData.extraSlot.room}
                             onChange={handleExtraSlotChange}
                             placeholder="Room number (optional)"
                             style={{
                               background: "white",
                               borderRadius: "10px",
                               padding: "0.75rem 0.85rem",
                               boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                               border: "1px solid #e2e8f0",
                             }}
                           />
                         </div>
                       </div>
                    </MotionDiv>
                  )}

                  {/* Action Buttons */}
                  <div
                    className="d-flex gap-2 justify-content-end mt-5 pt-3"
                    style={{ borderTop: "1px solid #e2e8f0" }}
                  >
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="btn px-4 py-2 fw-medium"
                      onClick={handleCancel}
                      disabled={submitting}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#64748b",
                        borderRadius: "10px",
                      }}
                    >
                      <FaTimes className="me-1" /> Cancel
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="btn px-4 py-2 fw-bold text-white"
                      disabled={submitting}
                      style={{
                        background:
                          "linear-gradient(135deg, var(--sidebar-accent, #3db5e6) 0%, var(--sidebar-accent-light, #4fc3f7) 100%)",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(61, 181, 230, 0.3)",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      <FaSave className="me-1" />
                      {submitting ? "Submitting..." : "Submit Exception Request"}
                    </MotionButton>
                  </div>
                </form>
              </div>
            </MotionDiv>
          </div>
        </div>
      </div>
    </div>
  );
}
