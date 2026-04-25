import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { FaChalkboardTeacher, FaBuilding, FaChartLine, FaExclamationTriangle, FaUserGraduate } from "react-icons/fa";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingApprovals: 0,
    overdueInstallments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the college-admin reports dashboard endpoint (principal has access)
        const res = await api.get("/reports/dashboard/all");
        const data = res.data.data;
        setStats({
          totalStudents: data?.totalStudents || 0,
          totalTeachers: data?.totalTeachers || 0,
          totalDepartments: data?.totalDepartments || 0,
          totalCourses: data?.totalCourses || 0,
          pendingApprovals: data?.pendingAdmissions || 0,
          overdueInstallments: data?.overdueInstallments || 0,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  const { totalStudents, totalTeachers, totalDepartments, totalCourses, pendingApprovals, overdueInstallments } = stats;

  return (
    <Container fluid className="p-4">
      <h2 className="mb-4"><FaChartLine /> Principal Dashboard</h2>
      <Row xs={1} md={3} lg={4} className="g-4 mb-4">
        <Col>
          <Card className="shadow-sm border-primary">
            <Card.Body>
              <Card.Title><FaUserGraduate /> Total Students</Card.Title>
              <Card.Text className="display-4">{totalStudents}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-success">
            <Card.Body>
              <Card.Title><FaChalkboardTeacher /> Total Teachers</Card.Title>
              <Card.Text className="display-4">{totalTeachers}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-info">
            <Card.Body>
              <Card.Title><FaBuilding /> Departments</Card.Title>
              <Card.Text className="display-4">{totalDepartments}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-warning">
            <Card.Body>
              <Card.Title><FaExclamationTriangle /> Pending Approvals</Card.Title>
              <Card.Text className="display-4 text-warning">{pendingApprovals}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header>Quick Overview</Card.Header>
        <Card.Text className="p-3">
          As Principal, you have read-only access to all academic and administrative data. Use the sidebar to navigate through departments, courses, students, teachers, and reports.
        </Card.Text>
      </Card>
    </Container>
  );
}
