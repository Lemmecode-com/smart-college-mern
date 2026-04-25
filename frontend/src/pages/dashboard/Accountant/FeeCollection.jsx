import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import { FaMoneyBillWave, FaCheckCircle } from "react-icons/fa";
import api from "../../../api/axios";

export default function FeeCollection() {
  const [formData, setFormData] = useState({
    feeId: "",
    installmentIndex: 0,
    paymentMode: "ONLINE",
    transactionId: "",
    referenceNumber: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.post("/admin/payment/mark-paid", {
        feeId: formData.feeId,
        installmentIndex: Number(formData.installmentIndex),
        paymentMode: formData.paymentMode,
        transactionId: formData.transactionId || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        remarks: formData.remarks || undefined,
      });
      setMessage({ type: "success", text: "Payment marked as paid successfully!" });
      setFormData({ feeId: "", installmentIndex: 0, paymentMode: "ONLINE", transactionId: "", referenceNumber: "", remarks: "" });
    } catch (err) {
      setMessage({ type: "danger", text: err.response?.data?.message || "Failed to mark payment" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="p-4">
      <h2 className="mb-4"><FaMoneyBillWave /> Fee Collection</h2>
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row xs={1} md={2} className="g-3">
              <Col>
                <Form.Group>
                  <Form.Label>Fee Record ID (StudentFee ID)</Form.Label>
                  <Form.Control
                    type="text"
                    name="feeId"
                    placeholder="Enter fee record ID"
                    value={formData.feeId}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Installment Index (0-based)</Form.Label>
                  <Form.Control
                    type="number"
                    name="installmentIndex"
                    min="0"
                    value={formData.installmentIndex}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Payment Mode</Form.Label>
                  <Form.Select name="paymentMode" value={formData.paymentMode} onChange={handleChange}>
                    <option value="ONLINE">Online</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DD">Demand Draft</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Transaction/Reference Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="transactionId"
                    placeholder="Transaction ID (optional)"
                    value={formData.transactionId}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col className="align-self-end">
                <Button variant="primary" type="submit" disabled={loading} className="w-100">
                  {loading ? "Processing..." : <><FaCheckCircle /> Mark as Paid</>}
                </Button>
              </Col>
            </Row>
            {message.text && <Alert variant={message.type} className="mt-3">{message.text}</Alert>}
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
