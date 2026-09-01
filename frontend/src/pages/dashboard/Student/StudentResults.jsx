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

const BRAND_COLORS = {
  primary: { main: "#1a4b6d" },
  success: { main: "#28a745" },
  danger: { main: "#dc3545" },
  warning: { main: "#ffc107" },
  info: { main: "#17a2b8" },
  secondary: { main: "#6c757d" },
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
          paddingTop: "1.5rem",
          paddingBottom: "2rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
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

          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: "1.5rem",
              background: "linear-gradient(180deg, #0f3a4a, #134952)",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(15, 58, 74, 0.3)",
              padding: "1.75rem 2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
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
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
                  My Results
                </h1>
                <p style={{ margin: "0.25rem 0 0", opacity: 0.85, fontSize: "1rem" }}>
                  Your published semester results
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              style={{
                padding: "0.6rem 1.25rem",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
              }}
              aria-label="Refresh results"
            >
              <FaSync /> Refresh
            </motion.button>
          </motion.div>

          {results.length === 0 ? (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{
                background: "white",
                borderRadius: "20px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
                padding: "3rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "4rem",
                  marginBottom: "1.5rem",
                  opacity: 0.3,
                  color: "#94a3b8",
                }}
              >
                <FaFileAlt />
              </div>
              <h3
                style={{
                  margin: "0 0 1rem",
                  color: "#1e293b",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                }}
              >
                No Published Results Yet
              </h3>
              <p style={{ color: "#64748b", margin: "0 0 2rem", fontSize: "1.05rem" }}>
                Your semester results will appear here once they are published by
                the exam coordinator.
              </p>
              <button
                onClick={handleGoBack}
                style={{
                  padding: "0.75rem 2rem",
                  background: "linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease",
                }}
              >
                <FaArrowLeft /> Back to Dashboard
              </button>
            </motion.div>
          ) : (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
            >
              {results.map((result, idx) => {
                const exam = result.exam_id || {};
                const course = result.course_id || {};

                return (
                  <motion.div
                    key={result._id || idx}
                    variants={fadeInVariants}
                    custom={idx * 0.1 + 0.1}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -3, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.12)" }}
                    style={{
                      background: "white",
                      borderRadius: "20px",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        background: "linear-gradient(180deg, #0f3a4a, #134952)",
                        padding: "1.25rem 1.75rem",
                        color: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: "1.35rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FaBook /> {exam.name || "Semester Result"}
                        </h2>
                        <p
                          style={{
                            margin: "0.25rem 0 0",
                            opacity: 0.8,
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            <FaLayerGroup style={{ marginRight: "0.25rem" }} />
                            {course.name || course.code || "Course"}
                          </span>
                          <span>• Semester {result.semester}</span>
                          <span>• Academic Year: {result.academicYear}</span>
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <span
                          style={{
                            padding: "0.5rem 1.25rem",
                            borderRadius: "20px",
                            backgroundColor: "rgba(255, 255, 255, 0.15)",
                            color: "white",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          Published
                        </span>
                        <div
                          style={{
                            padding: "0.6rem 1.5rem",
                            borderRadius: "12px",
                            backgroundColor: "rgba(255, 255, 255, 0.15)",
                            color: "white",
                            textAlign: "center",
                            minWidth: "80px",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              opacity: 0.8,
                            }}
                          >
                            Overall
                          </div>
                          <div
                            style={{
                              fontSize: "1.3rem",
                              fontWeight: 700,
                              marginTop: "0.25rem",
                            }}
                          >
                            <FaTrophy style={{ marginRight: "0.3rem" }} />
                            {result.overallResult || "INCOMPLETE"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "1.5rem 1.75rem" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "1.5rem",
                          flexWrap: "wrap",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <SummaryPill
                          icon={<FaCheckCircle />}
                          value={result.passedSubjects}
                          label="Passed"
                          color={BRAND_COLORS.success.main}
                        />
                        {result.failedSubjects > 0 && (
                          <SummaryPill
                            icon={<FaTimesCircle />}
                            value={result.failedSubjects}
                            label="Failed"
                            color={BRAND_COLORS.danger.main}
                          />
                        )}
                        {result.incompleteSubjects > 0 && (
                          <SummaryPill
                            icon={<FaInfoCircle />}
                            value={result.incompleteSubjects}
                            label="Incomplete"
                            color={BRAND_COLORS.warning.main}
                          />
                        )}
                        <SummaryPill
                          icon={<FaBook />}
                          value={result.totalSubjects}
                          label="Total Subjects"
                          color={BRAND_COLORS.secondary.main}
                        />
                        <SummaryPill
                          icon={<FaCalendarAlt />}
                          value={formatDate(result.publishedAt)}
                          label="Published On"
                          color={BRAND_COLORS.info.main}
                        />
                      </div>

                      {result.subjects && result.subjects.length > 0 && (
                        <div>
                          <h3
                            style={{
                              margin: "0 0 0.75rem",
                              fontSize: "1.05rem",
                              fontWeight: 600,
                              color: "#1e293b",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <FaTable /> Subject-wise Breakdown
                          </h3>
                          <div style={{ overflowX: "auto" }}>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "0.9rem",
                              }}
                              role="table"
                              aria-label={`Subject-wise results for ${exam.name || "exam"}`}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "left",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    Subject
                                  </th>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "left",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    Type
                                  </th>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    Internal
                                  </th>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    External
                                  </th>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    Total
                                  </th>
                                  <th
                                    style={{
                                      padding: "0.75rem 1rem",
                                      textAlign: "center",
                                      fontWeight: 700,
                                      color: "#495057",
                                      background: "#f8f9fa",
                                      borderBottom: "2px solid #e9ecef",
                                      fontSize: "0.8rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                    }}
                                    scope="col"
                                  >
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.subjects.map((subj, sIdx) => {
                                  const statusColors = getSubjectStatusColor(subj.status);
                                  return (
                                    <motion.tr
                                      key={subj.subject || sIdx}
                                      variants={fadeInVariants}
                                      custom={sIdx * 0.05}
                                      initial="hidden"
                                      animate="visible"
                                      style={{
                                        backgroundColor:
                                          sIdx % 2 === 0 ? "#ffffff" : "#f8fafc",
                                        transition: "background-color 0.2s ease",
                                      }}
                                      whileHover={{ backgroundColor: "#f1f5f9" }}
                                    >
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontWeight: 600,
                                              color: "#1e293b",
                                            }}
                                          >
                                            {subj.subjectName || "Unnamed Subject"}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: "0.8rem",
                                              color: "#64748b",
                                            }}
                                          >
                                            {subj.subjectCode || "N/A"}
                                          </span>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                        }}
                                      >
                                        <span
                                          style={{
                                            padding: "0.25rem 0.6rem",
                                            borderRadius: "6px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                            backgroundColor: "#f1f5f9",
                                            color: "#4a5568",
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          {subj.subjectType || "—"}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                          textAlign: "right",
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {subj.internalMarks !== null &&
                                        subj.internalMarks !== undefined
                                          ? subj.internalMarks
                                          : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                          textAlign: "right",
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {subj.externalMarks !== null &&
                                        subj.externalMarks !== undefined
                                          ? subj.externalMarks
                                          : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                          textAlign: "right",
                                          fontFamily: "monospace",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {subj.totalMarks !== null &&
                                        subj.totalMarks !== undefined
                                          ? subj.totalMarks
                                          : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "0.75rem 1rem",
                                          borderBottom: "1px solid #e9ecef",
                                          textAlign: "center",
                                        }}
                                      >
                                        <span
                                          style={{
                                            padding: "0.35rem 0.85rem",
                                            borderRadius: "20px",
                                            fontSize: "0.75rem",
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
                                            style={{
                                              marginLeft: "0.4rem",
                                              color: BRAND_COLORS.warning.main,
                                            }}
                                            title="Marks not recorded"
                                            aria-label="Marks not recorded"
                                          />
                                        )}
                                      </td>
                                    </motion.tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "1rem",
                          paddingTop: "1rem",
                          borderTop: "1px solid #e2e8f0",
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          display: "flex",
                          gap: "1.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          Published: {formatDate(result.publishedAt)}
                        </span>
                        <span>
                          Last Updated: {formatDate(result.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function SummaryPill({ icon, value, label, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        borderRadius: "10px",
        backgroundColor: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ color, fontSize: "1.1rem" }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1 }}>
          {label}
        </span>
      </div>
    </div>
  );
}
