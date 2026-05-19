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
  Nav,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  FaBug,
  FaChartLine,
  FaChartBar,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaSync,
  FaArrowLeft,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { GiMicroscope } from "react-icons/gi";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../../../api/axios";

// Predefined colors for modules
const MODULE_COLORS = {
  auth: "#4CAF50",
  payment: "#635BFF",
  attendance: "#00BCD4",
  student: "#FF9800",
  teacher: "#9C27B0",
  exam: "#F44336",
  college: "#3F51B5",
  default: "#607D8B",
};

export default function ErrorAnalytics() {
  const navigate = useNavigate();
  const [errorStats, setErrorStats] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [byCollege, setByCollege] = useState([]);
  const [byEndpoint, setByEndpoint] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hours, setHours] = useState(24);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsRes, trendRes, collegeRes, endpointRes] = await Promise.all([
        api.get(`/platform-support/error-stats?hours=${hours}`),
        api.get(`/platform-support/health/metrics?metric=errorRate&hours=${hours}`),
        api.get("/platform-support/colleges/health"),
        api.get("/platform-support/system-logs?limit=1000"),
      ]);

      setErrorStats(statsRes.data?.stats || []);
      setTrendData(trendRes.data?.trend || []);
      setByCollege(collegeRes.data?.colleges || []);

      // Process endpoint errors from system logs (extract URL)
      const logs = endpointRes.data?.logs || [];
      const endpointMap = {};
      logs.forEach((log) => {
        if (log.request?.url) {
          const endpoint = log.request.url.split("?")[0]; // remove query params
          endpointMap[endpoint] = (endpointMap[endpoint] || 0) + 1;
        }
      });
      const endpointArray = Object.entries(endpointMap)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setByEndpoint(endpointArray);
    } catch (err) {
      console.error("Error analytics fetch error:", err);
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [hours]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    toast?.info("Refreshing analytics...");
  };

  const getTrendDirection = () => {
    if (trendData.length < 2) return "min";
    const first = trendData[0]?.avgErrorRate || 0;
    const last = trendData[trendData.length - 1]?.avgErrorRate || 0;
    if (last > first * 1.2) return "up";
    if (last < first * 0.8) return "down";
    return "stable";
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button onClick={handleRefresh} variant="outline-danger">Retry</Button>
        </Alert>
      </Container>
    );
  }

  const trendDirection = getTrendDirection();
  const recentAvgError = trendData.length > 0 ? (trendData[trendData.length - 1]?.avgErrorRate || 0).toFixed(2) : "0";

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 className="mb-0">
            <GiMicroscope className="text-danger me-2" />
            Error Analytics
          </h2>
          <p className="text-muted mb-0">
            Error trends, top failing modules, and endpoint analysis
          </p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <Button variant={hours === 6 ? "primary" : "outline-primary"} onClick={() => setHours(6)}>6h</Button>
            <Button variant={hours === 24 ? "primary" : "outline-primary"} onClick={() => setHours(24)}>24h</Button>
            <Button variant={hours === 168 ? "primary" : "outline-primary"} onClick={() => setHours(168)}>7d</Button>
          </div>
          <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={refreshing ? "spinner" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Current Error Rate</Card.Title>
              <h2 className={`fw-bold ${trendDirection === "up" ? "text-danger" : trendDirection === "down" ? "text-success" : "text-warning"}`}>
                {recentAvgError}%
                {trendDirection === "up" && <FaArrowUp className="ms-1" />}
                {trendDirection === "down" && <FaArrowDown className="ms-1" />}
                {trendDirection === "stable" && <FaMinus className="ms-1" />}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Error Modules</Card.Title>
              <h2 className="text-warning">{errorStats.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-info">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Error Colleges</Card.Title>
              <h2 className="text-info">{byCollege.filter(c => c.healthScore < 80).length}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CHARTS ROW */}
      <Row xs={1} lg={2} className="g-4 mb-4">
        {/* Error Rate Trend */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaChartLine className="text-danger" />
                Error Rate Trend
              </h5>
            </Card.Header>
            <Card.Body>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tickFormatter={(t) => new Date(t).getHours() + ":00"} />
                    <YAxis unit="%" domain={[0, "auto"]} />
                    <Tooltip formatter={(value) => [value.toFixed(2) + "%", "Error Rate"]} />
                    <Line
                      type="monotone"
                      dataKey="avgErrorRate"
                      stroke="#dc3545"
                      strokeWidth={2}
                      dot={false}
                      name="Error Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No trend data</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Error Distribution by Module (Pie) */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaChartBar className="text-warning" />
                Errors by Module
              </h5>
            </Card.Header>
            <Card.Body>
              {errorStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={errorStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {errorStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MODULE_COLORS[entry._id] || MODULE_COLORS.default}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Errors"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No error data</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ERROR MODULES TABLE */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaBug className="text-danger" />
            Top Error Modules
            <Badge bg="danger" className="ms-auto">{errorStats.length}</Badge>
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {errorStats.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <Table hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Module</th>
                    <th>Error Count</th>
                    <th>Percentage</th>
                    <th>Last Error</th>
                    <th>Trend</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {errorStats.map((stat, idx) => {
                    const maxCount = errorStats[0]?.count || 1;
                    const percentage = ((stat.count / maxCount) * 100).toFixed(1);
                    return (
                      <tr key={stat._id}>
                        <td>
                          <code className="text-primary fw-bold">{stat._id}</code>
                        </td>
                        <td>
                          <Badge bg="danger" className="fs-6">
                            {stat.count}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="progress bg-light"
                              style={{ width: "100px", height: "8px" }}
                            >
                              <div
                                className="progress-bar bg-danger"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <small>{percentage}%</small>
                          </div>
                        </td>
                        <td>
                          {new Date(stat.lastError).toLocaleString()}
                        </td>
                        <td>
                          <Badge bg={stat.trend === "up" ? "danger" : stat.trend === "down" ? "success" : "warning"}>
                            {stat.trend?.toUpperCase() || "STABLE"}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => navigate(`/platform-support/system-logs?module=${stat._id}`)}
                          >
                            <FaExternalLinkAlt /> View Logs
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <FaBug size={48} className="mb-2 opacity-25" />
              <p>No errors in the selected time period</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* COLLEGES WITH HIGH ERROR RATE */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaExclamationTriangle className="text-warning" />
            Colleges with High Error Rates
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {byCollege.filter((c) => c.healthScore < 80).length > 0 ? (
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>College</th>
                  <th>Health Score</th>
                  <th>Error Rate (24h)</th>
                  <th>Open Tickets</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {byCollege.filter((c) => c.healthScore < 80).slice(0, 10).map((college) => (
                  <tr key={college._id}>
                    <td>
                      <strong>{college.name}</strong>
                      <br />
                      <small className="text-muted">{college.code}</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress bg-light" style={{ width: "60px", height: "8px" }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${college.healthScore}%`,
                              backgroundColor: college.healthScore >= 80 ? "#28a745" : college.healthScore >= 60 ? "#ffc107" : "#dc3545",
                            }}
                          />
                        </div>
                        <span>{college.healthScore}</span>
                      </div>
                    </td>
                    <td>
                      <Badge bg={college.healthScore < 60 ? "danger" : "warning"}>
                        {((100 - college.healthScore) / 3).toFixed(1)}% approx
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={college.openTickets > 5 ? "danger" : "warning"}>
                        {/* Need to compute from tickets */}
                        -
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={college.healthScore >= 80 ? "success" : college.healthScore >= 60 ? "warning" : "danger"}>
                        {college.healthScore >= 80 ? "healthy" : college.healthScore >= 60 ? "degraded" : "critical"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">
              <FaCheckCircle size={32} className="text-success mb-2" />
              <p>All colleges are healthy</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* TOP FAILING ENDPOINTS */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaExternalLinkAlt className="text-info" />
            Top Failing Endpoints
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {byEndpoint.length > 0 ? (
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Endpoint</th>
                  <th>Error Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {byEndpoint.map((ep, idx) => (
                  <tr key={idx}>
                    <td>
                      <code className="small">{ep.endpoint}</code>
                    </td>
                    <td>
                      <Badge bg="danger">{ep.count}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => navigate(`/platform-support/system-logs?search=${encodeURIComponent(ep.endpoint)}`)}
                      >
                        View Logs
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">
              <p>No endpoint error data available</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
