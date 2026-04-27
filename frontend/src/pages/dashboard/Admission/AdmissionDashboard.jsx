import React, { useEffect, useState } from "react";
import { Card, Col, Row, Table, Badge, Button } from "react-bootstrap";
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle, FaListOl, FaGraduationCap, FaUserTimes, FaExternalLinkAlt, FaArrowUp } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";

export default function AdmissionDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingCount: 0, approvalsThisWeek: 0, rejectionsThisWeek: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/admission/dashboard");
        setStats(res.data);
        setRecent(res.data.recentApplications || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  const { pendingCount, approvalsThisWeek, rejectionsThisWeek } = stats;

  return (
    <div className="p-4">
      <h2 className="mb-4"><FaFileAlt /> Admission Dashboard</h2>
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className="bg-primary text-white">
            <Card.Body>
              <Card.Title><FaClock /> Pending Applications</Card.Title>
              <Card.Text className="display-4">{pendingCount}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-success text-white">
            <Card.Body>
              <Card.Title><FaCheckCircle /> Approvals This Week</Card.Title>
              <Card.Text className="display-4">{approvalsThisWeek}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-danger text-white">
            <Card.Body>
              <Card.Title><FaTimesCircle /> Rejections This Week</Card.Title>
              <Card.Text className="display-4">{rejectionsThisWeek}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header>Recent Pending Applications</Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Application No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Applied On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((app) => (
                <tr key={app._id}>
                  <td>{app._id.slice(-6).toUpperCase()}</td>
                  <td>{app.fullName}</td>
                  <td>{app.email}</td>
                  <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button variant="primary" size="sm" onClick={() => navigate(`/college/view-student/${app._id}`)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan="5" className="text-center">No pending applications</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm mt-4">
        <Card.Header>Quick Actions</Card.Header>
        <Card.Body>
          <Row xs={1} sm={2} lg={4} className="g-3">
            <Col>
              <Link to="/admission/applications" className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2">
                <FaClock /> Pending Applications
              </Link>
            </Col>
            <Col>
              <Link to="/admission/approved" className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2">
                <FaCheckCircle /> Approved Students
              </Link>
            </Col>
            <Col>
              <Link to="/admission/promotion" className="btn btn-outline-info w-100 d-flex align-items-center justify-content-center gap-2">
                <FaArrowUp /> Student Promotion
              </Link>
            </Col>
            <Col>
              <Link to="/admission/alumni" className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2">
                <FaGraduationCap /> View Alumni
              </Link>
            </Col>
            <Col>
              <Link to="/admission/deactivated" className="btn btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2">
                <FaUserTimes /> Deactivated Students
              </Link>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
