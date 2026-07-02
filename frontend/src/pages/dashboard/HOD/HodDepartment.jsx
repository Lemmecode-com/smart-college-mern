import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaLayerGroup,
  FaGraduationCap,
  FaUsers,
  FaArrowLeft,
  FaChalkboardTeacher,
  FaUserTie,
  FaIdBadge,
  FaPhone,
  FaEnvelope
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
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

export default function HodDepartment() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartment();
  }, []);

  const fetchDepartment = async () => {
    try {
      const res = await api.get("/hod/department");
      setDepartment(res.data?.data?.department || res.data?.department || res.data || null);
    } catch (error) {
      console.error("Error fetching department:", error);
      toast.error(error.response?.data?.message || "Failed to load department");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No department found.</p>
        <button className="btn btn-outline-primary mt-2" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                  <FaLayerGroup />
                </div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Department Information
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    {department.name} ({department.code})
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
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
                <FaArrowLeft /> Back
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="row g-4"
          >
            {/* ================= HOD DETAILS ================= */}
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
                    <FaChalkboardTeacher className="me-2" style={{ color: BRAND_COLORS.primary.main }} />
                    HOD Details
                  </h5>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      backgroundColor: `${BRAND_COLORS.primary.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BRAND_COLORS.primary.main,
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      <FaUserTie />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                        {department.hod_id?.name || "N/A"}
                      </h4>
                      <p className="text-muted mb-0">{department.hod_id?.employeeId || "N/A"}</p>
                    </div>
                  </div>
                  {department.hod_id?.email && (
                    <div className="mb-3">
                      <FaEnvelope className="me-2 text-muted" />
                      {department.hod_id.email}
                    </div>
                  )}
                  {department.hod_id?.mobileNumber && (
                    <div className="mb-3">
                      <FaPhone className="me-2 text-muted" />
                      {department.hod_id.mobileNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ================= TEACHERS ================= */}
            <div className="col-md-6">
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                    <FaUsers className="me-2" style={{ color: BRAND_COLORS.success.main }} />
                    Teachers ({department.teachers?.length || 0})
                  </h5>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {department.teachers?.length > 0 ? (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {department.teachers.map((teacher, index) => (
                        <motion.div
                          key={teacher._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="d-flex align-items-center gap-3 mb-3"
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            backgroundColor: BRAND_COLORS.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            flexShrink: 0
                          }}>
                            {teacher.name?.charAt(0).toUpperCase() || "T"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {teacher.name}
                            </div>
                            <small className="text-muted">{teacher.employeeId}</small>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted mb-0">No teachers assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}