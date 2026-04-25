import React, { useEffect, useState } from "react";
import { Container, Table, Badge, Spinner, Alert } from "react-bootstrap";
import { FaListAlt } from "react-icons/fa";
import api from "../../../api/axios";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/admin/payments/report");
        // The response likely contains payment data; adjust based on actual structure
        setPayments(res.data.data?.payments || []); // adapt after checking actual response
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load payment history");
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
      <h2 className="mb-4"><FaListAlt /> Payment History</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Student</th>
            <th>Amount</th>
            <th>Payment Mode</th>
            <th>Status</th>
            <th>Paid At</th>
            <th>Transaction ID</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 && (
            <tr><td colSpan="6" className="text-center">No payments found</td></tr>
          )}
          {payments.map((p) => (
            <tr key={p._id}>
              <td>{p.student?.name || p.studentId?._id}</td>
              <td>₹{p.amount}</td>
              <td>{p.paymentMode}</td>
              <td>
                <Badge bg={p.status === "PAID" ? "success" : "warning"}>{p.status}</Badge>
              </td>
              <td>{new Date(p.paidAt).toLocaleDateString()}</td>
              <td>{p.transactionId || "-"}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
