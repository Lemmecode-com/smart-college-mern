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
  Tab,
  Form,
  InputGroup,
} from "react-bootstrap";
import {
  FaCog,
  FaSync,
  FaArrowLeft,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaToggleOn,
  FaToggleOff,
  FaCheck,
  FaExclamationTriangle,
  FaEnvelope,
  FaCreditCard,
  FaUniversity,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";

export default function ConfigurationViewer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Config sections
  const [globalConfig, setGlobalConfig] = useState(null);
  const [collegeConfigs, setCollegeConfigs] = useState([]);
  const [featureFlags, setFeatureFlags] = useState(null);

  const fetchConfig = async () => {
    try {
      const [
        globalRes,
        collegesRes,
        flagsRes,
      ] = await Promise.all([
        api.get("/platform-support/config/global"),
        api.get("/platform-support/config/colleges"),
        api.get("/platform-support/config/features"),
      ]);
      setGlobalConfig(globalRes.data?.config || {});
      setCollegeConfigs(collegesRes.data?.colleges || []);
      setFeatureFlags(flagsRes.data?.flags || {});
    } catch (err) {
      console.error("Config fetch error:", err);
      setError(err.response?.data?.message || "Failed to load configuration");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConfig();
    toast.info("Refreshing configuration...");
  };

  const toggleFeature = async (featureName) => {
    try {
      await api.post(`/platform-support/config/features/toggle`, { feature: featureName });
      toast.success(`Feature "${featureName}" toggled`);
      fetchConfig();
    } catch (err) {
      toast.error("Failed to toggle feature");
    }
  };

  const maskSecret = (value) => {
    if (!value) return "Not set";
    if (value.length <= 8) return "••••••••";
    return value.substring(0, 6) + "••••••••";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 className="mb-0">
            <FaCog className="text-secondary me-2" />
            System Configuration
          </h2>
          <p className="text-muted mb-0">
            View-only access to platform settings and integrations
          </p>
        </div>
        <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
          <FaSync className={refreshing ? "spinner" : ""} /> Refresh
        </Button>
      </div>

      <Tab.Container id="config-tabs" defaultActiveKey="global">
        <Row>
          <Col sm={3}>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="global"><FaCog className="me-2" /> Global Settings</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="email"><FaEnvelope className="me-2" /> Email Configuration</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="payment"><FaCreditCard className="me-2" /> Payment Gateways</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="features"><FaToggleOn className="me-2" /> Feature Flags</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="colleges"><FaUniversity className="me-2" /> College Configs</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col sm={9}>
            <Tab.Content>
              {/* GLOBAL SETTINGS TAB */}
              <Tab.Pane eventKey="global">
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Global System Settings</h5>
                  </Card.Header>
                  <Card.Body>
                    {globalConfig ? (
                      <div>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Platform Name:</strong> {globalConfig.platformName || "N/A"}
                          </Col>
                          <Col md={6}>
                            <strong>Version:</strong> {globalConfig.version || "N/A"}
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Environment:</strong>{" "}
                            <Badge bg={globalConfig.env === "production" ? "danger" : "warning"}>
                              {globalConfig.env?.toUpperCase() || "N/A"}
                            </Badge>
                          </Col>
                          <Col md={6}>
                            <strong>Maintenance Mode:</strong>{" "}
                            <Badge bg={globalConfig.maintenanceMode ? "warning" : "success"}>
                              {globalConfig.maintenanceMode ? "ENABLED" : "DISABLED"}
                            </Badge>
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Max File Upload (MB):</strong> {globalConfig.maxFileUpload || "N/A"}
                          </Col>
                          <Col md={6}>
                            <strong>Session Timeout (mins):</strong> {globalConfig.sessionTimeout || "N/A"}
                          </Col>
                        </Row>
                        <hr />
                        <h6>Rate Limits</h6>
                        <Row>
                          <Col md={4}>
                            <strong>API/Min (default):</strong> {globalConfig.rateLimitDefault || "N/A"}
                          </Col>
                          <Col md={4}>
                            <strong>API/Min (authenticated):</strong> {globalConfig.rateLimitAuth || "N/A"}
                          </Col>
                          <Col md={4}>
                            <strong>Upload Limit/Day:</strong> {globalConfig.uploadLimitDay || "N/A"}
                          </Col>
                        </Row>
                      </div>
                    ) : (
                      <p className="text-muted">No global configuration data</p>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* EMAIL CONFIG TAB */}
              <Tab.Pane eventKey="email">
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Email Provider Configuration</h5>
                  </Card.Header>
                  <Card.Body>
                    {globalConfig?.email ? (
                      <div>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Provider:</strong> {globalConfig.email.provider || "N/A"}
                          </Col>
                          <Col md={6}>
                            <strong>Host:</strong> <code>{globalConfig.email.host || "N/A"}</code>
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Port:</strong> {globalConfig.email.port || "N/A"}
                          </Col>
                          <Col md={6}>
                            <strong>From Address:</strong> {globalConfig.email.fromAddress || "N/A"}
                          </Col>
                        </Row>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>From Name:</strong> {globalConfig.email.fromName || "N/A"}
                          </Col>
                          <Col md={6}>
                            <strong>Status:</strong>{" "}
                            <Badge bg={globalConfig.email.enabled ? "success" : "secondary"}>
                              {globalConfig.email.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </Col>
                        </Row>
                        <Alert variant="warning" className="mt-3">
                          <FaExclamationTriangle className="me-2" />
                          <strong>Credentials are masked for security.</strong> Full email config is only visible to Super Admin.
                        </Alert>
                      </div>
                    ) : (
                      <p className="text-muted">Email configuration not set</p>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* PAYMENT TAB */}
              <Tab.Pane eventKey="payment">
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Payment Gateway Configuration</h5>
                  </Card.Header>
                  <Card.Body>
                    {globalConfig?.payment ? (
                      <div>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Stripe Enabled:</strong>{" "}
                            <Badge bg={globalConfig.payment.stripeEnabled ? "success" : "secondary"}>
                              {globalConfig.payment.stripeEnabled ? "Yes" : "No"}
                            </Badge>
                          </Col>
                          <Col md={6}>
                            <strong>Razorpay Enabled:</strong>{" "}
                            <Badge bg={globalConfig.payment.razorpayEnabled ? "success" : "secondary"}>
                              {globalConfig.payment.razorpayEnabled ? "Yes" : "No"}
                            </Badge>
                          </Col>
                        </Row>
                        <hr />
                        <h6>Stripe</h6>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Publishable Key:</strong> <code>{maskSecret(globalConfig.payment.stripeKey)}</code>
                            <Button variant="link" size="sm" className="ms-2" onClick={() => copyToClipboard(globalConfig.payment.stripeKey)}>
                              <FaEye />
                            </Button>
                          </Col>
                          <Col md={6}>
                            <strong>Webhook Status:</strong>{" "}
                            <Badge bg={globalConfig.payment.stripeWebhookVerified ? "success" : "warning"}>
                              {globalConfig.payment.stripeWebhookVerified ? "Verified" : "Not Verified"}
                            </Badge>
                          </Col>
                        </Row>
                        <hr />
                        <h6>Razorpay</h6>
                        <Row className="mb-3">
                          <Col md={6}>
                            <strong>Key ID:</strong> <code>{maskSecret(globalConfig.payment.razorpayKeyId)}</code>
                          </Col>
                          <Col md={6}>
                            <strong>Webhook Status:</strong>{" "}
                            <Badge bg={globalConfig.payment.razorpayWebhookVerified ? "success" : "warning"}>
                              {globalConfig.payment.razorpayWebhookVerified ? "Verified" : "Not Verified"}
                            </Badge>
                          </Col>
                        </Row>
                      </div>
                    ) : (
                      <p className="text-muted">Payment configuration not set</p>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* FEATURE FLAGS TAB */}
              <Tab.Pane eventKey="features">
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">Feature Flags</h5>
                  </Card.Header>
                  <Card.Body>
                    {featureFlags ? (
                      <div>
                        {Object.entries(featureFlags).map(([key, value]) => (
                          <div key={key} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                              <strong>{key.replace(/_/g, " ").toUpperCase()}</strong>
                              <br />
                              <small className="text-muted">{getFeatureDescription(key)}</small>
                            </div>
                            <Button
                              variant={value ? "success" : "secondary"}
                              size="sm"
                              onClick={() => toggleFeature(key)}
                            >
                              {value ? (
                                <>
                                  <FaToggleOn className="me-1" /> Enabled
                                </>
                              ) : (
                                <>
                                  <FaToggleOff className="me-1" /> Disabled
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">No feature flags defined</p>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* COLLEGE CONFIGS TAB */}
              <Tab.Pane eventKey="colleges">
                <Card className="shadow-sm">
                  <Card.Header className="bg-white">
                    <h5 className="mb-0">College-Specific Configurations</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {collegeConfigs.length > 0 ? (
                      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                        <Table hover responsive className="mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>College</th>
                              <th>Email Setup</th>
                              <th>Payment Gateway</th>
                              <th>Timetable Access</th>
                              <th>Features Enabled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {collegeConfigs.map((col) => (
                              <tr key={col._id}>
                                <td>
                                  <strong>{col.name}</strong>
                                  <br />
                                  <small className="text-muted">{col.code}</small>
                                </td>
                                <td>
                                  <Badge bg={col.emailEnabled ? "success" : "danger"}>
                                    {col.emailEnabled ? "Configured" : "Not Configured"}
                                  </Badge>
                                </td>
                                <td>
                                  {col.paymentGateway === "STRIPE" && <Badge bg="primary">Stripe</Badge>}
                                  {col.paymentGateway === "RAZORPAY" && <Badge bg="info">Razorpay</Badge>}
                                  {!col.paymentGateway && <Badge bg="secondary">None</Badge>}
                                </td>
                                <td>
                                  <Badge bg={col.timetableAccess ? "success" : "secondary"}>
                                    {col.timetableAccess ? "Enabled" : "Disabled"}
                                  </Badge>
                                </td>
                                <td>
                                  <div className="d-flex flex-wrap gap-1">
                                    {col.features?.map((f, i) => (
                                      <Badge key={i} bg="secondary" className="small">{f}</Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-5">
                        <FaUniversity size={48} className="mb-2 opacity-25" />
                        <p>No college configurations found</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
}

// Helper to generate description for feature flags
function getFeatureDescription(key) {
  const descriptions = {
    ONLINE_EXAM: "Enable online exam module for college",
    PARENT_PORTAL: "Allow parent guardian access to student data",
    MOBILE_APP: "Enable mobile app integration",
    BIOMETRIC_ATTENDANCE: "Allow biometric attendance devices",
    AUTO_FEE_REMINDER: "Automatic fee reminder notifications",
    SMS_NOTIFICATIONS: "Send SMS for important alerts",
  };
  return descriptions[key] || "Toggle this feature for all colleges";
}
