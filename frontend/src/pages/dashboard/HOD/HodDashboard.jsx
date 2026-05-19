import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";
import {
  FaChartBar,
  FaUserTie,
  FaChalkboardTeacher,
  FaUsers,
  FaCalendarAlt,
  FaLayerGroup,
  FaListUl,
  FaInfoCircle,
  FaClipboardList,
  FaUser,
  FaStar,
  FaArrowRight,
  FaClock,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }
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

const HodDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHodDashboard();
  }, []);

  const fetchHodDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hod/dashboard");
      setDashboardData(response.data);
    } catch (error) {
      console.error("HOD Dashboard error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load HOD dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading HOD Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <p className="text-muted">No data available</p>
        </div>
      </div>
    );
  }

  const stats = [
    { icon: <FaUsers />, label: "Teachers", value: dashboardData.stats?.teachers || 0, color: BRAND_COLORS.primary.main, bg: `${BRAND_COLORS.primary.main}15` },
    { icon: <FaCalendarAlt />, label: "Timetables", value: dashboardData.stats?.timetables || 0, color: BRAND_COLORS.info.main, bg: `${BRAND_COLORS.info.main}15` },
    { icon: <FaChalkboardTeacher />, label: "Classes", value: "Active", color: BRAND_COLORS.success.main, bg: `${BRAND_COLORS.success.main}15` },
    { icon: <FaClipboardList />, label: "Approvals", value: "Pending", color: BRAND_COLORS.warning.main, bg: `${BRAND_COLORS.warning.main}15` },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '1.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '2rem',
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            <div style={{
              padding: '2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  flexShrink: 0,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                }}>
                  <FaUserTie />
                </div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    HOD Dashboard
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Managing {dashboardData.department?.name || "Department"}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/hod/profile')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaUser /> View Profile
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ================= STATS CARDS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="row g-4 mb-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={fadeInVariants}
                custom={index}
                initial="hidden"
                animate="visible"
                className="col-md-3"
              >
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}>
                  <div style={{ padding: '1.75rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      backgroundColor: stat.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.color,
                      fontSize: '1.5rem',
                      marginBottom: '1rem'
                    }}>
                      {stat.icon}
                    </div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      {stat.value}
                    </h3>
                    <p style={{
                      margin: '0.25rem 0 0 0',
                      color: '#64748b',
                      fontSize: '0.95rem'
                    }}>
                      {stat.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ================= QUICK ACTIONS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="row g-4 mb-4"
          >
            <div className="col-md-4">
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    <FaStar className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                    Quick Actions
                  </h5>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div className="d-grid gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-lg"
                      style={{
                        background: BRAND_COLORS.primary.gradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem'
                      }}
                      onClick={() => navigate("/timetable/create")}
                    >
                      <span><FaCalendarAlt className="me-2" /> Create Timetable</span>
                      <FaArrowRight />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-lg"
                      style={{
                        background: BRAND_COLORS.info.gradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem'
                      }}
                      onClick={() => navigate("/hod/teachers")}
                    >
                      <span><FaUsers className="me-2" /> View Teachers</span>
                      <FaArrowRight />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-lg"
                      style={{
                        background: BRAND_COLORS.info.gradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem'
                      }}
                      onClick={() => navigate("/hod/department")}
                    >
                      <span><FaLayerGroup className="me-2" /> Department Info</span>
                      <FaArrowRight />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RECENT TIMETABLES ================= */}
            <div className="col-md-8">
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    <FaListUl className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                    Recent Timetables
                  </h5>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigate("/timetable/list")}
                  >
                    View All
                  </motion.button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {dashboardData.recentTimetables && dashboardData.recentTimetables.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Name</th>
                            <th>Semester</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.recentTimetables.map((timetable, index) => (
                            <motion.tr
                              key={timetable._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <td>
                                <strong>{timetable.name}</strong>
                                <div className="text-muted small">{timetable.academicYear}</div>
                              </td>
                              <td>Semester {timetable.semester}</td>
                              <td>
                                <span className={`badge bg-${timetable.status === "PUBLISHED" ? "success" : timetable.status === "DRAFT" ? "warning" : "secondary"}`}>
                                  {timetable.status}
                                </span>
                              </td>
                              <td>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => navigate(`/timetable/${timetable._id}/weekly`)}
                                >
                                  <FaArrowRight />
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <FaCalendarAlt style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                      <p className="text-muted mb-0">No recent timetables</p>
                      <button
                        className="btn btn-outline-primary mt-3"
                        onClick={() => navigate("/timetable/create")}
                      >
                        Create First Timetable
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= DEPARTMENT INFO ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="row g-4"
          >
            <div className="col-md-6">
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    <FaLayerGroup className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                    Department Information
                  </h5>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div className="row g-3">
                    <div className="col-6">
                      <p className="mb-1 text-muted small">Department Name</p>
                      <p className="mb-0 fw-bold fs-5">{dashboardData.department?.name || "N/A"}</p>
                    </div>
                    <div className="col-6">
                      <p className="mb-1 text-muted small">Department Code</p>
                      <p className="mb-0 fw-bold fs-5">{dashboardData.department?.code || "N/A"}</p>
                    </div>
                    <div className="col-6">
                      <p className="mb-1 text-muted small">HOD Name</p>
                      <p className="mb-0 fw-bold">{dashboardData.department?.hod_id?.name || "N/A"}</p>
                    </div>
                    <div className="col-6">
                      <p className="mb-1 text-muted small">Employee ID</p>
                      <p className="mb-0">{dashboardData.department?.hod_id?.employeeId || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    <FaInfoCircle className="me-2" style={{ color: BRAND_COLORS.warning.main }} />
                    About HOD Role
                  </h5>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <p style={{ color: '#475569', lineHeight: 1.7 }}>
                    As the Head of Department, you have authority to manage timetables, 
                    view teacher information, and oversee academic activities within your department.
                  </p>
                  <ul style={{ color: '#64748b', paddingLeft: '1.25rem' }}>
                    <li>Creating and managing department timetables</li>
                    <li>Viewing teacher profiles and information</li>
                    <li>Overseeing class schedules and allocations</li>
                    <li>Ensuring academic compliance within your department</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HodDashboard;