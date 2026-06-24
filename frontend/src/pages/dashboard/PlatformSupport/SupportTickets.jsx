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
  ProgressBar,
} from "react-bootstrap";
import {
  FaTicketAlt,
  FaSearch,
  FaFilter,
  FaPlus,
  FaEye,
  FaTimes,
  FaUser,
  FaBuilding,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaPaperclip,
  FaSync,
  FaArrowLeft,
  FaFlag,
  FaComments,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import api from "../../../api/axios";

export default function SupportTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Colleges for filter
  const [colleges, setColleges] = useState([]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (collegeFilter) params.set("college_id", collegeFilter);
    if (search) params.set("search", search);
    params.set("page", currentPage);
    params.set("limit", itemsPerPage);
    return params.toString();
  }, [statusFilter, priorityFilter, categoryFilter, collegeFilter, search, currentPage, itemsPerPage]);

  const fetchTickets = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        api.get(`/platform-support/tickets?${queryParams}`),
        api.get("/platform-support/tickets/stats"),
      ]);
      setTickets(ticketsRes.data?.tickets || []);
      setStats(statsRes.data?.stats || []);
    } catch (err) {
      console.error("Tickets fetch error:", err);
      setError(err.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [queryParams]);

  useEffect(() => {
    // Fetch colleges for filter dropdown
    const fetchColleges = async () => {
      try {
        const res = await api.get("/college/list?limit=200");
        setColleges(res.data?.data || []);
      } catch (err) {
        console.warn("Failed to load colleges:", err);
      }
    };
    fetchColleges();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
    toast.info("Refreshing tickets...");
  };

  const handleCreateTicket = () => {
    // Open modal for new ticket
    setSelectedTicket(null);
    setShowModal(true);
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
      subject: formData.get("subject"),
      category: formData.get("category"),
      priority: formData.get("priority"),
      description: formData.get("description"),
      college_id: formData.get("college_id") || null,
    };

    setSubmitting(true);
    try {
      await api.post("/platform-support/tickets", data);
      toast.success("Ticket created successfully");
      setShowModal(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (ticketId, assigneeId) => {
    try {
      await api.put(`/platform-support/tickets/${ticketId}/assign`, { assigneeId });
      toast.success("Ticket assigned");
      fetchTickets();
    } catch (err) {
      toast.error("Failed to assign ticket");
    }
  };

  const handleResolve = async (ticketId, resolution) => {
    try {
      await api.put(`/platform-support/tickets/${ticketId}/resolve`, { resolution });
      toast.success("Ticket resolved");
      fetchTickets();
    } catch (err) {
      toast.error("Failed to resolve ticket");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/platform-support/tickets/${selectedTicket.ticketId}/comments`, {
        message: commentText,
      });
      toast.success("Comment added");
      setCommentText("");
      fetchTickets();
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      OPEN: "danger",
      IN_PROGRESS: "warning",
      RESOLVED: "success",
      CLOSED: "secondary",
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      CRITICAL: "danger",
      HIGH: "warning",
      MEDIUM: "info",
      LOW: "secondary",
    };
    return <Badge bg={variants[priority] || "secondary"}>{priority}</Badge>;
  };

  // Stats calculations
  const statCards = useMemo(() => {
    const allTickets = tickets;
    return [
      { label: "Total", value: allTickets.length, color: "secondary" },
      { label: "Open", value: allTickets.filter((t) => t.status === "OPEN").length, color: "danger" },
      { label: "In Progress", value: allTickets.filter((t) => t.status === "IN_PROGRESS").length, color: "warning" },
      { label: "Resolved", value: allTickets.filter((t) => t.status === "RESOLVED").length, color: "success" },
      { label: "Critical", value: allTickets.filter((t) => t.priority === "CRITICAL").length, color: "danger" },
    ];
  }, [tickets]);

  if (loading && tickets.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error && tickets.length === 0) {
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
            <FaTicketAlt className="text-warning me-2" />
            Support Tickets
          </h2>
          <p className="text-muted mb-0">
            Manage college support requests across platform
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={handleRefresh} disabled={refreshing}>
            <FaSync className={refreshing ? "spinner" : ""} /> Refresh
          </Button>
          <Button variant="success" onClick={handleCreateTicket}>
            <FaPlus /> New Ticket
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <Row xs={1} md={5} className="g-3 mb-4">
        {statCards.map((stat, idx) => (
          <Col key={idx}>
            <Card className={`border-${stat.color}`}>
              <Card.Body className="text-center">
                <Card.Title className="text-muted small">{stat.label}</Card.Title>
                <h2 className={`fw-bold text-${stat.color}`}>{stat.value}</h2>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* FILTERS CARD */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row xs={1} md={3} lg={6} className="g-3">
            <Col>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Subject, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Priority</Form.Label>
                <Form.Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="BUG">BUG</option>
                  <option value="FEATURE">FEATURE</option>
                  <option value="ACCESS">ACCESS</option>
                  <option value="BILLING">BILLING</option>
                  <option value="OTHER">OTHER</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>College</Form.Label>
                <Form.Select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)}>
                  <option value="">All Colleges</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mt-2">
            <Col className="d-flex justify-content-end">
              <Button variant="outline-secondary" size="sm" onClick={() => {
                setStatusFilter("");
                setPriorityFilter("");
                setCategoryFilter("");
                setCollegeFilter("");
                setSearch("");
                setCurrentPage(1);
              }}>
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* TICKETS TABLE */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <Table hover responsive className="mb-0">
              <thead className="table-light sticky-top" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>College</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td>
                      <code className="small">{ticket.ticketId}</code>
                    </td>
                    <td>
                      <div>
                        <Link to={`/platform-support/tickets/${ticket.ticketId}`} className="text-decoration-none">
                          <strong className="d-block text-truncate" style={{ maxWidth: "300px" }}>
                            {ticket.subject}
                          </strong>
                        </Link>
                        <span className="badge bg-light text-dark small">
                          {ticket.category}
                        </span>
                      </div>
                    </td>
                    <td>
                      {ticket.college_id ? (
                        <Link to={`/colleges/${ticket.college_id._id}`} className="text-decoration-none">
                          {ticket.college_id.name}
                        </Link>
                      ) : (
                        <span className="text-muted">General</span>
                      )}
                    </td>
                    <td>{getPriorityBadge(ticket.priority)}</td>
                    <td>{getStatusBadge(ticket.status)}</td>
                    <td className="text-nowrap">
                      <div>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                        <br />
                        <small className="text-muted">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </small>
                      </div>
                    </td>
                    <td>
                      {ticket.assignedTo ? (
                        <div className="small">
                          {ticket.assignedTo.name}
                          <br />
                          <small className="text-muted">{ticket.assignedTo.email}</small>
                        </div>
                      ) : (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {/* assign modal */ ''}}
                        >
                          Assign
                        </Button>
                      )}
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowModal(true);
                          }}
                        >
                          <FaEye /> View
                        </Button>
                        {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Mark this ticket as resolved?")) {
                                handleResolve(ticket.ticketId, "Resolved by platform support");
                              }
                            }}
                          >
                            <FaCheckCircle /> Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <FaTicketAlt size={48} className="mb-2 opacity-25" />
                      <p>No tickets found</p>
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
            <Pagination.Prev onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} />
            {pageNumbers.map((num) => (
              <Pagination.Item key={num} active={num === currentPage} onClick={() => setCurrentPage(num)}>
                {num}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}

      {/* CREATE/VIEW TICKET MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTicketAlt className="me-2" />
            {selectedTicket ? "Ticket Details" : "Create New Ticket"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTicket ? (
            // VIEW MODE
            <div>
              <Row className="mb-3">
                <Col md={8}>
                  <h5>{selectedTicket.subject}</h5>
                  <div className="d-flex gap-2 mb-2">
                    <Badge bg={getPriorityBadge(selectedTicket.priority).props.bg}>{selectedTicket.priority}</Badge>
                    <Badge bg={getStatusBadge(selectedTicket.status).props.bg}>{selectedTicket.status}</Badge>
                    <Badge bg="secondary">{selectedTicket.category}</Badge>
                  </div>
                </Col>
                <Col md={4} className="text-end">
                  <small className="text-muted d-block">Created: {new Date(selectedTicket.createdAt).toLocaleString()}</small>
                  <small className="text-muted">
                    By: {selectedTicket.userId?.name} ({selectedTicket.userId?.email})
                  </small>
                </Col>
              </Row>
              <hr />
              <h6>Description</h6>
              <Card className="bg-light mb-3">
                <Card.Body>
                  <p className="mb-0">{selectedTicket.description}</p>
                </Card.Body>
              </Card>

              {/* Comments */}
              {selectedTicket.comments && selectedTicket.comments.length > 0 && (
                <>
                  <h6 className="mt-3">Comments</h6>
                  <div className="mb-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {selectedTicket.comments.map((c, idx) => (
                      <Card key={idx} className="mb-2">
                        <Card.Body className="py-2">
                          <div className="d-flex justify-content-between">
                            <strong>{c.user?.name || "Unknown"}</strong>
                            <small className="text-muted">
                              {new Date(c.createdAt).toLocaleString()}
                            </small>
                          </div>
                          <p className="mb-0 mt-1 small">{c.message}</p>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Add Comment */}
              {selectedTicket.status !== "CLOSED" && (
                <div className="mt-3">
                  <Form.Group>
                    <Form.Label>Add Comment</Form.Label>
                    <InputGroup>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                    </InputGroup>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-2"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      <FaComments className="me-1" /> Add Comment
                    </Button>
                  </Form.Group>
                </div>
              )}

              {/* Resolve Button */}
              {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                <div className="mt-3">
                  <Button
                    variant="success"
                    onClick={() => {
                      const res = window.prompt("Resolution summary (optional):");
                      if (res !== null) handleResolve(selectedTicket.ticketId, res);
                    }}
                  >
                    <FaCheckCircle className="me-1" /> Mark as Resolved
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // CREATE MODE - Simple form
            <Form onSubmit={handleSaveTicket}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject *</Form.Label>
                    <Form.Control
                      name="subject"
                      required
                      placeholder="Brief summary of the issue"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select name="category">
                      <option value="OTHER">Other</option>
                      <option value="BUG">Bug</option>
                      <option value="FEATURE">Feature Request</option>
                      <option value="ACCESS">Access Issue</option>
                      <option value="BILLING">Billing</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Priority</Form.Label>
                    <Form.Select name="priority">
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>College (optional)</Form.Label>
                    <Form.Select name="college_id">
                      <option value="">General / System-wide</option>
                      {colleges.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Description *</Form.Label>
                <Form.Control
                  name="description"
                  as="textarea"
                  rows={5}
                  required
                  placeholder="Detailed description of the issue or request..."
                />
              </Form.Group>
              <div className="text-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} className="me-2">
                  Cancel
                </Button>
                <Button variant="success" type="submit" disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <><FaPlus className="me-1" /> Create Ticket</>}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
