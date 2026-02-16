import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios"; // ✅ FIXED: Import real API instance
import {
  FaUserGraduate,
  FaClipboardList,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaBell,
  FaBook,
  FaClock,
  FaDoorOpen,
  FaUniversity,
  FaLayerGroup,
  FaGraduationCap,
  FaArrowRight,
  FaExclamationTriangle,
  FaDownload,
  FaQrcode,
  FaHistory,
  FaWallet,
  FaChalkboardTeacher
} from "react-icons/fa";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Static mock data for unavailable endpoints (will replace with real API later)
  const STATIC_STUDENT = {
    fullName: "Rahul Sharma",
    rollNumber: "CS2023001",
    department: { name: "Computer Science" },
    course: { name: "B.Tech Computer Science" },
    semester: 5,
    admissionYear: 2021,
    photo: null
  };

  const STATIC_SUBJECT_ATTENDANCE = [
    { subject: "Data Structures", code: "CS301", total: 45, present: 42, percentage: 93.3 },
    { subject: "Operating Systems", code: "CS302", total: 40, present: 38, percentage: 95.0 },
    { subject: "Database Management", code: "CS303", total: 35, present: 26, percentage: 74.3 },
    { subject: "Computer Networks", code: "CS304", total: 30, present: 28, percentage: 93.3 },
    { subject: "Machine Learning", code: "CS305", total: 25, present: 22, percentage: 88.0 }
  ];

  const STATIC_TIMETABLE = [
    { 
      startTime: "09:00", 
      endTime: "10:00", 
      subject: "Data Structures", 
      room: "A-204",
      teacher: "Dr. Mehta"
    },
    { 
      startTime: "10:15", 
      endTime: "11:15", 
      subject: "Operating Systems", 
      room: "B-101",
      teacher: "Prof. Sharma"
    },
    { 
      startTime: "11:30", 
      endTime: "12:30", 
      subject: "Database Management", 
      room: "Lab-3",
      teacher: "Dr. Patel"
    }
  ];

  const STATIC_NOTIFICATIONS = [
    { 
      _id: "1", 
      title: "Fee Payment Due", 
      message: "Second installment due on Jan 15, 2024", 
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      read: false 
    },
    { 
      _id: "2", 
      title: "Exam Schedule Released", 
      message: "End-semester exams start from Dec 5, 2023", 
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      read: true 
    },
    { 
      _id: "3", 
      title: "Holiday Notice", 
      message: "College closed on Nov 1 for Diwali", 
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      read: true 
    }
  ];

  const STATIC_FEES = {
    totalFee: 80000,
    paid: 0,
    due: 80000,
    installments: [
      { id: 1, dueDate: "2023-11-15", amount: 25000, status: "PAID" },
      { id: 2, dueDate: "2024-01-15", amount: 25000, status: "DUE" },
      { id: 3, dueDate: "2024-03-15", amount: 25000, status: "PENDING" }
    ]
  };

  // State management
  const [student, setStudent] = useState(STATIC_STUDENT);
  const [attendance, setAttendance] = useState({
    overall: 0,
    total: 0,
    present: 0,
    absent: 0
  });
  const [subjectAttendance, setSubjectAttendance] = useState(STATIC_SUBJECT_ATTENDANCE);
  const [timetable, setTimetable] = useState(STATIC_TIMETABLE);
  const [notifications, setNotifications] = useState(STATIC_NOTIFICATIONS);
  const [fees, setFees] = useState(STATIC_FEES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch dashboard data from REAL API endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // ✅ REAL API CALL: Fetch actual dashboard data
        const res = await api.get("/dashboard/student");
        
        // Update attendance data from real API
        const attendancePct = res.data.attendanceSummary.total > 0 
          ? (res.data.attendanceSummary.present / res.data.attendanceSummary.total) * 100 
          : 0;
          
        setAttendance({
          ...res.data.attendanceSummary,
          overall: attendancePct
        });
        
        // Update fee data from real API
        setFees(prev => ({
          ...prev,
          totalFee: res.data.feeSummary.totalFee,
          paid: res.data.feeSummary.paid,
          due: res.data.feeSummary.due
        }));
        
        // Success message for debugging
        console.log("✅ Dashboard data loaded successfully from /dashboard/student");
      } catch (err) {
        console.error("❌ Failed to load dashboard data:", err);
        setError("Failed to load dashboard data. Using mock data for other sections.");
        
        // Set realistic fallback values from mock data
        setAttendance({
          overall: 86.5,
          total: 120,
          present: 104,
          absent: 16
        });
      } finally {
        setLoading(false);
      }
    };

    // Only initialize if user is student
    if (user?.role === "STUDENT") {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Calculate attendance percentage
  const getAttendancePercentage = () => {
    if (attendance.total === 0) return 0;
    return ((attendance.present / attendance.total) * 100).toFixed(1);
  };

  // Get today's date details
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', options);

  if (loading) {
    return (
      <div className="novaa-dashboard">
        <div className="novaa-loader">
          <div className="novaa-loader-spinner"></div>
          <p className="mt-3 text-muted">Loading your dashboard...</p>
        </div>
        
        <style jsx>{`
          .novaa-dashboard {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
            padding: 2rem;
          }
          .novaa-loader {
            text-align: center;
          }
          .novaa-loader-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(26, 75, 109, 0.1);
            border-top: 4px solid #1a4b6d;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="novaa-dashboard">
      {/* Header Section */}
      <header className="novaa-header">
        <div className="container-fluid">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div className="mb-3 mb-md-0">
              <h1 className="novaa-header-title">
                <FaUserGraduate className="me-2" /> 
                Student Dashboard
              </h1>
              <p className="novaa-header-subtitle mb-0">
                Welcome back, <span className="fw-bold">{student.fullName}</span> • {formattedDate}
              </p>
            </div>
            <div className="d-flex align-items-center novaa-header-actions">
              <div className="novaa-quick-action me-2" onClick={() => navigate('/student/timetable')}>
                <FaCalendarAlt size={20} />
                <span>Timetable</span>
              </div>
              <div className="novaa-quick-action me-2" onClick={() => navigate('/my-attendance')}>
                <FaClipboardList size={20} />
                <span>Attendance</span>
              </div>
              <div className="novaa-quick-action" onClick={() => navigate('/student/fees')}>
                <FaWallet size={20} />
                <span>Fee Portal</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid novaa-container">
        {/* Summary Cards - REAL DATA FROM API */}
        <div className="row g-4 mb-4">
          <div className="col-xl-3 col-md-6 novaa-fade-in">
            <div className="novaa-card novaa-card-hover h-100">
              <div className="novaa-card-icon novaa-card-icon-attendance">
                <FaClipboardList size={28} />
              </div>
              <div className="novaa-card-content">
                <h3 className="novaa-card-title">Attendance</h3>
                <div className="novaa-card-value">{getAttendancePercentage()}%</div>
                <div className="novaa-card-meta">
                  <span className="text-success"><FaCheckCircle className="me-1" /> {attendance.present} Present</span>
                  <span className="text-danger ms-3"><FaTimesCircle className="me-1" /> {attendance.absent} Absent</span>
                </div>
                <div className="novaa-progress mt-3">
                  <div 
                    className="novaa-progress-bar" 
                    style={{ width: `${getAttendancePercentage()}%`, backgroundColor: getAttendancePercentage() < 75 ? '#ef4444' : '#10b981' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-xl-3 col-md-6 novaa-fade-in" style={{ "--delay": "0.1s" }}>
            <div className="novaa-card novaa-card-hover h-100">
              <div className="novaa-card-icon novaa-card-icon-fee">
                <FaMoneyBillWave size={28} />
              </div>
              <div className="novaa-card-content">
                <h3 className="novaa-card-title">Total Fee</h3>
                <div className="novaa-card-value">₹{fees.totalFee.toLocaleString()}</div>
                <div className="novaa-card-meta">
                  <span className="text-success"><FaCheckCircle className="me-1" /> Paid: ₹{fees.paid.toLocaleString()}</span>
                </div>
                <div className="mt-3">
                  <span className="badge bg-light text-dark border novaa-badge">Academic Year 2023-24</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-xl-3 col-md-6 novaa-fade-in" style={{ "--delay": "0.2s" }}>
            <div className="novaa-card novaa-card-hover h-100">
              <div className="novaa-card-icon novaa-card-icon-paid">
                <FaCheckCircle size={28} />
              </div>
              <div className="novaa-card-content">
                <h3 className="novaa-card-title">Paid Amount</h3>
                <div className="novaa-card-value text-success">₹{fees.paid.toLocaleString()}</div>
                <div className="novaa-card-meta">
                  <span>{((fees.paid / fees.totalFee) * 100).toFixed(0)}% of total fee</span>
                </div>
                <div className="mt-3">
                  <span className="badge bg-success novaa-badge">Receipt Available</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-xl-3 col-md-6 novaa-fade-in" style={{ "--delay": "0.3s" }}>
            <div className="novaa-card novaa-card-hover h-100">
              <div className="novaa-card-icon novaa-card-icon-due">
                <FaTimesCircle size={28} />
              </div>
              <div className="novaa-card-content">
                <h3 className="novaa-card-title">Due Amount</h3>
                <div className="novaa-card-value text-danger">₹{fees.due.toLocaleString()}</div>
                <div className="novaa-card-meta">
                  <span>Next due: {new Date(fees.installments.find(i => i.status === 'DUE')?.dueDate || Date.now()).toLocaleDateString()}</span>
                </div>
                {fees.due > 0 && (
                  <button 
                    className="btn novaa-btn-primary mt-3 w-100"
                    onClick={() => navigate('/student/make-payment')}
                  >
                    <FaWallet className="me-1" /> Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Column */}
          <div className="col-lg-8">
            {/* Profile Snapshot - STATIC MOCK DATA (endpoint not ready) */}
            <div className="novaa-card novaa-fade-in mb-4" style={{ "--delay": "0.4s" }}>
              <div className="novaa-card-header">
                <h2 className="h5 mb-0"><FaUserGraduate className="me-2" /> Profile Snapshot</h2>
              </div>
              <div className="novaa-card-body">
                <div className="row align-items-center">
                  <div className="col-md-3 text-center mb-3 mb-md-0">
                    <div className="novaa-avatar">
                      {student.photo ? (
                        <img src={student.photo} alt={student.fullName} />
                      ) : (
                        <div className="novaa-avatar-placeholder">
                          <span>{student.fullName.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-9">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Full Name</span>
                          <span className="novaa-profile-value">{student.fullName}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Roll Number</span>
                          <span className="novaa-profile-value">{student.rollNumber}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Department</span>
                          <span className="novaa-profile-value">{student.department?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Course</span>
                          <span className="novaa-profile-value">{student.course?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Semester</span>
                          <span className="novaa-profile-value">Semester {student.semester}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="novaa-profile-item">
                          <span className="novaa-profile-label">Admission Year</span>
                          <span className="novaa-profile-value">{student.admissionYear}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Timetable - STATIC MOCK DATA (endpoint not ready) */}
            <div className="novaa-card novaa-fade-in mb-4" style={{ "--delay": "0.5s" }}>
              <div className="novaa-card-header">
                <h2 className="h5 mb-0"><FaCalendarAlt className="me-2" /> Today's Timetable</h2>
                <span className="badge bg-primary">{timetable.length} Classes</span>
              </div>
              <div className="novaa-card-body p-0">
                {timetable.length > 0 ? (
                  <div className="novaa-timetable">
                    {timetable.map((slot, index) => (
                      <div key={index} className="novaa-timetable-slot">
                        <div className="novaa-timetable-time">
                          <div className="novaa-timetable-hour">{slot.startTime}</div>
                          <div className="novaa-timetable-divider"></div>
                          <div className="novaa-timetable-hour">{slot.endTime}</div>
                        </div>
                        <div className="novaa-timetable-details">
                          <div className="novaa-timetable-subject">
                            <FaBook className="me-2 text-primary" />
                            <span className="fw-bold">{slot.subject}</span>
                          </div>
                          <div className="novaa-timetable-meta">
                            <span><FaDoorOpen className="me-1 text-info" /> Room {slot.room}</span>
                            <span className="ms-3"><FaChalkboardTeacher className="me-1 text-success" /> {slot.teacher}</span>
                          </div>
                          <div className="novaa-timetable-actions">
                            <button className="btn btn-sm novaa-btn-outline-primary">
                              <FaQrcode className="me-1" /> Mark Attendance
                            </button>
                            <button className="btn btn-sm novaa-btn-outline-secondary ms-2">
                              <FaHistory className="me-1" /> View Materials
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="novaa-empty-icon">
                      <FaCalendarAlt size={48} className="text-muted" />
                    </div>
                    <p className="text-muted mt-3">No classes scheduled for today</p>
                    <button className="btn novaa-btn-outline-primary mt-2" onClick={() => navigate('/student/my-timetable')}>
                      <FaArrowRight className="me-1" /> View Full Timetable
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Subject-wise Attendance - STATIC MOCK DATA (endpoint not ready) */}
            <div className="novaa-card novaa-fade-in" style={{ "--delay": "0.6s" }}>
              <div className="novaa-card-header">
                <h2 className="h5 mb-0"><FaClipboardList className="me-2" /> Subject-wise Attendance</h2>
              </div>
              <div className="novaa-card-body p-0">
                <div className="table-responsive">
                  <table className="table novaa-table mb-0">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Present</th>
                        <th>Total</th>
                        <th>Percentage</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectAttendance.map((subject, index) => (
                        <tr key={index} className={subject.percentage < 75 ? 'novaa-table-row-critical' : ''}>
                          <td className="fw-medium">{subject.subject}</td>
                          <td><span className="badge bg-light text-dark">{subject.code}</span></td>
                          <td>{subject.present}</td>
                          <td>{subject.total}</td>
                          <td>
                            <div className="novaa-attendance-cell">
                              <span className={subject.percentage < 75 ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                                {subject.percentage}%
                              </span>
                              <div className="novaa-progress-small mt-1">
                                <div 
                                  className="novaa-progress-bar-small" 
                                  style={{ 
                                    width: `${subject.percentage}%`, 
                                    backgroundColor: subject.percentage < 75 ? '#ef4444' : '#10b981' 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${subject.percentage < 75 ? 'bg-danger' : 'bg-success'}`}>
                              {subject.percentage < 75 ? 'Critical' : 'Good'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="novaa-card-footer">
                  <button className="btn novaa-btn-link" onClick={() => navigate('/student/my-attendance')}>
                    <FaArrowRight className="me-1" /> View Detailed Attendance Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="col-lg-4">
            {/* Notifications - STATIC MOCK DATA (endpoint not ready) */}
            <div className="novaa-card novaa-fade-in mb-4" style={{ "--delay": "0.5s" }}>
              <div className="novaa-card-header">
                <h2 className="h5 mb-0"><FaBell className="me-2" /> Latest Notifications</h2>
                <span className="badge bg-danger">{notifications.filter(n => !n.read).length} New</span>
              </div>
              <div className="novaa-card-body p-0">
                {notifications.length > 0 ? (
                  <div className="novaa-notifications">
                    {notifications.map((notification, index) => (
                      <div 
                        key={notification._id} 
                        className={`novaa-notification ${!notification.read ? 'novaa-notification-unread' : ''}`}
                      >
                        <div className="novaa-notification-icon">
                          <div className={`novaa-notification-badge ${!notification.read ? 'bg-danger' : 'bg-secondary'}`}></div>
                        </div>
                        <div className="novaa-notification-content">
                          <h5 className="novaa-notification-title">{notification.title}</h5>
                          <p className="novaa-notification-message mb-1">{notification.message}</p>
                          <small className="text-muted">
                            <FaClock className="me-1" />
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="novaa-empty-icon">
                      <FaBell size={48} className="text-muted" />
                    </div>
                    <p className="text-muted mt-3">No new notifications</p>
                  </div>
                )}
                <div className="novaa-card-footer">
                  <button className="btn novaa-btn-link w-100" onClick={() => navigate('/student/notifications')}>
                    <FaArrowRight className="me-1" /> View All Notifications
                  </button>
                </div>
              </div>
            </div>

            {/* Fee Summary - REAL DATA FROM API */}
            <div className="novaa-card novaa-fade-in" style={{ "--delay": "0.6s" }}>
              <div className="novaa-card-header">
                <h2 className="h5 mb-0"><FaMoneyBillWave className="me-2" /> Fee Summary</h2>
              </div>
              <div className="novaa-card-body">
                <div className="novaa-fee-summary">
                  <div className="novaa-fee-item">
                    <span>Total Fee</span>
                    <span className="fw-bold">₹{fees.totalFee.toLocaleString()}</span>
                  </div>
                  <div className="novaa-fee-item">
                    <span>Paid Amount</span>
                    <span className="text-success fw-bold">₹{fees.paid.toLocaleString()}</span>
                  </div>
                  <div className="novaa-fee-item novaa-fee-due">
                    <span>Due Amount</span>
                    <span className="text-danger fw-bold">₹{fees.due.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h6 className="fw-bold mb-3"><FaCalendarAlt className="me-2" /> Installment Schedule</h6>
                  <div className="novaa-installments">
                    {fees.installments.map((installment) => (
                      <div key={installment.id} className="novaa-installment-item">
                        <div>
                          <div className="fw-bold">Installment {installment.id}</div>
                          <small className="text-muted">
                            Due: {new Date(installment.dueDate).toLocaleDateString()}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold">₹{installment.amount.toLocaleString()}</div>
                          <span className={`badge ${
                            installment.status === 'PAID' ? 'bg-success' : 
                            installment.status === 'DUE' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {installment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {fees.due > 0 && (
                  <button 
                    className="btn novaa-btn-primary w-100 mt-4"
                    onClick={() => navigate('/student/make-payment')}
                  >
                    <FaWallet className="me-2" /> Pay Due Amount: ₹{fees.due.toLocaleString()}
                  </button>
                )}
                
                <div className="novaa-card-footer mt-3 pt-3 border-top">
                  <button className="btn novaa-btn-outline-primary w-100" onClick={() => navigate('/student/fee-receipts')}>
                    <FaDownload className="me-1" /> Download Receipts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .novaa-dashboard {
          background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
          min-height: 100vh;
          padding-top: 20px;
          padding-bottom: 40px;
        }
        
        /* Header Styles */
        .novaa-header {
          background: linear-gradient(120deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          padding: 1.5rem 0;
          margin-bottom: 2rem;
          border-radius: 0 0 20px 20px;
          box-shadow: 0 4px 20px rgba(26, 75, 109, 0.25);
        }
        
        .novaa-header-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
        }
        
        .novaa-header-subtitle {
          opacity: 0.9;
          font-size: 1.05rem;
        }
        
        .novaa-header-actions {
          margin-top: 1rem;
        }
        
        .novaa-quick-action {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-left: 0.5rem;
        }
        
        .novaa-quick-action:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
        
        /* Container Styles */
        .novaa-container {
          max-width: 1600px;
        }
        
        /* Card Styles */
        .novaa-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
          border: none;
          overflow: hidden;
        }
        
        .novaa-card-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.15);
        }
        
        .novaa-card-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(to right, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .novaa-card-body {
          padding: 1.5rem;
        }
        
        .novaa-card-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f1f5f9;
          background-color: #f8fafc;
        }
        
        /* Summary Cards */
        .novaa-card-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          font-size: 1.5rem;
        }
        
        .novaa-card-icon-attendance { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; }
        .novaa-card-icon-fee { background: linear-gradient(135deg, #ffedd5, #fed7aa); color: #c2410c; }
        .novaa-card-icon-paid { background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #166534; }
        .novaa-card-icon-due { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #b91c1c; }
        
        .novaa-card-content {
          text-align: center;
        }
        
        .novaa-card-title {
          font-size: 1.1rem;
          color: #4a5568;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        
        .novaa-card-value {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        
        .novaa-card-meta {
          font-size: 0.9rem;
          color: #64748b;
        }
        
        .novaa-badge {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-weight: 500;
          font-size: 0.85rem;
        }
        
        /* Progress Bars */
        .novaa-progress {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .novaa-progress-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .novaa-progress-small {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .novaa-progress-bar-small {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        
        /* Profile Styles */
        .novaa-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto;
          border: 4px solid #dbeafe;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .novaa-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .novaa-avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 700;
          color: #1e40af;
        }
        
        .novaa-profile-item {
          padding: 0.75rem;
          border-radius: 12px;
          background: #f8fafc;
          margin-bottom: 0.75rem;
        }
        
        .novaa-profile-label {
          font-size: 0.85rem;
          color: #64748b;
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .novaa-profile-value {
          font-weight: 600;
          color: #0f172a;
          font-size: 1.1rem;
        }
        
        /* Timetable Styles */
        .novaa-timetable {
          border-radius: 12px;
          overflow: hidden;
        }
        
        .novaa-timetable-slot {
          display: flex;
          padding: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .novaa-timetable-slot:last-child {
          border-bottom: none;
        }
        
        .novaa-timetable-time {
          min-width: 100px;
          text-align: center;
          padding-right: 1.5rem;
          border-right: 2px dashed #e2e8f0;
        }
        
        .novaa-timetable-hour {
          font-weight: 700;
          color: #1a4b6d;
          font-size: 1.1rem;
        }
        
        .novaa-timetable-divider {
          height: 24px;
          width: 2px;
          background: #cbd5e1;
          margin: 4px auto;
        }
        
        .novaa-timetable-details {
          flex: 1;
          padding-left: 1.5rem;
        }
        
        .novaa-timetable-subject {
          font-size: 1.15rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }
        
        .novaa-timetable-meta {
          font-size: 0.95rem;
          color: #4a5568;
          margin-bottom: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .novaa-timetable-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        /* Table Styles */
        .novaa-table {
          margin-bottom: 0;
        }
        
        .novaa-table thead th {
          background: #f8fafc;
          font-weight: 600;
          color: #1e293b;
          padding: 1rem 1.25rem;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .novaa-table tbody td {
          padding: 1rem 1.25rem;
          border-color: #f1f5f9;
          vertical-align: middle;
        }
        
        .novaa-table-row-critical {
          background-color: #fff1f2 !important;
        }
        
        .novaa-attendance-cell {
          display: flex;
          flex-direction: column;
        }
        
        /* Notifications */
        .novaa-notifications {
          max-height: 350px;
          overflow-y: auto;
        }
        
        .novaa-notification {
          display: flex;
          padding: 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s ease;
        }
        
        .novaa-notification:hover {
          background: #f8fafc;
        }
        
        .novaa-notification:last-child {
          border-bottom: none;
        }
        
        .novaa-notification-unread {
          background: #f0f9ff !important;
          border-left: 3px solid #3b82f6;
        }
        
        .novaa-notification-icon {
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .novaa-notification-badge {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          right: 4px;
        }
        
        .novaa-notification-content {
          flex: 1;
          padding-left: 1rem;
        }
        
        .novaa-notification-title {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.25rem;
          font-size: 1.05rem;
        }
        
        .novaa-notification-message {
          color: #4a5568;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        
        /* Fee Styles */
        .novaa-fee-summary {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .novaa-fee-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .novaa-fee-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .novaa-fee-due {
          border-top: 1px solid #e2e8f0;
          padding-top: 1rem;
          margin-top: 1rem;
          font-size: 1.15rem;
        }
        
        .novaa-installments {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .novaa-installment-item {
          display: flex;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .novaa-installment-item:last-child {
          border-bottom: none;
        }
        
        /* Button Styles */
        .novaa-btn-primary {
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(26, 75, 109, 0.3);
        }
        
        .novaa-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(26, 75, 109, 0.4);
        }
        
        .novaa-btn-outline-primary {
          background: transparent;
          color: #1a4b6d;
          border: 1px solid #1a4b6d;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .novaa-btn-outline-primary:hover {
          background: #dbeafe;
          transform: translateY(-2px);
        }
        
        .novaa-btn-link {
          background: transparent;
          color: #1a4b6d;
          border: none;
          padding: 0.5rem 1rem;
          font-weight: 600;
          text-decoration: underline;
          transition: all 0.2s ease;
        }
        
        .novaa-btn-link:hover {
          color: #0f3a4a;
          background: #f1f5f9;
        }
        
        .novaa-btn-outline-secondary {
          background: transparent;
          color: #4a5568;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .novaa-btn-outline-secondary:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        
        /* Empty States */
        .novaa-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        
        /* Animations */
        .novaa-fade-in {
          animation: fadeIn 0.6s ease forwards;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        /* Responsive Design */
        @media (max-width: 992px) {
          .novaa-header-actions {
            margin-top: 1rem;
            width: 100%;
            justify-content: center;
          }
          
          .novaa-quick-action {
            margin-left: 0.25rem;
            margin-right: 0.25rem;
            padding: 0.6rem 1rem;
            font-size: 0.9rem;
          }
          
          .novaa-card-icon {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }
          
          .novaa-card-value {
            font-size: 1.75rem;
          }
        }
        
        @media (max-width: 768px) {
          .novaa-header {
            border-radius: 0 0 16px 16px;
          }
          
          .novaa-header-title {
            font-size: 1.5rem;
          }
          
          .novaa-header-subtitle {
            font-size: 0.95rem;
          }
          
          .novaa-card {
            border-radius: 14px;
          }
          
          .novaa-timetable-slot {
            flex-direction: column;
            text-align: center;
          }
          
          .novaa-timetable-time {
            border-right: none;
            border-bottom: 2px dashed #e2e8f0;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }
          
          .novaa-timetable-details {
            padding-left: 0;
          }
          
          .novaa-timetable-actions {
            justify-content: center;
          }
        }
        
        @media (max-width: 480px) {
          .novaa-container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          .novaa-card-body {
            padding: 1.25rem;
          }
          
          .novaa-card-header {
            padding: 1rem 1.25rem;
          }
          
          .novaa-card-value {
            font-size: 1.5rem;
          }
          
          .novaa-profile-item {
            padding: 0.6rem;
          }
          
          .novaa-btn-primary,
          .novaa-btn-outline-primary {
            padding: 0.65rem 1.25rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}