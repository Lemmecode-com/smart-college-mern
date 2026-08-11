import React, { useState, useEffect } from "react";
import { Modal, Button, Form, InputGroup, Spinner, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/axios";
import { logger } from "../utils/logger";
import {
  FaEnvelope,
  FaShieldAlt,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function ChangeEmailModal({ show, onClose, userRole, currentEmail }) {
  const [step, setStep] = useState("input"); // input | otp | success
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (show) {
      setStep("input");
      setNewEmail("");
      setCurrentPassword("");
      setOtp("");
      setError("");
      setSuccess("");
    }
  }, [show]);

  const handleRequestChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/change-email/request", {
        email: newEmail,
        currentPassword,
      });

      setStep("otp");
      toast.success(res.data?.message || "Verification OTP sent to your new email.", {
        position: "top-right",
        autoClose: 5000,
      });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      const errorCode = err.response?.data?.code;

      if (errorCode === "SAME_EMAIL") {
        setError("This is already your current email address.");
      } else if (errorCode === "EMAIL_EXISTS") {
        setError("This email is already associated with another account.");
      } else if (errorCode === "INVALID_CURRENT_PASSWORD") {
        setError("Current password is incorrect.");
      } else if (errorCode === "RATE_LIMIT_EXCEEDED") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(backendMessage || "Failed to request email change. Please try again.");
      }

      logger.error("Email change request failed:", {
        errorCode,
        backendMessage,
        role: userRole,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/change-email/verify", {
        email: newEmail,
        otp,
      });

      setStep("success");
      setSuccess("Email changed successfully! Please log in again with your new email.");
      toast.success(res.data?.message || "Email changed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setTimeout(() => {
        onClose?.();
      }, 3000);
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      const errorCode = err.response?.data?.code;

      if (errorCode === "INVALID_OTP") {
        setError("Invalid or expired OTP. Please request a new one.");
      } else {
        setError(backendMessage || "Failed to verify email. Please try again.");
      }

      logger.error("Email change verification failed:", {
        errorCode,
        backendMessage,
        role: userRole,
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    if (!submitting && !verifying) {
      onClose?.();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShieldAlt className="me-2" />
          Change Email Address
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="d-flex align-items-center">
            <FaCheckCircle className="me-2" />
            {success}
          </Alert>
        )}

        {step === "input" && (
          <Form onSubmit={handleRequestChange}>
            <Form.Group className="mb-3">
              <Form.Label>Current Email</Form.Label>
              <Form.Control
                type="email"
                value={currentEmail || ""}
                disabled
                readOnly
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Email</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaEnvelope />
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  placeholder="Enter new email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaShieldAlt />
                </InputGroup.Text>
                <Form.Control
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
              </InputGroup>
              <Form.Text className="text-muted">
                For security, please enter your current password to verify your identity.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="me-2" />
                    Send Verification OTP
                  </>
                )}
              </Button>
            </div>
          </Form>
        )}

        {step === "otp" && (
          <Form onSubmit={handleVerifyOtp}>
            <Alert variant="info">
              A verification OTP has been sent to <strong>{newEmail}</strong>.
              Please enter it below to confirm the email change.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Verification OTP</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FaEnvelope />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  disabled={verifying}
                />
              </InputGroup>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("input");
                  setError("");
                }}
                disabled={verifying}
              >
                Back
              </Button>
              <Button variant="primary" type="submit" disabled={verifying}>
                {verifying ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="me-2" />
                    Verify Email
                  </>
                )}
              </Button>
            </div>
          </Form>
        )}

        {step === "success" && (
          <div className="text-center py-3">
            <FaCheckCircle size={48} className="text-success mb-3" />
            <p className="mb-0">Your email has been changed successfully.</p>
            <p className="text-muted">Please log in again with your new email address.</p>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
