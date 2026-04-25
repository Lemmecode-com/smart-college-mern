import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { FaMoneyBillWave, FaCheckCircle, FaExclamationTriangle, FaClock, FaChartLine } from "react-icons/fa";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";

export default function AccountantDashboard() {
  const [stats, setStats] = useState({
    totalFees: 0,
    totalCollected: 0,
    pendingAmount: 0,
    overdueInstallments: 0,
    recentWeekPayments: 0,
    recentWeekAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/accountant/dashboard");
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  const { totalFees, totalCollected, pendingAmount, overdueInstallments, recentWeekPayments, recentWeekAmount } = stats;

  return (
    <Container fluid className="p-4">
      <h2 className="mb-4"><FaChartLine /> Accountant Dashboard</h2>
      <Row xs={1} md={2} lg={3} className="g-4 mb-4">
        <Col>
          <Card className="shadow-sm border-primary">
            <Card.Body>
              <Card.Title><FaMoneyBillWave /> Total Fees</Card.Title>
              <Card.Text className="display-5">₹{totalFees.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-success">
            <Card.Body>
              <Card.Title><FaCheckCircle /> Total Collected</Card.Title>
              <Card.Text className="display-5 text-success">₹{totalCollected.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-warning">
            <Card.Body>
              <Card.Title><FaClock /> Pending Amount</Card.Title>
              <Card.Text className="display-5 text-warning">₹{pendingAmount.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-danger">
            <Card.Body>
              <Card.Title><FaExclamationTriangle /> Overdue Installments</Card.Title>
              <Card.Text className="display-5 text-danger">{overdueInstallments}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="shadow-sm border-info">
            <Card.Body>
              <Card.Title>Payments (Last 7 Days)</Card.Title>
              <Card.Text className="display-5 text-info">{recentWeekPayments} payments</Card.Text>
              <Card.Text>₹{recentWeekAmount.toLocaleString()} collected</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick actions section can be added later */}
    </Container>
  );
}
