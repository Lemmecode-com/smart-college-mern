import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import {
  FaBuilding,
  FaChalkboardTeacher,
  FaUsers,
  FaBook,
  FaChartLine,
  FaExclamationTriangle,
  FaUserGraduate,
  FaClipboardCheck,
  FaMoneyBillWave,
  FaEye,
  FaBell,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaSignOutAlt,
  FaArrowRight,
  FaInfoCircle,
  FaGraduationCap,
  FaCheckCircle,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { useNavigate } from "react-router-dom";
import useRole from "../../../hooks/useRole";
import "./PrincipalDashboard.css";

// Brand colors matching the admin dashboard
const BRAND_COLORS = {
  primary: {
    main: '#2093bd',
    dark: '#ebeef0',
    light: '#1a4b6d',
    gradient: 'linear-gradient(135deg, #095571 0%, #000910 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%)'
  },
  secondary: {
    main: '#6c757d',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
  }
};

const CHART_COLORS = ['#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, gradient, onClick, subtext }) => (
  <div
    className={`principal-stat-card ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
    style={{ '--card-color': color }}
  >
    <div className="stat-card-inner">
      <div className="stat-card-front">
        <div className="stat-icon-wrapper" style={{ background: gradient }}>
          <Icon />
        </div>
        <div className="stat-content">
          <span className="stat-label">{label}</span>
          <span className="stat-value">{value}</span>
          {subtext && <small className="stat-subtext">{subtext}</small>}
        </div>
      </div>
    </div>
  </div>
);

// Progress Ring Component
const ProgressRing = ({ percentage, color, size = 60, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="progress-ring-bg"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size/2}
        cy={size/2}
      />
      <circle
        className="progress-ring-circle"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size/2}
        cy={size/2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          stroke: color
        }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="progress-ring-text">
        {percentage}%
      </text>
    </svg>
  );
};

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const { canEdit } = useRole();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
    totalApproved: 0,
    totalRejected: 0,
  });
  const [college, setCollege] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardRes, admissionRes, deptRes] = await Promise.all([
          api.get("/dashboard/principal"),
          api.get("/reports/admissions/college-admin-summary"),
          api.get("/departments"),
        ]);

        const dData = dashboardRes.data;
        const admData = admissionRes.data;
        const deptData = Array.isArray(deptRes.data) ? deptRes.data :
                         Array.isArray(deptRes.data.departments) ? deptRes.data.departments :
                         Array.isArray(deptRes.data.data) ? deptRes.data.data : [];

        setStats({
          totalStudents: dData?.stats?.totalStudents || 0,
          totalTeachers: dData?.stats?.totalTeachers || 0,
          totalDepartments: dData?.stats?.totalDepartments || 0,
          totalCourses: dData?.stats?.totalCourses || 0,
          pendingAdmissions: dData?.stats?.pendingAdmissions || 0,
          totalApproved: admData?.approved || 0,
          totalRejected: admData?.rejected || 0,
        });
        setCollege(dData?.college || null);
        setRecentStudents(dData?.recentStudents || []);

        // Department-wise distribution
        const deptChart = deptData.slice(0, 6).map(dept => ({
          name: dept.name?.length > 12 ? dept.name.substring(0, 12) + '...' : dept.name,
          Teachers: (dept.sanctionedFacultyCount || 0),
          Capacity: (dept.sanctionedStudentIntake || 0) / 10
        }));
        setDepartmentData(deptChart);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  const { totalStudents, totalTeachers, totalDepartments, totalCourses, pendingAdmissions, totalApproved, totalRejected } = stats;
  const totalApplications = totalApproved + pendingAdmissions + totalRejected;
  const approvalRate = totalApplications > 0 ? Math.round((totalApproved / totalApplications) * 100) : 0;

  // Quick action cards configuration
  const quickActions = [
    { icon: FaBuilding, label: "Departments", path: "/departments", color: BRAND_COLORS.info, count: totalDepartments },
    { icon: FaBook, label: "Courses", path: "/courses", color: BRAND_COLORS.success, count: totalCourses },
    { icon: FaChalkboardTeacher, label: "Teachers", path: "/teachers", color: BRAND_COLORS.warning, count: totalTeachers },
    { icon: FaUserGraduate, label: "Students", path: "/students/pending-approvals", color: BRAND_COLORS.primary, count: totalStudents },
    { icon: FaMoneyBillWave, label: "Fees", path: "/fees/list", color: BRAND_COLORS.danger, count: null },
    { icon: FaChartLine, label: "Reports", path: "/college-admin/reports-dashboard", color: BRAND_COLORS.secondary, count: null },
  ];

  return (
    <div className="principal-dashboard-wrapper">
      {/* Hero Header Section */}
      <div className="dashboard-hero" style={{ background: BRAND_COLORS.primary.gradient }}>
        <div className="hero-pattern"></div>
        <Container fluid className="p-4">
          <Row className="align-items-center">
            <Col lg={8}>
              <div className="hero-content">
                <div className="hero-badge">Principal Portal</div>
                
                <div className="hero-stats">
                  <div className="hero-stat-item">
                    <FaUserGraduate className="hero-stat-icon" />
                    <div>
                      <div className="hero-stat-value">{totalStudents.toLocaleString()}</div>
                      <div className="hero-stat-label">Total Students</div>
                    </div>
                  </div>
                  <div className="hero-stat-item">
                    <FaChalkboardTeacher className="hero-stat-icon" />
                    <div>
                      <div className="hero-stat-value">{totalTeachers}</div>
                      <div className="hero-stat-label">Faculty Members</div>
                    </div>
                  </div>
                  <div className="hero-stat-item">
                    <FaCheckCircle className="hero-stat-icon success" />
                    <div>
                      <div className="hero-stat-value">{approvalRate}%</div>
                      <div className="hero-stat-label">Approval Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={4}>
              <Card className="hero-card shadow-lg border-0">
                <Card.Body className="text-center">
                  <div className="hero-circle" style={{ background: BRAND_COLORS.primary.gradient }}>
                    <FaBuilding size={48} />
                  </div>
                  <h4 className="mt-3 text-primary">{college?.name || "Your College"}</h4>
                  <p className="text-light mb-0">
                    {college?.code && <Badge bg="dark" className="me-2">{college.code}</Badge>}
                    Est. {college?.establishedYear || 'N/A'}
                  </p>
                  <div className="mt-3">
                    <Badge bg="success">Active</Badge>
                    <span className="ms-2 text-light small">
                      <FaMapMarkerAlt className="me-1" />
                      {college?.address?.split(',').pop()?.trim() || 'Location'}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Main Dashboard Content */}
      <Container fluid className="p-4">
        {/* KPI Cards Row */}
        <Row xs={1} md={2} lg={4} className="g-4 mb-4">
          {quickActions.map((action, idx) => (
            <Col key={idx}>
              <StatCard
                icon={action.icon}
                label={action.label}
                value={action.count?.toLocaleString() || '—'}
                color={action.color.main}
                gradient={action.color.gradient}
                onClick={() => navigate(action.path)}
              />
            </Col>
          ))}
        </Row>

        {/* Second Row: Pending Approvals & College Info */}
        <Row xs={1} lg={8} className="g-4 mb-4">
          {/* Pending Approvals Card */}
          <Col lg={6}>
            <Card className="dashboard-card h-100 border-0 shadow-sm">
              <Card.Header className="card-header-custom">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FaExclamationTriangle className="me-2 text-warning" />
                    Pending Approvals
                  </h5>
                  <Badge bg="warning" className="fs-6">
                    {pendingAdmissions} Pending
                  </Badge>
                </div>
              </Card.Header>
              {pendingAdmissions > 0 && (
                <Card.Body className="p-0">
                  <div className="approval-flow">
                    <div className="progress-circle-container">
                      <ProgressRing
                        percentage={totalApplications > 0 ? Math.round((pendingAdmissions / totalApplications) * 100) : 0}
                        color={BRAND_COLORS.warning.main}
                      />
                      <div className="progress-label">Pending</div>
                    </div>
                    <div className="approval-breakdown">
                      <div className="breakdown-item approved">
                        <div className="breakdown-color" style={{ background: BRAND_COLORS.success.main }}></div>
                        <div>
                          <div className="breakdown-value">{totalApproved}</div>
                          <div className="breakdown-label">Approved</div>
                        </div>
                      </div>
                      <div className="breakdown-item pending">
                        <div className="breakdown-color" style={{ background: BRAND_COLORS.warning.main }}></div>
                        <div>
                          <div className="breakdown-value">{pendingAdmissions}</div>
                          <div className="breakdown-label">Pending</div>
                        </div>
                      </div>
                      <div className="breakdown-item rejected">
                        <div className="breakdown-color" style={{ background: BRAND_COLORS.danger.main }}></div>
                        <div>
                          <div className="breakdown-value">{totalRejected}</div>
                          <div className="breakdown-label">Rejected</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer text-center">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate("/students/pending-approvals")}
                    >
                      Review All <FaArrowRight className="ms-1" />
                    </button>
                  </div>
                </Card.Body>
              )}
              {pendingAdmissions === 0 && (
                <Card.Body className="text-center py-5">
                  <FaCheckCircle size={48} className="text-success mb-3" />
                  <h6>All caught up!</h6>
                  <p className="text-muted small">No pending student approvals</p>
                </Card.Body>
              )}
            </Card>
          </Col>

          {/* College Overview Card */}
          <Col lg={6}>
            <Card className="dashboard-card h-100 border-0 shadow-sm">
              <Card.Header className="card-header-custom">
                <h5 className="mb-0">
                  <FaBuilding className="me-2 text-primary" />
                  College Overview
                </h5>
              </Card.Header>
              <Card.Body>
                {college ? (
                  <div className="college-info-grid">
                    <div className="info-item">
                      <FaMapMarkerAlt className="info-icon" />
                      <div>
                        <div className="info-label">Address</div>
                        <div className="info-value">{college.address?.length > 30 ? college.address.substring(0,30)+'...' : college.address}</div>
                      </div>
                    </div>
                    <div className="info-item">
                      <FaEnvelope className="info-icon" />
                      <div>
                        <div className="info-label">Email</div>
                        <div className="info-value">{college.email}</div>
                      </div>
                    </div>
                    <div className="info-item">
                      <FaPhone className="info-icon" />
                      <div>
                        <div className="info-label">Contact</div>
                        <div className="info-value">{college.contactNumber}</div>
                      </div>
                    </div>
                    <div className="info-item">
                      <FaCalendarAlt className="info-icon" />
                      <div>
                        <div className="info-label">Established</div>
                        <div className="info-value">{college.establishedYear}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">College details not available</p>
                )}
              </Card.Body>
              <Card.Footer className="bg-transparent">
                <button
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={() => navigate("/college/profile")}
                >
                  View Full Profile <FaArrowRight className="ms-1" />
                </button>
              </Card.Footer>
            </Card>
          </Col>
        </Row>

        {/* Third Row: Charts & Recent Activity */}
        <Row xs={1} lg={8} className="g-4 mb-4">
          {/* Admission Status Pie Chart */}
          <Col lg={6}>
            <Card className="dashboard-card h-100 border-0 shadow-sm">
              <Card.Header className="card-header-custom">
                <h5 className="mb-0">
                  <FaChartLine className="me-2 text-info" />
                  Admission Overview
                </h5>
              </Card.Header>
              <Card.Body className="d-flex align-items-center justify-content-center">
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Approved', value: totalApproved, color: BRAND_COLORS.success.main },
                          { name: 'Pending', value: pendingAdmissions, color: BRAND_COLORS.warning.main },
                          { name: 'Rejected', value: totalRejected, color: BRAND_COLORS.danger.main },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[
                          { name: 'Approved', value: totalApproved, color: BRAND_COLORS.success.main },
                          { name: 'Pending', value: pendingAdmissions, color: BRAND_COLORS.warning.main },
                          { name: 'Rejected', value: totalRejected, color: BRAND_COLORS.danger.main },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Department Distribution Bar Chart */}
          <Col lg={6}>
            <Card className="dashboard-card h-100 border-0 shadow-sm">
              <Card.Header className="card-header-custom">
                <h5 className="mb-0">
                  <FaBook className="me-2 text-success" />
                  Department Overview
                </h5>
              </Card.Header>
              <Card.Body>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6c757d' }} />
                      <YAxis fontSize={12} tick={{ fill: '#6c757d' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Bar dataKey="Teachers" fill={BRAND_COLORS.info.main} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Capacity" fill={BRAND_COLORS.success.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Fourth Row: Recent Admissions */}
        <Row className="mb-4">
          <Col>
            <Card className="dashboard-card border-0 shadow-sm">
              <Card.Header className="card-header-custom d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaUserGraduate className="me-2 text-primary" />
                  Recent Admissions
                </h5>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate("/students/pending-approvals")}
                >
                  View All <FaArrowRight className="ms-1" />
                </button>
              </Card.Header>
              <Card.Body className="p-0">
                {recentStudents && recentStudents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Registered</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentStudents.slice(0, 5).map((student) => (
                          <tr key={student._id}>
                            <td>
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                  style={{ width: 40, height: 40, borderRadius: '50%' }}
                                >
                                  {student.fullName?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <div className="fw-medium">{student.fullName}</div>
                                  <div className="small text-muted">{student.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>{student.course_id?.name || 'N/A'}</td>
                            <td>{student.department_id?.name || 'N/A'}</td>
                            <td>
                              <Badge bg={
                                student.status === 'APPROVED' ? 'success' :
                                student.status === 'PENDING' ? 'warning' : 'danger'
                              }>
                                {student.status}
                              </Badge>
                            </td>
                            <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/college/view-student/${student._id}`)}
                              >
                                <FaEye /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <FaUserGraduate size={48} className="text-muted mb-3" />
                    <h6>No recent admissions</h6>
                    <p className="text-muted small">New student registrations will appear here</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Fifth Row: Quick Links */}
        <Row className="mb-4">
          <Col>
            <Card className="dashboard-card border-0 shadow-sm">
              <Card.Header className="card-header-custom">
                <h5 className="mb-0">
                  <FaInfoCircle className="me-2 text-secondary" />
                  Quick Access
                </h5>
              </Card.Header>
              <Card.Body>
                <Row xs={2} md={3} lg={6} className="g-3">
                  {[
                    { label: 'View Departments', path: '/departments', icon: FaBuilding, color: BRAND_COLORS.info },
                    { label: 'View Courses', path: '/courses', icon: FaBook, color: BRAND_COLORS.success },
                    { label: 'View Teachers', path: '/teachers', icon: FaChalkboardTeacher, color: BRAND_COLORS.warning },
                    { label: 'Review Students', path: '/students/pending-approvals', icon: FaUserGraduate, color: BRAND_COLORS.primary },
                    { label: 'Fee Structures', path: '/fees/list', icon: FaMoneyBillWave, color: BRAND_COLORS.danger },
                    { label: 'Analytics Reports', path: '/college-admin/reports-dashboard', icon: FaChartLine, color: BRAND_COLORS.secondary },
                  ].map((link, idx) => (
                    <Col key={idx}>
                      <div
                        className="quick-link-card"
                        onClick={() => navigate(link.path)}
                      >
                        <div className="quick-link-icon" style={{ background: link.color.gradient }}>
                          <link.icon />
                        </div>
                        <span className="quick-link-label">{link.label}</span>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
