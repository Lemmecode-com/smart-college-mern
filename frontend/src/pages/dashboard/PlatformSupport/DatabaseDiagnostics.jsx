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
  FaDatabase,
  FaServer,
  FaHdd,
  FaClock,
  FaArrowLeft,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaBolt,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";

export default function DatabaseDiagnostics() {
  const navigate = useNavigate();
  const [dbHealth, setDbHealth] = useState(null);
  const [collections, setCollections] = useState([]);
  const [slowQueries, setSlowQueries] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [
        healthRes,
        collectionsRes,
        slowRes,
        backupsRes,
      ] = await Promise.all([
        api.get("/platform-support/health/database"),
        api.get("/platform-support/database/collections"),
        api.get("/platform-support/database/slow-queries"),
        api.get("/platform-support/database/backups"),
      ]);
      setDbHealth(healthRes.data?.health || null);
      setCollections(collectionsRes.data?.collections || []);
      setSlowQueries(slowRes.data?.queries || []);
      setBackups(backupsRes.data?.backups || []);
    } catch (err) {
      console.error("Database diagnostics fetch error:", err);
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    toast.info("Refreshing database diagnostics...");
  };

  const getConnectionStatus = (connected) => {
    if (connected) return <Badge bg="success"><FaCheckCircle /> Connected</Badge>;
    return <Badge bg="danger"><FaTimesCircle /> Disconnected</Badge>;
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
          <Alert.Heading>Database Error</Alert.Heading>
          <p>{error}</p>
          <Button onClick={handleRefresh} variant="outline-danger">Retry</Button>
        </Alert>
      </Container>
    );
  }

  const connection = dbHealth?.connected ? "Connected" : "Disconnected";
  const collectionCount = collections?.length || 0;
  const slowCount = slowQueries?.length || 0;

  return (
    <Container fluid className="p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 className="mb-0">
            <FaDatabase className="text-primary me-2" />
            Database Diagnostics
          </h2>
          <p className="text-muted mb-0">
            MongoDB connection health, collections info, slow queries, backup status
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={refreshing ? "spinner" : ""} /> Refresh
          </Button>
          <Button variant="outline-success" onClick={() => toast.info("Manual backup triggered")}>
            <FaBolt /> Trigger Backup
          </Button>
        </div>
      </div>

      {/* CONNECTION STATUS */}
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className={`border-${dbHealth?.connected ? "success" : "danger"}`}>
            <Card.Body className="text-center">
              <Card.Title className="text-muted small mb-2">Connection Status</Card.Title>
              {getConnectionStatus(dbHealth?.connected)}
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-info">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small mb-2">Collections</Card.Title>
              <h2 className="text-info">{collectionCount}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Card.Title className="text-muted small mb-2">Slow Queries (Last 24h)</Card.Title>
              <h2 className="text-warning">{slowCount}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row xs={1} lg={2} className="g-4 mb-4">
        {/* Connection Details */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaServer className="text-success" />
                connection Information
              </h5>
            </Card.Header>
            <Card.Body>
              {dbHealth ? (
                <div className="mb-3">
                  <div className="mb-2">
                    <strong>Status:</strong> {connection}
                  </div>
                  <div className="mb-2">
                    <strong>Databases:</strong>{" "}
                    {Array.isArray(dbHealth.databases) ? dbHealth.databases.join(", ") : "N/A"}
                  </div>
                  <div className="mb-2">
                    <strong>Total Collections:</strong> {dbHealth.collections || "N/A"}
                  </div>
                  <div>
                    <strong>Slow Queries Detected:</strong>{" "}
                    <Badge bg={slowCount > 0 ? "warning" : "success"}>{slowCount}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-muted">No connection data available</div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Collection Sizes */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <FaHdd className="text-info" />
                Collection Sizes
              </h5>
            </Card.Header>
            <Card.Body>
              {collections.length > 0 ? (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {collections.map((col, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{col.name}</span>
                        <span>{(col.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <ProgressBar
                        now={Math.min((col.size / 100000) * 100, 100)}
                        variant={col.size > 100000 ? "warning" : "success"}
                        style={{ height: "6px" }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No collection data</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SLOW QUERIES */}
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaClock className="text-warning" />
            Slow Queries (&gt;100ms)
            {slowCount > 0 && <Badge bg="warning" className="ms-auto">{slowCount}</Badge>}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {slowQueries.length > 0 ? (
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Operation</th>
                  <th>Collection</th>
                  <th>Query</th>
                  <th>Duration (ms)</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((q, idx) => (
                  <tr key={idx}>
                    <td>
                      <Badge bg={q.operation === "find" ? "info" : q.operation === "aggregate" ? "warning" : "secondary"}>
                        {q.operation}
                      </Badge>
                    </td>
                    <td>
                      <code>{q.collection}</code>
                    </td>
                    <td>
                      <code className="small text-truncate d-inline-block" style={{ maxWidth: "300px" }}>
                        {JSON.stringify(q.query)}
                      </code>
                    </td>
                    <td>
                      <Badge bg={q.duration > 500 ? "danger" : "warning"}>
                        {q.duration.toFixed(0)}ms
                      </Badge>
                    </td>
                    <td>{new Date(q.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">
              <FaCheckCircle size={48} className="mb-2 opacity-25" />
              <p>No slow queries detected. Good!</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* BACKUP STATUS */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FaDatabase className="text-primary" />
            Backup History
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {backups.length > 0 ? (
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, idx) => (
                  <tr key={idx}>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                    <td>
                      <Badge bg="secondary">{b.type || "AUTOMATIC"}</Badge>
                    </td>
                    <td>{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td>
                      <Badge bg={b.success ? "success" : "danger"}>
                        {b.success ? "Success" : "Failed"}
                      </Badge>
                    </td>
                    <td>
                      <code className="small">{b.location || "Cloud"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-5">
              <FaDatabase size={48} className="mb-2 opacity-25" />
              <p>No backup records found. Check backup configuration.</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* INFO ALERT */}
      <Alert variant="info" className="mt-4">
        <FaInfoCircle className="me-2" />
        <strong>Note:</strong> Database diagnostics are based on last health check. For real-time
        metrics, enable MongoDB monitoring and slow query logging in your deployment.
      </Alert>
    </Container>
  );
}

function FaInfoCircle({ className }) {
  return <i className={`fa fa-info-circle ${className || ""}`} />;
}
