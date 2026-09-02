import { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getMyResults } from "../../../api/results";
import { formatDate } from "../../../utils/format";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaFileAlt,
  FaArrowLeft,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaBook,
  FaLayerGroup,
  FaTrophy,
  FaInfoCircle,
  FaTable,
  FaCalendarAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
  "STUDENT_NOT_FOUND",
]);

// Unchanged brand palette — only the tokens below (spacing/radius/shadow)
// are new, purely presentational additions to keep the layout consistent.
const BRAND_COLORS = {
  primary: { main: "#1a4b6d" },
  success: { main: "#28a745" },
  danger: { main: "#dc3545" },
  warning: { main: "#ffc107" },
  info: { main: "#17a2b8" },
  secondary: { main: "#6c757d" },
};

// A small spacing/radius/shadow scale so every gap, corner, and elevation
// in the page is drawn from the same rhythm instead of one-off pixel values.
const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };
const SHADOW = {
  card: "0 8px 24px rgba(15, 23, 42, 0.07)",
  cardHover: "0 16px 36px rgba(15, 23, 42, 0.12)",
  banner: "0 10px 28px rgba(15, 58, 74, 0.28)",
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: "easeOut" },
  }),
};

const getSubjectStatusColor = (status) => {
  switch (status) {
    case "PASS":
      return { bg: `${BRAND_COLORS.success.main}15`, color: BRAND_COLORS.success.main };
    case "FAIL":
      return { bg: `${BRAND_COLORS.danger.main}15`, color: BRAND_COLORS.danger.main };
    case "INCOMPLETE":
      return { bg: `${BRAND_COLORS.warning.main}15`, color: BRAND_COLORS.warning.main };
    default:
      return { bg: "#f1f5f9", color: "#64748b" };
  }
};

// Shared table-cell style builders so the six near-identical header cells
// (and their body counterparts) collapse into one definition each.
const thStyle = (align = "left") => ({
  padding: `${SPACE.md}px ${SPACE.lg}px`,
  textAlign: align,
  fontWeight: 700,
  color: "#495057",
  background: "#f8f9fa",
  borderBottom: "2px solid #e9ecef",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
});

const tdStyle = (align = "left", emphasis = false) => ({
  padding: `${SPACE.md}px ${SPACE.lg}px`,
  borderBottom: "1px solid #e9ecef",
  textAlign: align,
  fontFamily: align === "right" ? "monospace" : undefined,
  fontWeight: emphasis ? 600 : 400,
});

export default function StudentResults() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const loadTimeoutRef = useRef(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  if (!user) {
    return null;
  }
  if (user.role !== "STUDENT") {
    return null;
  }

  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      logger.warn("Student results request timed out", {
        page: "StudentResults",
        role: user?.role,
      });
      setError({
        message: "Request timed out. Please check your connection and try again.",
        statusCode: 408,
        errorCode: undefined,
      });
      setLoading(false);
    }, 30000);

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyResults();
        setResults(Array.isArray(data) ? data : []);

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      } catch (err) {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Student results load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "StudentResults",
          role: user?.role,
        });

        if (AUTH_ERROR_CODES.has(errorCode)) {
          return;
        }

        setError({
          message:
            backendMessage ||
            "Failed to load your results. Please try again later.",
          statusCode,
          errorCode,
        });

        toast.error("Failed to load results. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Results..." />;
  }

  if (error) {
    return (
      <ApiError
        title="Results Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="student-results-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          paddingTop: SPACE.xl,
          paddingBottom: SPACE.xxl,
          paddingLeft: SPACE.lg,
          paddingRight: SPACE.lg,
        }}
        role="main"
        aria-label="My Results"
      >
        <a
          href="#results-content"
          className="sr-only sr-only-focusable"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Skip to results content
        </a>

        <div style={{ maxWidth: "1320px", margin: "0 auto" }} id="results-content">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/student/dashboard" },
              { label: "My Results" },
            ]}
          />

          <PageHeader resultCount={results.length} onRefresh={handleRetry} />

          {results.length === 0 ? (
            <EmptyState onGoBack={handleGoBack} />
          ) : (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{ display: "flex", flexDirection: "column", gap: SPACE.xl }}
            >
              {results.map((result, idx) => (
                <ResultCard key={result._id || idx} result={result} index={idx} />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PageHeader({ resultCount, onRefresh }) {
  return (
    <motion.div
      variants={fadeInVariants}
      custom={0}
      initial="hidden"
      animate="visible"
      style={{
        marginBottom: SPACE.xl,
        background: "linear-gradient(180deg, #0f3a4a, #134952)",
        borderRadius: RADIUS.xl,
        boxShadow: SHADOW.banner,
        padding: `${SPACE.xl}px ${SPACE.xxl}px`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: SPACE.lg,
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.lg }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            flexShrink: 0,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: RADIUS.lg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            color: "#4fc3f7",
          }}
        >
          <FaFileAlt />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 }}>
            My Results
          </h1>
          <p style={{ margin: "0.35rem 0 0", opacity: 0.8, fontSize: "0.95rem" }}>
            {resultCount > 0
              ? `${resultCount} published semester result${resultCount === 1 ? "" : "s"}`
              : "Your published semester results"}
          </p>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRefresh}
        style={{
          padding: "0.6rem 1.25rem",
          borderRadius: RADIUS.md,
          border: "1px solid rgba(255, 255, 255, 0.3)",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          color: "white",
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: SPACE.sm,
        }}
        aria-label="Refresh results"
      >
        <FaSync /> Refresh
      </motion.button>
    </motion.div>
  );
}

function EmptyState({ onGoBack }) {
  return (
    <motion.div
      variants={fadeInVariants}
      custom={1}
      initial="hidden"
      animate="visible"
      style={{
        background: "white",
        borderRadius: RADIUS.xl,
        boxShadow: SHADOW.card,
        padding: `${SPACE.xxxl}px ${SPACE.xxl}px`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "88px",
          height: "88px",
          margin: `0 auto ${SPACE.xl}px`,
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.25rem",
          color: "#94a3b8",
        }}
      >
        <FaFileAlt />
      </div>
      <h3 style={{ margin: `0 0 ${SPACE.sm}px`, color: "#1e293b", fontWeight: 700, fontSize: "1.4rem" }}>
        No published results yet
      </h3>
      <p style={{ color: "#64748b", margin: `0 0 ${SPACE.xl}px`, fontSize: "1rem", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
        Your semester results will appear here once they are published by the exam coordinator.
      </p>
      <button
        onClick={onGoBack}
        style={{
          padding: "0.75rem 2rem",
          background: "linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%)",
          color: "white",
          border: "none",
          borderRadius: RADIUS.md,
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: SPACE.sm,
        }}
      >
        <FaArrowLeft /> Back to Dashboard
      </button>
    </motion.div>
  );
}

function ResultCard({ result, index }) {
  const exam = result.exam_id || {};
  const course = result.course_id || {};

  return (
    <motion.div
      variants={fadeInVariants}
      custom={index * 0.1 + 0.1}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, boxShadow: SHADOW.cardHover }}
      style={{
        background: "white",
        borderRadius: RADIUS.xl,
        boxShadow: SHADOW.card,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          padding: `${SPACE.lg}px ${SPACE.xl}px`,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: SPACE.md,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.3rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: SPACE.sm,
            }}
          >
            <FaBook /> {exam.name || "Semester Result"}
          </h2>
          <p
            style={{
              margin: "0.4rem 0 0",
              opacity: 0.8,
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: SPACE.md,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <FaLayerGroup /> {course.name || course.code || "Course"}
            </span>
            <span>Semester {result.semester}</span>
            <span>Academic Year: {result.academicYear}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.md }}>
          <span
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "20px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "white",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            Published
          </span>
          <div
            style={{
              padding: "0.6rem 1.5rem",
              borderRadius: RADIUS.md,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "white",
              textAlign: "center",
              minWidth: "84px",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.75 }}>
              Overall
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              <FaTrophy /> {result.overallResult || "INCOMPLETE"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: `${SPACE.xl}px` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: SPACE.md,
            marginBottom: SPACE.xl,
          }}
        >
          <SummaryPill icon={<FaCheckCircle />} value={result.passedSubjects} label="Passed" color={BRAND_COLORS.success.main} />
          {result.failedSubjects > 0 && (
            <SummaryPill icon={<FaTimesCircle />} value={result.failedSubjects} label="Failed" color={BRAND_COLORS.danger.main} />
          )}
          {result.incompleteSubjects > 0 && (
            <SummaryPill icon={<FaInfoCircle />} value={result.incompleteSubjects} label="Incomplete" color={BRAND_COLORS.warning.main} />
          )}
          <SummaryPill icon={<FaBook />} value={result.totalSubjects} label="Total Subjects" color={BRAND_COLORS.secondary.main} />
          <SummaryPill icon={<FaCalendarAlt />} value={formatDate(result.publishedAt)} label="Published On" color={BRAND_COLORS.info.main} />
        </div>

        {result.subjects && result.subjects.length > 0 && (
          <SubjectsTable subjects={result.subjects} examName={exam.name} />
        )}

        <div
          style={{
            marginTop: SPACE.lg,
            paddingTop: SPACE.lg,
            borderTop: "1px solid #e2e8f0",
            fontSize: "0.8rem",
            color: "#94a3b8",
            display: "flex",
            gap: SPACE.xl,
            flexWrap: "wrap",
          }}
        >
          <span>Published: {formatDate(result.publishedAt)}</span>
          <span>Last Updated: {formatDate(result.updatedAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function SubjectsTable({ subjects, examName }) {
  return (
    <div>
      <h3
        style={{
          margin: `0 0 ${SPACE.md}px`,
          fontSize: "1.02rem",
          fontWeight: 600,
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          gap: SPACE.sm,
        }}
      >
        <FaTable /> Subject-wise Breakdown
      </h3>
      <div style={{ overflowX: "auto", borderRadius: RADIUS.sm, border: "1px solid #e9ecef" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}
          role="table"
          aria-label={`Subject-wise results for ${examName || "exam"}`}
        >
          <thead>
            <tr>
              <th style={thStyle("left")} scope="col">Subject</th>
              <th style={thStyle("left")} scope="col">Type</th>
              <th style={thStyle("right")} scope="col">Internal</th>
              <th style={thStyle("right")} scope="col">External</th>
              <th style={thStyle("right")} scope="col">Total</th>
              <th style={thStyle("center")} scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, sIdx) => (
              <SubjectRow key={subj.subject || sIdx} subject={subj} index={sIdx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectRow({ subject: subj, index: sIdx }) {
  const statusColors = getSubjectStatusColor(subj.status);

  return (
    <motion.tr
      variants={fadeInVariants}
      custom={sIdx * 0.05}
      initial="hidden"
      animate="visible"
      style={{ backgroundColor: sIdx % 2 === 0 ? "#ffffff" : "#f8fafc" }}
      whileHover={{ backgroundColor: "#f1f5f9" }}
    >
      <td style={tdStyle("left")}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>
            {subj.subjectName || "Unnamed Subject"}
          </span>
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            {subj.subjectCode || "N/A"}
          </span>
        </div>
      </td>
      <td style={tdStyle("left")}>
        <span
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 600,
            backgroundColor: "#f1f5f9",
            color: "#4a5568",
            textTransform: "uppercase",
          }}
        >
          {subj.subjectType || "—"}
        </span>
      </td>
      <td style={tdStyle("right")}>
        {subj.internalMarks !== null && subj.internalMarks !== undefined ? subj.internalMarks : "—"}
      </td>
      <td style={tdStyle("right")}>
        {subj.externalMarks !== null && subj.externalMarks !== undefined ? subj.externalMarks : "—"}
      </td>
      <td style={tdStyle("right", true)}>
        {subj.totalMarks !== null && subj.totalMarks !== undefined ? subj.totalMarks : "—"}
      </td>
      <td style={tdStyle("center")}>
        <span
          style={{
            padding: "0.35rem 0.85rem",
            borderRadius: "20px",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            backgroundColor: statusColors.bg,
            color: statusColors.color,
          }}
        >
          {subj.status || "—"}
        </span>
        {!subj.marksRecorded && (
          <FaInfoCircle
            style={{ marginLeft: "0.4rem", color: BRAND_COLORS.warning.main }}
            title="Marks not recorded"
            aria-label="Marks not recorded"
          />
        )}
      </td>
    </motion.tr>
  );
}

function SummaryPill({ icon, value, label, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SPACE.sm,
        padding: `${SPACE.sm}px ${SPACE.md}px`,
        borderRadius: RADIUS.md,
        backgroundColor: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        style={{
          color,
          fontSize: "1rem",
          width: "28px",
          height: "28px",
          flexShrink: 0,
          borderRadius: "50%",
          backgroundColor: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color, lineHeight: 1.2 }}>
          {value}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#64748b", lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
    </div>
  );
}