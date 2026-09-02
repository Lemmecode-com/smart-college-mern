import { useState, useEffect, useContext } from "react";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { FaKey, FaCheckCircle, FaExclamationTriangle, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

// Get userId: from sessionStorage (first-login) OR from auth context (logged-in users)
   useEffect(() => {
     const storedUserId = sessionStorage.getItem("userId");
     if (storedUserId) {
       setUserId(storedUserId);
     } else if (user?.realId) {
       setUserId(user.realId);
     }
   }, [user?.realId]);

  // Redirect logic after successful password change
  useEffect(() => {
    if (success) {
      const isFirstLogin = !!sessionStorage.getItem("userId");
      const timer = setTimeout(() => {
        if (user?.role === "COLLEGE_ADMIN" && isFirstLogin) {
          navigate("/college/setup-wizard");
        } else if (isFirstLogin) {
          navigate("/login");
        } else {
          navigate(-1);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate, user?.role]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTogglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
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
      // Include userId for both: first-login (from sessionStorage) and logged-in users (from AuthContext)
      if (userId) {
        payload.userId = userId;
      }

      const res = await api.post("/auth/change-password", payload);

      if (res.data.success) {
        setSuccess(res.data.message);
        // Clear stored userId if exists
        sessionStorage.removeItem("userId");
        // Clear form
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Row className="w-100 justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Card className="shadow">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <FaKey className="text-primary" style={{ fontSize: "3rem" }} />
                  <h3 className="mt-3">Change Your Password</h3>
                  <p className="text-muted">
                    {userId ? "Enter your current and new password to update" : "You must change your temporary password before continuing."}
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
                      <small>{userId ? "Redirecting back..." : "Redirecting to login..."}</small>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Password{!userId ? " (Temporary)" : ""}</Form.Label>
                    <div className="password-field-wrap">
                      <Form.Control
                        type={showPassword.currentPassword ? "text" : "password"}
                        name="currentPassword"
                        placeholder={userId ? "Enter current password" : "Enter temporary password"}
                        value={formData.currentPassword}
                        onChange={handleChange}
                        required
                        disabled={loading || success}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => handleTogglePassword("currentPassword")}
                        aria-label={showPassword.currentPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword.currentPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <div className="password-field-wrap">
                      <Form.Control
                        type={showPassword.newPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Enter new password (min 8 characters)"
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                        disabled={loading || success}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => handleTogglePassword("newPassword")}
                        aria-label={showPassword.newPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword.newPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <Form.Text className="text-muted">
                      At least 8 characters. Include numbers & special characters.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Confirm New Password</Form.Label>
                    <div className="password-field-wrap">
                      <Form.Control
                        type={showPassword.confirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Re-enter new password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={loading || success}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => handleTogglePassword("confirmPassword")}
                        aria-label={showPassword.confirmPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword.confirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
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

      <style>{`
        .password-field-wrap { position: relative; }
        .password-field-wrap .form-control { padding-right: 2.6rem; }
        .password-toggle {
          position: absolute;
          right: 0.55rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: #6c757d;
          padding: 0.25rem;
          line-height: 0;
        }
        .password-toggle:hover { color: #0d6efd; }
      `}</style>
    </>
  );
}