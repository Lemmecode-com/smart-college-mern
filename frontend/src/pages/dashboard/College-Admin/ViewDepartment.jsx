import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaUserTie,
  FaGraduationCap,
  FaArrowLeft,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaInfoCircle,
  FaClock,
  FaUsers,
  FaTimesCircle,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";
import Breadcrumb from "../../../components/Breadcrumb";

export default function ViewDepartment() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL")
    return <Navigate to="/dashboard" replace />;

   /* ================= FETCH DEPARTMENT ================= */
   useEffect(() => {
     const fetchDepartment = async () => {
       try {
         const res = await api.get(`/departments/${id}`);
         setDepartment(res.data.department);
       } catch (err) {
         setError("Failed to load department details.");
       } finally {
         setLoading(false);
       }
     };
     fetchDepartment();
   }, [id]);

  if (loading) return <Loading fullScreen size="lg" text="Loading department..." />;
  if (error || !department) return <div className="text-center text-danger mt-4">{error || "Department not found"}</div>;

  const {
    name,
    code,
    type,
    status,
    address,
    email,
    contactNumber,
    establishedYear,
    hod,
    sanctionedFacultyCount,
    sanctionedStudentIntake,
    programsOffered = [],
    headOfDepartment,
  } = department;

  return (
    <Container fluid className="p-4">
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Departments", path: "/departments" },
          { label: name || "Department Details" }
        ]}
      />

      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1 d-flex align-items-center gap-2">
                <FaBuilding className="text-primary" />
                {name}
              </h2>
              <p className="text-muted mb-0">
                Department Code: <Badge bg="secondary">{code}</Badge>
              </p>
            </div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft /> Back
            </button>
          </div>
        </Col>
      </Row>

      <Row xs={1} lg={2} className="g-4">
        {/* Main Info Card */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaInfoCircle className="text-info" />
                Department Information
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-3">
                <div className="info-row">
                  <span className="info-label">Department Name</span>
                  <span className="info-value">{name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Code</span>
                  <Badge bg="light text-dark">{code}</Badge>
                </div>
                <div className="info-row">
                  <span className="info-label">Type</span>
                  <Badge bg="primary">{type}</Badge>
                </div>
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <Badge bg={status === "ACTIVE" ? "success" : "secondary"}>
                    {status}
                  </Badge>
                </div>
                <div className="info-row">
                  <span className="info-label">Established Year</span>
                  <span>{establishedYear}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="text-muted">{address || "Not provided"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Contact</span>
                  <span>{email}<br/>{contactNumber}</span>
                </div>
                {hod && (
                  <div className="info-row">
                    <span className="info-label">Head of Department</span>
                    <span>{hod.name}<br/><small className="text-muted">{hod.email}</small></span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Stats Card */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaChartLine className="text-success" />
                Department Stats
              </h5>
            </Card.Header>
            <Card.Body>
              <Row xs={2} className="text-center">
                <Col className="mb-4">
                  <div className="stat-circle" style={{ borderColor: "#17a2b8" }}>
                    <FaChalkboardTeacher size={24} className="text-info" />
                    <div className="stat-number">{sanctionedFacultyCount || 0}</div>
                    <div className="stat-label">Faculty</div>
                  </div>
                </Col>
                <Col className="mb-4">
                  <div className="stat-circle" style={{ borderColor: "#28a745" }}>
                    <FaGraduationCap size={24} className="text-success" />
                    <div className="stat-number">{sanctionedStudentIntake || 0}</div>
                    <div className="stat-label">Intake Capacity</div>
                  </div>
                </Col>
              </Row>
              {programsOffered.length > 0 && (
                <div className="mt-3">
                  <h6 className="fw-semibold mb-2">Programs Offered</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {programsOffered.map((prog, idx) => (
                      <Badge key={idx} bg="light text-dark border">{prog}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
