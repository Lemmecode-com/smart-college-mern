import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaUserTie,
  FaDoorOpen,
} from "react-icons/fa";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function WeeklyTimetableGrid() {
  const { departmentId, courseId, semester } = useParams();

  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState({});
  const [error, setError] = useState("");

  /* ================= FETCH WEEKLY TIMETABLE ================= */
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/timetable/${departmentId}/${courseId}/${semester}`
        );
        setTimetable(res.data || {});
      } catch (err) {
        console.error(err);
        setError("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [departmentId, courseId, semester]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="tt-loading">
        <FaCalendarAlt className="spin" />
        <p>Loading weekly timetable...</p>
      </div>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return <div className="tt-error">{error}</div>;
  }

  return (
    <div className="tt-container">
      <div className="tt-header">
        <FaCalendarAlt />
        <h2>Weekly Timetable</h2>
      </div>

      <div className="tt-grid">
        {DAYS.map((day) => (
          <DayColumn
            key={day}
            day={day}
            slots={timetable[day] || []}
          />
        ))}
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .tt-container {
          padding: 24px;
          background: #f5f7fb;
          min-height: 100vh;
        }

        .tt-header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 22px;
          font-weight: 700;
          color: #1a4b6d;
          margin-bottom: 20px;
        }

        .tt-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .tt-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .tt-grid {
            grid-template-columns: 1fr;
          }
        }

        .tt-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          font-size: 18px;
          color: #1a4b6d;
        }

        .spin {
          font-size: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .tt-error {
          color: red;
          font-weight: 600;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}

/* ================= DAY COLUMN ================= */

function DayColumn({ day, slots }) {
  return (
    <div className="day-card">
      <div className="day-header">{day}</div>

      {slots.length === 0 ? (
        <div className="empty-slot">No lectures</div>
      ) : (
        slots.map((slot) => <SlotCard key={slot._id} slot={slot} />)
      )}

      <style>{`
        .day-card {
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .day-header {
          text-align: center;
          font-weight: 700;
          color: #0f3a4a;
          font-size: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #eef2f6;
        }

        .empty-slot {
          text-align: center;
          font-size: 14px;
          color: #999;
          padding: 20px 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

/* ================= SLOT CARD ================= */

function SlotCard({ slot }) {
  return (
    <div className="slot-card">
      <div className="slot-time">
        <FaClock /> {slot.startTime} - {slot.endTime}
      </div>

      <div className="slot-row">
        <FaBook /> {slot.subject_id?.name}
      </div>

      <div className="slot-row">
        <FaUserTie /> {slot.teacher_id?.name}
      </div>

      {slot.room && (
        <div className="slot-row">
          <FaDoorOpen /> {slot.room}
        </div>
      )}

      <div className="slot-type">{slot.slotType}</div>

      <style>{`
        .slot-card {
          background: #f9fbfd;
          border-left: 4px solid #1a4b6d;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: transform 0.2s ease;
        }

        .slot-card:hover {
          transform: translateY(-3px);
        }

        .slot-time {
          font-weight: 600;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
        }

        .slot-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #333;
        }

        .slot-type {
          align-self: flex-end;
          font-size: 11px;
          font-weight: 700;
          background: #e3f2fd;
          color: #1a4b6d;
          padding: 2px 8px;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
