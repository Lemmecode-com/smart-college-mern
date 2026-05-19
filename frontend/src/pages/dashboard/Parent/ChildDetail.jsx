// Child Detail - Shows individual child profile, attendance, and fees
import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";

import {
  FaUser,
  FaCalendarCheck,
  FaRupeeSign,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaSchool,
  FaIdCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaArrowRight,
  FaExclamationTriangle,
  FaSyncAlt,
  FaEye,
  FaChartBar,
  FaCreditCard,
  FaHistory,
  FaFileAlt,
  FaUserGraduate
} from "react-icons/fa";

// Brand Color Palette - Matching Application Theme
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    dark: '#0f3a4a',
    light: '#2a6b8d',
    gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    light: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    light: '#17a2b8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  secondary: {
    main: '#6c757d',
    dark: '#545b62',
    light: '#868e96',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
  }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export default function ChildDetail() {
  const { user } = useContext(AuthContext);
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fees");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    if (childId) {
      fetchChildData();
    }
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);

      // Fetch child profile
      const profileResponse = await api.get(
        `/parent/student/${childId}/profile`,
      );
      setChild(profileResponse.data);

      // Fetch attendance and fees (fees are important, so always fetch)
      if (activeTab === "attendance") {
        await fetchAttendance();
      }
      await fetchFees(); // Always fetch fees as it's important information
    } catch (error) {
      toast.error("Failed to load child information");
      console.error("Error fetching child data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/parent/student/${childId}/attendance`);
      setAttendance(response.data.attendance || []);
    } catch (error) {
      toast.error("Failed to load attendance data");
      console.error("Error fetching attendance:", error);
    }
  };

  const fetchFees = async () => {
    try {
      console.log("🔄 Fetching fees for childId:", childId);
      const response = await api.get(`/parent/student/${childId}/fees`);
      // The axios interceptor unwraps the response, so response.data is the feeRecord directly
      setFees(response.data);
    } catch (error) {
      console.error("❌ Error fetching fees:", error);
      toast.error("Failed to load fee information");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "attendance" && attendance.length === 0) {
      fetchAttendance();
    } else if (tab === "fees" && !fees) {
      fetchFees();
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      APPROVED: BRAND_COLORS.success.main,
      PENDING: BRAND_COLORS.warning.main,
      REJECTED: BRAND_COLORS.danger.main,
      DEACTIVATED: BRAND_COLORS.secondary.main,
    };
    return colors[status] || BRAND_COLORS.secondary.main;
  };

  const getStatusGradient = (status) => {
    const gradients = {
      APPROVED: BRAND_COLORS.success.gradient,
      PENDING: BRAND_COLORS.warning.gradient,
      REJECTED: BRAND_COLORS.danger.gradient,
      DEACTIVATED: BRAND_COLORS.secondary.gradient,
    };
    return gradients[status] || BRAND_COLORS.secondary.gradient;
  };

  const getStatusLabel = (status) => {
    const labels = {
      APPROVED: "Active Student",
      PENDING: "Application Pending",
      REJECTED: "Application Rejected",
      DEACTIVATED: "Account Inactive",
    };
    return labels[status] || status;
  };

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 0;
    const presentCount = attendance.filter(
      (record) => record.status === "PRESENT",
    ).length;
    return Math.round((presentCount / attendance.length) * 100);
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading child information..." />;
  }

  if (!child) {
    return (
      <div className="child-detail-page">
        <div className="erp-container">
          <div className="text-center py-5">
            <FaUser size={48} className="text-muted mb-3" />
            <h5 className="text-muted">Child Not Found</h5>
            <p className="text-muted">
              The requested child information could not be found.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard/parent/children")}
            >
              <FaArrowLeft className="me-2" />
              Back to Children
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper"
      >
        <div className="parent-portal-container">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            {/* Hero Section */}
            <div className="parent-dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="parent-header-icon-wrapper"
                    >
                      <FaUserGraduate />
                    </motion.div>
                    <div className="parent-header-title-section">
                      <h1 className="parent-header-title">
                        {child.fullName}
                      </h1>
                      <p className="parent-header-subtitle">
                        {child.course_id?.name} • Semester {child.currentSemester} • {getStatusLabel(child.status)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <Breadcrumb
                      items={[
                        { label: "Dashboard", path: "/dashboard/parent" },
                        { label: "My Children", path: "/dashboard/parent/children" },
                        {
                          label: child.fullName,
                          path: `/dashboard/parent/child/${childId}`,
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= QUICK STATS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <div className="row g-3 g-md-4">
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaGraduationCap}
                  label="Academic Status"
                  value={getStatusLabel(child.status)}
                  color={getStatusColor(child.status)}
                  gradient={getStatusGradient(child.status)}
                  subtitle="Current enrollment status"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaCalendarCheck}
                  label="Attendance Rate"
                  value={`${calculateAttendancePercentage()}%`}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle={`${attendance.length} sessions recorded`}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaRupeeSign}
                  label="Pending Fees"
                  value={fees ? `₹${(fees.totalFee - fees.paidAmount).toLocaleString()}` : "--"}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle={fees ? `Total: ₹${fees.totalFee.toLocaleString()}` : "Fee information unavailable"}
                />
              </div>
            </div>
          </motion.div>

          {/* ================= TABS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="parent-tabs-container">
              <div className="parent-tabs-header">
                <TabButton
                  icon={<FaUser />}
                  label="Profile"
                  isActive={activeTab === "profile"}
                  onClick={() => handleTabChange("profile")}
                />
                <TabButton
                  icon={<FaCalendarCheck />}
                  label="Attendance"
                  isActive={activeTab === "attendance"}
                  onClick={() => handleTabChange("attendance")}
                />
                <TabButton
                  icon={<FaRupeeSign />}
                  label="Fees & Payments"
                  isActive={activeTab === "fees"}
                  onClick={() => handleTabChange("fees")}
                />
              </div>

              <div className="parent-tab-content">
                <AnimatePresence mode="wait">
                  {/* Profile Tab */}
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="row g-3 g-md-4">
                        <div className="col-12 col-lg-6">
                          <ProfileCard
                            title="Personal Information"
                            icon={<FaUser />}
                            color={BRAND_COLORS.primary.main}
                          >
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaUser />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Full Name</div>
                                <div className="parent-profile-value">{child.fullName}</div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaEnvelope />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Email Address</div>
                                <div className="parent-profile-value">
                                  <a href={`mailto:${child.email}`} className="text-decoration-none">
                                    {child.email}
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaPhone />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Mobile Number</div>
                                <div className="parent-profile-value">
                                  <a href={`tel:${child.mobileNumber}`} className="text-decoration-none">
                                    {child.mobileNumber}
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaCalendarCheck />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Date of Birth</div>
                                <div className="parent-profile-value">
                                  {new Date(child.dateOfBirth).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </ProfileCard>
                        </div>

                        <div className="col-12 col-lg-6">
                          <ProfileCard
                            title="Academic Details"
                            icon={<FaGraduationCap />}
                            color={BRAND_COLORS.success.main}
                          >
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaGraduationCap />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Course</div>
                                <div className="parent-profile-value">{child.course_id?.name}</div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaSchool />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Department</div>
                                <div className="parent-profile-value">{child.department_id?.name}</div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaIdCard />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Current Semester</div>
                                <div className="parent-profile-value">{child.currentSemester}</div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaCalendarCheck />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Admission Year</div>
                                <div className="parent-profile-value">{child.admissionYear}</div>
                              </div>
                            </div>
                          </ProfileCard>
                        </div>

                        <div className="col-12 col-lg-6">
                          <ProfileCard
                            title="Address Information"
                            icon={<FaMapMarkerAlt />}
                            color={BRAND_COLORS.info.main}
                          >
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaMapMarkerAlt />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Address</div>
                                <div className="parent-profile-value">
                                  {child.addressLine}<br />
                                  {child.city}, {child.state} - {child.pincode}
                                </div>
                              </div>
                            </div>
                          </ProfileCard>
                        </div>

                        <div className="col-12 col-lg-6">
                          <ProfileCard
                            title="Family Information"
                            icon={<FaUsers />}
                            color={BRAND_COLORS.warning.main}
                          >
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaUser />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Father's Name</div>
                                <div className="parent-profile-value">
                                  {child.fatherName}
                                  {child.fatherMobile && (
                                    <span className="ms-2">
                                      <a href={`tel:${child.fatherMobile}`} className="text-decoration-none">
                                        <FaPhone className="me-1" />
                                        {child.fatherMobile}
                                      </a>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="parent-profile-item">
                              <div className="parent-profile-icon">
                                <FaUser />
                              </div>
                              <div className="parent-profile-content">
                                <div className="parent-profile-label">Mother's Name</div>
                                <div className="parent-profile-value">
                                  {child.motherName}
                                  {child.motherMobile && (
                                    <span className="ms-2">
                                      <a href={`tel:${child.motherMobile}`} className="text-decoration-none">
                                        <FaPhone className="me-1" />
                                        {child.motherMobile}
                                      </a>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </ProfileCard>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Attendance Tab */}
                  {activeTab === "attendance" && (
                    <motion.div
                      key="attendance"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="parent-attendance-chart">
                        <div className="parent-chart-header">
                          <div>
                            <h3 className="parent-chart-title">Attendance Overview</h3>
                            <p className="text-muted mb-0">Track your child's attendance performance</p>
                          </div>
                          <div className="parent-chart-stats">
                            <div className="parent-chart-stat">
                              <div className="parent-chart-value">{calculateAttendancePercentage()}%</div>
                              <div className="parent-chart-label">Overall Rate</div>
                            </div>
                            <div className="parent-chart-stat">
                              <div className="parent-chart-value">{attendance.length}</div>
                              <div className="parent-chart-label">Total Sessions</div>
                            </div>
                            <div className="parent-chart-stat">
                              <div className="parent-chart-value">
                                {attendance.filter(r => r.status === 'PRESENT').length}
                              </div>
                              <div className="parent-chart-label">Present</div>
                            </div>
                          </div>
                        </div>

                        {attendance.length === 0 ? (
                          <EmptyState
                            icon={<FaCalendarCheck style={{ color: BRAND_COLORS.info.main }} />}
                            title="No Attendance Records"
                            message="Attendance data will appear here once classes begin."
                            success={false}
                          />
                        ) : (
                          <div className="parent-table-responsive">
                            <table className="parent-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Subject</th>
                                  <th>Status</th>
                                  <th>Session Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attendance.map((record, idx) => (
                                  <motion.tr
                                    key={idx}
                                    variants={fadeInVariants}
                                    custom={idx}
                                    initial="hidden"
                                    animate="visible"
                                  >
                                    <td>{new Date(record.date).toLocaleDateString()}</td>
                                    <td>{record.subject_id?.name || "N/A"}</td>
                                    <td>
                                      <span className={`parent-status-badge ${
                                        record.status === 'PRESENT' ? 'parent-status-approved' : 'parent-status-rejected'
                                      }`}>
                                        {record.status === 'PRESENT' ? (
                                          <><FaCheckCircle /> Present</>
                                        ) : (
                                          <><FaTimesCircle /> Absent</>
                                        )}
                                      </span>
                                    </td>
                                    <td>{record.session_type || "Regular"}</td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Fees Tab */}
                  {activeTab === "fees" && (
                    <motion.div
                      key="fees"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {!fees ? (
                        <EmptyState
                          icon={<FaRupeeSign style={{ color: BRAND_COLORS.warning.main }} />}
                          title="Fee Information Not Available"
                          message="Fee details will be displayed here once processed."
                          success={false}
                        />
                      ) : (
                        <div className="row g-3 g-md-4">
                          <div className="col-12 col-lg-6">
                            <FeeCard
                              title="Fee Summary"
                              icon={<FaRupeeSign />}
                              color={BRAND_COLORS.primary.main}
                            >
                              <div className="parent-fee-item">
                                <div className="parent-fee-icon">
                                  <FaFileAlt />
                                </div>
                                <div>
                                  <div className="parent-fee-title">Total Fee</div>
                                  <div className="parent-fee-amount">₹{fees.totalFee?.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="parent-fee-item">
                                <div className="parent-fee-icon">
                                  <FaCheckCircle />
                                </div>
                                <div>
                                  <div className="parent-fee-title">Paid Amount</div>
                                  <div className="parent-fee-amount text-success">₹{fees.paidAmount?.toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="parent-fee-item">
                                <div className="parent-fee-icon">
                                  <FaClock />
                                </div>
                                <div>
                                  <div className="parent-fee-title">Pending Amount</div>
                                  <div className="parent-fee-amount text-warning">
                                    ₹{(fees.totalFee - fees.paidAmount)?.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </FeeCard>
                          </div>

                          <div className="col-12 col-lg-6">
                            <FeeCard
                              title="Payment Installments"
                              icon={<FaCreditCard />}
                              color={BRAND_COLORS.info.main}
                            >
                              <div className="space-y-3">
                                {fees.installments?.map((installment, idx) => (
                                  <motion.div
                                    key={idx}
                                    className="p-3 bg-light rounded-lg"
                                    variants={fadeInVariants}
                                    custom={idx}
                                    initial="hidden"
                                    animate="visible"
                                  >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <h6 className="mb-0">{installment.name}</h6>
                                      <span className={`parent-status-badge ${
                                        installment.status === 'PAID' ? 'parent-status-approved' :
                                        installment.status === 'PENDING' ? 'parent-status-pending' :
                                        'parent-status-secondary'
                                      }`}>
                                        {installment.status}
                                      </span>
                                    </div>
                                    <div className="d-flex justify-content-between text-sm">
                                      <span>₹{installment.amount?.toLocaleString()}</span>
                                      <span className="text-muted">
                                        Due: {new Date(installment.dueDate).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </FeeCard>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Back Button */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="mt-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="parent-btn-outline"
              onClick={() => navigate("/dashboard/parent/children")}
            >
              <FaArrowLeft className="me-2" />
              Back to Children
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= TAB BUTTON ================= */
function TabButton({ icon, label, isActive, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`parent-tab-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon: Icon, label, value, color, gradient, subtitle }) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)' }}
      whileTap={{ scale: 0.98 }}
      className="parent-stat-card"
      tabIndex={0}
      role="region"
      aria-label={`${label}: ${value}`}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.outline = 'none';
      }}
    >
      <div className="parent-stat-card-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div className="parent-stat-card-content">
        <div className="parent-card-label">{label}</div>
        <div className="parent-card-value">{value}</div>
        {subtitle && <div className="parent-card-subtitle">{subtitle}</div>}
      </div>
    </motion.div>
  );
}

/* ================= PROFILE CARD ================= */
function ProfileCard({ title, icon, color, children }) {
  return (
    <div className="parent-profile-card">
      <div className="parent-profile-header">
        <h3 className="parent-profile-title">
          <span className="me-2" style={{ color: 'white', fontSize: '1.1rem' }}>{icon}</span>
          {title}
        </h3>
      </div>
      <div className="parent-profile-body">
        {children}
      </div>
    </div>
  );
}

/* ================= FEE CARD ================= */
function FeeCard({ title, icon, color, children }) {
  return (
    <div className="parent-fee-card">
      <div className="parent-fee-header">
        <div className="parent-fee-icon" style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <h3 className="parent-fee-title">{title}</h3>
        </div>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div className="parent-empty-state">
      <div className="parent-empty-icon" style={{ opacity: success ? 0.9 : 0.6, color: success ? BRAND_COLORS.success.main : '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="parent-empty-title">{title}</h4>
      <p className="parent-empty-message">{message}</p>
    </div>
  );
}
