import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { Container, Row, Col } from "react-bootstrap";
import {
  FaBuilding,
  FaCalendarAlt,
  FaGraduationCap,
  FaArrowLeft,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaInfoCircle,
  FaUserTie,
  FaBookOpen,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Breadcrumb from "../../../components/Breadcrumb";

/* ==========================================================================
   Design tokens — aligned with NOVAA ERP sidebar/app palette.
   Primary: #1a4b6d → #0f3a4a
   Accent : #3db5e6
   ========================================================================== */
const T = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  accent: "#3db5e6",
  accentLight: "#4fc3f7",
  bg: "#f6f7f9",
  surface: "#ffffff",
  border: "#e6e8ec",
  text: "#1f2530",
  textMuted: "#6b7280",
  success: "#157a4a",
  successBg: "#e3f6ec",
  inactive: "#6b7280",
  inactiveBg: "#eef0f2",
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 7,
  shadow: "0 1px 2px rgba(20,27,41,0.04), 0 2px 8px rgba(20,27,41,0.05)",
  shadowHover: "0 4px 12px rgba(20,27,41,0.08)",
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const s = {
  page: { background: T.bg, minHeight: "100vh", color: T.text, fontFamily: T.font },
  backBtn: (hover) => ({
    border: `1px solid ${hover ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)"}`,
    background: hover ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
    color: "#fff",
    borderRadius: T.radiusSm,
    padding: "0.5rem 1rem",
    fontWeight: 500,
    fontSize: "0.875rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
  }),
  header: {
    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
    border: `1px solid ${T.primary}30`,
    borderRadius: T.radiusLg,
    boxShadow: `0 4px 12px ${T.primary}25`,
    padding: "1.5rem 1.75rem",
    position: "relative",
    overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentLight} 100%)`,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: T.radiusMd,
    background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.35rem",
    flexShrink: 0,
    boxShadow: `0 2px 8px rgba(61,181,230,0.35)`,
  },
  title: { fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.25 },
  codeBadge: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    borderRadius: T.radiusSm,
    padding: "0.15rem 0.5rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.2)",
  },
  chip: (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.28rem 0.7rem",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    background: bg,
    color,
  }),
  chipDot: (color) => ({ width: 6, height: 6, borderRadius: "50%", background: color }),
  kpi: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusMd,
    boxShadow: T.shadow,
    padding: "1.1rem 1.25rem",
    display: "flex",
    alignItems: "center",
    gap: "0.9rem",
    height: "100%",
    transition: "all 0.25s ease",
    cursor: "default",
  },
  kpiIcon: (bg, color) => ({
    width: 42,
    height: 42,
    borderRadius: T.radiusSm,
    background: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.05rem",
    flexShrink: 0,
  }),
  kpiValue: { fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.1, color: T.text },
  kpiLabel: { fontSize: "0.76rem", color: T.textMuted, fontWeight: 500 },
  card: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    boxShadow: T.shadow,
    height: "100%",
    transition: "box-shadow 0.2s ease",
  },
  cardHeader: {
    padding: "1.1rem 1.35rem",
    borderBottom: `1px solid ${T.border}`,
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    fontWeight: 600,
    fontSize: "0.95rem",
    color: T.text,
  },
  cardBody: { padding: "1.35rem" },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem 1.5rem" },
  detailLabel: {
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: T.textMuted,
    marginBottom: "0.3rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  detailValue: (muted) => ({
    fontSize: "0.93rem",
    color: muted ? T.textMuted : T.text,
    fontWeight: muted ? 400 : 500,
    fontStyle: muted ? "italic" : "normal",
    lineHeight: 1.45,
  }),
  avatar: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    flexShrink: 0,
    boxShadow: `0 2px 6px ${T.primary}30`,
  },
  hodName: { fontWeight: 600, fontSize: "0.92rem", color: T.text },
  hodEmail: { fontSize: "0.8rem", color: T.textMuted },
  empty: {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    padding: "0.85rem",
    border: `1px dashed ${T.border}`,
    borderRadius: T.radiusSm,
    color: T.textMuted,
    fontSize: "0.85rem",
  },
  pill: {
    display: "inline-block",
    padding: "0.35rem 0.75rem",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 500,
    background: `linear-gradient(135deg, ${T.primary}12 0%, ${T.accent}12 100%)`,
    color: T.primary,
    border: `1px solid ${T.primary}20`,
    transition: "all 0.2s ease",
  },
};

export default function ViewDepartment() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backHover, setBackHover] = useState(false);
  const [teacherCount, setTeacherCount] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL")
    return <Navigate to="/dashboard" replace />;

  /* ================= FETCH DEPARTMENT ================= */
  const fetchDepartment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/departments/${id}`);
      setDepartment(res.data.department);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Error fetching department:", statusCode, errorCode);

      setError({
        message: backendMessage || "Failed to load department details.",
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  useEffect(() => {
    let isCancelled = false;
    const fetchTeacherCount = async () => {
      try {
        const res = await api.get("/teachers", {
          params: { department_id: id },
        });
        if (!isCancelled) {
          setTeacherCount(Array.isArray(res.data) ? res.data.length : 0);
        }
      } catch {
        if (!isCancelled) {
          setTeacherCount(0);
        }
      }
    };

    if (id) {
      fetchTeacherCount();
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (loading) return <Loading fullScreen size="lg" text="Loading department..." />;
  if (error)
    return (
      <ApiError
        title="Department Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchDepartment}
        onGoBack={() => navigate(-1)}
      />
    );
  if (!department)
    return <div className="text-center text-danger mt-4">Department not found</div>;

  const {
    name,
    code,
    type,
    status,
    startYear,
    hod_id,
    sanctionedFacultyCount,
    sanctionedStudentIntake,
    programsOffered = [],
  } = department;

  const isActive = status === "ACTIVE";

  const kpis = [
    {
      icon: <FaChalkboardTeacher />,
      value: teacherCount ?? 0,
      label: "Teacher Count",
      tint: `linear-gradient(135deg, ${T.primary}15 0%, ${T.primaryDark}15 100%)`,
      color: T.primary,
    },
    {
      icon: <FaGraduationCap />,
      value: sanctionedStudentIntake ?? 0,
      label: "Student Intake",
      tint: `linear-gradient(135deg, ${T.accent}15 0%, ${T.accentLight}15 100%)`,
      color: T.accent,
    },
    {
      icon: <FaLayerGroup />,
      value: programsOffered.length,
      label: "Programs Offered",
      tint: `linear-gradient(135deg, #fdf0e3 0%, #fef3e2 100%)`,
      color: "#b56a1f",
    },
    {
      icon: <FaCalendarAlt />,
      value: startYear || "—",
      label: "Established Year",
      tint: T.inactiveBg,
      color: T.textMuted,
    },
  ];

  return (
    <div style={s.page}>
      <Container fluid className="p-4 erp-viewport-min-100">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Departments", path: "/departments" },
            { label: name || "Department Details" },
          ]}
        />

        {/* Page header */}
        <div
          style={{
            ...s.header,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            marginTop: "0.5rem",
          }}
        >
          <div style={s.headerAccentBar} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <div style={s.headerIcon}>
              <FaBuilding />
            </div>
            <div>
              <h2 style={s.title}>{name}</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                }}
              >
                <span style={s.codeBadge}>{code}</span>
                <span style={s.chip("rgba(255,255,255,0.18)", "#fff")}>{type}</span>
                <span
                  style={s.chip(
                    isActive ? "rgba(39,174,96,0.25)" : "rgba(255,255,255,0.12)",
                    isActive ? "#4ade80" : "rgba(255,255,255,0.7)"
                  )}
                >
                  <span style={s.chipDot(isActive ? "#4ade80" : "rgba(255,255,255,0.5)")} />
                  {status}
                </span>
              </div>
            </div>
          </div>
          <button
            style={s.backBtn(backHover)}
            onMouseEnter={() => setBackHover(true)}
            onMouseLeave={() => setBackHover(false)}
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft size={13} /> Back
          </button>
        </div>

        {/* KPI strip */}
        <Row xs={2} md={4} className="g-3 mb-4">
          {kpis.map((kpi, idx) => (
            <Col key={idx}>
              <div
                style={s.kpi}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = T.shadowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = T.shadow)}
              >
                <div style={s.kpiIcon(kpi.tint, kpi.color)}>{kpi.icon}</div>
                <div>
                  <div style={s.kpiValue}>{kpi.value}</div>
                  <div style={s.kpiLabel}>{kpi.label}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <Row className="g-4">
          {/* Department information */}
          <Col lg={7}>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <FaInfoCircle color={T.accent} />
                Department Information
              </div>
              <div style={s.cardBody}>
                <div style={s.detailGrid}>
                  <div>
                    <div style={s.detailLabel}>Type</div>
                    <div style={s.detailValue(false)}>{type || "—"}</div>
                  </div>
                  <div>
                    <div style={s.detailLabel}>Established Year</div>
                    <div style={s.detailValue(false)}>{startYear || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* HOD + Programs */}
          <Col lg={5}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <FaUserTie color={T.primary} />
                  Head of Department
                </div>
                <div style={s.cardBody}>
                  {hod_id?.name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                      <div style={s.avatar}>{getInitials(hod_id.name)}</div>
                      <div>
                        <div style={s.hodName}>{hod_id.name}</div>
                        <div style={s.hodEmail}>{hod_id.email}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={s.empty}>
                      <FaUserTie /> Not Assigned
                    </div>
                  )}
                </div>
              </div>

              <div style={s.card}>
                <div style={s.cardHeader}>
                  <FaBookOpen color={"#b56a1f"} />
                  Programs Offered
                </div>
                <div style={s.cardBody}>
                  {programsOffered.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {programsOffered.map((prog, idx) => (
                        <span key={idx} style={s.pill}>
                          {prog}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={s.empty}>
                      <FaBookOpen /> No programs added yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
