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
  ProgressBar,
} from "react-bootstrap";
import {
  FaMoneyBillWave,
  FaEnvelope,
  FaSms,
  FaCloud,
  FaSync,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaPlug,
  FaBolt,
  FaClock,
  FaTachometerAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";

export default function IntegrationMonitoring() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState({});

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/platform-support/health/integrations");
      setIntegrations(res.data?.integrations || []);
    } catch (err) {
      console.error("Integrations fetch error:", err);
      setError(err.response?.data?.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    const interval = setInterval(fetchIntegrations, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTest = async (serviceName) => {
    setTesting({ ...testing, [serviceName]: true });
    try {
      await api.post(`/platform-support/health/test-integration/${serviceName}`);
      toast.success(`${serviceName} health check completed`);
      fetchIntegrations(); // Refresh
    } catch (err) {
      toast.error(`Failed to test ${serviceName}: ${err.response?.data?.message}`);
    } finally {
      setTesting({ ...testing, [serviceName]: false });
    }
  };

  const getServiceIcon = (service) => {
    const iconClass = "me-2";
    if (service.includes("EMAIL")) return <FaEnvelope className={iconClass} />;
    if (service.includes("SMS")) return <FaSms className={iconClass} />;
    if (service.includes("STRIPE") || service.includes("RAZORPAY"))
      return <FaMoneyBillWave className={iconClass} />;
    if (service.includes("CLOUD")) return <FaCloud className={iconClass} />;
    return <FaPlug className={iconClass} />;
  };

  const getHealthScoreColor = (score) => {
    if (score >= 90) return "success";
    if (score >= 70) return "warning";
    return "danger";
  };

  // Group integrations by category
  const paymentGateways = integrations.filter((i) =>
    i.service.includes("PAYMENT")
  );
  const communication = integrations.filter((i) =>
    i.service.includes("EMAIL") || i.service.includes("SMS")
  );
  const other = integrations.filter((i) =>
    !i.service.includes("PAYMENT") && !i.service.includes("EMAIL") && !i.service.includes("SMS")
  );

  const renderIntegrationCard = (integration) => (
    <Card
      key={integration._id}
      className={`h-100 border-${integration.status === "ACTIVE" ? "success" : integration.status === "INACTIVE" ? "secondary" : "danger"}`}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <Card.Title className="mb-1">
              {getServiceIcon(integration.service)}
              {integration.service.replace(/_/g, " ")}
            </Card.Title>
            <Badge
              bg={
                integration.status === "ACTIVE"
                  ? "success"
                  : integration.status === "INACTIVE"
                    ? "secondary"
                    : "danger"
              }
            >
              {integration.status}
            </Badge>
          </div>
          <FaTachometerAlt
            className={integration.healthScore >= 80 ? "text-success" : integration.healthScore >= 60 ? "text-warning" : "text-danger"}
            size={24}
          />
        </div>

        {/* Health Score */}
        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-1">
            <span>Health Score</span>
            <span className="fw-bold">{integration.healthScore || 100}%</span>
          </div>
          <ProgressBar
            now={integration.healthScore || 100}
            variant={getHealthScoreColor(integration.healthScore)}
            style={{ height: "8px" }}
          />
        </div>

        {/* Metrics */}
        <div className="small text-muted">
          {integration.responseTimeMs && (
            <div className="mb-1">
              Latency: <strong>{integration.responseTimeMs}ms</strong>
            </div>
          )}
          {integration.consecutiveFailures > 0 && (
            <div className="mb-1">
              Failures: <strong className="text-danger">{integration.consecutiveFailures}</strong>
            </div>
          )}
          <div className="mb-1">
            Last Check:{" "}
            {new Date(integration.lastCheck).toLocaleTimeString()}
          </div>
          {integration.lastSuccess && (
            <div className="mb-1 text-success">
              <FaCheck size={10} className="me-1" />
              Last success: {new Date(integration.lastSuccess).toLocaleDateString()}
            </div>
          )}
          {integration.lastFailure && (
            <div className="mb-1 text-danger">
              <FaTimes size={10} className="me-1" />
              Last failure: {new Date(integration.lastFailure).toLocaleDateString()}
            </div>
          )}
        </div>

        {integration.errorMessage && (
          <Alert variant="danger" className="mt-2 py-2 small">
            <FaExclamationTriangle className="me-1" />
            {integration.errorMessage}
          </Alert>
        )}

        <Button
          variant="outline-primary"
          size="sm"
          className="w-100 mt-2"
          onClick={() => handleTest(integration.service)}
          disabled={testing[integration.service]}
        >
          <FaSync className={testing[integration.service] ? "spinner" : ""} />
          {" "}Test Connection
        </Button>
      </Card.Body>
    </Card>
  );

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
          <Button onClick={fetchIntegrations} variant="outline-danger">
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 className="mb-0">
            <FaBolt className="text-warning me-2" />
            Integration Monitoring
          </h2>
          <p className="text-muted mb-0">
            Third-party services health & connectivity status
          </p>
        </div>
        <Button variant="outline-primary" onClick={fetchIntegrations}>
          <FaSync /> Refresh
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className="border-success">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Healthy</Card.Title>
              <h2 className="text-success">
                {integrations.filter((i) => i.status === "ACTIVE").length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Degraded</Card.Title>
              <h2 className="text-warning">
                {integrations.filter((i) => i.status === "INACTIVE").length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Failed</Card.Title>
              <h2 className="text-danger">
                {integrations.filter((i) => i.status === "ERROR").length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* PAYMENT GATEWAYS */}
      <h4 className="mb-3">
        <FaMoneyBillWave className="text-primary me-2" />
        Payment Gateways
      </h4>
      <Row xs={1} md={2} className="g-4 mb-4">
        {paymentGateways.map(renderIntegrationCard)}
      </Row>

      {/* COMMUNICATION SERVICES */}
      <h4 className="mb-3">
        <FaEnvelope className="text-info me-2" />
        Communication Services
      </h4>
      <Row xs={1} md={2} className="g-4 mb-4">
        {communication.map(renderIntegrationCard)}
      </Row>

      {/* OTHER SERVICES */}
      <h4 className="mb-3">
        <FaCloud className="text-secondary me-2" />
        Other Integrations
      </h4>
      <Row xs={1} md={2} className="g-4 mb-4">
        {other.map(renderIntegrationCard)}
      </Row>

      {/* EMPTY STATE */}
      {integrations.length === 0 && (
        <Alert variant="info">
          <FaPlug className="me-2" />
          No integration health data available yet. Services will appear here once health checks are initiated.
        </Alert>
      )}

      {/* INFO CARD */}
      <Card className="bg-light mt-4">
        <Card.Body>
          <h6><FaInfoCircle className="me-2" /> About Integration Health</h6>
          <p className="small text-muted mb-0">
            Each integration is periodically checked for availability. Health score is calculated based on
            uptime, response time, and consecutive failures. Click "Test Connection" to manually verify
            connectivity. Failed integrations are highlighted for immediate attention.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
