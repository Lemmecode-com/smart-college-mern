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
  DropdownButton,
  Dropdown,
  Modal,
} from "react-bootstrap";
import {
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaFlag,
  FaTimes,
  FaCalendarAlt,
  FaUser,
  FaBuilding,
  FaLayerGroup,
  FaFileAlt,
  FaSync,
  FaArrowLeft,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import ExportButtons from "../../../components/ExportButtons";

export default function AuditLogsViewer() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Modal for viewing full log details
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Computed query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (collegeFilter) params.set("college_id", collegeFilter);
    if (userFilter) params.set("userId", userFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (resourceFilter) params.set("resourceType", resourceFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", currentPage);
    params.set("limit", itemsPerPage);
    return params.toString();
  }, [search, collegeFilter, userFilter, actionFilter, resourceFilter, startDate, endDate, currentPage, itemsPerPage]);

  // Fetch data
  const fetchLogs = async () => {
    try {
      setError(null);
      const res = await api.get(`/platform-support/audit-logs?${queryParams}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Audit logs fetch error:", err);
      setError(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryParams]);

  // Load initial filter options (colleges, users)
  const [colleges, setColleges] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [collegesRes] = await Promise.all([
          api.get("/college/list?limit=100"),
          // Could also fetch top users for filter
        ]);
        setColleges(collegesRes.data.data || []);
      } catch (err) {
        console.warn("Failed to load filter options:", err);
      }
    };
    fetchFilters();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
    toast.info("Refreshing audit logs...");
  };

  const handleExport = (type) => {
    // Build export URL with current filters
    const exportUrl = `/platform-support/audit-logs/export?${queryParams}&format=${type}`;
    // This would require a backend export endpoint - for now just show message
    toast.info(`Export to ${type.toUpperCase()} feature coming soon!`);
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(total / itemsPerPage);
  const pageNumbers = [];
  for (let i = 1; i <= Math.min(totalPages, 10); i++) {
    pageNumbers.push(i);
  }

  // Format action badge color
  const getActionBadgeColor = (action) => {
    const colors = {
      CREATE: "success",
      UPDATE: "warning",
      DELETE: "danger",
      LOGIN: "info",
      LOGOUT: "secondary",
      PAYMENT: "primary",
      ATTENDANCE: "info",
      EXAM: "warning",
    };
    return colors[action] || "secondary";
  };

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
          <Alert.Heading>Error Loading Audit Logs</Alert.Heading>
          <p>{error}</p>
          <Button onClick={handleRefresh} variant="outline-danger">
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
            <FaArrowLeft /> Back to Dashboard
          </Button>
          <h2 className="mb-0">
            <FaFileAlt className="text-info me-2" />
            Audit Logs
          </h2>
          <p className="text-muted mb-0">
            System-wide activity tracking & security audit trail
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={refreshing ? "spinner" : ""} /> Refresh
          </Button>
          <DropdownButton
            as="button"
            variant="outline-success"
            title="Export"
            id="export-dropdown"
          >
            <Dropdown.Item onClick={() => handleExport("csv")}>Export as CSV</Dropdown.Item>
            <Dropdown.Item onClick={() => handleExport("pdf")}>Export as PDF</Dropdown.Item>
          </DropdownButton>
        </div>
      </div>

      {/* FILTERS CARD */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row xs={1} md={3} lg={5} className="g-3">
            {/* Search */}
            <Col>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Action, user, target..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>

            {/* College Filter */}
            <Col>
              <Form.Group>
                <Form.Label>College</Form.Label>
                <Form.Select
                  value={collegeFilter}
                  onChange={(e) => setCollegeFilter(e.target.value)}
                >
                  <option value="">All Colleges</option>
                  {colleges.map((college) => (
                    <option key={college._id} value={college._id}>
                      {college.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Action Filter */}
            <Col>
              <Form.Group>
                <Form.Label>Action</Form.Label>
                <Form.Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="LOGOUT">LOGOUT</option>
                  <option value="PAYMENT">PAYMENT</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Resource Type Filter */}
            <Col>
              <Form.Group>
                <Form.Label>Resource</Form.Label>
                <Form.Select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                >
                  <option value="">All Resources</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="DEPARTMENT">Department</option>
                  <option value="COURSE">Course</option>
                  <option value="FEE">Fee</option>
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="EXAM">Exam</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Date Range */}
            <Col>
              <Form.Group>
                <Form.Label>Date Range</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaCalendarAlt />
                  </InputGroup.Text>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start"
                  />
                  <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End"
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mt-2">
            <Col className="d-flex justify-content-end">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCollegeFilter("");
                  setUserFilter("");
                  setActionFilter("");
                  setResourceFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* RESULTS SUMMARY */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted">
          Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, total)} of {total} logs
        </div>
        <div>
          <Form.Label className="me-2">Rows per page:</Form.Label>
          <Form.Select
            style={{ width: "auto", display: "inline-block" }}
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Form.Select>
        </div>
      </div>

      {/* LOGS TABLE */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ overflowX: "auto" }}>
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>College</th>
                  <th>IP Address</th>
                  <th>Changes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <Badge bg={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <FaUser className="text-muted" />
                        <div>
                          <div>{log.userId?.name || "System"}</div>
                          <small className="text-muted">{log.userId?.role || ""}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="secondary">
                        {log.resourceType || "UNKNOWN"}
                      </Badge>
                    </td>
                    <td>
                      {log.college_id ? (
                        <Link to={`/colleges/${log.college_id._id}`} className="text-decoration-none">
                          {log.college_id.name || log.college_id.code}
                        </Link>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <code className="small">{log.ipAddress || "N/A"}</code>
                    </td>
                    <td>
                      {log.changes ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0"
                          onClick={() => viewLogDetails(log)}
                        >
                          View changes
                        </Button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-1"
                        onClick={() => viewLogDetails(log)}
                      >
                        <FaEye /> Details
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => {
                          toast.info("Flagging audit log for review");
                          // TODO: Call API to flag
                        }}
                      >
                        <FaFlag />
                      </Button>
                    </td>
                  </tr>
                ))}
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
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileAlt className="me-2" />
            Audit Log Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Action:</strong>{" "}
                  <Badge bg={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Actor:</strong> {selectedLog.userId?.name || "System"} ({selectedLog.userId?.role})
                </Col>
                <Col md={6}>
                  <strong>Resource:</strong> {selectedLog.resourceType || "N/A"}
                </Col>
              </Row>
              {selectedLog.college_id && (
                <Row className="mb-3">
                  <Col>
                    <strong>College:</strong> {selectedLog.college_id.name} ({selectedLog.college_id.code})
                  </Col>
                </Row>
              )}
              <Row className="mb-3">
                <Col>
                  <strong>IP Address:</strong> <code>{selectedLog.ipAddress || "N/A"}</code>
                </Col>
              </Row>

              {/* Changes */}
              {selectedLog.changes && (
                <Card className="bg-light">
                  <Card.Header>Changes Made</Card.Header>
                  <Card.Body>
                    {Object.keys(selectedLog.changes).length > 0 ? (
                      <Table hover size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Before</th>
                            <th>After</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedLog.changes).map(([key, values]) => (
                            <tr key={key}>
                              <td><code>{key}</code></td>
                              <td>
                                {values.before !== undefined ? (
                                  <pre className="mb-0" style={{ fontSize: "0.85rem" }}>
                                    {JSON.stringify(values.before, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                {values.after !== undefined ? (
                                  <pre className="mb-0" style={{ fontSize: "0.85rem" }}>
                                    {JSON.stringify(values.after, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-muted mb-0">No detailed change information available</p>
                    )}
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
