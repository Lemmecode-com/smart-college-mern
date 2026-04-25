import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { FaKey, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Get userId from sessionStorage (set by Login.jsx on first-login trigger)
  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Client-side validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      };
      // Include userId only on first-login (stored from Login.jsx)
      if (userId) {
        payload.userId = userId;
      }

      const res = await api.post("/auth/change-password", payload);

      if (res.data.success) {
        setSuccess(res.data.message);
        // Clear stored userId
        sessionStorage.removeItem("userId");
        // Clear form
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        // Redirect to login after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Row className="w-100 justify-content-center">
        <Col xs={12} md={6} lg={4}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <FaKey className="text-primary" style={{ fontSize: "3rem" }} />
                <h3 className="mt-3">Change Your Password</h3>
                <p className="text-muted">
                  You must change your temporary password before continuing.
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  <FaExclamationTriangle className="me-2" />
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-3">
                  <FaCheckCircle className="me-2" />
                  {success}
                  <div className="mt-2">
                    <small>Redirecting to login...</small>
                  </div>
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Current Password (Temporary)</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    placeholder="Enter temporary password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    disabled={loading || success}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password (min 8 characters)"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    disabled={loading || success}
                  />
                  <Form.Text className="text-muted">
                    At least 8 characters. Include numbers & special characters.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading || success}
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit" disabled={loading || success}>
                    {loading ? "Changing Password..." : (
                      <>
                        <FaCheckCircle /> Change Password
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(-1)}
                    disabled={loading || success}
                  >
                    <FaArrowLeft /> Go Back
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
