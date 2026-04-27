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
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  FaHeartbeat,
  FaTachometerAlt,
  FaMemory,
  FaHdd,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaChartArea,
  FaArrowLeft,
  FaSync,
} from "react-icons/fa";
import { FaServer } from "react-icons/fa";
import { GiMicrochip } from "react-icons/gi";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./styles/PlatformSupportDashboard.css";
import api from "../../../api/axios";

export default function SystemHealth() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hours, setHours] = useState(24);

  const fetchData = async () => {
    try {
      setError(null);
      const [healthRes, historyRes] = await Promise.all([
        api.get("/platform-support/health"),
        api.get(`/platform-support/health/history?hours=${hours}`),
      ]);
      setLatest(healthRes.data?.health || null);
      setHistory(historyRes.data?.history || []);
    } catch (err) {
      console.error("Health fetch error:", err);
      setError(err.response?.data?.message || "Failed to load health data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, [hours]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleHoursChange = (h) => {
    setHours(h);
    setLoading(true);
  };

  if (loading && !latest) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error && !latest) {
    return (
      <Container className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button onClick={handleRefresh} variant="outline-danger">
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  const metrics = latest?.metrics || {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    responseTimeMs: 0,
    errorRate: 0,
  };

  const services = latest?.services || [];
  const errors = latest?.errors || [];

  // Format chart data
  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    cpu: h.metrics?.cpuUsage,
    memory: h.metrics?.memoryUsage,
    disk: h.metrics?.diskUsage,
    responseTime: h.metrics?.responseTimeMs,
    errorRate: h.metrics?.errorRate,
  })).reverse();

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 className="mb-0">
            <FaHeartbeat className="text-danger me-2" />
            System Health Monitor
          </h2>
          <p className="text-muted mb-0">
            Real-time and historical system metrics
          </p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <Button variant={hours === 6 ? "primary" : "outline-primary"} onClick={() => handleHoursChange(6)}>
              6h
            </Button>
            <Button variant={hours === 24 ? "primary" : "outline-primary"} onClick={() => handleHoursChange(24)}>
              24h
            </Button>
            <Button variant={hours === 168 ? "primary" : "outline-primary"} onClick={() => handleHoursChange(168)}>
              7d
            </Button>
          </div>
          <Button
            variant="outline-primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSync className={refreshing ? "spinner" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {/* CURRENT STATUS CARD */}
      <Card className={`mb-4 border-${latest?.status === "HEALTHY" ? "success" : latest?.status === "DEGRADED" ? "warning" : "danger"}`}>
        <Card.Body>
          <Row xs={1} md={5} className="g-4 text-center">
            <Col>
              <div>
                <div className="text-muted small mb-1">Overall Status</div>
                <Badge bg={latest?.status === "HEALTHY" ? "success" : latest?.status === "DEGRADED" ? "warning" : "danger"} className="fs-6">
                  {latest?.status || "UNKNOWN"}
                </Badge>
              </div>
            </Col>
            <Col>
              <div>
                <div className="text-muted small mb-1">Response Time</div>
                <h4 className="text-info mb-0">{metrics.responseTimeMs?.toFixed(0) || 0} ms</h4>
              </div>
            </Col>
            <Col>
              <div>
                <div className="text-muted small mb-1">CPU Usage</div>
                <h4 className="text-primary mb-0">{metrics.cpuUsage?.toFixed(1) || 0}%</h4>
              </div>
            </Col>
            <Col>
              <div>
                <div className="text-muted small mb-1">Memory Usage</div>
                <h4 className="text-primary mb-0">{metrics.memoryUsage?.toFixed(1) || 0}%</h4>
              </div>
            </Col>
            <Col>
              <div>
                <div className="text-muted small mb-1">Error Rate</div>
                <h4 className={metrics.errorRate > 5 ? "text-danger" : metrics.errorRate > 2 ? "text-warning" : "text-success"}>
                  {metrics.errorRate?.toFixed(2) || 0}%
                </h4>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* TABS */}
      <Tabs defaultActiveKey="trends" className="mb-4">
        <Tab eventKey="trends" title="Trends">
          <Row xs={1} lg={2} className="g-4 mt-2">
            {/* CPU & Memory Chart */}
            <Col>
              <Card className="shadow-sm">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <GiMicrochip className="text-primary" />
                    CPU & Memory Usage
                  </h5>
                </Card.Header>
                <Card.Body>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis unit="%" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#635BFF" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="memory" name="Memory %" stroke="#28a745" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">No data</div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Response Time Chart */}
            <Col>
              <Card className="shadow-sm">
                <Card.Header className="bg-white">
                  <h5 className="mb-0 d-flex align-items-center gap-2">
                    <FaServer className="text-info" />
                    Response Time & Error Rate
                  </h5>
                </Card.Header>
                <Card.Body>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis yAxisId="response" unit="ms" />
                        <YAxis yAxisId="error" orientation="right" unit="%" />
                        <Tooltip />
                        <Legend />
                        <Area
                          yAxisId="response"
                          type="monotone"
                          dataKey="responseTime"
                          name="Response (ms)"
                          stroke="#635BFF"
                          fill="#635BFF"
                          fillOpacity={0.2}
                        />
                        <Area
                          yAxisId="error"
                          type="monotone"
                          dataKey="errorRate"
                          name="Error %"
                          stroke="#dc3545"
                          fill="#dc3545"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">No data</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="services" title="Services">
          <Card className="shadow-sm mt-2">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Service Status</h5>
            </Card.Header>
            <Card.Body>
              <Row xs={1} md={2} lg={3} className="g-3">
                {services.map((service) => (
                  <Col key={service._id}>
                    <div className="border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">{service.name}</h6>
                        <StatusIcon status={service.status} />
                      </div>
                      <small className="text-muted d-block mb-1">
                        Latency: {service.latencyMs}ms
                      </small>
                      <small className="text-muted tiny">
                        Last: {new Date(service.lastChecked).toLocaleString()}
                      </small>
                      {service.errorMessage && (
                        <p className="text-danger small mt-2 mb-0">
                          {service.errorMessage}
                        </p>
                      )}
                    </div>
                  </Col>
                ))}
                {services.length === 0 && (
                  <Col>
                    <p className="text-muted">No service data available</p>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="errors" title="Recent Errors">
          <Card className="shadow-sm mt-2">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Active Errors</h5>
              <Badge bg="danger">{errors.length}</Badge>
            </Card.Header>
            <Card.Body>
              {errors.length > 0 ? (
                <Table hover responsive>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Message</th>
                      <th>Count</th>
                      <th>Last Occurred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err) => (
                      <tr key={err._id}>
                        <td>
                          <Badge bg="secondary">{err.type}</Badge>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: "300px" }}>
                          {err.message}
                        </td>
                        <td>{err.count}</td>
                        <td>{new Date(err.lastOccurred).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-5">
                  <FaCheckCircle size={48} className="mb-2 opacity-25" />
                  <p>No active errors</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
}

// Helper component
function StatusIcon({ status }) {
  if (status === "ACTIVE") return <FaCheckCircle className="text-success" />;
  if (status === "INACTIVE") return <FaTimesCircle className="text-secondary" />;
  return <FaExclamationTriangle className="text-danger" />;
}
