import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import { FaCheckCircle, FaExclamationTriangle, FaLock, FaInfoCircle, FaTimes, FaCalendarAlt, FaClock, FaUser, FaChalkboardTeacher } from "react-icons/fa";

export default function CreateSessionModal({ onClose, onSuccess, slots }) {
  const [form, setForm] = useState({
    slot_id: "",
    lectureDate: "",
    lectureNumber: "1"
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [closing, setClosing] = useState(false);

  // ✅ Auto-set today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, lectureDate: today }));
  }, []);

  // ✅ Get selected slot details
  useEffect(() => {
    if (form.slot_id && slots) {
      const slot = slots.find(s => s._id === form.slot_id);
      setSelectedSlot(slot);
    }
  }, [form.slot_id, slots]);

  // ✅ Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [loading]);

  /* ================= VALIDATION ================= */
  const validate = () => {
    const newErrors = {};
    
    if (!form.slot_id) {
      newErrors.slot_id = "Please select a time slot";
    }
    
    if (!form.lectureDate) {
      newErrors.lectureDate = "Date is required";
    }
    
    if (!form.lectureNumber || form.lectureNumber < 1) {
      newErrors.lectureNumber = "Lecture number must be at least 1";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error("Please fix the errors below", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />
      });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      await api.post("/attendance/sessions", form);
      
      // Success animation
      toast.success("Session created successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />,
        onClose: () => {
          setClosing(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 300);
        }
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create session";

      // Show specific validation errors
      if (err.response?.data?.code === 'ONLY_TODAY_ALLOWED') {
        toast.warning("⚠️ Attendance sessions can only be created for today", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaInfoCircle />
        });
      } else if (err.response?.data?.code === 'DATE_DAY_MISMATCH') {
        toast.warning("⚠️ Selected date does not match slot's day", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaInfoCircle />
        });
      } else if (err.response?.data?.code === 'NOT_SUBJECT_TEACHER') {
        toast.error("🚫 Access denied: You are not the assigned teacher for this subject", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaLock />
        });
      } else if (err.response?.data?.code === 'PAST_DATE_NOT_ALLOWED') {
        toast.warning("⚠️ Cannot create session for past dates", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaInfoCircle />
        });
      } else if (err.response?.data?.code === 'DUPLICATE_SESSION') {
        toast.warning("⚠️ Attendance session already created for this lecture", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaInfoCircle />
        });
      } else {
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`modal-overlay ${closing ? 'closing' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal-container ${closing ? 'closing' : ''}`}>
        {/* Header */}
        <div className="modal-header-custom">
          <div className="modal-title-wrapper">
            <div className="modal-icon">
              <FaCalendarAlt />
            </div>
            <div>
              <h5 id="modal-title" className="modal-title">Create Attendance Session</h5>
              <p className="modal-subtitle">Schedule a new lecture attendance session</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-custom">
          {/* ℹ️ Info Box */}
          {selectedSlot && (
            <div className="info-banner animate-fade-in">
              <div className="info-icon">
                <FaInfoCircle />
              </div>
              <div className="info-content">
                <div className="info-row">
                  <FaChalkboardTeacher className="info-icon-small" />
                  <span><strong>Subject:</strong> {selectedSlot.subject?.name || selectedSlot.slotSnapshot?.subject_name}</span>
                </div>
                <div className="info-row">
                  <FaUser className="info-icon-small" />
                  <span><strong>Teacher:</strong> {selectedSlot.teacher?.name || selectedSlot.slotSnapshot?.teacher_name}</span>
                </div>
                <div className="info-row">
                  <FaClock className="info-icon-small" />
                  <span><strong>Time:</strong> {selectedSlot.startTime || selectedSlot.slotSnapshot?.startTime} - {selectedSlot.endTime || selectedSlot.slotSnapshot?.endTime}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="modal-form">
            {/* Slot Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="slot-select">
                <FaClock className="label-icon" />
                <span>Select Time Slot</span>
                <span className="required">*</span>
              </label>
              <select
                id="slot-select"
                className={`form-control-custom ${errors.slot_id ? 'error' : ''}`}
                value={form.slot_id}
                onChange={(e) => {
                  setForm({ ...form, slot_id: e.target.value });
                  if (errors.slot_id) setErrors({...errors, slot_id: ''});
                }}
                required
                disabled={loading}
              >
                <option value="">-- Select a Slot --</option>
                {slots?.map(slot => (
                  <option key={slot._id} value={slot._id}>
                    {slot.subject?.name || slot.slotSnapshot?.subject_name} - {slot.day} {slot.startTime}
                  </option>
                ))}
              </select>
              {errors.slot_id && (
                <span className="error-message" role="alert">
                  <FaExclamationTriangle className="error-icon" />
                  {errors.slot_id}
                </span>
              )}
            </div>

            {/* Date Field (Auto-filled with today, disabled) */}
            <div className="form-group">
              <label className="form-label" htmlFor="lecture-date">
                <FaCalendarAlt className="label-icon" />
                <span>Lecture Date</span>
                <span className="required">*</span>
              </label>
              <div className="date-input-wrapper">
                <input
                  id="lecture-date"
                  type="date"
                  className={`form-control-custom ${errors.lectureDate ? 'error' : ''}`}
                  value={form.lectureDate}
                  onChange={(e) => {
                    setForm({ ...form, lectureDate: e.target.value });
                    if (errors.lectureDate) setErrors({...errors, lectureDate: ''});
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  disabled
                  title="Attendance sessions can only be created for today"
                />
                <span className="date-badge">Today Only</span>
              </div>
              {errors.lectureDate && (
                <span className="error-message" role="alert">
                  <FaExclamationTriangle className="error-icon" />
                  {errors.lectureDate}
                </span>
              )}
              <small className="form-hint">
                <FaInfoCircle className="hint-icon" />
                Sessions can only be created for the current day
              </small>
            </div>

            {/* Lecture Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="lecture-number">
                <FaChalkboardTeacher className="label-icon" />
                <span>Lecture Number</span>
                <span className="required">*</span>
              </label>
              <input
                id="lecture-number"
                type="number"
                className={`form-control-custom ${errors.lectureNumber ? 'error' : ''}`}
                value={form.lectureNumber}
                onChange={(e) => {
                  setForm({ ...form, lectureNumber: e.target.value });
                  if (errors.lectureNumber) setErrors({...errors, lectureNumber: ''});
                }}
                min="1"
                placeholder="e.g., 1, 2, 3..."
                required
                disabled={loading}
              />
              {errors.lectureNumber && (
                <span className="error-message" role="alert">
                  <FaExclamationTriangle className="error-icon" />
                  {errors.lectureNumber}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer-custom">
          <button
            type="button"
            className="btn btn-secondary-custom"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary-custom"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm"></span>
                <span>Creating Session...</span>
              </>
            ) : (
              <>
                <FaCheckCircle className="btn-icon" />
                <span>Create Session</span>
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
          max-width: 560px;
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

        .modal-icon {
          width: 48px;
          height: 48px;
          background: rgba(61, 181, 230, 0.25);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3db5e6;
          font-size: 1.5rem;
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
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
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        /* INFO BANNER */
        .info-banner {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1) 0%, rgba(79, 195, 247, 0.15) 100%);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #3db5e6;
        }

        .info-banner .info-icon {
          width: 40px;
          height: 40px;
          background: rgba(61, 181, 230, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3db5e6;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #0f3a4a;
          margin-bottom: 0.5rem;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-icon-small {
          font-size: 0.9rem;
          color: #3db5e6;
          flex-shrink: 0;
        }

        /* FORM STYLES */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f3a4a;
        }

        .label-icon {
          color: #3db5e6;
          font-size: 1rem;
        }

        .required {
          color: #ef4444;
          margin-left: 0.25rem;
        }

        .form-control-custom {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          color: #1f2937;
          background: #f9fafb;
          transition: all 0.3s ease;
        }

        .form-control-custom:hover:not(:disabled):not(.error) {
          border-color: #3db5e6;
          background: white;
        }

        .form-control-custom:focus:not(:disabled):not(.error) {
          outline: none;
          border-color: #3db5e6;
          background: white;
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.12);
        }

        .form-control-custom.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.02);
        }

        .form-control-custom:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: #f3f4f6;
        }

        /* DATE INPUT */
        .date-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .date-badge {
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .form-hint {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .hint-icon {
          font-size: 0.85rem;
          color: #3db5e6;
        }

        /* ERROR MESSAGE */
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #ef4444;
          font-weight: 500;
          animation: shake 0.3s ease;
        }

        .error-icon {
          font-size: 0.9rem;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
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

        @keyframes animate-fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

          .modal-body-custom {
            padding: 1.25rem;
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