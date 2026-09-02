// src/pages/dashboard/Dashboard.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Card, Row, Col, Spinner } from "react-bootstrap";
import ApiError from "../../components/ApiError";
import { logger } from "../../utils/logger";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
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

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    departments: 0,
  });

  const [teacherCourses, setTeacherCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [studentsRes, coursesRes, departmentsRes] = await Promise.all([
          api.get("/students"),
          api.get("/courses"),
          api.get("/departments"),
        ]);

        setStats({
          students:
            studentsRes.data?.data?.length ||
            studentsRes.data?.length ||
            0,
          courses:
            coursesRes.data?.data?.length ||
            coursesRes.data?.length ||
            0,
          departments:
            departmentsRes.data?.data?.length ||
            departmentsRes.data?.length ||
            0,
        });
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode =
          err.response?.data?.code || (!err.response ? "NETWORK_ERROR" : undefined);
        const backendMessage = err.response?.data?.message;

        logger.error("Dashboard (admin) load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "Dashboard",
        });

        setError({
          message: "Failed to load dashboard data. Please try again.",
          statusCode,
          errorCode,
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchTeacherCourses = async () => {
      try {
        const res = await api.get("/courses");
        setTeacherCourses(res.data?.data || res.data || []);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode =
          err.response?.data?.code || (!err.response ? "NETWORK_ERROR" : undefined);
        const backendMessage = err.response?.data?.message;

        logger.error("Dashboard (teacher) load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "Dashboard",
        });

        setError({
          message: "Failed to load dashboard data. Please try again.",
          statusCode,
          errorCode,
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      fetchAdminData();
    } else if (user?.role === "teacher") {
      fetchTeacherCourses();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f3a4a, #134952)",
        padding: "20px",
      }}
    >
      <h3 className="text-white mb-4">Dashboard</h3>

      {error && (
        <ApiError
          title="Dashboard Loading Error"
          message={error.message}
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          onRetry={() => window.location.reload()}
          onGoBack={() => navigate(-1)}
          retryCount={0}
          maxRetry={3}
        />
      )}

      {/* ADMIN DASHBOARD */}
      {user?.role === "admin" && (
        <>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Students</h6>
                  <h2 className="text-primary">{stats.students}</h2>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Courses</h6>
                  <h2 className="text-success">{stats.courses}</h2>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Departments</h6>
                  <h2 className="text-warning">{stats.departments}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Alert variant="info">
            Welcome Admin 👋  
            Use the sidebar to manage Students, Courses, Departments & more.
          </Alert>
        </>
      )}

      {/* TEACHER DASHBOARD */}
      {user?.role === "teacher" && (
        <>
          <h5 className="text-white mb-3">My Courses</h5>

          <Row>
            {teacherCourses.length > 0 ? (
              teacherCourses.map((course) => (
                <Col md={4} key={course._id} className="mb-3">
                  <Card className="shadow border-0">
                    <Card.Body>
                      <h6>{course.name}</h6>
                      <p className="text-muted mb-1">
                        Department: {course.departmentId?.name || "N/A"}
                      </p>
                      <span className="badge bg-success">
                        {course.status || "Active"}
                      </span>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            ) : (
              <p className="text-light">No courses available.</p>
            )}
          </Row>
        </>
      )}
    </div>
  );
}

