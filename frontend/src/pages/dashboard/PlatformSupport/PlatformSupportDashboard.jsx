import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
  Button,
} from "react-bootstrap";
import {
  FaShieldAlt,
  FaChartLine,
  FaBuilding,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaPlug,
  FaEnvelope,
  FaSms,
  FaMoneyBillWave,
  FaDatabase,
  FaTicketAlt,
  FaBug,
  FaCog,
  FaArrowRight,
  FaSync,
  FaClock,
  FaServer,
  FaClipboardList,
} from "react-icons/fa";
import { GiMicroscope } from "react-icons/gi";
import { MdSecurity } from "react-icons/md";
import { TiTicket } from "react-icons/ti";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import "./styles/PlatformSupportDashboard.css";
import api from "../../../api/axios";

// Helper to get status icon
const StatusIcon = ({ status }) => {
  if (status === "HEALTHY" || status === "ACTIVE")
    return <FaCheckCircle className="text-success" />;
  if (status === "DEGRADED")
    return <FaExclamationTriangle className="text-warning" />;
  return <FATimesCircle className="text-danger" />;
};

export default function PlatformSupportDashboard() {
  const navigate = useNavigate();

  // State - Enabled Features
  const [enabledFeatures, setEnabledFeatures] = useState([]);

  // State - Health Metrics
  const [latestHealth, setLatestHealth] = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [collegeHealth, setCollegeHealth] = useState([]);

  // State - Tickets & Logs
  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState({});
  const [errorStats, setErrorStats] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  // State - UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Colors for services
  const serviceColors = {
    MONGODB: "#4CAF50",
    EMAIL_SMTP: "#9C27B0",
    SMS_TWILIO: "#00BCD4",
    PAYMENT_STRIPE: "#635BFF",
    PAYMENT_RAZORPAY: "#0DB9B9",
  };

  /**
   * FETCH ENABLED FEATURES FIRST, THEN DASHBOARD DATA
   */
  const fetchDashboardData = async () => {
    try {
      setError(null);

      // First fetch enabled features
      const featuresRes = await api.get("/platform-support/features/enabled");
      const features = featuresRes.data?.features || [];
      setEnabledFeatures(features);

      // Create dynamic API calls based on enabled features
      const apiCalls = [];
      const callMap = {};

      // System Health
      if (features.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH')) {
        apiCalls.push(api.get("/platform-support/health"));
        callMap.health = apiCalls.length - 1;

        apiCalls.push(api.get("/platform-support/health/history?hours=24"));
        callMap.history = apiCalls.length - 1;
      }

      // Integrations
      if (features.some(f => f.id === 'PLATFORM_SUPPORT_INTEGRATIONS')) {
        apiCalls.push(api.get("/platform-support/health/integrations"));
        callMap.integrations = apiCalls.length - 1;
      }

      // Colleges Health
      if (features.some(f => f.id === 'PLATFORM_SUPPORT_COLLEGES_HEALTH')) {
        apiCalls.push(api.get("/platform-support/colleges/health"));
        callMap.colleges = apiCalls.length - 1;
      }

      // Support Tickets
      if (features.some(f => f.id === 'PLATFORM_SUPPORT_SUPPORT_TICKETS')) {
        apiCalls.push(api.get("/platform-support/tickets?limit=5"));
        callMap.tickets = apiCalls.length - 1;

        apiCalls.push(api.get("/platform-support/tickets/stats"));
        callMap.ticketStats = apiCalls.length - 1;
      }

      // Error Analytics
      if (features.some(f => f.id === 'PLATFORM_SUPPORT_ERROR_ANALYTICS')) {
        apiCalls.push(api.get("/platform-support/error-stats?hours=24"));
        callMap.errors = apiCalls.length - 1;
      }

      // Execute all enabled API calls in parallel
      if (apiCalls.length > 0) {
        const results = await Promise.all(apiCalls);

        // Map results back to state
        if (callMap.health !== undefined) {
          setLatestHealth(results[callMap.health].data?.health || null);
        }
        if (callMap.history !== undefined) {
          setHealthHistory(results[callMap.history].data?.history || []);
        }
        if (callMap.integrations !== undefined) {
          setIntegrations(results[callMap.integrations].data?.integrations || []);
        }
        if (callMap.colleges !== undefined) {
          setCollegeHealth(results[callMap.colleges].data?.colleges || []);
        }
        if (callMap.tickets !== undefined) {
          setTickets(results[callMap.tickets].data?.tickets || []);
        }
        if (callMap.ticketStats !== undefined) {
          setTicketStats(results[callMap.ticketStats].data?.stats || []);
        }
        if (callMap.errors !== undefined) {
          setErrorStats(results[callMap.errors].data?.stats || []);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Optional: Auto-refresh every 60s
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    toast.info("Refreshing dashboard data...");
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button onClick={handleRefresh} variant="outline-danger">
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  // Calculate overall system health
  const systemStatus = latestHealth?.status || "UNKNOWN";
  const criticalAlerts = integrations.filter(
    (i) => i.status === "ERROR" || i.consecutiveFailures >= 3
  );

  // Default metrics for empty state
  const metrics = latestHealth?.metrics || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    responseTimeMs: 0,
    errorRate: 0,
  };

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <FaShieldAlt className="text-primary me-2" />
            Platform Support Dashboard
          </h2>
          <p className="text-muted mb-0">
            System Health & Operations Monitoring
          </p>
        </div>
        <Button
          variant="outline-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? "spinner-border spinner-border-sm" : ""} />
          {" "}Refresh
        </Button>
      </div>

      {/* CRITICAL ALERTS BAR */}
      {criticalAlerts.length > 0 && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>
            <FaExclamationTriangle className="me-2" />
            Critical Alerts ({criticalAlerts.length})
          </Alert.Heading>
          <ul className="mb-0">
            {criticalAlerts.slice(0, 3).map((service) => (
              <li key={service._id}>
                <strong>{service.service}</strong>: {service.errorMessage || "Service unreachable"}
                {" "}({service.consecutiveFailures} consecutive failures)
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* OVERVIEW STATS CARDS */}
      <Row xs={1} md={2} lg={4} className="g-4 mb-4">
        {/* System Health Card */}
        {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') && (
          <Col>
            <Card className={`h-100 border-${systemStatus === "HEALTHY" ? "success" : systemStatus === "DEGRADED" ? "warning" : "danger"}`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <Card.Title className="text-muted small">
                      System Health
                    </Card.Title>
                    <h2 className={`mb-0 fw-bold ${systemStatus === "HEALTHY" ? "text-success" : systemStatus === "DEGRADED" ? "text-warning" : "text-danger"}`}>
                      {systemStatus}
                    </h2>
                  </div>
                  <StatusIcon status={systemStatus} />
                </div>
                <Card.Text className="text-muted mt-2 mb-0">
                  Last checked: {new Date(latestHealth?.timestamp).toLocaleTimeString()}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Response Time Card */}
        {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') && (
          <Col>
            <Card className="h-100 border-info">
              <Card.Body>
                <Card.Title className="text-muted small">
                  Avg Response Time
                </Card.Title>
                <h2 className="text-info mb-0 fw-bold">
                  {metrics.responseTimeMs?.toFixed(0) || 0} ms
                </h2>
                <Card.Text className="text-muted mt-2 mb-0">
                  Error Rate: <span className={metrics.errorRate > 5 ? "text-danger" : metrics.errorRate > 2 ? "text-warning" : "text-success"}>
                    {metrics.errorRate?.toFixed(1) || 0}%
                  </span>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* CPU + Memory Card */}
        {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') && (
          <Col>
            <Card className="h-100 border-primary">
              <Card.Body>
                <Card.Title className="text-muted small">
                  CPU & Memory Usage
                </Card.Title>
                <div className="d-flex gap-4">
                  <div>
                    <h3 className="text-primary mb-0">{metrics.cpuUsage?.toFixed(0) || 0}%</h3>
                    <small className="text-muted">CPU</small>
                  </div>
                  <div>
                    <h3 className="text-primary mb-0">{metrics.memoryUsage?.toFixed(0) || 0}%</h3>
                    <small className="text-muted">Memory</small>
                  </div>
                </div>
                <Card.Text className="text-muted mt-2 mb-0">
                  Disk: {metrics.diskUsage?.toFixed(0) || 0}%
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Open Tickets */}
        {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SUPPORT_TICKETS') && (
          <Col>
            <Card className="h-100 border-warning">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <Card.Title className="text-muted small">
                      Open Tickets
                    </Card.Title>
                    <h2 className="text-warning mb-0 fw-bold">
                      {tickets?.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length || 0}
                    </h2>
                    <Card.Text className="text-muted mt-2 mb-0">
                      Total: {tickets?.length || 0}
                    </Card.Text>
                  </div>
                  <FaTicketAlt size={32} className="text-warning" style={{ opacity: 0.3 }} />
                </div>
                <Button
                  variant="link"
                  className="px-0 mt-2"
                  onClick={() => navigate("/platform-support/tickets")}
                >
                  View All <FaArrowRight className="ms-1" />
                </Button>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* SERVICE STATUS CARDS */}
      {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_INTEGRATIONS') && (
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-white">
            <h5 className="mb-0 d-flex align-items-center gap-2">
              <FaPlug className="text-success" />
              Integration Status
            </h5>
          </Card.Header>
          <Card.Body>
            <Row xs={2} md={4} lg={6} className="g-3">
              {integrations.map((service) => (
                <Col key={service._id}>
                  <div className="border rounded-3 p-3 h-100">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-bold mb-1">{service.service}</h6>
                        <Badge
                          bg={
                            service.status === "ACTIVE"
                              ? "success"
                              : service.status === "INACTIVE"
                                ? "secondary"
                                : "danger"
                          }
                        >
                          {service.status}
                        </Badge>
                      </div>
                      <div
                        className="rounded-circle p-2"
                        style={{ backgroundColor: `${serviceColors[service.service] || "#6c757d"}20` }}
                      >
                        {service.service === "EMAIL_SMTP" ? (
                          <FaEnvelope style={{ color: serviceColors[service.service] || "#6c757d" }} />
                        ) : service.service === "SMS_TWILIO" || service.service === "SMS_NODEJS" ? (
                          <FaSms style={{ color: serviceColors[service.service] || "#6c757d" }} />
                        ) : service.service === "PAYMENT_STRIPE" || service.service === "PAYMENT_RAZORPAY" ? (
                          <FaMoneyBillWave style={{ color: serviceColors[service.service] || "#6c757d" }} />
                        ) : (
                          <FaDatabase style={{ color: serviceColors[service.service] || "#6c757d" }} />
                        )}
                      </div>
                    </div>
                    {service.responseTimeMs && (
                      <p className="text-muted small mb-1 mt-2">
                        Latency: {service.responseTimeMs}ms
                      </p>
                    )}
                    {service.lastChecked && (
                      <p className="text-muted tiny mb-0">
                        Checked: {new Date(service.lastChecked).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* SECOND ROW: Charts + College Health */}
      {(enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') ||
        enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_COLLEGES_HEALTH')) && (
        <Row xs={1} lg={2} className="g-4 mb-4">
          {/* Response Time Chart */}
          {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') && (
            <Col>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <FaServer className="text-primary" />
                    Response Time (Last 24h)
                  </h5>
                </Card.Header>
                <Card.Body>
                  {healthHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={healthHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(t) => new Date(t).getHours() + ":00"}
                        />
                        <YAxis unit="ms" />
                        <Tooltip
                          labelFormatter={(t) => new Date(t).toLocaleString()}
                          formatter={(value) => [value + "ms", "Response Time"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="metrics.responseTimeMs"
                          stroke="#635BFF"
                          fill="#635BFF"
                          fillOpacity={0.2}
                          name="Response Time"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <FaChartLine size={48} className="mb-2 opacity-25" />
                      <p>No health history available yet</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* College Health Overview */}
          {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_COLLEGES_HEALTH') && (
            <Col>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <FaBuilding className="text-success" />
                    College Health Overview
                  </h5>
                </Card.Header>
                <Card.Body className="p-0">
                  {collegeHealth.length > 0 ? (
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <Table hover responsive className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>College</th>
                            <th>Health Score</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {collegeHealth.slice(0, 10).map((college) => (
                            <tr key={college._id}>
                              <td>
                                <div>
                                  <strong>{college.name}</strong>
                                  <br />
                                  <small className="text-muted">{college.code}</small>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="progress bg-light"
                                    style={{ width: "80px", height: "8px" }}
                                  >
                                    <div
                                      className="progress-bar"
                                      style={{
                                        width: `${college.healthScore}%`,
                                        backgroundColor:
                                          college.healthScore >= 80
                                            ? "#28a745"
                                            : college.healthScore >= 60
                                              ? "#ffc107"
                                              : "#dc3545",
                                      }}
                                    />
                                  </div>
                                  <span className="fw-bold">{college.healthScore}</span>
                                </div>
                              </td>
                              <td>
                                <Badge
                                  bg={
                                    college.healthScore >= 80
                                      ? "success"
                                      : college.healthScore >= 60
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {college.healthScore >= 80
                                    ? "Healthy"
                                    : college.healthScore >= 60
                                      ? "Degraded"
                                      : "Critical"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <FaBuilding size={48} className="mb-2 opacity-25" />
                      <p>No colleges found</p>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-0 text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/platform-support/colleges")}
                  >
                    View All Colleges <FaArrowRight />
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* THIRD ROW: Error Stats + Recent Alerts */}
      {(enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_ERROR_ANALYTICS') ||
        enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SUPPORT_TICKETS')) && (
        <Row xs={1} md={2} className="g-4 mb-4">
          {/* Top Error Modules */}
          {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_ERROR_ANALYTICS') && (
            <Col>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <FaBug className="text-danger" />
                    Top Error Modules
                  </h5>
                </Card.Header>
                <Card.Body>
                  {errorStats.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {errorStats.slice(0, 5).map((stat) => (
                        <div key={stat._id}>
                          <div className="d-flex justify-content-between mb-1">
                            <span className="text-capitalize text-truncate me-2" style={{ maxWidth: "150px" }}>
                              {stat._id}
                            </span>
                            <Badge bg="danger">{stat.count}</Badge>
                          </div>
                          <div className="progress bg-light" style={{ height: "6px" }}>
                            <div
                              className="progress-bar bg-danger"
                              style={{
                                width: `${Math.min((stat.count / errorStats[0]?.count) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <GiMicroscope size={48} className="mb-2 opacity-25" />
                      <p>No errors in last 24h</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}

          {/* Recent Tickets */}
          {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SUPPORT_TICKETS') && (
            <Col>
              <Card className="shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <TiTicket className="text-warning" />
                    Recent Support Tickets
                    <Badge bg="warning" className="ms-auto">
                      {tickets?.length || 0}
                    </Badge>
                  </h5>
                </Card.Header>
                <Card.Body className="p-0">
                  {tickets.length > 0 ? (
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {tickets.map((ticket) => (
                        <div
                          key={ticket._id}
                          className="border-bottom p-3 hover-lift"
                          style={{ cursor: "pointer" }}
                          onClick={() => navigate(`/platform-support/tickets`)}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1 fw-bold">{ticket.subject}</h6>
                              <small className="text-muted">
                                {ticket.college_id?.name || "General"} • {ticket.category}
                              </small>
                            </div>
                            <Badge
                              bg={
                                ticket.priority === "CRITICAL"
                                  ? "danger"
                                  : ticket.priority === "HIGH"
                                    ? "warning"
                                    : ticket.priority === "MEDIUM"
                                      ? "info"
                                      : "secondary"
                              }
                            >
                              {ticket.priority}
                            </Badge>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-muted">
                              Status: <Badge bg={ticket.status === "OPEN" ? "danger" : ticket.status === "RESOLVED" ? "success" : "warning"}>{ticket.status}</Badge>
                            </small>
                            <small className="text-muted">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <FaTicketAlt size={48} className="mb-2 opacity-25" />
                      <p>No tickets yet</p>
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white border-0 text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate("/platform-support/tickets")}
                  >
                    Manage All Tickets <FaArrowRight />
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* QUICK ACTIONS & NAVIGATION */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <h5 className="mb-0">
            <FaCog className="me-2" />
            Platform Support Tools
          </h5>
        </Card.Header>
        <Card.Body>
          <Row xs={1} md={3} className="g-3">
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_HEALTH') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-blue hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/health")}
                >
                  <Card.Body className="text-center">
                    <FaChartLine size={32} className="text-primary mb-2" />
                    <h6>System Health</h6>
                    <small className="text-muted">
                      Detailed metrics & service status
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_AUDIT_LOGS') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-warning hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/audit-logs")}
                >
                  <Card.Body className="text-center">
                    <FaClipboardList size={32} className="text-info mb-2" />
                    <h6>Audit Logs</h6>
                    <small className="text-muted">
                      Security & user activity tracking
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SYSTEM_LOGS') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-success hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/system-logs")}
                >
                  <Card.Body className="text-center">
                    <GiMicroscope size={32} className="text-success mb-2" />
                    <h6>System Logs</h6>
                    <small className="text-muted">
                      Application error & debug logs
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_INTEGRATIONS') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-danger hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/integrations")}
                >
                  <Card.Body className="text-center">
                    <FaPlug size={32} className="text-danger mb-2" />
                    <h6>Integrations</h6>
                    <small className="text-muted">
                      Stripe, Email, SMS gateway health
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_SUPPORT_TICKETS') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-purple hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/tickets")}
                >
                  <Card.Body className="text-center">
                    <FaTicketAlt size={32} className="text-purple mb-2" />
                    <h6>Support Tickets</h6>
                    <small className="text-muted">
                      Manage college issues & tickets
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_ERROR_ANALYTICS') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-primary hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/errors")}
                >
                  <Card.Body className="text-center">
                    <FaBug size={32} className="text-danger mb-2" />
                    <h6>Error Analytics</h6>
                    <small className="text-muted">
                      Top errors & trending issues
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_COLLEGES_HEALTH') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-secondary hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/colleges")}
                >
                  <Card.Body className="text-center">
                    <FaBuilding size={32} className="text-secondary mb-2" />
                    <h6>Colleges Health</h6>
                    <small className="text-muted">
                      Overview of all college status
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_DATABASE') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-info hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/database")}
                >
                  <Card.Body className="text-center">
                    <FaDatabase size={32} className="text-info mb-2" />
                    <h6>Database</h6>
                    <small className="text-muted">
                      MongoDB health & diagnostics
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
            {enabledFeatures.some(f => f.id === 'PLATFORM_SUPPORT_CONFIGURATION') && (
              <Col>
                <Card
                  className="h-100 border-0 bg-light-dark hover-lift"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/platform-support/config")}
                >
                  <Card.Body className="text-center">
                    <FaCog size={32} className="text-dark mb-2" />
                    <h6>Configuration</h6>
                    <small className="text-muted">
                      System settings & configs
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* FOOTER INFO */}
      <Row className="mt-2">
        <Col>
          <Alert variant="info" className="mb-0">
            <Alert.Heading>
              <MdSecurity className="me-2" />
              Platform Support Portal
            </Alert.Heading>
            <p className="mb-0 small">
              This portal provides comprehensive system monitoring, health checks,
              audit trail access, and support ticket management across all colleges.
              All actions are logged and monitored.
            </p>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}
