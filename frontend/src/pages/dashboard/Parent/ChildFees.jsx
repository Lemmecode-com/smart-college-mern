import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Card, Row, Col, Table, Badge, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft, FaMoneyBillWave, FaCheckCircle, FaClock } from "react-icons/fa";
import api from "../../../api/axios";

export default function ChildFees() {
  const { studentId } = useParams();
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await api.get(`/parent/student/${studentId}/fees`);
        setFeeData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load fee details");
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, [studentId]);

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!feeData) return <div className="text-center mt-4">No fee record available</div>;

  const { totalFee, paidAmount, installments } = feeData;

  return (
    <Container className="p-4">
      <div className="mb-3">
        <Link to="/dashboard/parent" className="btn btn-outline-secondary"><FaArrowLeft /> Back to Dashboard</Link>
      </div>
      <h2 className="mb-4"><FaMoneyBillWave /> Fee Details</h2>
      <Row xs={1} md={3} className="g-4 mb-4">
        <Col>
          <Card className="bg-primary text-white">
            <Card.Body>
              <Card.Title>Total Fee</Card.Title>
              <Card.Text className="display-5">₹{totalFee?.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-success text-white">
            <Card.Body>
              <Card.Title>Paid Amount</Card.Title>
              <Card.Text className="display-5">₹{paidAmount?.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="bg-warning text-dark">
            <Card.Body>
              <Card.Title>Pending Amount</Card.Title>
              <Card.Text className="display-5">₹{(totalFee - paidAmount)?.toLocaleString()}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header>Installment History</Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid At</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {installments?.length === 0 && (
                <tr><td colSpan="7" className="text-center">No installments</td></tr>
              )}
              {installments?.map((inst, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{inst.name}</td>
                  <td>{new Date(inst.dueDate).toLocaleDateString()}</td>
                  <td>₹{inst.amount?.toLocaleString()}</td>
                  <td>
                    <Badge bg={inst.status === 'PAID' ? 'success' : inst.status === 'PENDING' ? 'warning' : 'danger'}>
                      {inst.status}
                    </Badge>
                  </td>
                  <td>{inst.paidAt ? new Date(inst.paidAt).toLocaleDateString() : "-"}</td>
                  <td>{inst.paymentMode || "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}
