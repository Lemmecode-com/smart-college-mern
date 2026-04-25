import React, { useEffect, useState } from "react";
import { Card, Col, Row, Table, Badge } from "react-bootstrap";
import { FaFileAlt, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";

export default function AdmissionDashboard() {
  const [stats, setStats] = useState({ pendingCount: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/admission/dashboard");
        setStats(res.data.data);
        setRecent(res.data.data.recentApplications || []);
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

  const { pendingCount } = stats;

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
              <Card.Text className="display-4">--</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-danger text-white">
            <Card.Body>
              <Card.Title><FaTimesCircle /> Rejections This Week</Card.Title>
              <Card.Text className="display-4">--</Card.Text>
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
                  <td>{app.applicationNo || app._id.slice(-6)}</td>
                  <td>{app.firstName} {app.lastName}</td>
                  <td>{app.email}</td>
                  <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admission/application/${app._id}`} className="btn btn-sm btn-primary">
                      Review
                    </Link>
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
    </div>
  );
}
