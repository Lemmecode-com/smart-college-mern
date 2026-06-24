import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  Modal,
  Form,
} from "react-bootstrap";
import {
  FaCog,
  FaToggleOn,
  FaToggleOff,
  FaShieldAlt,
  FaSave,
  FaArrowLeft,
  FaInfoCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import api from "../../../api/axios";

export default function PlatformSupportConfig() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch current feature flags
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/platform-support/config/features");
      setFeatures(response.data?.features || []);
    } catch (err) {
      console.error("Error fetching features:", err);
      setError(err.response?.data?.message || "Failed to load feature configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  // Toggle feature
  const toggleFeature = async (featureName, currentValue) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.post("/platform-support/config/features/toggle", {
        key: featureName,
        value: !currentValue,
        description: features.find(f => f.name === featureName)?.description || featureName,
      });

      setSuccess(`Feature "${featureName.replace('PLATFORM_SUPPORT_', '').replace(/_/g, ' ')}" has been ${!currentValue ? 'enabled' : 'disabled'}`);

      // Refresh features
      await fetchFeatures();
    } catch (err) {
      console.error("Error toggling feature:", err);
      setError(err.response?.data?.message || "Failed to update feature");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <FaShieldAlt className="text-primary me-2" />
            Platform Support Configuration
          </h2>
          <p className="text-muted mb-0">
            Manage dashboard features for PLATFORM_SUPPORT role
          </p>
        </div>
        <Button
          variant="outline-secondary"
          onClick={() => navigate("/super-admin/dashboard")}
        >
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* ALERTS */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <FaInfoCircle className="me-2" />
          {success}
        </Alert>
      )}

      {/* INFO CARD */}
      <Card className="mb-4 border-info">
        <Card.Body>
          <Card.Title className="text-info">
            <FaInfoCircle className="me-2" />
            About Platform Support Features
          </Card.Title>
          <p className="mb-0">
            These feature flags control which monitoring and support tools are available to users with the PLATFORM_SUPPORT role.
            Only enabled features will appear in their dashboard. Changes take effect immediately.
          </p>
        </Card.Body>
      </Card>

      {/* FEATURES GRID */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {features.map((feature) => (
          <Col key={feature.name}>
            <Card className={`h-100 ${feature.enabled ? 'border-success' : 'border-secondary'}`}>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div
                    className={`me-2 p-2 rounded-circle ${
                      feature.enabled ? 'bg-success' : 'bg-secondary'
                    }`}
                  >
                    <FaCog className="text-white" size={14} />
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold">
                      {feature.name.replace('PLATFORM_SUPPORT_', '').replace(/_/g, ' ')}
                    </h6>
                  </div>
                </div>
                <Badge bg={feature.enabled ? 'success' : 'secondary'}>
                  {feature.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-3">{feature.description}</p>
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Category: <strong>{feature.category}</strong>
                  </small>
                  <Button
                    variant={feature.enabled ? 'outline-danger' : 'outline-success'}
                    size="sm"
                    onClick={() => toggleFeature(feature.name, feature.enabled)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Spinner animation="border" size="sm" />
                    ) : feature.enabled ? (
                      <>
                        <FaToggleOff className="me-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <FaToggleOn className="me-1" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* SUMMARY CARD */}
      <Card className="mt-4 border-primary">
        <Card.Header>
          <h5 className="mb-0">Configuration Summary</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <div className="text-center">
                <h3 className="text-primary">{features.filter(f => f.enabled).length}</h3>
                <p className="text-muted mb-0">Enabled Features</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <h3 className="text-secondary">{features.filter(f => !f.enabled).length}</h3>
                <p className="text-muted mb-0">Disabled Features</p>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <h3 className="text-info">{features.length}</h3>
                <p className="text-muted mb-0">Total Features</p>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}