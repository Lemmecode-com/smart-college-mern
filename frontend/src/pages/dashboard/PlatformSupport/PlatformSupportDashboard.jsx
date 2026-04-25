import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert } from "react-bootstrap";
import { FaBuilding, FaShieldAlt, FaChartLine } from "react-icons/fa";
import api from "../../../api/axios";

export default function PlatformSupportDashboard() {
  const [stats, setStats] = useState({ colleges: 0, auditLogs: 0 });
  const [colleges, setColleges] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch colleges list
        const collegesRes = await api.get("/college/list");
        setColleges(collegesRes.data.data || []);

        // Fetch audit logs
        const logsRes = await api.get("/audit-logs/?limit=5");
        setLogs(logsRes.data.data?.auditLogs || []);

        setStats({
          colleges: collegesRes.data.data?.length || 0,
          auditLogs: logsRes.data.data?.total || 0,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="p-4">
      <h2 className="mb-4"><FaShieldAlt /> Platform Support Dashboard</h2>
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className="bg-primary text-white">
            <Card.Body>
              <Card.Title><FaBuilding /> Total Colleges</Card.Title>
              <Card.Text className="display-4">{stats.colleges}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-info text-white">
            <Card.Body>
              <Card.Title><FaShieldAlt /> Audit Logs</Card.Title>
              <Card.Text className="display-4">{stats.auditLogs}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-success text-white">
            <Card.Body>
              <Card.Title><FaChartLine /> System Status</Card.Title>
              <Card.Text className="display-4">Online</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm mb-4">
        <Card.Header>Colleges Overview</Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map((college) => (
                <tr key={college._id}>
                  <td>{college.collegeCode}</td>
                  <td>{college.name}</td>
                  <td>{college.email}</td>
                  <td>{college.phone || "N/A"}</td>
                  <td>
                    <Badge bg={college.isActive ? "success" : "secondary"}>{college.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header>Recent Audit Logs</Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>College</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{log.action}</td>
                  <td>{log.actor_name || log.actor_user_id}</td>
                  <td>{log.target_type}</td>
                  <td>{log.college_id?.name || "N/A"}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}
