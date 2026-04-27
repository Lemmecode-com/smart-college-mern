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
  InputGroup,
  Form,
} from "react-bootstrap";
import {
  FaBuilding,
  FaHeartbeat,
  FaSearch,
  FaSync,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";

export default function CollegeHealthOverview() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterHealth, setFilterHealth] = useState("");

  const fetchColleges = async () => {
    try {
      const res = await api.get("/platform-support/colleges/health");
      setColleges(res.data?.colleges || []);
    } catch (err) {
      console.error("College health fetch error:", err);
      setError(err.response?.data?.message || "Failed to load colleges");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchColleges();
    toast.info("Refreshing college health data...");
  };

  // Filter colleges
  const filteredColleges = colleges.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase());
    const matchesHealth =
      !filterHealth ||
      (filterHealth === "healthy" && c.healthScore >= 80) ||
      (filterHealth === "degraded" && c.healthScore >= 60 && c.healthScore < 80) ||
      (filterHealth === "critical" && c.healthScore < 60);
    return matchesSearch && matchesHealth;
  });

  // Sort by health score (worst first)
  filteredColleges.sort((a, b) => a.healthScore - b.healthScore);

  const getHealthColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "danger";
  };

  const getHealthIcon = (score) => {
    if (score >= 80) return <FaCheckCircle className="text-success" />;
    if (score >= 60) return <FaExclamationTriangle className="text-warning" />;
    return <FaTimesCircle className="text-danger" />;
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
            <FaBuilding className="text-primary me-2" />
            Colleges Health Overview
          </h2>
          <p className="text-muted mb-0">
            System-wide health scores and diagnostics for all colleges
          </p>
        </div>
        <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
          <FaSync className={refreshing ? "spinner" : ""} /> Refresh
        </Button>
      </div>

      {/* STATS SUMMARY */}
      <Row xs={1} md={4} className="g-3 mb-4">
        <Col>
          <Card className="border-success">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Healthy</Card.Title>
              <h2 className="text-success">
                {colleges.filter((c) => c.healthScore >= 80).length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Degraded</Card.Title>
              <h2 className="text-warning">
                {colleges.filter((c) => c.healthScore >= 60 && c.healthScore < 80).length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Critical</Card.Title>
              <h2 className="text-danger">
                {colleges.filter((c) => c.healthScore < 60).length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-secondary">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small">Total Colleges</Card.Title>
              <h2 className="text-secondary">{colleges.length}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row xs={1} md={3} className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search Colleges</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Health Status</Form.Label>
                <Form.Select
                  value={filterHealth}
                  onChange={(e) => setFilterHealth(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="healthy">Healthy (≥80)</option>
                  <option value="degraded">Degraded (60-79)</option>
                  <option value="critical">Critical (&lt;60)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearch("");
                  setFilterHealth("");
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* COLLEGES TABLE */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {filteredColleges.length > 0 ? (
            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <Table hover responsive className="mb-0">
                <thead className="table-light sticky-top" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: "30%" }}>College</th>
                    <th style={{ width: "20%" }}>Health Score</th>
                    <th style={{ width: "20%" }}>Status</th>
                    <th style={{ width: "30%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColleges.map((college) => (
                    <tr key={college._id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              width: "40px",
                              height: "40px",
                              backgroundColor: `${getHealthColor(college.healthScore)}20`,
                            }}
                          >
                            {getHealthIcon(college.healthScore)}
                          </div>
                          <div>
                            <strong>{college.name}</strong>
                            <br />
                            <small className="text-muted">{college.code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="progress bg-light"
                            style={{ width: "80px", height: "10px" }}
                          >
                            <div
                              className={`progress-bar bg-${getHealthColor(college.healthScore)}`}
                              style={{ width: `${college.healthScore}%` }}
                            />
                          </div>
                          <span className="fw-bold h5 mb-0">{college.healthScore}</span>
                        </div>
                      </td>
                      <td>
                        <Badge bg={getHealthColor(college.healthScore)}>
                          {college.healthScore >= 80
                            ? "Healthy"
                            : college.healthScore >= 60
                              ? "Degraded"
                              : "Critical"}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/platform-support/colleges/${college._id}/diagnostics`)}
                            title="View Diagnostics"
                          >
                            <FaChartLine /> Diagnostics
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => navigate(`/colleges/${college._id}`)}
                          >
                            View College
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <FaBuilding size={48} className="mb-2 opacity-25" />
              <p>No colleges match your filters</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
