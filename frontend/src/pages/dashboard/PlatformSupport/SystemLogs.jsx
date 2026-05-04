import React, { useEffect, useState, useMemo } from "react";
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
  Form,
  InputGroup,
  Pagination,
  Nav,
} from "react-bootstrap";
import {
  FaBug,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEye,
  FaTimes,
  FaCode,
  FaSync,
  FaArrowLeft,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import { GiMicroscope } from "react-icons/gi";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import { Modal } from "bootstrap/dist/js/bootstrap.bundle.min";

export default function SystemLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (levelFilter) params.set("level", levelFilter);
    if (moduleFilter) params.set("module", moduleFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", currentPage);
    params.set("limit", itemsPerPage);
    return params.toString();
  }, [search, levelFilter, moduleFilter, startDate, endDate, currentPage, itemsPerPage]);

  const fetchLogs = async () => {
    try {
      setError(null);
      const res = await api.get(`/platform-support/system-logs?${queryParams}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("System logs fetch error:", err);
      setError(err.response?.data?.message || "Failed to load system logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryParams]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
    toast.info("Refreshing system logs...");
  };

  const handleClearFilters = () => {
    setSearch("");
    setLevelFilter("");
    setModuleFilter("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  // Get level badge color
  const getLevelBadgeColor = (level) => {
    const colors = {
      ERROR: "danger",
      WARN: "warning",
      INFO: "info",
      DEBUG: "secondary",
    };
    return colors[level] || "secondary";
  };

  // Pagination
  const totalPages = Math.ceil(total / itemsPerPage);
  const pageNumbers = [];
  for (let i = 1; i <= Math.min(totalPages, 10); i++) {
    pageNumbers.push(i);
  }

  if (loading && logs.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <Container className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading System Logs</Alert.Heading>
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
            <GiMicroscope className="text-success me-2" />
            System Logs
          </h2>
          <p className="text-muted mb-0">
            Application logs - errors, warnings, info, debug messages
          </p>
        </div>
        <Button
          variant="outline-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <FaSync className={refreshing ? "spinner" : ""} /> Refresh
        </Button>
      </div>

      {/* LEVEL STATS SUMMARY */}
      <Row xs={1} md={4} className="g-3 mb-4">
        {["ERROR", "WARN", "INFO", "DEBUG"].map((level) => {
          const count = logs.filter((l) => l.level === level).length;
          return (
            <Col key={level}>
              <Card className={`border-${level === "ERROR" ? "danger" : level === "WARN" ? "warning" : level === "INFO" ? "info" : "secondary"}`}>
                <Card.Body className="text-center">
                  <Card.Title className="text-muted small mb-2">{level}</Card.Title>
                  <h2 className={`fw-bold ${level === "ERROR" ? "text-danger" : level === "WARN" ? "text-warning" : level === "INFO" ? "text-info" : "text-secondary"}`}>
                    {count}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* FILTERS CARD */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row xs={1} md={3} lg={5} className="g-3">
            <Col>
              <Form.Group>
                <Form.Label>Search Message</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search in logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Level</Form.Label>
                <Form.Select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                  <option value="DEBUG">DEBUG</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Module</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. auth, payment"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-2">
            <Col className="d-flex justify-content-end">
              <Button variant="outline-secondary" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* LOGS TABLE */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <Table hover responsive className="mb-0 table-hover">
              <thead className="table-light sticky-top" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: "160px" }}>Timestamp</th>
                  <th style={{ width: "80px" }}>Level</th>
                  <th>Module</th>
                  <th>Message</th>
                  <th style={{ width: "120px" }}>User</th>
                  <th style={{ width: "180px" }}>College</th>
                  <th style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log._id || idx}
                    className={log.level === "ERROR" ? "table-danger" : log.level === "WARN" ? "table-warning" : ""}
                  >
                    <td className="text-nowrap small">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <Badge bg={getLevelBadgeColor(log.level)}>
                        {log.level}
                      </Badge>
                    </td>
                    <td>
                      <code className="small text-primary">{log.module}</code>
                    </td>
                    <td>
                      <div
                        className="text-truncate"
                        style={{ maxWidth: "500px" }}
                        title={log.message}
                      >
                        {log.message}
                      </div>
                      {log.stack && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger"
                          onClick={() => viewLogDetails(log)}
                        >
                          View stack trace
                        </Button>
                      )}
                    </td>
                    <td>
                      {log.userId ? (
                        <div className="small">
                          <div>{log.userId.name}</div>
                          <small className="text-muted">{log.userId.role}</small>
                        </div>
                      ) : (
                        <span className="text-muted">System</span>
                      )}
                    </td>
                    <td className="small">
                      {log.college_id ? log.college_id.name : "N/A"}
                    </td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-1"
                        onClick={() => viewLogDetails(log)}
                        title="View Details"
                      >
                        <FaEye />
                      </Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <GiMicroscope size={48} className="mb-2 opacity-25" />
                      <p>No logs found matching your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination>
            <Pagination.Prev
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            />
            {pageNumbers.map((num) => (
              <Pagination.Item
                key={num}
                active={num === currentPage}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* LOG DETAILS MODAL */}
      <Modal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        size="xl"
        scrollable
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCode className="me-2" />
            Log Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Level:</strong> <Badge bg={getLevelBadgeColor(selectedLog.level)}>{selectedLog.level}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Module:</strong> <code>{selectedLog.module}</code>
                </Col>
                <Col md={6}>
                  <strong>User:</strong> {selectedLog.userId?.name || "System"} ({selectedLog.userId?.role})
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>IP Address:</strong> <code>{selectedLog.ip || "N/A"}</code>
                </Col>
                <Col md={6}>
                  <strong>College:</strong> {selectedLog.college_id?.name || "N/A"}
                </Col>
              </Row>
              <hr />
              <h6>Message</h6>
              <Card className="bg-light mb-3">
                <Card.Body>
                  <p className="mb-0">{selectedLog.message}</p>
                </Card.Body>
              </Card>

              {selectedLog.stack && (
                <>
                  <h6>Stack Trace</h6>
                  <Card className="bg-dark text-light mb-3">
                    <Card.Body>
                      <pre style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {selectedLog.stack}
                      </pre>
                    </Card.Body>
                  </Card>
                </>
              )}

              {selectedLog.request && (
                <>
                  <h6>Request Info</h6>
                  <Card className="bg-light mb-3">
                    <Card.Body>
                      <pre style={{ fontSize: "0.85rem" }}>
{JSON.stringify(selectedLog.request, null, 2)}
                      </pre>
                    </Card.Body>
                  </Card>
                </>
              )}

              {selectedLog.response && (
                <>
                  <h6>Response Info</h6>
                  <Card className="bg-light">
                    <Card.Body>
                      <pre style={{ fontSize: "0.85rem" }}>
{JSON.stringify(selectedLog.response, null, 2)}
                      </pre>
                    </Card.Body>
                  </Card>
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
