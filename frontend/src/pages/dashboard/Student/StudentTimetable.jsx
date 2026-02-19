import { useEffect, useState, useRef } from "react";
import api from "../../../api/axios";
import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaMapMarkerAlt,
  FaFlask,
  FaBook,
  FaLaptop,
  FaExclamationTriangle,
  FaSpinner,
  FaRedo,
  FaDownload,
  FaPrint,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TIME_SLOTS = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 01:00",
  "01:00 - 02:00",
  "02:00 - 03:00",
];

export default function StudentTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasShownSuccessToast = useRef(false);

  useEffect(() => {
    fetchTimetable();
  }, [retryCount]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      hasShownSuccessToast.current = false; // Reset toast flag on new fetch

      const res = await api.get("/timetable/student");
      setSlots(res.data || []);

      // Show success toast only once
      if (!hasShownSuccessToast.current) {
        if (res.data && res.data.length > 0) {
          toast.success("Timetable loaded successfully!", {
            position: "top-right",
            autoClose: 3000,
            icon: "✅",
            toastId: "timetable-success", // Unique ID to prevent duplicates
          });
          hasShownSuccessToast.current = true;
        } else {
          toast.info("No timetable found for your course", {
            position: "top-right",
            autoClose: 4000,
            icon: "ℹ️",
            toastId: "timetable-info", // Unique ID
          });
        }
      }
    } catch (err) {
      console.error("Fetch timetable error:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load timetable. Please try again.";
      setError(errorMessage);
      
      // Show error toast with unique ID
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
        toastId: "timetable-error", // Unique ID
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    hasShownSuccessToast.current = false; // Reset for retry
    setRetryCount((prev) => prev + 1);
  };

  const getSlot = (day, timeRange) => {
    const [start] = timeRange.split(" - ");
    const slot = slots.find((slot) => slot.day === day && slot.startTime === start);
    
    // ✅ Return slot with snapshot data if available
    if (slot) {
      return {
        ...slot,
        // Use snapshot data for historical accuracy
        subjectName: slot.subject?.name || slot.slotSnapshot?.subject_name || slot.subject_id?.name,
        teacherName: slot.teacher?.name || slot.slotSnapshot?.teacher_name,
        room: slot.room || slot.slotSnapshot?.room,
        slotType: slot.slotType || slot.slotSnapshot?.slotType
      };
    }
    return null;
  };

  const getSlotTypeIcon = (type) => {
    switch (type) {
      case "LAB":
        return <FaFlask />;
      case "PRACTICAL":
        return <FaLaptop />;
      case "LECTURE":
        return <FaBook />;
      default:
        return <FaBook />;
    }
  };

  const getSlotTypeColor = (type) => {
    switch (type) {
      case "LAB":
        return "bg-danger";
      case "PRACTICAL":
        return "bg-warning text-dark";
      case "LECTURE":
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  };

  const courseName = slots.length > 0 ? slots[0]?.course_id?.name : "";
  const semester = slots.length > 0 ? slots[0]?.timetable_id?.semester : "";
  const academicYear = slots.length > 0 ? slots[0]?.timetable_id?.academicYear : "";

  const handlePrint = () => {
    window.print();
    toast.info("Print dialog opened", {
      position: "top-right",
      autoClose: 2000,
      toastId: "print-info",
    });
  };

  const handleExport = () => {
    toast.success("Export feature coming soon!", {
      position: "top-right",
      autoClose: 3000,
      icon: "🚀",
      toastId: "export-info",
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className="timetable-container">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <div className="loading-wrapper">
          <div className="loading-spinner">
            <FaSpinner className="spin-icon" />
            <p>Loading your timetable...</p>
          </div>
          <div className="skeleton-table">
            <div className="skeleton-header" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-row">
                {[...Array(7)].map((_, j) => (
                  <div key={j} className="skeleton-cell" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="timetable-container">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <div className="error-wrapper fade-in">
          <div className="error-content">
            <FaExclamationTriangle className="error-icon" />
            <h3>Oops! Something went wrong</h3>
            <p className="error-message">{error}</p>
            <button onClick={handleRetry} className="retry-btn">
              <FaRedo className="me-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* HEADER */}
      <header className="timetable-header fade-in">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <FaCalendarAlt />
          </div>
          <div>
            <h1 className="header-title">My Weekly Timetable</h1>
            <p className="header-subtitle">
              {courseName && (
                <>
                  {courseName}
                  {semester && <span className="separator">•</span>}
                  {semester && `Sem ${semester}`}
                  {academicYear && <span className="separator">•</span>}
                  {academicYear && `${academicYear}`}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-action" onClick={handlePrint} title="Print Timetable">
            <FaPrint />
            <span className="btn-text">Print</span>
          </button>
          <button className="btn-action btn-primary-action" onClick={handleExport} title="Export Timetable">
            <FaDownload />
            <span className="btn-text">Export</span>
          </button>
          <button className="btn-action" onClick={handleRetry} title="Refresh">
            <FaRedo className={loading ? "spin" : ""} />
            <span className="btn-text">Refresh</span>
          </button>
        </div>
      </header>

      {/* TIMETABLE CARD */}
      <main className="timetable-card fade-in-up">
        <div className="table-responsive">
          <table className="timetable-table">
            <thead>
              <tr>
                <th className="time-column">
                  <FaClock className="me-2" />
                  Time
                </th>
                {DAYS.map((day, index) => (
                  <th key={day} className="day-column" style={{ animationDelay: `${index * 0.1}s` }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((time, timeIndex) => (
                <tr key={time} className="time-row" style={{ animationDelay: `${timeIndex * 0.1}s` }}>
                  <td className="time-cell">
                    <div className="time-content">
                      <FaClock className="time-icon" />
                      <span>{time}</span>
                    </div>
                  </td>
                  {DAYS.map((day, dayIndex) => {
                    const slot = getSlot(day, time);
                    return (
                      <td key={`${day}-${time}`} className="slot-cell">
                        {!slot ? (
                          <div className="empty-slot">
                            <span>—</span>
                          </div>
                        ) : (
                          <div className="slot-card scale-on-hover">
                            <div className="slot-header">
                              {/* ✅ Use snapshot data if available */}
                              <h6 className="slot-subject">{slot.subjectName || slot.subject_id?.name}</h6>
                              <span className={`slot-type-badge ${getSlotTypeColor(slot.slotType)}`}>
                                {getSlotTypeIcon(slot.slotType)}
                                <span>{slot.slotType}</span>
                              </span>
                            </div>
                            <div className="slot-body">
                              <div className="slot-code">
                                <FaBook className="icon" />
                                <span>{slot.subject_id?.code || slot.slotSnapshot?.subject_code}</span>
                              </div>
                              <div className="slot-teacher">
                                <FaChalkboardTeacher className="icon" />
                                <span>{slot.teacherName || slot.teacher_id?.name}</span>
                              </div>
                              <div className="slot-room">
                                <FaMapMarkerAlt className="icon" />
                                <span>Room {slot.room || slot.slotSnapshot?.room}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* LEGEND */}
      <footer className="timetable-legend fade-in-up">
        <h5 className="legend-title">Class Types</h5>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-badge bg-primary">
              <FaBook /> LECTURE
            </span>
          </div>
          <div className="legend-item">
            <span className="legend-badge bg-danger">
              <FaFlask /> LAB
            </span>
          </div>
          <div className="legend-item">
            <span className="legend-badge bg-warning text-dark">
              <FaLaptop /> PRACTICAL
            </span>
          </div>
        </div>
      </footer>

      {/* CSS */}
      <style>{`
        /* ================= CONTAINER ================= */
        .timetable-container {
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
        }

        /* ================= LOADING ================= */
        .loading-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          gap: 2rem;
        }

        .loading-spinner {
          text-align: center;
        }

        .spin-icon {
          font-size: 4rem;
          color: #1a4b6d;
          animation: spin 1s linear infinite;
        }

        .loading-spinner p {
          margin-top: 1rem;
          color: #6c757d;
          font-weight: 500;
          font-size: 1.1rem;
        }

        .skeleton-table {
          width: 100%;
          max-width: 1400px;
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .skeleton-header {
          height: 60px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: 120px repeat(6, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .skeleton-cell {
          height: 100px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 10px;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* ================= ERROR ================= */
        .error-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .error-content {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          max-width: 500px;
        }

        .error-icon {
          font-size: 5rem;
          color: #dc3545;
          margin-bottom: 1.5rem;
        }

        .error-content h3 {
          margin: 0 0 1rem;
          color: #1a4b6d;
          font-size: 1.75rem;
        }

        .error-message {
          color: #6c757d;
          margin-bottom: 2rem;
          font-size: 1rem;
          line-height: 1.6;
        }

        .retry-btn {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        /* ================= HEADER ================= */
        .timetable-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem 2rem;
          background: linear-gradient(180deg, #0f3a4a, #134952);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 58, 74, 0.3);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .header-icon-wrapper {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4fc3f7;
          font-size: 2rem;
        }

        .header-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
        }

        .header-subtitle {
          margin: 0.25rem 0 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
        }

        .separator {
          margin: 0 0.5rem;
          opacity: 0.6;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-action {
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .btn-action:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .btn-primary-action {
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          border: none;
        }

        .btn-primary-action:hover {
          background: linear-gradient(135deg, #29b6f6, #0288d1);
          box-shadow: 0 6px 20px rgba(79, 195, 247, 0.4);
        }

        .btn-text {
          display: none;
        }

        @media (min-width: 768px) {
          .btn-text {
            display: inline;
          }
        }

        /* ================= TIMETABLE CARD ================= */
        .timetable-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .timetable-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .timetable-table thead {
          background: linear-gradient(135deg, #1a4b6d, #2d6f8f);
          color: white;
        }

        .timetable-table th {
          padding: 1.25rem 1rem;
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .time-column {
          width: 140px;
          background: linear-gradient(135deg, #0f3a4a, #134952);
        }

        .day-column {
          animation: fadeInLeft 0.6s ease forwards;
          opacity: 0;
        }

        .timetable-table tbody tr {
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .timetable-table tbody tr:hover {
          background: rgba(26, 75, 109, 0.03);
        }

        .time-cell {
          padding: 1rem;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          font-weight: 600;
          font-size: 0.85rem;
          color: #1a4b6d;
        }

        .time-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .time-icon {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .slot-cell {
          padding: 0.75rem;
          border: 1px solid #e9ecef;
          vertical-align: top;
        }

        .empty-slot {
          height: 100%;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dee2e6;
          font-size: 1.5rem;
          font-weight: 300;
        }

        /* ================= SLOT CARD ================= */
        .slot-card {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-radius: 12px;
          padding: 1rem;
          min-height: 110px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(26, 75, 109, 0.1);
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .scale-on-hover:hover {
          transform: scale(1.03);
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.2);
          background: linear-gradient(135deg, #e8f4f8, #d0e8f0);
        }

        .slot-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .slot-subject {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 700;
          color: #1a4b6d;
          line-height: 1.3;
          flex: 1;
        }

        .slot-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .slot-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .slot-code,
        .slot-teacher,
        .slot-room {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6c757d;
        }

        .slot-code .icon,
        .slot-teacher .icon,
        .slot-room .icon {
          font-size: 0.8rem;
          color: #1a4b6d;
          width: 14px;
        }

        /* ================= LEGEND ================= */
        .timetable-legend {
          background: white;
          border-radius: 16px;
          padding: 1.5rem 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .legend-title {
          margin: 0 0 1rem;
          font-size: 1rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        .legend-items {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: white;
        }

        /* ================= ANIMATIONS ================= */
        .fade-in {
          animation: fadeIn 0.6s ease forwards;
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .fade-in-up:nth-child(1) {
          animation-delay: 0.1s;
        }
        .fade-in-up:nth-child(2) {
          animation-delay: 0.2s;
        }
        .fade-in-up:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .timetable-container {
            padding: 1rem;
          }

          .timetable-header {
            padding: 1.25rem;
            flex-direction: column;
            text-align: center;
          }

          .header-left {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: center;
          }

          .slot-card {
            min-height: 95px;
            padding: 0.75rem;
          }

          .slot-subject {
            font-size: 0.85rem;
          }

          .slot-code,
          .slot-teacher,
          .slot-room {
            font-size: 0.7rem;
          }
        }

        @media (max-width: 768px) {
          .timetable-table th,
          .timetable-table td {
            padding: 0.75rem 0.5rem;
          }

          .time-column {
            width: 100px;
            font-size: 0.75rem;
          }

          .slot-card {
            min-height: 85px;
          }

          .slot-type-badge {
            font-size: 0.65rem;
            padding: 0.2rem 0.4rem;
          }

          .legend-items {
            gap: 0.75rem;
          }

          .legend-badge {
            font-size: 0.75rem;
            padding: 0.4rem 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 1.4rem;
          }

          .header-subtitle {
            font-size: 0.85rem;
          }

          .header-icon-wrapper {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
          }

          .timetable-card {
            border-radius: 12px;
          }

          .slot-card {
            padding: 0.6rem;
          }

          .slot-subject {
            font-size: 0.8rem;
          }
        }

        /* ================= PRINT STYLES ================= */
        @media print {
          .timetable-container {
            background: white;
            padding: 0;
          }

          .timetable-header {
            background: #1a4b6d !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .header-actions {
            display: none !important;
          }

          .timetable-card {
            box-shadow: none;
            border: 1px solid #ddd;
          }

          .timetable-legend {
            box-shadow: none;
            border: 1px solid #ddd;
            page-break-inside: avoid;
          }

          .slot-card {
            break-inside: avoid;
          }
        }

        /* ================= TOASTIFY OVERRIDES ================= */
        .Toastify__toast {
          border-radius: 10px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .Toastify__toast--success {
          background: linear-gradient(135deg, #28a745, #1e7e34);
        }

        .Toastify__toast--error {
          background: linear-gradient(135deg, #dc3545, #c82333);
        }

        .Toastify__toast--info {
          background: linear-gradient(135deg, #17a2b8, #117a8b);
        }
      `}</style>
    </div>
  );
}