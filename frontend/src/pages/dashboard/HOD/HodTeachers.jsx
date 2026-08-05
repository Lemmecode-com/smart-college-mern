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
  FaSearch
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Loading from "../../../components/Loading";
import PageHero from "../../../components/common/PageHero";

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

export default function HodTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hod/teachers");
      setTeachers(res.data || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load teachers";

      logger.error("Error fetching teachers:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

if (error) {
     return (
       <ApiError
         title="Teachers Loading Error"
         message={error.message}
         statusCode={error.statusCode}
         errorCode={error.errorCode}
         onRetry={fetchTeachers}
         onGoBack={() => navigate("/hod/dashboard")}
       />
     );
   }

   const filtered = teachers.filter(
     (t) =>
       t.name?.toLowerCase().includes(search.toLowerCase()) ||
       t.email?.toLowerCase().includes(search.toLowerCase()) ||
       t.employeeId?.toLowerCase().includes(search.toLowerCase())
   );

    return (
      <AnimatePresence mode="wait">
        <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="erp-page erp-viewport-min-100"
         style={{
           background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
           paddingTop: '1.5rem',
           paddingBottom: '2rem',
           paddingLeft: '1rem',
           paddingRight: '1rem'
         }}
       >
         <div className="erp-page-content">
          <PageHero
            icon={<FaUsers />}
            title="Department Teachers"
            description={`${filtered.length} teacher${filtered.length !== 1 ? "s" : ""} found`}
            onBack={() => navigate(-1)}
            backLabel="Back"
          />

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