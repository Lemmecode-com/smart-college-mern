import React, { useState } from "react";
import { Container, Form, Button, Alert, Card, Row, Col } from "react-bootstrap";
import { FaFileAlt, FaDownload } from "react-icons/fa";
import api from "../../../api/axios";

export default function ReceiptManagement() {
  const [installmentId, setInstallmentId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReceiptUrl(null);
    try {
      const res = await api.get(`/admin/payments/receipt/${installmentId}`, {
        responseType: "blob", // to get PDF blob
      });
      // Create blob URL
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setReceiptUrl(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (receiptUrl) {
      const a = document.createElement("a");
      a.href = receiptUrl;
      a.download = `receipt-${installmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(receiptUrl);
      document.body.removeChild(a);
    }
  };

  return (
    <Container className="p-4">
      <h2 className="mb-4"><FaFileAlt /> Receipt Management</h2>
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row xs={1} md={3} className="g-3 align-items-end">
              <Col>
                <Form.Group>
                  <Form.Label>Installment ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter installment ID"
                    value={installmentId}
                    onChange={(e) => setInstallmentId(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Loading..." : <><FaDownload /> View Receipt</>}
                </Button>
              </Col>
            </Row>
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          </Form>
        </Card.Body>
      </Card>
      {receiptUrl && (
        <Card className="shadow-sm">
          <Card.Body>
            <h5>Receipt Preview</h5>
            <iframe
              src={receiptUrl}
              width="100%"
              height="600px"
              title="Receipt PDF"
              style={{ border: "none" }}
            />
            <Button variant="success" onClick={handleDownload} className="mt-3">
              <FaDownload /> Download Receipt
            </Button>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
