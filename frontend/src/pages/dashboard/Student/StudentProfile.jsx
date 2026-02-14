import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

// REPLACE THIS (INVALID):
// import { ..., FaFileCertificate, ... } from "react-icons/fa";

// WITH THIS (VALID ICONS):
import {
  FaUserGraduate,
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaCalendarAlt,
  FaBook,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaEdit,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaTimesCircle,
  FaSpinner,
  FaHome,
  FaIdCard,
  FaVial,
  FaUserFriends,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaGlobe,
  FaHeartbeat,
  FaDownload,
  FaPrint,
  FaExclamationTriangle,
  FaFileAlt,      // ✅ VALID: Generic file
  FaFilePdf,      // ✅ VALID: PDF document (REPLACES FaFileCertificate)
  FaFileInvoice,  // ✅ VALID
  FaFileMedical,  // ✅ VALID
  FaFileSignature,// ✅ VALID
  FaCertificate   // ✅ VALID: Standalone certificate icon
} from "react-icons/fa";

export default function StudentProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'academic', 'contact', 'address', 'education', 'college'

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");

        if (!res.data || !res.data.student) {
          throw new Error("Invalid profile response structure");
        }

        setProfile(res.data);
      } catch (err) {
        console.error("PROFILE ERROR:", err);

        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
          setTimeout(() => navigate("/login"), 3000);
        } else if (err.response?.status === 404) {
          setError("Student profile not found. Please contact administration.");
        } else if (err.response?.status === 500) {
          setError("Server error while loading profile. Please try again later.");
        } else {
          setError(err.response?.data?.message || "Failed to load student profile. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading Student Profile...</h5>
                <p className="text-muted small">Fetching your personal and academic information</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <div className="text-danger mb-3">
                  <FaTimesCircle size={64} />
                </div>
                <h4 className="fw-bold mb-2">Profile Loading Error</h4>
                <p className="text-muted mb-4">{error}</p>
                <div className="d-flex justify-content-center gap-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaSync className="spin-icon" /> Retry
                  </button>
                  <button 
                    onClick={() => navigate("/student/dashboard")}
                    className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaArrowLeft /> Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <FaUserGraduate className="text-muted mb-3" size={64} />
                <h4 className="fw-bold mb-2">No Profile Data Found</h4>
                <p className="text-muted mb-4">Your profile information could not be retrieved. Please contact your college administrator.</p>
                <button 
                  onClick={() => navigate("/student/dashboard")}
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
                >
                  <FaArrowLeft /> Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { student, college, department, course } = profile;

  // Mock educational documents data (to be replaced with real API later)
  const educationalDocuments = [
  {
    id: 1,
    type: "10th Marksheet",
    name: "Secondary School Certificate",
    board: "State Board",
    year: "2018",
    percentage: "85.4%",
    file: "10th_marksheet.pdf",
    icon: <FaFileAlt />  // Generic file icon
  },
  {
    id: 2,
    type: "12th Marksheet",
    name: "Higher Secondary Certificate",
    board: "CBSE",
    year: "2020",
    percentage: "78.9%",
    file: "12th_marksheet.pdf",
    icon: <FaFilePdf />  // ✅ CORRECTED: PDF icon instead of invalid FaFileCertificate
  },
  {
    id: 3,
    type: "Migration Certificate",
    name: "Inter-State Migration Certificate",
    board: "State Education Board",
    year: "2020",
    percentage: "",
    file: "migration_certificate.pdf",
    icon: <FaCertificate />  // ✅ CORRECTED: Standalone certificate icon
  },
  {
    id: 4,
    type: "Character Certificate",
    name: "School Character Certificate",
    board: "Delhi Public School",
    year: "2020",
    percentage: "",
    file: "character_certificate.pdf",
    icon: <FaCertificate />  // ✅ CORRECTED
  },
  {
    id: 5,
    type: "Income Certificate",
    name: "Family Income Certificate",
    board: "Municipal Corporation",
    year: "2022",
    percentage: "",
    file: "income_certificate.pdf",
    icon: <FaFileInvoice />
  }
];

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">

        <div className="d-flex justify-content-end align-items-center flex-wrap w-100">
          <button
            className="btn btn-success d-flex align-items-center gap-2 px-4 py-2 pulse-button "
            onClick={() => navigate("/student/edit-profile")}
          >
            <FaEdit size={16} /> Edit Profile
          </button>
        </div>
      </div>
      {/* ================= PROFILE HEADER CARD ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="card-header bg-gradient-primary text-white py-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
            <div className="d-flex align-items-center gap-4 mb-3 mb-md-0">
              <div className="profile-avatar-container">
                <div className="profile-avatar bg-white d-flex align-items-center justify-content-center text-primary">
                  <FaUserGraduate size={64} />
                </div>
                <div className="profile-status-indicator">
                  <span className={`status-dot ${
                    student?.status === "APPROVED" ? "bg-success" : 
                    student?.status === "REJECTED" ? "bg-danger" : "bg-warning"
                  }`}></span>
                </div>
              </div>
              <div>
                <h2 className="h3 fw-bold mb-1">{student?.fullName || "N/A"}</h2>
                <div className="d-flex flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-1">
                    <FaGraduationCap className="text-white opacity-75" /> 
                    <span className="opacity-75">{course?.name || "N/A"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FaLayerGroup className="text-white opacity-75" /> 
                    <span className="opacity-75">{department?.name || "N/A"}</span>
                  </div>
                </div>
                <div className="mt-2 d-flex flex-wrap gap-2">
                  <span className={`badge ${
                    student?.status === "APPROVED" ? "bg-success" : 
                    student?.status === "REJECTED" ? "bg-danger" : "bg-warning"
                  }`}>
                    <FaCheckCircle className="me-1" />
                    {student?.status || "PENDING"}
                  </span>
                  <span className="badge bg-light text-dark">
                    <FaClock className="me-1" />
                    {student?.currentSemester ? `Semester ${student.currentSemester}` : "N/A"}
                  </span>
                  <span className="badge bg-light text-dark">
                    <FaCalendarAlt className="me-1" />
                    Admitted: {student?.admissionYear || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card-body bg-light py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center text-center text-md-start">
            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-4 mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <FaEnvelope className="text-primary" /> 
                <span className="fw-medium">{student?.email || "N/A"}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaPhoneAlt className="text-success" /> 
                <span className="fw-medium">{student?.mobileNumber || "N/A"}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaGlobe className="text-info" /> 
                <span className="fw-medium">{student?.nationality || "N/A"}</span>
              </div>
            </div>
            <small className="text-muted">
              <FaSync className="spin-icon me-1" />
              Last updated: {new Date().toLocaleString()}
            </small>
          </div>
        </div>
      </div>

      {/* ================= TAB NAVIGATION ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-4 animate-fade-in-up">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-lg-row">
            {/* Tab Navigation - Vertical on desktop, horizontal on mobile */}
            <div className="tabs-navigation bg-light border-end border-bottom border-lg-end-0 border-lg-bottom-0">
              <TabItem 
                icon={<FaUserGraduate />} 
                label="Personal Information" 
                active={activeTab === 'personal'} 
                onClick={() => setActiveTab('personal')} 
              />
              <TabItem 
                icon={<FaBook />} 
                label="Academic Information" 
                active={activeTab === 'academic'} 
                onClick={() => setActiveTab('academic')} 
              />
              <TabItem 
                icon={<FaPhoneAlt />} 
                label="Contact Information" 
                active={activeTab === 'contact'} 
                onClick={() => setActiveTab('contact')} 
              />
              <TabItem 
                icon={<FaHome />} 
                label="Address Information" 
                active={activeTab === 'address'} 
                onClick={() => setActiveTab('address')} 
              />
              <TabItem 
                icon={<FaGraduationCap />} 
                label="Educational Information" 
                active={activeTab === 'education'} 
                onClick={() => setActiveTab('education')} 
                badge={educationalDocuments.length}
              />
              <TabItem 
                icon={<FaUniversity />} 
                label="College Information" 
                active={activeTab === 'college'} 
                onClick={() => setActiveTab('college')} 
              />
            </div>
            
            {/* Tab Content */}
            <div className="tabs-content flex-grow-1 p-4">
              {activeTab === 'personal' && (
                <SectionContent title="Personal Information" icon={<FaUserGraduate />} color="info">
                  <div className="row g-3">
                    <InfoItem label="Full Name" value={student?.fullName || "N/A"} icon={<FaUserGraduate />} col={12} />
                    <InfoItem label="Gender" value={student?.gender || "N/A"} icon={<FaVial />} />
                    <InfoItem 
                      label="Date of Birth" 
                      value={student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"} 
                      icon={<FaCalendarAlt />} 
                    />
                    <InfoItem label="Nationality" value={student?.nationality || "N/A"} icon={<FaGlobe />} />
                    <InfoItem label="Religion" value={student?.religion || "N/A"} icon={<FaHeartbeat />} />
                    <InfoItem label="Category" value={student?.category || "N/A"} icon={<FaUserFriends />} />
                    <InfoItem label="Blood Group" value={student?.bloodGroup || "N/A"} icon={<FaHeartbeat />} />
                  </div>
                </SectionContent>
              )}
              
              {activeTab === 'academic' && (
                <SectionContent title="Academic Information" icon={<FaBook />} color="success">
                  <div className="row g-3">
                    <InfoItem label="Department" value={department?.name || "N/A"} icon={<FaUniversity />} />
                    <InfoItem label="Course" value={course?.name || "N/A"} icon={<FaGraduationCap />} />
                    <InfoItem label="Course Code" value={course?.code || "N/A"} icon={<FaLayerGroup />} />
                    <InfoItem label="Current Semester" value={student?.currentSemester ? `Semester ${student.currentSemester}` : "N/A"} icon={<FaClock />} />
                    <InfoItem label="Admission Year" value={student?.admissionYear || "N/A"} icon={<FaCalendarAlt />} />
                    <InfoItem label="Academic Status" value={student?.status || "N/A"} icon={<FaCheckCircle />} />
                  </div>
                </SectionContent>
              )}
              
              {activeTab === 'contact' && (
                <SectionContent title="Contact Information" icon={<FaPhoneAlt />} color="warning">
                  <div className="row g-3">
                    <InfoItem label="Personal Email" value={student?.email || "N/A"} icon={<FaEnvelope />} col={12} />
                    <InfoItem label="Mobile Number" value={student?.mobileNumber || "N/A"} icon={<FaPhoneAlt />} col={12} />
                    <InfoItem label="Alternate Number" value={student?.alternateMobileNumber || "N/A"} icon={<FaPhoneAlt />} col={12} />
                    <InfoItem label="Emergency Contact" value={student?.emergencyContactName || "N/A"} icon={<FaUserFriends />} />
                    <InfoItem label="Emergency Phone" value={student?.emergencyContactNumber || "N/A"} icon={<FaPhoneAlt />} />
                  </div>
                </SectionContent>
              )}
              
              {activeTab === 'address' && (
                <SectionContent title="Address Information" icon={<FaHome />} color="dark">
                  <div className="row g-3">
                    <InfoItem label="Address Line 1" value={student?.addressLine || "N/A"} icon={<FaMapMarkerAlt />} col={12} />
                    <InfoItem label="Address Line 2" value={student?.addressLine2 || "N/A"} icon={<FaMapMarkerAlt />} col={12} />
                    <InfoItem label="City" value={student?.city || "N/A"} icon={<FaMapMarkerAlt />} />
                    <InfoItem label="State" value={student?.state || "N/A"} icon={<FaMapMarkerAlt />} />
                    <InfoItem label="Pincode" value={student?.pincode || "N/A"} icon={<FaMapMarkerAlt />} />
                    <InfoItem label="Country" value={student?.country || "N/A"} icon={<FaGlobe />} />
                  </div>
                </SectionContent>
              )}
              
              {activeTab === 'education' && (
                <SectionContent title="Educational Information" icon={<FaGraduationCap />} color="primary">
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3 text-primary">
                      <FaFileAlt className="me-2" />
                      Academic Documents Repository
                    </h5>
                    <p className="text-muted mb-0">
                      Your previous academic records and important certificates. Click on any document to download.
                    </p>
                  </div>
                  
                  <div className="row g-3">
                    {educationalDocuments.map((doc) => (
                      <div key={doc.id} className="col-md-6">
                        <DocumentCard 
                          icon={doc.icon} 
                          type={doc.type} 
                          name={doc.name} 
                          board={doc.board} 
                          year={doc.year} 
                          percentage={doc.percentage} 
                          file={doc.file}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-light rounded-3">
                    <h6 className="fw-bold mb-2">
                      <FaInfoCircle className="me-2 text-info" />
                      Document Guidelines
                    </h6>
                    <ul className="mb-0 ps-3 small text-muted">
                      <li>All documents must be in PDF format</li>
                      <li>Maximum file size: 5MB per document</li>
                      <li>Ensure documents are clear and legible</li>
                      <li>Contact administration for document verification</li>
                    </ul>
                  </div>
                </SectionContent>
              )}
              
              {activeTab === 'college' && (
                <SectionContent title="College Information" icon={<FaUniversity />} color="secondary">
                  <div className="row g-3">
                    <InfoItem label="College Name" value={college?.name || "N/A"} icon={<FaGraduationCap />} col={12} />
                    <InfoItem label="Email" value={college?.email || "N/A"} icon={<FaEnvelope />} />
                    <InfoItem label="Contact Number" value={college?.contactNumber || "N/A"} icon={<FaPhoneAlt />} />
                    <InfoItem label="Established Year" value={college?.establishedYear || "N/A"} icon={<FaCalendarAlt />} />
                    <InfoItem label="Address" value={college?.address || "N/A"} icon={<FaMapMarkerAlt />} col={12} />
                  </div>
                </SectionContent>
              )}
            </div>
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
                  <FaUserGraduate className="me-1" />
                  Student Profile | NOVAA College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Profile last updated: <strong>{student?.updatedAt ? new Date(student.updatedAt).toLocaleString() : "N/A"}</strong>
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
        .pulse-button { position: relative; overflow: hidden; }
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

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .profile-logo-container {
          width: 70px;
          height: 70px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .profile-avatar-container {
          position: relative;
          width: 100px;
          height: 100px;
        }

        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          font-size: 2.5rem;
        }

        .profile-status-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #f8f9fa;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        /* Tab Navigation Styles */
        .tabs-navigation {
          min-width: 250px;
          border-right: 1px solid #e9ecef;
          background: #f8f9fa;
        }
        
        @media (max-width: 992px) {
          .tabs-navigation {
            min-width: 100%;
            border-right: none;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            overflow-x: auto;
          }
        }
        
        .tab-item {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 3px solid transparent;
          position: relative;
        }
        
        .tab-item:hover {
          background: rgba(26, 75, 109, 0.05);
          transform: translateX(5px);
        }
        
        .tab-item.active {
          background: white;
          border-left-color: #1a4b6d;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .tab-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #1a4b6d;
        }
        
        .tab-badge {
          background: #1a4b6d;
          color: white;
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 20px;
          min-width: 24px;
          text-align: center;
        }
        
        .tabs-content {
          min-height: 400px;
        }
        
        .section-content {
          border-radius: 12px;
          padding: 1.5rem;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }
        
        .document-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        
        .document-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(0,0,0,0.1);
          border-color: #cbd5e1;
        }
        
        .document-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        
        .document-type {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .document-name {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 0.5rem;
          font-size: 1.05rem;
        }
        
        .document-meta {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px dashed #e2e8f0;
        }
        
        .document-board {
          font-size: 0.85rem;
          color: #4a5568;
        }
        
        .document-year {
          font-size: 0.85rem;
          color: #4a5568;
        }
        
        .document-percentage {
          font-weight: 700;
          color: #166534;
          font-size: 0.95rem;
        }
        
        .document-download {
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
          width: 100%;
        }
        
        .document-download:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(26, 75, 109, 0.3);
        }
        
        .info-item {
          border-left: 3px solid #e9ecef;
          padding-left: 1rem;
          transition: all 0.2s ease;
        }
        
        .info-item:hover {
          border-left-color: #1a4b6d;
          background-color: rgba(26, 75, 109, 0.03);
          transform: translateX(5px);
        }
        
        .info-label {
          font-weight: 600;
          color: #495057;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }
        
        .info-value {
          font-weight: 500;
          color: #212529;
          font-size: 1rem;
        }
        
        @media (max-width: 992px) {
          .tabs-navigation {
            min-width: 100%;
          }
          
          .tab-item {
            min-width: 180px;
            justify-content: center;
            flex-direction: column;
            text-align: center;
            padding: 1rem;
          }
          
          .tab-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 0.7rem;
            padding: 0.1rem 0.4rem;
          }
        }
        
        @media (max-width: 768px) {
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
          .profile-avatar-container {
            width: 80px;
            height: 80px;
          }
          .profile-avatar {
            width: 80px;
            height: 80px;
          }
          .section-title {
            font-size: 1.35rem;
          }
        }
        
        @media (max-width: 576px) {
          .profile-logo-container {
            width: 50px;
            height: 50px;
          }
          .profile-avatar-container {
            width: 70px;
            height: 70px;
          }
          .profile-avatar {
            width: 70px;
            height: 70px;
            font-size: 1.75rem;
          }
          .document-card {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= TAB ITEM COMPONENT ================= */
function TabItem({ icon, label, active, onClick, badge }) {
  return (
    <div 
      className={`tab-item ${active ? 'active' : ''}`} 
      onClick={onClick}
    >
      <span className="fs-4">{icon}</span>
      <div className="flex-grow-1">
        <div className="fw-medium">{label}</div>
      </div>
      {badge && (
        <span className="tab-badge">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ================= SECTION CONTENT COMPONENT ================= */
function SectionContent({ title, icon, color, children }) {
  return (
    <div className="section-content">
      <h2 className="section-title text-primary">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

/* ================= INFO ITEM COMPONENT ================= */
function InfoItem({ label, value, icon, col = 6 }) {
  return (
    <div className={`col-md-${col} info-item animate-fade-in`} style={{ animationDelay: "0.1s" }}>
      <div className="info-label">
        {icon}
        {label}
      </div>
      <div className="info-value">{value}</div>
    </div>
  );
}

/* ================= DOCUMENT CARD COMPONENT ================= */
function DocumentCard({ icon, type, name, board, year, percentage, file }) {
  const getDocumentColor = () => {
    switch(type) {
      case "10th Marksheet": return "#dbeafe";
      case "12th Marksheet": return "#dcfce7";
      case "Migration Certificate": return "#ffedd5";
      case "Character Certificate": return "#ede9fe";
      case "Income Certificate": return "#fee2e2";
      default: return "#f1f5f9";
    }
  };
  
  const getDocumentIconColor = () => {
    switch(type) {
      case "10th Marksheet": return "#1e40af";
      case "12th Marksheet": return "#166534";
      case "Migration Certificate": return "#c2410c";
      case "Character Certificate": return "#5b21b6";
      case "Income Certificate": return "#b91c1c";
      default: return "#4a5568";
    }
  };

  return (
    <div className="document-card">
      <div 
        className="document-icon" 
        style={{ 
          backgroundColor: getDocumentColor(),
          color: getDocumentIconColor()
        }}
      >
        {icon}
      </div>
      <div className="document-type">
        <FaFileAlt /> {type}
      </div>
      <div className="document-name">{name}</div>
      <div className="document-meta">
        <div className="document-board">{board}</div>
        <div className="document-year">{year}</div>
        {percentage && <div className="document-percentage">{percentage}</div>}
      </div>
      <button className="document-download">
        <FaDownload size={14} /> Download {file}
      </button>
    </div>
  );
}