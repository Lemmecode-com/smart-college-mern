import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaIdCard,
  FaUsers,
  FaGraduationCap,
  FaCheckCircle,
  FaHome,
  FaArrowLeft,
} from "react-icons/fa";
import "./ViewStaffProfile.css";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
  success: { main: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
  info: { main: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
  warning: { main: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
};

const ROLE_LABELS = {
  SUPER_ADMIN: "System Administrator",
  COLLEGE_ADMIN: "College Administrator",
  PRINCIPAL: "Principal",
  HOD: "Head of Department",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  ADMISSION_OFFICER: "Admission Officer",
  EXAM_COORDINATOR: "Exam Coordinator",
  PLATFORM_SUPPORT: "Platform Support",
};

const formatRole = (role) => {
  if (!role) return "Staff";
  return ROLE_LABELS[role] || role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getValue = (profile, field) => {
  const value = profile[field];
  if (value === undefined || value === null || value === "") return null;
  return value;
};

export default function ViewStaffProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const actualUserId = userId || currentUser?.id;

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
    if (!currentUser || !profile) return false;
    const profileUserId = profile.user_id?._id || profile.id;
    const isSelf = currentUser.id === profileUserId?.toString();
    const isCollegeAdmin = currentUser.role === "COLLEGE_ADMIN";
    return isSelf || isCollegeAdmin;
  }, [currentUser, profile]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff/profile/${actualUserId}`);
      const raw = res.data?.data || res.data;
      logger.log("[ViewStaffProfile] raw profile keys:", raw ? Object.keys(raw) : "null/undefined");
      logger.log("[ViewStaffProfile] profile data:", raw);
      setProfile(raw || {});
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load profile";

      logger.error("Error fetching staff profile:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  }, [actualUserId]);

  useEffect(() => {
    if (actualUserId) fetchProfile();
  }, [actualUserId, fetchProfile]);

  if (loading) return <Loading />;
  if (error) return (
    <ApiError
      title="Staff Profile Loading Error"
      message={error.message}
      statusCode={error.statusCode}
      errorCode={error.errorCode}
      onRetry={fetchProfile}
      onGoBack={() => navigate(-1)}
    />
  );
  if (!profile) return <div className="text-center p-4">Profile not found</div>;

  const profileUserId = profile.user_id || {};
  const userName = profileUserId.name || "Unnamed Staff";
  const userEmail = getValue(profileUserId, "email") || getValue(profile, "email") || "Not Provided";
  const userRole = formatRole(profileUserId.role || profile.role);
  const collegeName = profile.college_id?.name || getValue(profile, "collegeName") || "Unknown College";
  const collegeCode = profile.college_id?.code || getValue(profile, "collegeCode") || "";
  const isActive = profileUserId.isActive !== undefined ? profileUserId.isActive : profile.isActive;
  const statusLabel = isActive ? "Active" : "Inactive";
  const statusVariant = isActive ? "success" : "secondary";

  const mobileNumber = getValue(profile, "mobileNumber") || "Not Provided";
  const designation = getValue(profile, "designation") || "Not Provided";
  const employmentType = getValue(profile, "employmentType") || "Not Provided";
  const joiningDate = formatDate(getValue(profile, "joiningDate"));
  const gender = getValue(profile, "gender") || "Not Provided";
  const dateOfBirth = formatDate(getValue(profile, "dateOfBirth"));
  const bloodGroup = getValue(profile, "bloodGroup") || "Not Provided";
  const qualification = getValue(profile, "qualification") || "Not Provided";
  const experienceYears = getValue(profile, "experienceYears");
  const experienceText = experienceYears !== null ? `${experienceYears} yrs` : "Not Provided";

  const addressParts = [getValue(profile, "address"), getValue(profile, "city"), getValue(profile, "state"), getValue(profile, "pincode")].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "Not Provided";

  const emergencyContactName = getValue(profile, "emergencyContactName") || "Not Provided";
  const emergencyContactPhone = getValue(profile, "emergencyContactPhone");
  const emergencyRelation = getValue(profile, "emergencyRelation");
  const emergencySub = emergencyContactPhone ? `${emergencyContactPhone}${emergencyRelation ? ` (${emergencyRelation})` : ""}` : "";

  return (
    <div className="dashboard-wrapper erp-viewport-min-100">
      <Container fluid className="py-4">

        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: BRAND_COLORS.primary.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "2rem"
              }}>
                <FaUser />
              </div>
              <div>
                <h2 style={{ color: BRAND_COLORS.primary.main, margin: 0 }}>
                  {userName}
                </h2>
                <p className="text-muted mb-0">
                  {userRole} • {collegeName}
                  {collegeCode && <span className="text-muted"> ({collegeCode})</span>}
                </p>
                <Badge bg={statusVariant} className="mt-1">
                  <FaCheckCircle size={12} className="me-1" />
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </Col>

          <Col xs="auto">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={() => navigate("/college/staff")}
                style={{
                  background: "none",
                  border: "none",
                  color: BRAND_COLORS.primary.main,
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: "8px",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <FaArrowLeft /> Back
              </button>
              {canEdit && (
                <Button
                  variant="primary"
                  onClick={() => navigate(`/staff/profile/edit/${actualUserId}`)}
                  style={{
                    background: BRAND_COLORS.primary.gradient,
                    border: "none",
                    padding: "0.75rem 1.5rem",
                  }}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </Col>
        </Row>

        {/* Personal Information */}
        <div className="mb-3">
          <h5 className="text-muted text-uppercase fw-semibold" style={{ letterSpacing: "0.05em", fontSize: "0.85rem" }}>Personal Information</h5>
        </div>
        <Row className="g-4 mb-4">
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.info.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaUser size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Gender</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {gender}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.info.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaBirthdayCake size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Date of Birth</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {dateOfBirth || "Not Provided"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.info.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaIdCard size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Blood Group</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {bloodGroup}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.info.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaHome size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Address</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {fullAddress}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Contact Information */}
        <div className="mb-3">
          <h5 className="text-muted text-uppercase fw-semibold" style={{ letterSpacing: "0.05em", fontSize: "0.85rem" }}>Contact Information</h5>
        </div>
        <Row className="g-4 mb-4">
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.primary.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaEnvelope size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Email</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {userEmail}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.primary.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaPhone size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Mobile</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {mobileNumber}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.primary.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaUsers size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Emergency Contact</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {emergencyContactName}
                    </div>
                    {emergencySub && (
                      <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                        {emergencySub}
                      </div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Professional Information */}
        <div className="mb-3">
          <h5 className="text-muted text-uppercase fw-semibold" style={{ letterSpacing: "0.05em", fontSize: "0.85rem" }}>Professional Information</h5>
        </div>
        <Row className="g-4 mb-4">
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaBriefcase size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Designation</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {designation}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          {profile.department_id?.name && (
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
                <Card.Body>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <FaBuilding size={20} />
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.85rem" }}>Department</div>
                      <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                        {profile.department_id.name}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaCalendarAlt size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Joining Date</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {joiningDate || "Not Provided"}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaGraduationCap size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Qualification</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {qualification}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                      Experience: {experienceText}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaBuilding size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Employment Type</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {employmentType}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: BRAND_COLORS.warning.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                    <FaCheckCircle size={20} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Status</div>
                    <Badge bg={statusVariant} className="mt-1">
                      {statusLabel}
                    </Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
