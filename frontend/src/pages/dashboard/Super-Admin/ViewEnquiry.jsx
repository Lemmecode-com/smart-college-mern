import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Badge, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import {
  FaArrowLeft,
  FaEnvelopeOpenText,
  FaBuilding,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExchangeAlt,
  FaPlus,
  FaReply,
  FaTag,
} from "react-icons/fa";

export default function ViewEnquiry() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  /* ================= FETCH INQUIRY DETAILS ================= */
  const fetchInquiryDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/inquiries/${id}`);

      // axios.js interceptor unwraps to res.data or res.data.data
      const data = res.data?.data || res.data;
      if (!data || !data._id) {
        throw new Error("Enquiry data not found");
      }
      setInquiry(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load enquiry details";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInquiryDetails();
  }, [fetchInquiryDetails]);

  /* ================= STATUS CHANGE ================= */
  const handleStatusChange = async (newStatus) => {
    if (!inquiry || inquiry.status === newStatus) return;
    try {
      setUpdatingStatus(true);
      await api.patch(`/inquiries/${inquiry._id}/status`, { status: newStatus });
      setInquiry((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Enquiry marked as ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update enquiry status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "NEW":
        return <Badge bg="warning" text="dark" className="px-3 py-2 fs-6">NEW</Badge>;
      case "CONTACTED":
        return <Badge bg="info" text="dark" className="px-3 py-2 fs-6">CONTACTED</Badge>;
      case "CLOSED":
        return <Badge bg="success" className="px-3 py-2 fs-6">CLOSED</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 fs-6">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="erp-page erp-viewport-min-100 p-4">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/super-admin/dashboard" },
            { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
            { label: "Loading..." },
          ]}
        />
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <Loading size="lg" color="primary" text="Loading Enquiry Details..." />
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="erp-page erp-viewport-min-100 p-4">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/super-admin/dashboard" },
            { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
            { label: "Error" },
          ]}
        />
        <ApiError
          title="Enquiry Not Found"
          message={error || "The requested enquiry could not be found."}
          onRetry={fetchInquiryDetails}
          onGoBack={() => navigate("/super-admin/enquiries")}
        />
      </div>
    );
  }

  return (
    <div
      className="erp-page erp-viewport-min-100"
      style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%)" }}
    >
      {/* BREADCRUMB */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/super-admin/dashboard" },
          { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
          { label: inquiry.inquiryNumber || "Details" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <button
            className="btn btn-outline-secondary btn-sm me-3 d-flex align-items-center gap-1"
            onClick={() => navigate("/super-admin/enquiries")}
            title="Back to all enquiries"
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>

          <div
            className="erp-header-icon"
            aria-hidden="true"
            style={{ background: "#eff6ff", color: "#2563eb" }}
          >
            <FaEnvelopeOpenText />
          </div>

          <div className="erp-header-text">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h1 className="erp-page-title mb-0">{inquiry.institutionName}</h1>
              <span className="badge bg-light text-dark font-monospace border px-2 py-1 fs-6">
                {inquiry.inquiryNumber}
              </span>
              {getStatusBadge(inquiry.status)}
            </div>
            <p className="erp-page-subtitle mb-0 mt-1">
              <FaCalendarAlt className="me-1 text-muted" />
              Received on:{" "}
              {new Date(inquiry.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <div className="erp-header-actions d-flex gap-2">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchInquiryDetails}
            title="Refresh"
            disabled={loading}
          >
            <FaClock className="erp-btn-icon" />
            <span>Refresh</span>
          </button>

          <button
            className="erp-btn erp-btn-primary"
            onClick={() =>
              navigate("/super-admin/create-college", {
                state: {
                  prefillName: inquiry.institutionName,
                  prefillEmail: inquiry.email,
                  prefillContact: inquiry.phone,
                },
              })
            }
            title="Register as college"
          >
            <FaPlus className="erp-btn-icon" />
            <span>Add as College</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="row g-4 mb-4 animate-fade-in">
        {/* LEFT COLUMN: Main Details & Message */}
        <div className="col-12 col-lg-8">
          {/* ENQUIRY MESSAGE CARD */}
          <div className="erp-card shadow-sm p-4 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h4 className="h6 fw-bold text-dark text-uppercase mb-0 d-flex align-items-center gap-2">
                <FaEnvelopeOpenText className="text-primary" />
                <span>Enquiry Message</span>
              </h4>
              <span className="text-muted small">
                Length: {(inquiry.inquiryMessage || inquiry.message)?.length || 0} characters
              </span>
            </div>

            <div
              className="p-3 rounded bg-light border"
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                fontSize: "1rem",
                color: "#1e293b",
                minHeight: "140px",
              }}
            >
              {inquiry.inquiryMessage || inquiry.message}
            </div>
          </div>

          {/* INSTITUTION & CONTACT PERSON CARD */}
          <div className="erp-card shadow-sm p-4">
            <h4 className="h6 fw-bold text-dark text-uppercase mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
              <FaBuilding className="text-primary" />
              <span>Institution & Sender Profile</span>
            </h4>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="p-3 rounded border bg-light h-100">
                  <span className="text-muted small d-block mb-1">
                    <FaBuilding className="me-1 text-primary" /> Institution / College Name
                  </span>
                  <strong className="fs-6 text-dark">{inquiry.institutionName}</strong>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded border bg-light h-100">
                  <span className="text-muted small d-block mb-1">
                    <FaUser className="me-1 text-primary" /> Sender Name & Designation
                  </span>
                  <strong className="fs-6 text-dark">
                    {inquiry.firstName} {inquiry.lastName}
                  </strong>
                  <span className="badge bg-secondary ms-2 text-capitalize">
                    {inquiry.role}
                  </span>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded border bg-light h-100">
                  <span className="text-muted small d-block mb-1">
                    <FaEnvelope className="me-1 text-primary" /> Email Address
                  </span>
                  <a
                    href={`mailto:${inquiry.email}?subject=Response to Enquiry ${inquiry.inquiryNumber}`}
                    className="text-primary fw-semibold"
                  >
                    {inquiry.email}
                  </a>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 rounded border bg-light h-100">
                  <span className="text-muted small d-block mb-1">
                    <FaPhone className="me-1 text-primary" /> Phone Number
                  </span>
                  {inquiry.phone ? (
                    <a href={`tel:${inquiry.phone}`} className="text-dark fw-semibold">
                      {inquiry.phone}
                    </a>
                  ) : (
                    <span className="text-muted font-italic">Not provided</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Status & Quick Actions */}
        <div className="col-12 col-lg-4">
          {/* LEAD STATUS CONTROL CARD */}
          <div className="erp-card shadow-sm p-4 mb-4">
            <h4 className="h6 fw-bold text-dark text-uppercase mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
              <FaTag className="text-primary" />
              <span>Lead Status & Follow-up</span>
            </h4>

            <div className="mb-3">
              <label className="form-label text-muted small fw-semibold">
                Current Status:
              </label>
              <div className="mb-2">{getStatusBadge(inquiry.status)}</div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small fw-semibold">
                Change Status to:
              </label>
              <Form.Select
                value={inquiry.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mb-2"
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="CLOSED">CLOSED</option>
              </Form.Select>
            </div>

            <div className="d-grid gap-2">
              {inquiry.status === "NEW" && (
                <Button
                  variant="outline-info"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("CONTACTED")}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  <FaExchangeAlt /> Mark as Contacted
                </Button>
              )}

              {inquiry.status !== "CLOSED" && (
                <Button
                  variant="outline-success"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("CLOSED")}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  <FaCheckCircle /> Mark as Closed
                </Button>
              )}

              {inquiry.status === "CLOSED" && (
                <Button
                  variant="outline-warning"
                  size="sm"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("NEW")}
                  className="d-flex align-items-center justify-content-center gap-2"
                >
                  <FaClock /> Reopen as New
                </Button>
              )}
            </div>
          </div>

          {/* QUICK COMMUNICATION CARD */}
          <div className="erp-card shadow-sm p-4 mb-4">
            <h4 className="h6 fw-bold text-dark text-uppercase mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
              <FaReply className="text-primary" />
              <span>Direct Communication</span>
            </h4>

            <div className="d-grid gap-2">
              <a
                href={`mailto:${inquiry.email}?subject=Smart College Solution - Enquiry ${inquiry.inquiryNumber}&body=Dear ${inquiry.firstName},%0D%0A%0D%0AThank you for reaching out to us regarding Smart College ERP for ${inquiry.institutionName}.`}
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center gap-2"
              >
                <FaEnvelope /> Send Reply Email
              </a>

              {inquiry.phone && (
                <a
                  href={`tel:${inquiry.phone}`}
                  className="btn btn-outline-success btn-sm d-flex align-items-center justify-content-center gap-2"
                >
                  <FaPhone /> Call Contact Person
                </a>
              )}
            </div>
          </div>

          {/* CONVERT TO COLLEGE CARD */}
          <div
            className="erp-card shadow-sm p-4"
            style={{ borderLeft: "4px solid #2563eb", background: "#f8fafc" }}
          >
            <h5 className="h6 fw-bold text-dark mb-2">College Onboarding</h5>
            <p className="small text-muted mb-3">
              Ready to onboard <strong>{inquiry.institutionName}</strong>? Convert this lead directly into a registered institution.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() =>
                navigate("/super-admin/create-college", {
                  state: {
                    prefillName: inquiry.institutionName,
                    prefillEmail: inquiry.email,
                    prefillContact: inquiry.phone,
                  },
                })
              }
            >
              <FaPlus /> Onboard College
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
