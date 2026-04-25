import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaUser, FaEnvelope, FaPhone, FaGraduationCap } from "react-icons/fa";
import api from "../../../api/axios";

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/registered/${id}`);
        setStudent(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Application not found");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  const updateStatus = async (newStatus) => {
    setActionLoading(true);
    setStatusMsg({ type: "", text: "" });
    try {
      await api.put(`/students/${id}/approve`, { status: newStatus });
      setStatusMsg({
        type: "success",
        text: `Application ${newStatus === "APPROVED" ? "approved" : "rejected"} successfully`,
      });
      const res = await api.get(`/students/registered/${id}`);
      setStudent(res.data.data);
    } catch (err) {
      setStatusMsg({
        type: "danger",
        text: err.response?.data?.message || "Failed to update status",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    address,
    department_id,
    course_id,
    documents,
    fullName,
  } = student;

  return (
    <Container className="p-4">
      <div className="mb-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </Button>
      </div>

      <h2 className="mb-4">
        <FaUser /> Application Details
      </h2>

      {statusMsg.text && <Alert variant={statusMsg.type}>{statusMsg.text}</Alert>}

      <Row xs={1} md={2} className="g-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header>Personal Information</Card.Header>

            <Card.Body>
              <Card.Title>
                <FaUser /> {firstName} {lastName}
              </Card.Title>
              <Card.Text>
                <strong>Email:</strong> {email}
                <br />
                <strong>Phone:</strong> {phone || "N/A"}
                <br />
                <strong>DOB:</strong> {dateOfBirth || "N/A"}
                <br />
                <strong>Gender:</strong> {gender || "N/A"}
                <br />
                <strong>Address:</strong> {address || "N/A"}
                <br />
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col>
          <Card className="shadow-sm">
            <Card.Header>Academic Details</Card.Header>

            <Card.Body>
              <Card.Text>
                <strong>Department:</strong> {department_id?.name || "N/A"}
                <br />
                <strong>Course:</strong> {course_id?.name || "N/A"}
                <br />
                <strong>Status:</strong>{" "}
                <Badge
                  bg={
                    student.status === "PENDING"
                      ? "warning"
                      : student.status === "APPROVED"
                      ? "success"
                      : "danger"
                  }
                >
                  {student.status}
                </Badge>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {documents && Object.keys(documents).length > 0 && (
        <Card className="shadow-sm mt-4">
          <Card.Header>Uploaded Documents</Card.Header>

          <Card.Body>
            <Table striped size="sm">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(documents).map(([key, url]) => (
                  <tr key={key}>
                    <td>{key.replace(/([A-Z])/g, " $1").trim()}</td>
                    <td>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {student.status === "PENDING" && (
        <Card className="shadow-sm mt-4">
          <Card.Header>Actions</Card.Header>

          <Card.Body>
            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => updateStatus("APPROVED")}
                disabled={actionLoading}
              >
                <FaCheckCircle /> Approve
              </Button>

              <Button
                variant="danger"
                onClick={() => updateStatus("REJECTED")}
                disabled={actionLoading}
              >
                <FaTimesCircle /> Reject
              </Button>
            </div>

            {actionLoading && (
              <Spinner animation="border" size="sm" className="ms-2" />
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}