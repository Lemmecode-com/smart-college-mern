import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUsers,
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaBriefcase,
  FaArrowLeft,
  FaSearch,
  FaUser
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
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

export default function HodTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hod/teachers");
      setTeachers(res.data || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error(error.response?.data?.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
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
                  <FaUsers />
                </div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Department Teachers
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    {filtered.length} teacher{filtered.length !== 1 ? "s" : ""} found
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

          {/* ================= SEARCH ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              marginBottom: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1.5rem' }}>
              <div className="input-group input-group-lg">
                <span className="input-group-text" style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <FaSearch style={{ color: BRAND_COLORS.primary.main }} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, or Employee ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* ================= TEACHERS GRID ================= */}
          {filtered.length === 0 ? (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                padding: '3rem'
              }}
              className="text-center"
            >
              <FaUserTie style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }} />
              <h4 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No teachers found</h4>
              <p className="text-muted">Try adjusting your search criteria</p>
            </motion.div>
          ) : (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              className="row g-4"
            >
              {filtered.map((teacher, index) => (
                <motion.div
                  key={teacher._id}
                  variants={fadeInVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  className="col-md-6 col-lg-4"
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: BRAND_COLORS.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        {teacher.name?.charAt(0).toUpperCase() || "T"}
                      </div>
                      <div>
                        <h5 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                          {teacher.name}
                        </h5>
                        <small className="text-muted">{teacher.employeeId}</small>
                      </div>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <div className="mb-3">
                        <FaEnvelope className="me-2 text-muted" />
                        <span style={{ color: '#1e293b' }}>{teacher.email}</span>
                      </div>
                      {teacher.phone && (
                        <div className="mb-3">
                          <FaPhone className="me-2 text-muted" />
                          <span style={{ color: '#1e293b' }}>{teacher.phone}</span>
                        </div>
                      )}
                      {teacher.specialization && (
                        <div className="mb-3">
                          <FaGraduationCap className="me-2 text-muted" />
                          <span style={{ color: '#1e293b' }}>{teacher.specialization}</span>
                        </div>
                      )}
                      {teacher.qualification && (
                        <div className="mb-0">
                          <FaBriefcase className="me-2 text-muted" />
                          <span style={{ color: '#1e293b' }}>{teacher.qualification}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}