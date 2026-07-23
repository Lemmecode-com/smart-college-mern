import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
import {
  FaUser,
  FaEnvelope,
  FaUserFriends,
  FaCheckCircle,
  FaKey,
  FaArrowLeft,
  FaCalendarAlt,
} from "react-icons/fa";
import "./ViewStaffProfile.css";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
  success: { main: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
  info: { main: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
  warning: { main: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
  danger: { main: "#dc3545", gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" },
};

export default function ViewParent() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === "COLLEGE_ADMIN";
  }, [currentUser]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/college/parents/${userId}`);
      const raw = res.data?.data || res.data;
      logger.log("[ViewParent] raw profile keys:", raw ? Object.keys(raw) : "null/undefined");
      setProfile(raw || {});
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load parent profile";

      logger.error("Error fetching parent profile:", statusCode, errorCode);
      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId, fetchProfile]);

  if (loading) return <Loading />;
  if (error)
    return (
      <ApiError
        title="Parent Profile Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchProfile}
        onGoBack={() => navigate(-1)}
      />
    );
  if (!profile) return <div className="text-center p-4">Profile not found</div>;

  return (
    <div className="dashboard-wrapper" style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <Card className="border-0 shadow-sm" style={{ borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ height: "8px", background: BRAND_COLORS.primary.gradient }} />
            <Card.Body className="p-4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: BRAND_COLORS.primary.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "2rem",
                      boxShadow: "0 8px 20px rgba(26, 75, 109, 0.25)",
                    }}
                  >
                    <FaUser />
                  </motion.div>
                  <div>
                    <h2 style={{ color: BRAND_COLORS.primary.main, margin: 0, fontWeight: 800, fontSize: "1.75rem" }}>
                      {profile.name || "Unnamed Parent"}
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <Badge bg="light" text="dark" style={{ fontWeight: 600, fontSize: "0.85rem", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        {profile.relation?.replace("_", " ") || "Guardian"}
                      </Badge>
                      <span className="text-muted" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                        • ID: {profile.id}
                      </span>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="d-flex gap-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline-secondary"
                        onClick={() => navigate("/college/parents")}
                        style={{ borderRadius: "10px", padding: "0.6rem 1.2rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, borderWidth: "2px" }}
                      >
                        <FaArrowLeft /> Back
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => navigate(`/college/parents/edit/${profile.id}`)}
                        style={{
                          background: BRAND_COLORS.primary.gradient,
                          border: "none",
                          borderRadius: "10px",
                          padding: "0.6rem 1.5rem",
                          fontWeight: 600,
                          boxShadow: "0 4px 12px rgba(26, 75, 109, 0.3)",
                        }}
                      >
                        Edit Profile
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        {/* Details Grid */}
        <Row className="g-4">
          {/* Profile & Contact Info */}
          <Col md={7}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "16px" }}>
                <Card.Header style={{ background: "transparent", borderBottom: "1px solid #f0f0f0", padding: "1.25rem 1.5rem", fontWeight: 700, color: BRAND_COLORS.primary.main, fontSize: "1.1rem" }}>
                  Profile & Contact Details
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-4">
                    <Col xs={12} sm={6}>
                      <InfoItem icon={<FaUser />} color={BRAND_COLORS.info} label="Full Name" value={profile.name || "-"} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <InfoItem icon={<FaEnvelope />} color={BRAND_COLORS.info} label="Email Address" value={profile.email || "-"} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <InfoItem icon={<FaUserFriends />} color={BRAND_COLORS.primary} label="Relationship" value={profile.relation?.replace("_", " ") || "-"} />
                    </Col>
                    <Col xs={12} sm={6}>
                      <InfoItem icon={<FaCalendarAlt />} color={BRAND_COLORS.warning} label="Joined Date" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "-"} />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>

          {/* Account Security */}
          <Col md={5}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "16px" }}>
                <Card.Header style={{ background: "transparent", borderBottom: "1px solid #f0f0f0", padding: "1.25rem 1.5rem", fontWeight: 700, color: BRAND_COLORS.primary.main, fontSize: "1.1rem" }}>
                  Account Security
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex flex-column gap-4">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: profile.isActive ? BRAND_COLORS.success.gradient : BRAND_COLORS.danger.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.2rem"
                      }}>
                        {profile.isActive ? <FaCheckCircle /> : <FaKey />}
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Status</div>
                        <div className="fw-bold" style={{ fontSize: "1.15rem", color: profile.isActive ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main }}>
                          {profile.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: "1px", background: "#f0f0f0" }} />

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "12px",
                        background: profile.mustChangePassword ? BRAND_COLORS.warning.gradient : BRAND_COLORS.success.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.2rem"
                      }}>
                        <FaKey />
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Password Status</div>
                        {profile.mustChangePassword ? (
                          <Badge bg="warning" text="dark" className="mt-1" style={{ fontWeight: 600, fontSize: "0.85rem", padding: "6px 10px" }}>
                            Change Required
                          </Badge>
                        ) : (
                          <div className="fw-bold" style={{ fontSize: "1rem", color: BRAND_COLORS.success.main, marginTop: "4px" }}>
                            Up to date
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Linked Students Section */}
        {profile.linkedStudents && profile.linkedStudents.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-4"
          >
            <Card className="border-0 shadow-sm" style={{ borderRadius: "16px", overflow: "hidden" }}>
              <Card.Header style={{ background: "transparent", borderBottom: "1px solid #f0f0f0", padding: "1.25rem 1.5rem" }}>
                <h4 className="mb-0" style={{ color: BRAND_COLORS.primary.main, fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FaUserFriends style={{ color: BRAND_COLORS.accent?.main || BRAND_COLORS.info.main }} />
                  Linked Students 
                  <Badge bg="light" text="dark" style={{ fontWeight: 700, fontSize: "0.85rem", padding: "4px 10px", borderRadius: "20px" }}>
                    {profile.linkedStudents.length}
                  </Badge>
                </h4>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                    <thead>
                      <tr>
                        {["Student Name", "Email", "Department", "Course", "Semester", "Status"].map((header) => (
                          <th
                            key={header}
                            style={{
                              padding: "14px 20px",
                              textAlign: "left",
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: BRAND_COLORS.primary.main,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              borderBottom: `2px solid ${BRAND_COLORS.primary.main}15`,
                              backgroundColor: "#fafbfc",
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profile.linkedStudents.map((student, index) => (
                        <tr 
                          key={student.id} 
                          style={{ transition: "background-color 0.2s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none", fontWeight: 600, color: BRAND_COLORS.primary.main }}>
                            {student.fullName}
                          </td>
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none", color: "#4a5568", fontSize: "0.95rem" }}>
                            {student.email}
                          </td>
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none", color: "#4a5568", fontSize: "0.95rem" }}>
                            {student.department || "-"}
                          </td>
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none", color: "#4a5568", fontSize: "0.95rem" }}>
                            {student.course || "-"}
                          </td>
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none", color: "#4a5568", fontSize: "0.95rem" }}>
                            {student.currentSemester ?? "-"}
                          </td>
                          <td style={{ padding: "16px 20px", borderBottom: index < profile.linkedStudents.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "5px 12px",
                                borderRadius: "20px",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                backgroundColor: (student.status === "APPROVED" || student.status === "ENROLLED") ? "#d4edda" : "#fff3cd",
                                color: (student.status === "APPROVED" || student.status === "ENROLLED") ? "#1e7e34" : "#856404",
                                border: `1px solid ${(student.status === "APPROVED" || student.status === "ENROLLED") ? "#28a745" : "#ffc107"}40`,
                              }}
                            >
                              {student.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </motion.div>
        )}
      </Container>
    </div>
  );
}

// Reusable inline-styled info item for cleaner JSX and consistent design
function InfoItem({ icon, color, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: color.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "1.1rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
          {label}
        </div>
        <div className="fw-bold" style={{ fontSize: "1.05rem", color: "#1a4b6d", wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}