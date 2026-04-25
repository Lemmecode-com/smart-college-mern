import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { FaUsers, FaUserGraduate, FaClipboardList, FaMoneyBillWave } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";


export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await api.get("/parent/children");
        setChildren(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load children");
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  return (
    <Container className="p-4">
      <h2 className="mb-4"><FaUsers /> My Children</h2>
      {children.length === 0 ? (
        <Card className="text-center p-4">
          <Card.Body>
            <Card.Text className="text-muted">No students linked to your account.</Card.Text>
          </Card.Body>
        </Card>
      ) : (
        <Row xs={1} md={2} className="g-4">
          {children.map((child) => (
            <Col key={child._id}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>{child.firstName} {child.lastName}</Card.Title>
                  <Card.Text>
                    <strong>Enrollment:</strong> {child.enrollmentNo || "N/A"}<br/>
                    <strong>Department:</strong> {child.department_id?.name || "N/A"}<br/>
                    <strong>Course:</strong> {child.course_id?.name || "N/A"}<br/>
                    <strong>Status:</strong> <Badge bg={child.status === 'APPROVED' ? 'success' : 'warning'}>{child.status}</Badge>
                  </Card.Text>
                  <div className="d-flex gap-2 mt-3">
                    <Link to={`/parent/student/${child._id}/profile`} className="btn btn-outline-primary btn-sm">
                      <FaUserGraduate /> Profile
                    </Link>
                    <Link to={`/parent/student/${child._id}/attendance`} className="btn btn-outline-info btn-sm">
                      <FaClipboardList /> Attendance
                    </Link>
                    <Link to={`/parent/student/${child._id}/fees`} className="btn btn-outline-success btn-sm">
                      <FaMoneyBillWave /> Fees
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
