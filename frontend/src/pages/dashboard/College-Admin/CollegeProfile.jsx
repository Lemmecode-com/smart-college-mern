import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaLayerGroup,
  FaBook,
  FaUserGraduate,
  FaEdit,
  FaEye,
  FaDownload,
  FaPrint,
  FaArrowLeft,
  FaStar,
  FaShieldAlt,
  FaInfoCircle,
  FaBell,
  FaChartLine,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaClipboardList,
  FaMoneyBillWave,
  FaFileInvoice,
  FaCogs,
  FaSync, // ✅ ADDED: Replace FaSyncAlt with FaSync
  FaBolt, // ✅ ADDED: For Quick Actions header
  FaRedo // ✅ ADDED: Alternative refresh icon
} from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState({
    departments: 0,
    courses: 0,
    students: 0,
    teachers: 0,
    activeSessions: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ FIXED: Only fetch college data (remove students/courses API calls)
        const collegeRes = await api.get("/college/my-college");
        setCollege(collegeRes.data);
        
        // ✅ FIXED: Use placeholder stats or calculate from college data if available
        // If your backend has different endpoints, update these accordingly
        setStats({
          departments: collegeRes.data?.departments?.length || 0,
          courses: collegeRes.data?.courses?.length || 0,
          students: collegeRes.data?.studentCount || 0,
          teachers: collegeRes.data?.teacherCount || 0,
          activeSessions: collegeRes.data?.activeSessions || 0
        });
      } catch (err) {
        console.error("Error loading college profile:", err);
        setError("Failed to load college profile data");
        // ✅ FIXED: Don't crash - set empty college data
        setCollege(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ================= QUICK ACTIONS ================= */
  const quickActions = [
    { icon: <FaUsers />, label: "Students", path: "/students", color: "primary" },
    { icon: <FaLayerGroup />, label: "Departments", path: "/departments", color: "success" },
    { icon: <FaBook />, label: "Courses", path: "/courses", color: "info" },
    { icon: <FaChalkboardTeacher />, label: "Teachers", path: "/teachers", color: "warning" },
    { icon: <FaMoneyBillWave />, label: "Fee Structures", path: "/fees/list", color: "danger" },
    { icon: <FaCogs />, label: "Settings", path: "/college/profile", color: "dark" }
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  if (!college) return <EmptyState onBack={() => navigate("/dashboard")} />;

  return (
    <div className="container-fluid py-4 animate-fade-in">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="d-flex align-items-center justify-content-between mb-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3">
          
          <div className="d-flex align-items-center gap-3">
            <div className="college-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaUniversity size={32} />
            </div>
            
            <div>
              <h1 className="h3 fw-bold mb-0 text-dark">{college.name}</h1>
              <p className="text-muted mb-0">
                <span className="badge bg-secondary me-2">{college.code}</span>
                <span className={`badge ${
                  college.isActive ? "bg-success blink" : "bg-danger"
                }`}>
                  {college.isActive ? (
                    <>
                      <FaCheckCircle className="me-1" /> Active
                    </>
                  ) : (
                    <>
                      <FaTimesCircle className="me-1" /> Inactive
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button 
            className="btn btn-success d-flex align-items-center gap-2 px-4 py-2 hover-lift pulse-button"
          >
            <FaEdit /> Edit Profile
          </button>
        </div>
      </div>

      {/* ================= STATS DASHBOARD ================= */}
      <div className="row g-4 mb-4 animate-fade-in-up">
        <StatCard 
          title="Total Departments" 
          value={stats.departments} 
          icon={<FaLayerGroup />} 
          color="primary"
          trend="+12% this year"
        />
        <StatCard 
          title="Active Courses" 
          value={stats.courses} 
          icon={<FaBook />} 
          color="success"
          trend="+8 courses"
        />
        <StatCard 
          title="Enrolled Students" 
          value={stats.students} 
          icon={<FaUserGraduate />} 
          color="info"
          trend="+45 new"
        />
        <StatCard 
          title="Faculty Members" 
          value={stats.teachers} 
          icon={<FaChalkboardTeacher />} 
          color="warning"
          trend="Stable"
        />
      </div>

      {/* ================= MAIN CONTENT GRID ================= */}
      <div className="row g-4">
        {/* LEFT COLUMN - PROFILE DETAILS */}
        <div className="col-lg-8">
          {/* ================= BASIC INFO CARD ================= */}
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="card-header bg-gradient-primary text-white py-4">
              <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                <FaInfoCircle /> College Information
              </h2>
            </div>
            <div className="card-body p-4">
              <div className="row g-4">
                <InfoItem 
                  icon={<FaEnvelope className="text-primary" />} 
                  label="Official Email" 
                  value={college.email} 
                  copyable 
                />
                <InfoItem 
                  icon={<FaPhoneAlt className="text-success" />} 
                  label="Contact Number" 
                  value={college.contactNumber} 
                  copyable 
                />
                <InfoItem 
                  icon={<FaMapMarkerAlt className="text-danger" />} 
                  label="Full Address" 
                  value={college.address} 
                  fullWidth 
                />
                <InfoItem 
                  icon={<FaCalendarAlt className="text-warning" />} 
                  label="Established Year" 
                  value={college.establishedYear?.toString() || "N/A"} 
                />
                <InfoItem 
                  icon={<FaShieldAlt className="text-info" />} 
                  label="College Type" 
                  value={college.collegeType || "Private"} 
                />
                <InfoItem 
                  icon={<FaCalendarAlt className="text-secondary" />} 
                  label="Member Since" 
                  value={new Date(college.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} 
                />
              </div>
            </div>
          </div>

          {/* ================= QUICK ACTIONS CARD ================= */}
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="card-header bg-gradient-success text-white py-4">
              <h2 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
                <FaBolt /> Quick Actions
              </h2>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                {quickActions.map((action, idx) => (
                  <div className="col-md-4 col-sm-6" key={idx}>
                    <button
                      onClick={() => navigate(action.path)}
                      className={`btn btn-outline-${action.color} w-100 d-flex flex-column align-items-center gap-2 py-3 rounded-3 shadow-sm hover-lift animate-fade-in`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className={`fs-3 text-${action.color}`}>{action.icon}</div>
                      <span className="fw-semibold">{action.label}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - SIDEBAR */}
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: "20px" }}>

           {/* ================= RECENT ACTIVITY ================= */}
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <div className="card-header bg-gradient-info text-white py-3">
                <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <FaBell /> Recent Activity
                </h2>
              </div>
              <div className="card-body p-3">
                <div className="activity-item mb-3 pb-3 border-bottom">
                  <div className="d-flex align-items-start gap-2">
                    <div className="activity-icon bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                      <FaUserGraduate size={14} />
                    </div>
                    <div>
                      <p className="mb-1 fw-medium">New student enrolled</p>
                      <small className="text-muted">2 hours ago</small>
                    </div>
                  </div>
                </div>
                
                <div className="activity-item mb-3 pb-3 border-bottom">
                  <div className="d-flex align-items-start gap-2">
                    <div className="activity-icon bg-success text-white rounded-circle d-flex align-items-center justify-content-center">
                      <FaBook size={14} />
                    </div>
                    <div>
                      <p className="mb-1 fw-medium">Course added</p>
                      <small className="text-muted">Yesterday</small>
                    </div>
                  </div>
                </div>
                
                <div className="activity-item">
                  <div className="d-flex align-items-start gap-2">
                    <div className="activity-icon bg-warning text-white rounded-circle d-flex align-items-center justify-content-center">
                      <FaMoneyBillWave size={14} />
                    </div>
                    <div>
                      <p className="mb-1 fw-medium">Fee structure updated</p>
                      <small className="text-muted">2 days ago</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="card-body p-4 bg-light">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <p className="mb-1">
                <small className="text-muted">
                  <FaInfoCircle className="me-2" /> 
                  System Version: <strong>v2.1.0</strong>
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  Last Sync: <strong>{new Date().toLocaleTimeString()}</strong>
                </small>
              </p>
            </div>
            <div justifyContent="flex-end" className="d-flex gap-2">
              <div>
              <button 
            onClick={() => navigate("/dashboard")}
            className="btn btn-outline-secondary d-flex me-2 gap-2 px-1 py-2 shadow-sm hover-lift" >
           <FaArrowLeft /> Back to dashboard
           </button>
            </div>
            <div>
              <button 
              className="btn btn-outline-primary px-4 py-2 d-flex align-items-center gap-2 hover-lift"
              onClick={() => window.location.reload()}
            >
              <FaSync className="spin-icon" /> Refresh Data
            </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style jsx>{`
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
        .bg-gradient-success {
          background: linear-gradient(135deg, #1e6f5c 0%, #155447 100%);
        }
        .bg-gradient-info {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        }
        .bg-gradient-dark {
          background: linear-gradient(135deg, #343a40 0%, #23272b 100%);
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .college-logo-container {
          width: 70px;
          height: 70px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .college-badge {
          width: 120px;
          height: 120px;
          margin: 0 auto 15px;
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(26, 75, 109, 0.5);
          position: relative;
          overflow: hidden;
        }

        .college-badge::before {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: rotate 10s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .college-initials {
          font-size: 48px;
          font-weight: bold;
          color: white;
          position: relative;
          z-index: 1;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .stat-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
          border-color: rgba(0,0,0,0.1);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          font-size: 14px;
        }

        .info-item {
          transition: all 0.3s ease;
        }
        .info-item:hover {
          transform: translateX(5px);
          background-color: rgba(0,0,0,0.02);
        }

        .pulse-button {
          position: relative;
          overflow: hidden;
        }
        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        .pulse-button:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        @keyframes ripple {
          0% { transform: scale(0, 0); opacity: 0.5; }
          100% { transform: scale(100, 100); opacity: 0; }
        }

        @media (max-width: 992px) {
          .sticky-top {
            position: static !important;
          }
          .college-logo-container {
            width: 50px;
            height: 50px;
          }
        }

        /* Loading Skeleton */
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s ease-in-out infinite;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .copyable:hover {
          background-color: rgba(0,123,255,0.1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/* ================= LOADING SKELETON ================= */
function LoadingSkeleton() {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex align-items-center justify-content-center gap-3 mb-5">
            <div className="skeleton rounded-circle" style={{ width: '80px', height: '80px' }}></div>
            <div>
              <div className="skeleton rounded" style={{ width: '300px', height: '30px' }}></div>
              <div className="skeleton rounded mt-2" style={{ width: '150px', height: '20px' }}></div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div className="col-md-3" key={i}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4 text-center">
                    <div className="skeleton rounded-circle mx-auto mb-3" style={{ width: '50px', height: '50px' }}></div>
                    <div className="skeleton rounded mx-auto mb-2" style={{ width: '80px', height: '25px' }}></div>
                    <div className="skeleton rounded mx-auto" style={{ width: '120px', height: '20px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="skeleton rounded mb-4" style={{ width: '200px', height: '30px' }}></div>
              <div className="row g-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div className="col-md-4" key={i}>
                    <div className="skeleton rounded" style={{ width: '100%', height: '80px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= ERROR DISPLAY ================= */
function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body text-center p-5">
              <div className="text-danger mb-3">
                <FaTimesCircle size={64} />
              </div>
              <h4 className="fw-bold mb-2">Error Loading Profile</h4>
              <p className="text-muted mb-4">{message}</p>
              <button 
                onClick={onRetry}
                className="btn btn-primary px-4 py-2"
              >
                <FaSync className="me-2 spin-icon" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ onBack }) {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body text-center p-5">
              <div className="text-secondary mb-3">
                <FaUniversity size={64} />
              </div>
              <h4 className="fw-bold mb-2">No College Data Found</h4>
              <p className="text-muted mb-4">Please contact your system administrator to set up college profile.</p>
              <button 
                onClick={onBack}
                className="btn btn-outline-secondary px-4 py-2"
              >
                <FaArrowLeft className="me-2" /> Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ title, value, icon, color, trend }) {
  return (
    <div className="col-md-3 mb-3">
      <div className={`card border-0 shadow-sm rounded-4 stat-card bg-light-${color}`}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 className="text-muted mb-1">{title}</h6>
              <h2 className={`fw-bold text-${color}`}>{value}</h2>
            </div>
            <div className={`fs-2 text-${color} opacity-50`}>{icon}</div>
          </div>
          {trend && (
            <div className="d-flex align-items-center">
              <small className={`fw-semibold ${
                trend.includes('+') ? 'text-success' : trend.includes('-') ? 'text-danger' : 'text-muted'
              }`}>
                {trend}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= INFO ITEM ================= */
function InfoItem({ icon, label, value, copyable = false, fullWidth = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (copyable && value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={fullWidth ? "col-12" : "col-md-6"}>
      <div 
        className={`p-3 border rounded-3 shadow-sm h-100 info-item ${
          copyable ? 'copyable' : ''
        }`}
        onClick={handleCopy}
      >
        <div className="d-flex align-items-start gap-3">
          <div className="mt-1 flex-shrink-0">{icon}</div>
          <div className="flex-grow-1">
            <h6 className="text-muted mb-1 fw-normal small">{label}</h6>
            <h5 className="fw-bold mb-0 text-dark">
              {value || "-"}
              {copyable && copied && (
                <span className="ms-2 text-success small">
                  <FaCheckCircle size={14} /> Copied!
                </span>
              )}
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
}  











