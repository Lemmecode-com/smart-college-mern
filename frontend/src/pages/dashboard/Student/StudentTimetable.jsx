import { useContext, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaMapMarkerAlt,
  FaBookOpen,
  FaArrowLeft,
  FaArrowRight,
  FaSync,
  FaInfoCircle,
  FaDownload,
  FaPrint,
  FaUserGraduate,
  FaGraduationCap,
  FaLayerGroup,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaBell,
  FaCoffee,
  FaRunning,
  FaEdit
} from "react-icons/fa";

export default function StudentTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // Convert to 0-6 (Mon-Sun)
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

  /* ================= MOCK TIMETABLE DATA ================= */
  const getMockTimetable = () => {
    // Generate dates for the week (Monday to Saturday)
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }

    // Subject color mapping
    const subjectColors = {
      "Data Structures": "bg-blue-100 border-l-4 border-blue-500",
      "Database Management": "bg-green-100 border-l-4 border-green-500",
      "Operating Systems": "bg-purple-100 border-l-4 border-purple-500",
      "Computer Networks": "bg-yellow-100 border-l-4 border-yellow-500",
      "Theory of Computation": "bg-red-100 border-l-4 border-red-500",
      "Free Period": "bg-gray-100 border-l-4 border-gray-300",
      "Lunch Break": "bg-orange-50 border-l-4 border-orange-200",
      "Library": "bg-indigo-50 border-l-4 border-indigo-300"
    };

    // Time slots (8:30 AM to 4:30 PM)
    const timeSlots = [
      { start: "08:30", end: "09:20", period: 1 },
      { start: "09:25", end: "10:15", period: 2 },
      { start: "10:20", end: "11:10", period: 3 },
      { start: "11:15", end: "12:05", period: 4 },
      { start: "12:05", end: "12:50", period: "Lunch", isBreak: true },
      { start: "12:55", end: "13:45", period: 5 },
      { start: "13:50", end: "14:40", period: 6 },
      { start: "14:45", end: "15:35", period: 7 },
      { start: "15:40", end: "16:30", period: 8 }
    ];

    // Mock lecture data (Monday=0, Saturday=5)
    const lectures = [
      // Monday
      { day: 0, period: 1, subject: "Data Structures", teacher: "Dr. Smith", room: "Room 201", type: "Theory" },
      { day: 0, period: 2, subject: "Database Management", teacher: "Prof. Johnson", room: "Lab 3", type: "Lab" },
      { day: 0, period: 3, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 0, period: 4, subject: "Operating Systems", teacher: "Dr. Williams", room: "Room 105", type: "Theory" },
      { day: 0, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 0, period: 6, subject: "Computer Networks", teacher: "Prof. Brown", room: "Room 204", type: "Theory" },
      { day: 0, period: 7, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 0, period: 8, subject: "Library", teacher: "Librarian", room: "Library", type: "Study" },
      
      // Tuesday
      { day: 1, period: 1, subject: "Operating Systems", teacher: "Dr. Williams", room: "Room 105", type: "Theory" },
      { day: 1, period: 2, subject: "Data Structures", teacher: "Dr. Smith", room: "Room 201", type: "Theory" },
      { day: 1, period: 3, subject: "Computer Networks", teacher: "Prof. Brown", room: "Room 204", type: "Theory" },
      { day: 1, period: 4, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 1, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 1, period: 6, subject: "Theory of Computation", teacher: "Dr. Miller", room: "Room 301", type: "Theory" },
      { day: 1, period: 7, subject: "Database Management", teacher: "Prof. Johnson", room: "Lab 3", type: "Lab" },
      { day: 1, period: 8, subject: "Free Period", teacher: "", room: "", type: "Free" },
      
      // Wednesday
      { day: 2, period: 1, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 2, period: 2, subject: "Theory of Computation", teacher: "Dr. Miller", room: "Room 301", type: "Theory" },
      { day: 2, period: 3, subject: "Data Structures", teacher: "Dr. Smith", room: "Room 201", type: "Theory" },
      { day: 2, period: 4, subject: "Operating Systems", teacher: "Dr. Williams", room: "Room 105", type: "Theory" },
      { day: 2, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 2, period: 6, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 2, period: 7, subject: "Computer Networks", teacher: "Prof. Brown", room: "Room 204", type: "Theory" },
      { day: 2, period: 8, subject: "Database Management", teacher: "Prof. Johnson", room: "Lab 3", type: "Lab" },
      
      // Thursday
      { day: 3, period: 1, subject: "Computer Networks", teacher: "Prof. Brown", room: "Room 204", type: "Theory" },
      { day: 3, period: 2, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 3, period: 3, subject: "Theory of Computation", teacher: "Dr. Miller", room: "Room 301", type: "Theory" },
      { day: 3, period: 4, subject: "Data Structures", teacher: "Dr. Smith", room: "Room 201", type: "Theory" },
      { day: 3, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 3, period: 6, subject: "Operating Systems", teacher: "Dr. Williams", room: "Room 105", type: "Theory" },
      { day: 3, period: 7, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 3, period: 8, subject: "Library", teacher: "Librarian", room: "Library", type: "Study" },
      
      // Friday
      { day: 4, period: 1, subject: "Database Management", teacher: "Prof. Johnson", room: "Lab 3", type: "Lab" },
      { day: 4, period: 2, subject: "Operating Systems", teacher: "Dr. Williams", room: "Room 105", type: "Theory" },
      { day: 4, period: 3, subject: "Computer Networks", teacher: "Prof. Brown", room: "Room 204", type: "Theory" },
      { day: 4, period: 4, subject: "Theory of Computation", teacher: "Dr. Miller", room: "Room 301", type: "Theory" },
      { day: 4, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 4, period: 6, subject: "Data Structures", teacher: "Dr. Smith", room: "Room 201", type: "Theory" },
      { day: 4, period: 7, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 4, period: 8, subject: "Free Period", teacher: "", room: "", type: "Free" },
      
      // Saturday
      { day: 5, period: 1, subject: "Special Lecture", teacher: "Guest Speaker", room: "Auditorium", type: "Seminar" },
      { day: 5, period: 2, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 5, period: 3, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 5, period: 4, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 5, period: 5, subject: "Lunch Break", teacher: "", room: "Cafeteria", type: "Break" },
      { day: 5, period: 6, subject: "Sports", teacher: "Coach Davis", room: "Playground", type: "Activity" },
      { day: 5, period: 7, subject: "Free Period", teacher: "", room: "", type: "Free" },
      { day: 5, period: 8, subject: "Free Period", teacher: "", room: "", type: "Free" }
    ];

    return { dates, timeSlots, lectures, subjectColors };
  };

  const { dates, timeSlots, lectures, subjectColors } = getMockTimetable();

  /* ================= WEEK NAVIGATION ================= */
  const goToPreviousWeek = () => {
    setLoading(true);
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStart(prevWeek);
    setTimeout(() => setLoading(false), 300);
  };

  const goToNextWeek = () => {
    setLoading(true);
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
    setTimeout(() => setLoading(false), 300);
  };

  const goToCurrentWeek = () => {
    setLoading(true);
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
    setActiveDay(day === 0 ? 6 : day - 1);
    setTimeout(() => setLoading(false), 300);
  };

  /* ================= GET WEEK RANGE TEXT ================= */
  const getWeekRangeText = () => {
    const startDate = dates[0];
    const endDate = dates[5];
    const options = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}, ${startDate.getFullYear()}`;
  };

  /* ================= GET LECTURE FOR SLOT ================= */
  const getLectureForSlot = (dayIndex, period) => {
    return lectures.find(lec => 
      lec.day === dayIndex && 
      (lec.period === period || (lec.period === "Lunch" && period === "Lunch"))
    );
  };

  /* ================= GET TODAY'S INDEX ================= */
  const getTodayIndex = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
    return currentDay === 0 ? 6 : currentDay - 1; // Convert to 0-6 (Mon-Sat)
  };

  const todayIndex = getTodayIndex();
  const isCurrentWeek = () => {
    const today = new Date();
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return today >= start && today <= end;
  };

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <button 
            onClick={() => navigate("/student/dashboard")}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Back to Dashboard"
          >
            <FaArrowLeft size={16} /> Back
          </button>
          
          <div className="d-flex align-items-center gap-3">
            <div className="timetable-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaCalendarAlt size={28} />
            </div>
            <div>
              <h1 className="h4 h3-md fw-bold mb-1 text-dark">Weekly Timetable</h1>
              <p className="text-muted mb-0 small">
                <FaClock className="me-1" />
                {getWeekRangeText()}
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Timetable Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>
          
          <button 
            onClick={goToCurrentWeek}
            className={`btn ${isCurrentWeek() ? 'btn-success' : 'btn-outline-primary'} d-flex align-items-center gap-2 px-3 py-2 hover-lift`}
            disabled={loading}
            title={isCurrentWeek() ? "Current Week" : "Go to Current Week"}
          >
            <FaSync className={loading ? "spin-icon" : ""} size={16} /> 
            {isCurrentWeek() ? "Current Week" : "This Week"}
          </button>
          
          <div className="btn-group" role="group">
            <button 
              onClick={goToPreviousWeek}
              className="btn btn-outline-secondary d-flex align-items-center gap-1 px-3 py-2 hover-lift"
              disabled={loading}
              title="Previous Week"
            >
              <FaArrowLeft size={14} /> Prev
            </button>
            <button 
              onClick={goToNextWeek}
              className="btn btn-outline-secondary d-flex align-items-center gap-1 px-3 py-2 hover-lift"
              disabled={loading}
              title="Next Week"
            >
              Next <FaArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Timetable Guide</h6>
              <ul className="mb-0 small ps-3">
                <li><strong>Color Coding</strong>: Each subject has a unique color for quick identification</li>
                <li><strong>Period Details</strong>: Click any lecture cell to see full details (teacher, room, type)</li>
                <li><strong>Navigation</strong>: Use arrows to browse weeks or "This Week" button to return to current week</li>
                <li><strong>Today Highlight</strong>: Current day is highlighted with a blue border</li>
                <li><strong>Breaks</strong>: Lunch and free periods are clearly marked</li>
                <li>Timetable updates automatically at midnight</li>
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

      {/* ================= TIMETABLE CONTAINER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up">
        <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3">
            <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
              <FaCalendarAlt /> Weekly Schedule
              <span className="badge bg-light text-dark">{getWeekRangeText()}</span>
            </h2>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0 timetable-table">
              <thead className="table-light">
                <tr>
                  <th className="time-slot-header" rowSpan="2">Time</th>
                  {dates.map((date, index) => {
                    const isToday = index === todayIndex && isCurrentWeek();
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateNum = date.getDate();
                    
                    return (
                      <th 
                        key={index} 
                        className={`day-header ${isToday ? 'today-highlight' : ''} ${activeDay === index ? 'active-day' : ''}`}
                        onClick={() => setActiveDay(index)}
                      >
                        <div className="day-name">{dayName}</div>
                        <div className="date-num">{dateNum}</div>
                        {isToday && <div className="today-badge">Today</div>}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {dates.map((date, index) => {
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                    return (
                      <th key={`sub-${index}`} className="day-subheader">
                        <small className="text-muted">{dayName}</small>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slotIndex} className={slot.isBreak ? 'break-row' : ''}>
                    <td className="time-slot">
                      <div className="time-text">{slot.start}-{slot.end}</div>
                      <div className="period-text">Period {slot.period}</div>
                    </td>
                    {dates.map((date, dayIndex) => {
                      const lecture = getLectureForSlot(dayIndex, slot.period);
                      const isToday = dayIndex === todayIndex && isCurrentWeek();
                      const isActive = activeDay === dayIndex;
                      
                      return (
                        <td 
                          key={`${dayIndex}-${slotIndex}`} 
                          className={`lecture-cell ${isToday ? 'today-cell' : ''} ${isActive ? 'active-cell' : ''} ${slot.isBreak ? 'break-cell' : ''}`}
                          onClick={() => lecture && !slot.isBreak && alert(`
Subject: ${lecture.subject}
Teacher: ${lecture.teacher}
Room: ${lecture.room}
Type: ${lecture.type}
Period: ${slot.period}
Time: ${slot.start} - ${slot.end}
                          `.trim())}
                        >
                          {lecture ? (
                            <div className={`lecture-card ${subjectColors[lecture.subject] || 'bg-white'} ${slot.isBreak ? 'break-card' : ''}`}>
                              <div className="lecture-subject fw-bold">{lecture.subject}</div>
                              <div className="lecture-details">
                                <div className="lecture-teacher">
                                  <FaChalkboardTeacher className="me-1" size={10} /> {lecture.teacher}
                                </div>
                                <div className="lecture-room">
                                  <FaMapMarkerAlt className="me-1" size={10} /> {lecture.room}
                                </div>
                                <div className={`lecture-type badge ${
                                  lecture.type === "Theory" ? "bg-primary" :
                                  lecture.type === "Lab" ? "bg-success" :
                                  lecture.type === "Break" ? "bg-warning" :
                                  lecture.type === "Free" ? "bg-secondary" :
                                  lecture.type === "Seminar" ? "bg-info" :
                                  lecture.type === "Activity" ? "bg-danger" : "bg-light"
                                }`}>
                                  {lecture.type}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="empty-slot">
                              {slot.isBreak ? (
                                <div className="break-indicator">
                                  <FaCoffee className="me-1" /> {slot.period === "Lunch" ? "Lunch Break" : "Break"}
                                </div>
                              ) : (
                                <div className="free-indicator">
                                  <FaCheckCircle className="text-success me-1" size={14} /> Free
                                </div>
                              )}
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
          
          {/* ================= TIMETABLE LEGEND ================= */}
          <div className="card-footer bg-light py-3">
            <div className="d-flex flex-wrap justify-content-center gap-3">
              <div className="legend-item">
                <span className="legend-color bg-blue-100 border-l-4 border-blue-500"></span>
                <span>Data Structures</span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-green-100 border-l-4 border-green-500"></span>
                <span>Database Management</span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-purple-100 border-l-4 border-purple-500"></span>
                <span>Operating Systems</span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-yellow-100 border-l-4 border-yellow-500"></span>
                <span>Computer Networks</span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-red-100 border-l-4 border-red-500"></span>
                <span>Theory of Computation</span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-gray-100 border-l-4 border-gray-300"></span>
                <span>Free Period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= UPCOMING LECTURES ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-header bg-gradient-info text-white py-3">
          <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
            <FaBell /> Upcoming Lectures
          </h2>
        </div>
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            {(() => {
              const upcoming = [];
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              const currentTime = currentHour * 60 + currentMinute;
              
              // Find today's lectures after current time
              if (isCurrentWeek()) {
                const todayLectures = lectures.filter(lec => 
                  lec.day === todayIndex && 
                  !lec.subject.includes("Free") && 
                  !lec.subject.includes("Break")
                );
                
                // Get time slots for today
                timeSlots.forEach(slot => {
                  if (typeof slot.period === 'number') {
                    const [startHour, startMinute] = slot.start.split(':').map(Number);
                    const slotTime = startHour * 60 + startMinute;
                    
                    if (slotTime > currentTime) {
                      const lecture = todayLectures.find(l => l.period === slot.period);
                      if (lecture && upcoming.length < 3) {
                        upcoming.push({
                          time: `${slot.start} - ${slot.end}`,
                          subject: lecture.subject,
                          teacher: lecture.teacher,
                          room: lecture.room,
                          type: lecture.type
                        });
                      }
                    }
                  }
                });
              }
              
              // If no today's lectures, show next day's first lecture
              if (upcoming.length === 0 && isCurrentWeek()) {
                for (let day = todayIndex + 1; day < 6; day++) {
                  const nextDayLectures = lectures.filter(lec => 
                    lec.day === day && 
                    !lec.subject.includes("Free") && 
                    !lec.subject.includes("Break")
                  );
                  
                  if (nextDayLectures.length > 0) {
                    const firstLecture = nextDayLectures[0];
                    const slot = timeSlots.find(s => s.period === firstLecture.period);
                    if (slot) {
                      upcoming.push({
                        time: `${slot.start} - ${slot.end}`,
                        subject: firstLecture.subject,
                        teacher: firstLecture.teacher,
                        room: firstLecture.room,
                        type: firstLecture.type,
                        nextDay: true
                      });
                    }
                    break;
                  }
                }
              }
              
              // Default upcoming if none found
              if (upcoming.length === 0) {
                upcoming.push({
                  time: "09:25 - 10:15",
                  subject: "Data Structures",
                  teacher: "Dr. Smith",
                  room: "Room 201",
                  type: "Theory"
                });
              }
              
              return upcoming.slice(0, 3).map((lecture, idx) => (
                <div className="col-md-4" key={idx}>
                  <div className="upcoming-card border rounded-3 p-3 h-100 hover-lift">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bold fs-5">{lecture.subject}</div>
                        <div className="text-muted small">
                          <FaClock className="me-1" size={12} />
                          {lecture.time}
                        </div>
                      </div>
                      <span className={`badge ${
                        lecture.type === "Theory" ? "bg-primary" :
                        lecture.type === "Lab" ? "bg-success" :
                        lecture.type === "Seminar" ? "bg-info" : "bg-warning"
                      }`}>
                        {lecture.type}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                      <FaChalkboardTeacher /> {lecture.teacher}
                    </div>
                    <div className="d-flex align-items-center gap-2 text-muted small">
                      <FaMapMarkerAlt /> {lecture.room}
                    </div>
                    {lecture.nextDay && (
                      <div className="mt-2 p-2 bg-warning bg-opacity-10 rounded-2 small">
                        <FaRunning className="me-1" size={12} />
                        First lecture tomorrow
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaCalendarAlt className="me-1" />
                  Student Timetable | Smart College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Last Updated: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button 
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => navigate("/student/dashboard")}
              >
                <FaArrowLeft size={12} /> Back to Dashboard
              </button>
              <button 
                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                onClick={goToCurrentWeek}
              >
                <FaSync size={12} /> Current Week
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
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        .bg-gradient-info {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        }

        .timetable-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .timetable-table {
          font-size: 0.85rem;
        }
        .timetable-table th, .timetable-table td {
          vertical-align: middle;
          padding: 0.5rem;
        }
        .time-slot-header {
          background: linear-gradient(120deg, #0f3a4a, #134952);
          color: white;
          font-weight: 700;
          width: 120px;
          text-align: center;
        }
        .time-slot {
          background-color: #f8f9fa;
          font-weight: 600;
          font-size: 0.8rem;
          text-align: center;
          min-width: 100px;
        }
        .time-text {
          font-weight: 700;
          color: #1a4b6d;
        }
        .period-text {
          font-size: 0.75rem;
          color: #6c757d;
        }
        .day-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          position: relative;
          min-width: 120px;
          transition: all 0.3s ease;
        }
        .day-header:hover {
          background: linear-gradient(135deg, #155447 0%, #0f3a4a 100%);
          transform: translateY(-2px);
        }
        .day-header.today-highlight {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
          position: relative;
        }
        .day-header.today-highlight::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
        }
        .day-header.active-day {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        .day-name {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }
        .date-num {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .today-badge {
          position: absolute;
          top: 5px;
          right: 5px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .day-subheader {
          background-color: #e9ecef;
          font-size: 0.75rem;
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }
        .lecture-cell {
          min-height: 80px;
          vertical-align: top;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }
        .lecture-cell:hover {
          background-color: rgba(26, 75, 109, 0.05);
          transform: scale(1.02);
          z-index: 10;
        }
        .lecture-cell.today-cell {
          box-shadow: inset 0 0 0 2px #3b82f6;
          background-color: rgba(59, 130, 246, 0.05);
        }
        .lecture-cell.active-cell {
          box-shadow: inset 0 0 0 2px #2563eb;
          background-color: rgba(37, 99, 235, 0.1);
        }
        .lecture-card {
          border-radius: 8px;
          padding: 0.5rem;
          height: 100%;
          border-left: 4px solid #1a4b6d;
          transition: all 0.3s ease;
        }
        .lecture-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .lecture-subject {
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lecture-details {
          font-size: 0.7rem;
          color: #495057;
        }
        .lecture-teacher, .lecture-room {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.15rem;
        }
        .lecture-type {
          font-size: 0.65rem;
          padding: 0.2rem 0.4rem;
          margin-top: 0.2rem;
        }
        .empty-slot {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6c757d;
          font-size: 0.75rem;
        }
        .free-indicator, .break-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .break-row {
          background-color: rgba(255, 243, 224, 0.3);
        }
        .break-cell {
          background-color: rgba(255, 243, 224, 0.1);
        }
        .break-card {
          background-color: rgba(255, 243, 224, 0.3) !important;
          border-left-color: #f39c12 !important;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        .legend-color {
          width: 24px;
          height: 24px;
          border-radius: 4px;
        }

        .upcoming-card {
          transition: all 0.3s ease;
          border-color: #dee2e6;
        }
        .upcoming-card:hover {
          border-color: #1a4b6d;
          box-shadow: 0 4px 12px rgba(26, 75, 109, 0.15);
          transform: translateY(-3px);
        }

        @media (max-width: 992px) {
          .timetable-table {
            font-size: 0.75rem;
          }
          .time-slot-header, .time-slot {
            width: 80px;
            min-width: 80px;
            padding: 0.3rem;
          }
          .day-name {
            font-size: 0.9rem;
          }
          .date-num {
            font-size: 1.2rem;
          }
          .lecture-cell {
            min-height: 60px;
            padding: 0.25rem;
          }
          .lecture-subject {
            font-size: 0.75rem;
          }
          .lecture-details {
            font-size: 0.65rem;
          }
        }

        @media (max-width: 768px) {
          .timetable-table {
            font-size: 0.7rem;
          }
          .time-slot-header, .time-slot {
            width: 70px;
            min-width: 70px;
            padding: 0.25rem;
          }
          .day-header, .day-subheader {
            min-width: 90px;
            padding: 0.4rem 0.25rem;
          }
          .day-name {
            font-size: 0.85rem;
          }
          .date-num {
            font-size: 1.1rem;
          }
          .lecture-cell {
            min-height: 50px;
            padding: 0.2rem;
          }
          .lecture-subject {
            font-size: 0.7rem;
          }
          .lecture-type {
            font-size: 0.6rem;
            padding: 0.15rem 0.3rem;
          }
          .empty-slot {
            font-size: 0.7rem;
          }
          .today-badge {
            font-size: 0.6rem;
            padding: 1px 4px;
          }
        }

        @media (max-width: 576px) {
          .timetable-logo-container {
            width: 50px;
            height: 50px;
          }
          .time-slot-header, .time-slot {
            width: 60px;
            min-width: 60px;
            padding: 0.2rem;
            font-size: 0.75rem;
          }
          .day-header, .day-subheader {
            min-width: 80px;
            padding: 0.3rem 0.2rem;
            font-size: 0.8rem;
          }
          .day-name {
            font-size: 0.8rem;
          }
          .date-num {
            font-size: 1rem;
          }
          .lecture-cell {
            min-height: 45px;
            padding: 0.15rem;
          }
          .lecture-subject {
            font-size: 0.65rem;
          }
          .lecture-details {
            font-size: 0.6rem;
          }
          .lecture-teacher, .lecture-room {
            font-size: 0.55rem;
          }
          .lecture-type {
            font-size: 0.55rem;
            padding: 0.1rem 0.25rem;
          }
          .empty-slot {
            font-size: 0.65rem;
          }
          .today-badge {
            font-size: 0.55rem;
            padding: 1px 3px;
          }
          .btn-sm {
            padding: 0.2rem 0.4rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}