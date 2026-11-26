import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
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
  FaCopy,
  FaCheck,
  FaSyncAlt,
  FaUndo,
  FaGraduationCap,
  FaEye,
} from "react-icons/fa";

/* Helper to format readable date and time */
function formatDateTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* Helper to compute relative time label */
function getRelativeTime(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return past.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffHour > 0) return `${diffHour} hr${diffHour > 1 ? "s" : ""} ago`;
  if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  return "just now";
}

export default function ViewEnquiry() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  /* ================= FETCH INQUIRY DETAILS ================= */
  const fetchInquiryDetails = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const res = await api.get(`/inquiries/${id}`);

        // axios interceptor unwraps to res.data or res.data.data
        const data = res.data?.data || res.data;
        if (!data || !data._id) {
          throw new Error("Enquiry data not found");
        }
        setInquiry(data);
        if (isManualRefresh) {
          toast.success("Enquiry refreshed");
        }
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load enquiry details";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

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
      toast.error(
        err.response?.data?.message || "Failed to update enquiry status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ================= ONBOARD COLLEGE NAVIGATION ================= */
  const handleOnboardCollege = () => {
    if (!inquiry) return;
    navigate("/super-admin/create-college", {
      state: {
        inquiryId: inquiry._id,
        prefillName: inquiry.institutionName,
        prefillEmail: inquiry.email,
        prefillContact: inquiry.phone,
      },
    });
  };

  /* ================= COPY TO CLIPBOARD ================= */
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  /* ================= STATUS BADGE ================= */
  const getStatusBadge = (status) => {
    switch (status) {
      case "NEW":
        return (
          <span className="sa-badge sa-badge-new" aria-label="Status: New">
            <span className="sa-badge-dot sa-badge-dot-new" aria-hidden="true" />
            NEW
          </span>
        );
      case "CONTACTED":
        return (
          <span className="sa-badge sa-badge-contacted" aria-label="Status: Contacted">
            <span className="sa-badge-dot sa-badge-dot-contacted" aria-hidden="true" />
            CONTACTED
          </span>
        );
      case "CLOSED":
        return (
          <span className="sa-badge sa-badge-closed" aria-label="Status: Closed">
            <span className="sa-badge-dot sa-badge-dot-closed" aria-hidden="true" />
            CLOSED
          </span>
        );
      case "CONVERTED":
        return (
          <span className="sa-badge sa-badge-converted" aria-label="Status: Onboarded">
            <span className="sa-badge-dot sa-badge-dot-converted" aria-hidden="true" />
            ONBOARDED
          </span>
        );
      default:
        return (
          <span className="sa-badge sa-badge-default" aria-label={`Status: ${status}`}>
            {status}
          </span>
        );
    }
  };

  /* ================= RENDER SKELETON LOADING STATE ================= */
  if (loading && !inquiry) {
    return (
      <div className="sa-view-enquiry-wrapper">
        <style>{scopedStyles}</style>
        <div className="container-fluid px-3 px-md-4 pt-3">
          {/* BREADCRUMB AT TOP (OUTSIDE HEADER) */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/super-admin/dashboard" },
              { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
              { label: "Loading..." },
            ]}
          />

          {/* SKELETON HEADER BAND */}
          <header className="sa-header-band">
            <div className="sa-header-top-row">
              <button
                type="button"
                className="sa-back-btn"
                onClick={() => navigate("/super-admin/enquiries")}
                aria-label="Back to all enquiries"
              >
                <FaArrowLeft className="sa-btn-icon" />
                <span>Back to Enquiries</span>
              </button>
              <div className="d-flex gap-2">
                <div className="sa-skeleton" style={{ width: "90px", height: "36px", borderRadius: "8px" }} />
                <div className="sa-skeleton" style={{ width: "130px", height: "36px", borderRadius: "8px" }} />
              </div>
            </div>
            <div className="sa-title-row mt-2">
              <div>
                <div className="sa-skeleton mb-2" style={{ width: "280px", height: "32px", borderRadius: "6px" }} />
                <div className="d-flex gap-2 align-items-center">
                  <div className="sa-skeleton" style={{ width: "120px", height: "24px", borderRadius: "20px" }} />
                  <div className="sa-skeleton" style={{ width: "80px", height: "24px", borderRadius: "20px" }} />
                  <div className="sa-skeleton" style={{ width: "150px", height: "20px" }} />
                </div>
              </div>
            </div>
          </header>

          {/* SKELETON BODY */}
          <main className="sa-main-content">
            {/* Stepper Skeleton */}
            <div className="sa-stepper-card mb-4 p-4">
              <div className="d-flex justify-content-between align-items-center">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <div className="sa-skeleton" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                    <div className="sa-skeleton" style={{ width: "80px", height: "16px" }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12 col-lg-8">
                <div className="sa-card p-4 mb-4">
                  <div className="sa-skeleton mb-3" style={{ width: "160px", height: "20px" }} />
                  <div className="sa-skeleton mb-2" style={{ width: "100%", height: "20px" }} />
                  <div className="sa-skeleton mb-2" style={{ width: "90%", height: "20px" }} />
                  <div className="sa-skeleton" style={{ width: "60%", height: "20px" }} />
                </div>
                <div className="sa-card p-4">
                  <div className="sa-skeleton mb-3" style={{ width: "200px", height: "20px" }} />
                  <div className="row g-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="col-12 col-md-6">
                        <div className="sa-skeleton" style={{ width: "100%", height: "70px", borderRadius: "8px" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="sa-card p-4 mb-4">
                  <div className="sa-skeleton mb-2" style={{ width: "140px", height: "24px" }} />
                  <div className="sa-skeleton mb-3" style={{ width: "100%", height: "40px" }} />
                  <div className="sa-skeleton" style={{ width: "100%", height: "38px", borderRadius: "8px" }} />
                </div>
                <div className="sa-card p-4 mb-4">
                  <div className="sa-skeleton mb-3" style={{ width: "120px", height: "20px" }} />
                  <div className="sa-skeleton" style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ================= RENDER ERROR OR NOT FOUND STATE ================= */
  if (error || !inquiry) {
    return (
      <div className="sa-view-enquiry-wrapper">
        <style>{scopedStyles}</style>
        <div className="container-fluid px-3 px-md-4 pt-3">
          {/* ================= BREADCRUMB (OUT OF HEADER, AT TOP) ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/super-admin/dashboard" },
              { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
              { label: "Error" },
            ]}
          />

          <header className="sa-header-band">
            <div className="sa-header-top-row">
              <button
                type="button"
                className="sa-back-btn"
                onClick={() => navigate("/super-admin/enquiries")}
              >
                <FaArrowLeft className="sa-btn-icon" />
                <span>Back to Enquiries</span>
              </button>
            </div>
          </header>

          <main className="sa-main-content py-5">
            <ApiError
              title="Enquiry Not Found"
              message={error || "The requested enquiry could not be found or has been removed."}
              onRetry={() => fetchInquiryDetails(false)}
              onGoBack={() => navigate("/super-admin/enquiries")}
            />
          </main>
        </div>
      </div>
    );
  }

  const messageText = inquiry.inquiryMessage || inquiry.message || "";

  /* Compute stepper step states based on inquiry.status */
  const steps = [
    {
      id: "NEW",
      title: "New Lead",
      desc: "Received & Logged",
      timestamp: inquiry.createdAt,
    },
    {
      id: "CONTACTED",
      title: "Contacted",
      desc: "Follow-up in Progress",
      timestamp:
        inquiry.status === "CONTACTED" || inquiry.status === "CLOSED" || inquiry.status === "CONVERTED"
          ? inquiry.updatedAt && inquiry.updatedAt !== inquiry.createdAt
            ? inquiry.updatedAt
            : null
          : null,
    },
    {
      id: "CLOSED",
      title: inquiry.status === "CONVERTED" ? "Onboarded" : "Closed",
      desc: inquiry.status === "CONVERTED" ? "College Onboarded" : "Resolved / Closed",
      timestamp:
        inquiry.status === "CLOSED" || inquiry.status === "CONVERTED"
          ? inquiry.convertedAt || inquiry.updatedAt
          : null,
    },
  ];

  const getStepStatus = (stepId) => {
    if (inquiry.status === "NEW") {
      if (stepId === "NEW") return "active";
      return "pending";
    }
    if (inquiry.status === "CONTACTED") {
      if (stepId === "NEW") return "completed";
      if (stepId === "CONTACTED") return "active";
      return "pending";
    }
    if (inquiry.status === "CLOSED" || inquiry.status === "CONVERTED") {
      if (stepId === "CLOSED") return "active-completed";
      return "completed";
    }
    return "pending";
  };

  return (
    <div className="sa-view-enquiry-wrapper">
      <style>{scopedStyles}</style>

      <div className="container-fluid px-3 px-md-4 pt-3">
        {/* ================= BREADCRUMB (OUT OF HEADER, AT TOP) ================= */}
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/super-admin/dashboard" },
            { label: "Enquiries & Leads", path: "/super-admin/enquiries" },
            { label: inquiry.inquiryNumber || "Details" },
          ]}
        />

        {/* ================= HEADER BAND ================= */}
        <header className="sa-header-band">
          {/* TOP ROW: BACK BUTTON ON LEFT, ACTIONS ON RIGHT */}
          <div className="sa-header-top-row">
            <button
              type="button"
              className="sa-back-btn"
              onClick={() => navigate("/super-admin/enquiries")}
              aria-label="Back to all enquiries"
            >
              <FaArrowLeft className="sa-btn-icon" />
              <span>Back to Enquiries</span>
            </button>

            <div className="sa-header-actions">
              <button
                type="button"
                className="sa-header-btn sa-header-btn-refresh"
                onClick={() => fetchInquiryDetails(true)}
                disabled={loading || refreshing}
                title="Refresh enquiry details"
                aria-label="Refresh enquiry details"
              >
                <FaSyncAlt className={`sa-btn-icon ${refreshing ? "sa-spin" : ""}`} />
                <span className="d-none d-sm-inline">
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>

              {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? (
                <button
                  type="button"
                  className="sa-header-btn sa-header-btn-primary"
                  onClick={() => navigate(`/super-admin/college/${inquiry.convertedCollegeId?._id || inquiry.convertedCollegeId}`)}
                  title="View registered college profile"
                  aria-label="View registered college profile"
                >
                  <FaEye className="sa-btn-icon" />
                  <span>View College</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="sa-header-btn sa-header-btn-primary"
                  onClick={handleOnboardCollege}
                  title="Register this lead as an institution"
                  aria-label="Onboard this lead as a college"
                >
                  <FaPlus className="sa-btn-icon" />
                  <span>Onboard College</span>
                </button>
              )}
            </div>
          </div>

          {/* MAIN TITLE ROW */}
          <div className="sa-title-row">
            <div className="sa-title-left">
              <h1 className="sa-institution-title" title={inquiry.institutionName}>
                {inquiry.institutionName}
              </h1>

              <div className="sa-meta-strip">
                {/* Copyable Reference Chip */}
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="tip-ref-num">
                      {copiedKey === "ref" ? "Copied!" : "Click to copy reference"}
                    </Tooltip>
                  }
                >
                  <button
                    type="button"
                    className="sa-ref-chip"
                    onClick={() => handleCopy(inquiry.inquiryNumber, "ref")}
                    aria-label={`Copy reference number ${inquiry.inquiryNumber}`}
                  >
                    <span className="sa-ref-text">{inquiry.inquiryNumber}</span>
                    {copiedKey === "ref" ? (
                      <FaCheck className="sa-copy-icon sa-copy-success" />
                    ) : (
                      <FaCopy className="sa-copy-icon" />
                    )}
                  </button>
                </OverlayTrigger>

                {getStatusBadge(inquiry.status)}

                <span className="sa-meta-time">
                  <FaCalendarAlt className="me-1 opacity-75" aria-hidden="true" />
                  <span>Received {formatDateTime(inquiry.createdAt)}</span>
                  <span className="sa-relative-badge">
                    {getRelativeTime(inquiry.createdAt)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </header>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="sa-main-content">
        {/* 1. PROGRESS STEPPER */}
        <section
          className="sa-stepper-card mb-4"
          aria-label="Enquiry progress stepper"
        >
          <ol className="sa-stepper-track" role="list">
            {steps.map((step, idx) => {
              const stepStatus = getStepStatus(step.id);
              const isCurrent =
                (inquiry.status === "NEW" && step.id === "NEW") ||
                (inquiry.status === "CONTACTED" && step.id === "CONTACTED") ||
                (inquiry.status === "CLOSED" && step.id === "CLOSED");

              return (
                <li
                  key={step.id}
                  className={`sa-step-item sa-step-${stepStatus}`}
                  role="listitem"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <div className="sa-step-indicator-wrapper">
                    <div className="sa-step-indicator">
                      {stepStatus === "completed" || stepStatus === "active-completed" ? (
                        <FaCheckCircle className="sa-step-check" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    {idx < steps.length - 1 && <div className="sa-step-line" />}
                  </div>

                  <div className="sa-step-content">
                    <span className="sa-step-title">{step.title}</span>
                    <span className="sa-step-desc">{step.desc}</span>
                    {step.timestamp && (
                      <span className="sa-step-date">
                        <FaClock className="me-1" aria-hidden="true" />
                        {formatDateTime(step.timestamp)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 2. TWO-COLUMN LAYOUT */}
        <div className="row g-4">
          {/* ================= LEFT COLUMN (~2/3 on desktop) ================= */}
          <div className="col-12 col-lg-8">
            {/* A. ENQUIRY MESSAGE CARD */}
            <div className="sa-card mb-4">
              <div className="sa-card-header">
                <div className="d-flex align-items-center gap-2">
                  <div className="sa-card-header-icon" aria-hidden="true">
                    <FaEnvelopeOpenText />
                  </div>
                  <h2 className="sa-card-title mb-0">Enquiry Message</h2>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <span className="sa-char-count">
                    {messageText.length} characters
                  </span>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id="tip-copy-msg">
                        {copiedKey === "message" ? "Copied!" : "Copy message"}
                      </Tooltip>
                    }
                  >
                    <button
                      type="button"
                      className="sa-action-chip-btn"
                      onClick={() => handleCopy(messageText, "message")}
                      aria-label="Copy message text"
                    >
                      {copiedKey === "message" ? (
                        <FaCheck className="sa-copy-success me-1" />
                      ) : (
                        <FaCopy className="me-1" />
                      )}
                      <span>{copiedKey === "message" ? "Copied" : "Copy"}</span>
                    </button>
                  </OverlayTrigger>
                </div>
              </div>

              <div className="sa-card-body">
                <div className="sa-message-content">
                  {messageText || (
                    <span className="text-muted fst-italic">No message provided.</span>
                  )}
                </div>
              </div>
            </div>

            {/* B. INSTITUTION AND SENDER CARD */}
            <div className="sa-card">
              <div className="sa-card-header">
                <div className="d-flex align-items-center gap-2">
                  <div className="sa-card-header-icon" aria-hidden="true">
                    <FaBuilding />
                  </div>
                  <h2 className="sa-card-title mb-0">Institution & Contact Profile</h2>
                </div>
              </div>

              <div className="sa-card-body">
                <div className="row g-3">
                  {/* Institution Name */}
                  <div className="col-12 col-md-6">
                    <div className="sa-info-tile">
                      <div className="sa-tile-icon" aria-hidden="true">
                        <FaBuilding />
                      </div>
                      <div className="sa-tile-details">
                        <span className="sa-tile-label">Institution / College</span>
                        <strong className="sa-tile-value text-dark" title={inquiry.institutionName}>
                          {inquiry.institutionName}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Sender Name & Role */}
                  <div className="col-12 col-md-6">
                    <div className="sa-info-tile">
                      <div className="sa-tile-icon" aria-hidden="true">
                        <FaUser />
                      </div>
                      <div className="sa-tile-details">
                        <span className="sa-tile-label">Sender & Designation</span>
                        <div className="d-flex align-items-center gap-2 flex-wrap mt-0.5">
                          <strong className="sa-tile-value text-dark">
                            {inquiry.firstName} {inquiry.lastName}
                          </strong>
                          <span className="sa-role-pill">
                            {inquiry.role || "Other"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="col-12 col-md-6">
                    <div className="sa-info-tile">
                      <div className="sa-tile-icon" aria-hidden="true">
                        <FaEnvelope />
                      </div>
                      <div className="sa-tile-details">
                        <span className="sa-tile-label">Email Address</span>
                        <div className="d-flex align-items-center justify-content-between gap-2 mt-0.5">
                          <a
                            href={`mailto:${inquiry.email}?subject=Response to Enquiry ${inquiry.inquiryNumber}`}
                            className="sa-tile-link"
                            title={`Email ${inquiry.email}`}
                          >
                            {inquiry.email}
                          </a>
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id="tip-copy-email">
                                {copiedKey === "email" ? "Copied!" : "Copy email"}
                              </Tooltip>
                            }
                          >
                            <button
                              type="button"
                              className="sa-mini-copy-btn"
                              onClick={() => handleCopy(inquiry.email, "email")}
                              aria-label="Copy email address"
                            >
                              {copiedKey === "email" ? (
                                <FaCheck className="sa-copy-success" />
                              ) : (
                                <FaCopy />
                              )}
                            </button>
                          </OverlayTrigger>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="col-12 col-md-6">
                    <div className="sa-info-tile">
                      <div className="sa-tile-icon" aria-hidden="true">
                        <FaPhone />
                      </div>
                      <div className="sa-tile-details">
                        <span className="sa-tile-label">Phone Number</span>
                        {inquiry.phone ? (
                          <div className="d-flex align-items-center justify-content-between gap-2 mt-0.5">
                            <a
                              href={`tel:${inquiry.phone}`}
                              className="sa-tile-link"
                              title={`Call ${inquiry.phone}`}
                            >
                              {inquiry.phone}
                            </a>
                            <OverlayTrigger
                              placement="top"
                              overlay={
                                <Tooltip id="tip-copy-phone">
                                  {copiedKey === "phone" ? "Copied!" : "Copy phone"}
                                </Tooltip>
                              }
                            >
                              <button
                                type="button"
                                className="sa-mini-copy-btn"
                                onClick={() => handleCopy(inquiry.phone, "phone")}
                                aria-label="Copy phone number"
                              >
                                {copiedKey === "phone" ? (
                                  <FaCheck className="sa-copy-success" />
                                ) : (
                                  <FaCopy />
                                )}
                              </button>
                            </OverlayTrigger>
                          </div>
                        ) : (
                          <span className="sa-tile-value text-muted fst-italic">
                            Not provided
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (~1/3 on desktop) ================= */}
          <div className="col-12 col-lg-4">
            {/* A. NEXT-STEP CARD ("Onboard College" or "College Already Onboarded") */}
            <div className={`sa-card ${inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? "sa-card-converted" : "sa-card-highlight"} mb-4`}>
              <div className="sa-card-header">
                <div className="d-flex align-items-center gap-2">
                  <div className={`sa-card-header-icon ${inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? "sa-icon-converted" : "sa-icon-accent"}`} aria-hidden="true">
                    {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? <FaCheckCircle /> : <FaGraduationCap />}
                  </div>
                  <h2 className="sa-card-title mb-0">
                    {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? "College Onboarded" : "Next Step: Onboard"}
                  </h2>
                </div>
                <span className={inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? "sa-converted-tag" : "sa-priority-tag"}>
                  {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? "Onboarded" : "Primary Action"}
                </span>
              </div>

              <div className="sa-card-body">
                {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? (
                  <>
                    <p className="sa-highlight-copy">
                      ✅ This lead was successfully converted into a registered college: <strong>{inquiry.convertedCollegeId?.name || inquiry.institutionName}</strong>.
                    </p>
                    {inquiry.convertedCollegeId && (
                      <button
                        type="button"
                        className="sa-btn-cta w-100"
                        onClick={() => navigate(`/super-admin/college/${inquiry.convertedCollegeId._id || inquiry.convertedCollegeId}`)}
                        aria-label={`View registered details for ${inquiry.convertedCollegeId.name || inquiry.institutionName}`}
                      >
                        <FaEye className="me-2" />
                        <span>View Registered College</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="sa-highlight-copy">
                      Ready to onboard <strong>{inquiry.institutionName}</strong>? Convert this lead directly into a registered institution on NOVAA.
                    </p>

                    <button
                      type="button"
                      className="sa-btn-cta w-100"
                      onClick={handleOnboardCollege}
                      aria-label={`Onboard ${inquiry.institutionName} as a registered college`}
                    >
                      <FaPlus className="me-2" />
                      <span>Onboard College</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* B. LEAD STATUS CARD */}
            <div className="sa-card mb-4">
              <div className="sa-card-header">
                <div className="d-flex align-items-center gap-2">
                  <div className="sa-card-header-icon" aria-hidden="true">
                    <FaTag />
                  </div>
                  <h2 className="sa-card-title mb-0">Lead Status & Progress</h2>
                </div>
              </div>

              <div className="sa-card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="sa-label-muted">Current Status:</span>
                  <div>{getStatusBadge(inquiry.status)}</div>
                </div>

                {/* Status Selection (Dropdown) - Hidden when Onboarded */}
                {inquiry.status !== "CONVERTED" && (
                  <div className="sa-other-status-section pt-3 mt-3 border-top">
                    <label htmlFor="manual-status-select" className="sa-quiet-label mb-1.5">
                      Change Status:
                    </label>
                    <Form.Select
                      id="manual-status-select"
                      size="sm"
                      value={inquiry.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="sa-status-select"
                      aria-label="Change enquiry status"
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="CLOSED">CLOSED</option>
                    </Form.Select>
                  </div>
                )}
              </div>
            </div>

            {/* C. DIRECT COMMUNICATION CARD */}
            <div className="sa-card">
              <div className="sa-card-header">
                <div className="d-flex align-items-center gap-2">
                  <div className="sa-card-header-icon" aria-hidden="true">
                    <FaReply />
                  </div>
                  <h2 className="sa-card-title mb-0">Direct Communication</h2>
                </div>
              </div>

              <div className="sa-card-body d-flex flex-column gap-2.5">
                {/* Send Reply Email */}
                <a
                  href={`mailto:${inquiry.email}?subject=Smart College Solution - Enquiry ${inquiry.inquiryNumber}&body=Dear ${inquiry.firstName},%0D%0A%0D%0AThank you for reaching out to us regarding Smart College ERP for ${inquiry.institutionName}.`}
                  className="sa-comm-item"
                  title={`Send email to ${inquiry.email}`}
                >
                  <div className="sa-comm-icon-wrap sa-comm-email-wrap" aria-hidden="true">
                    <FaEnvelope />
                  </div>
                  <div className="sa-comm-details">
                    <span className="sa-comm-heading">Send Reply Email</span>
                    <span className="sa-comm-sub">
                      Open mail client with prefilled response
                    </span>
                  </div>
                </a>

                {/* Call Contact Person */}
                {inquiry.phone ? (
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="sa-comm-item"
                    title={`Call ${inquiry.phone}`}
                  >
                    <div className="sa-comm-icon-wrap sa-comm-call-wrap" aria-hidden="true">
                      <FaPhone />
                    </div>
                    <div className="sa-comm-details">
                      <span className="sa-comm-heading">Call Contact Person</span>
                      <span className="sa-comm-sub">{inquiry.phone}</span>
                    </div>
                  </a>
                ) : (
                  <div
                    className="sa-comm-item sa-comm-disabled"
                    aria-disabled="true"
                    title="Phone number not provided by sender"
                  >
                    <div className="sa-comm-icon-wrap sa-comm-disabled-wrap" aria-hidden="true">
                      <FaPhone />
                    </div>
                    <div className="sa-comm-details">
                      <span className="sa-comm-heading">Call Contact Person</span>
                      <span className="sa-comm-sub text-muted">Phone not provided</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* ================= STICKY BOTTOM ACTION BAR (MOBILE ONLY) ================= */}
      <nav className="sa-mobile-sticky-bar d-lg-none" aria-label="Mobile quick actions">
        <div className="d-flex gap-2 w-100">
          {inquiry.convertedCollegeId || inquiry.status === "CONVERTED" ? (
            <button
              type="button"
              className="sa-mobile-btn sa-mobile-btn-primary flex-fill"
              onClick={() => navigate(`/super-admin/college/${inquiry.convertedCollegeId?._id || inquiry.convertedCollegeId}`)}
            >
              <FaEye className="me-1" />
              <span>View College</span>
            </button>
          ) : (
            <button
              type="button"
              className="sa-mobile-btn sa-mobile-btn-primary flex-fill"
              onClick={handleOnboardCollege}
            >
              <FaPlus className="me-1" />
              <span>Onboard College</span>
            </button>
          )}

          {inquiry.status === "NEW" && (
            <button
              type="button"
              className="sa-mobile-btn sa-mobile-btn-contacted flex-fill"
              disabled={updatingStatus}
              onClick={() => handleStatusChange("CONTACTED")}
            >
              <FaExchangeAlt className="me-1" />
              <span>Contacted</span>
            </button>
          )}

          {inquiry.status === "CONTACTED" && (
            <button
              type="button"
              className="sa-mobile-btn sa-mobile-btn-closed flex-fill"
              disabled={updatingStatus}
              onClick={() => handleStatusChange("CLOSED")}
            >
              <FaCheckCircle className="me-1" />
              <span>Close</span>
            </button>
          )}

          {inquiry.status === "CLOSED" && (
            <button
              type="button"
              className="sa-mobile-btn sa-mobile-btn-reopen flex-fill"
              disabled={updatingStatus}
              onClick={() => handleStatusChange("NEW")}
            >
              <FaUndo className="me-1" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

/* =========================================================================
   SCOPED CSS STYLESHEET
   Uses exclusively the dark teal/navy theme tokens from Sidebar.css:
   #0f3a4a, #0c2d3a, #3db5e6, #4fc3f7, #e6f2f5, and matching rgba values.
   ========================================================================= */
const scopedStyles = `
  .sa-view-enquiry-wrapper {
    --sa-teal-dark: #0c2d3a;
    --sa-teal-base: #0f3a4a;
    --sa-teal-accent: #3db5e6;
    --sa-teal-accent-light: #4fc3f7;
    --sa-teal-text: #e6f2f5;
    --sa-teal-text-muted: rgba(255, 255, 255, 0.75);
    --sa-teal-border: rgba(255, 255, 255, 0.14);
    --sa-teal-hover: rgba(255, 255, 255, 0.08);
    --sa-teal-active: rgba(255, 255, 255, 0.16);

    --sa-bg-body: #f8fafc;
    --sa-card-bg: #ffffff;
    --sa-card-border: #e2e8f0;
    --sa-card-radius: 12px;
    --sa-card-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
    --sa-card-shadow-hover: 0 8px 20px -3px rgba(15, 23, 42, 0.08), 0 3px 6px -2px rgba(15, 23, 42, 0.04);

    background-color: var(--sa-bg-body);
    min-height: 100vh;
    padding-bottom: 4rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    box-sizing: border-box;
  }

  /* ================= HEADER BAND ================= */
  .sa-header-band {
    background: linear-gradient(135deg, var(--sa-teal-base) 0%, var(--sa-teal-dark) 100%);
    color: var(--sa-teal-text);
    padding: 1.25rem 1.75rem;
    border-radius: var(--sa-card-radius);
    border: 1px solid var(--sa-teal-border);
    box-shadow: 0 4px 16px rgba(12, 45, 58, 0.18);
    margin-bottom: 1.5rem;
  }

  .sa-header-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--sa-teal-border);
  }

  .sa-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--sa-teal-hover);
    color: var(--sa-teal-text);
    border: 1px solid var(--sa-teal-border);
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.825rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .sa-back-btn:hover {
    background: var(--sa-teal-active);
    color: #ffffff;
    border-color: var(--sa-teal-accent);
    transform: translateX(-2px);
  }

  .sa-back-btn:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 2px;
  }

  /* Title Row */
  .sa-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .sa-title-left {
    flex: 1 1 300px;
    min-width: 0;
  }

  .sa-institution-title {
    font-size: 1.45rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
    margin: 0 0 0.5rem 0;
    word-break: break-word;
    line-height: 1.3;
  }

  .sa-meta-strip {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  /* Reference Number Chip */
  .sa-ref-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--sa-teal-border);
    color: var(--sa-teal-text);
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 0.775rem;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sa-ref-chip:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: var(--sa-teal-accent);
    color: #ffffff;
  }

  .sa-ref-chip:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 2px;
  }

  .sa-copy-icon {
    font-size: 0.7rem;
    opacity: 0.75;
  }

  .sa-copy-success {
    color: #10b981 !important;
    opacity: 1 !important;
  }

  .sa-meta-time {
    font-size: 0.8rem;
    color: var(--sa-teal-text-muted);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .sa-relative-badge {
    background: rgba(255, 255, 255, 0.1);
    color: var(--sa-teal-text);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.725rem;
    font-weight: 500;
  }

  /* Header Action Buttons */
  .sa-header-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .sa-header-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    text-decoration: none;
  }

  .sa-header-btn-refresh {
    background: var(--sa-teal-hover);
    color: var(--sa-teal-text);
    border: 1px solid var(--sa-teal-border);
  }

  .sa-header-btn-refresh:hover:not(:disabled) {
    background: var(--sa-teal-active);
    color: #ffffff;
    border-color: var(--sa-teal-accent);
  }

  .sa-header-btn-refresh:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 2px;
  }

  .sa-header-btn-primary {
    background: var(--sa-teal-accent);
    color: var(--sa-teal-dark);
    box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
  }

  .sa-header-btn-primary:hover {
    background: var(--sa-teal-accent-light);
    color: var(--sa-teal-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(61, 181, 230, 0.4);
  }

  .sa-header-btn-primary:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  /* ================= MAIN CONTAINER ================= */
  .sa-main-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  /* ================= STEPPER CARD ================= */
  .sa-stepper-card {
    background: var(--sa-card-bg);
    border: 1px solid var(--sa-card-border);
    border-radius: var(--sa-card-radius);
    padding: 1.25rem 1.75rem;
    box-shadow: var(--sa-card-shadow);
  }

  .sa-stepper-track {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 1rem;
    position: relative;
  }

  .sa-step-item {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .sa-step-indicator-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    margin-bottom: 0.6rem;
  }

  .sa-step-indicator {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    z-index: 2;
    transition: all 0.25s ease;
  }

  .sa-step-pending .sa-step-indicator {
    background: #f1f5f9;
    color: #94a3b8;
    border: 2px solid #cbd5e1;
  }

  .sa-step-active .sa-step-indicator {
    background: var(--sa-teal-base);
    color: #ffffff;
    border: 2px solid var(--sa-teal-accent);
    box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.25);
  }

  .sa-step-completed .sa-step-indicator,
  .sa-step-active-completed .sa-step-indicator {
    background: #ecfdf5;
    color: #059669;
    border: 2px solid #10b981;
  }

  .sa-step-check {
    font-size: 1rem;
    color: #059669;
  }

  .sa-step-line {
    position: absolute;
    left: 32px;
    right: -1rem;
    top: 50%;
    height: 2px;
    background: #e2e8f0;
    z-index: 1;
    transform: translateY(-50%);
  }

  .sa-step-completed .sa-step-line {
    background: #10b981;
  }

  .sa-step-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sa-step-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #1e293b;
  }

  .sa-step-active .sa-step-title {
    color: var(--sa-teal-base);
  }

  .sa-step-desc {
    font-size: 0.75rem;
    color: #64748b;
  }

  .sa-step-date {
    font-size: 0.72rem;
    color: #059669;
    font-weight: 500;
    margin-top: 2px;
    display: inline-flex;
    align-items: center;
  }

  /* ================= CARDS GENERAL ================= */
  .sa-card {
    background: var(--sa-card-bg);
    border: 1px solid var(--sa-card-border);
    border-radius: var(--sa-card-radius);
    box-shadow: var(--sa-card-shadow);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .sa-card-header {
    padding: 1rem 1.35rem;
    background: #ffffff;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .sa-card-header-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(15, 58, 74, 0.08);
    color: var(--sa-teal-base);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
  }

  .sa-icon-accent {
    background: rgba(61, 181, 230, 0.15);
    color: var(--sa-teal-base);
  }

  .sa-card-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--sa-teal-dark);
    letter-spacing: -0.01em;
  }

  .sa-card-body {
    padding: 1.35rem;
  }

  /* Message Box */
  .sa-message-content {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.15rem 1.25rem;
    font-size: 0.925rem;
    line-height: 1.7;
    color: #1e293b;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 480px;
    overflow-y: auto;
  }

  .sa-char-count {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .sa-action-chip-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #475569;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sa-action-chip-btn:hover {
    background: #f1f5f9;
    color: #1e293b;
    border-color: #94a3b8;
  }

  .sa-action-chip-btn:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 1px;
  }

  /* Info Tiles */
  .sa-info-tile {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    height: 100%;
    transition: border-color 0.15s ease;
  }

  .sa-info-tile:hover {
    border-color: #cbd5e1;
  }

  .sa-tile-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: var(--sa-teal-base);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .sa-tile-details {
    flex: 1;
    min-width: 0;
  }

  .sa-tile-label {
    display: block;
    font-size: 0.725rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    margin-bottom: 2px;
  }

  .sa-tile-value {
    font-size: 0.9rem;
    word-break: break-word;
  }

  .sa-tile-link {
    color: var(--sa-teal-base);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    word-break: break-all;
    transition: color 0.15s ease;
  }

  .sa-tile-link:hover {
    color: var(--sa-teal-accent);
    text-decoration: underline;
  }

  .sa-mini-copy-btn {
    border: none;
    background: transparent;
    color: #94a3b8;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .sa-mini-copy-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .sa-mini-copy-btn:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
  }

  /* Role pill */
  .sa-role-pill {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 12px;
    font-size: 0.725rem;
    font-weight: 600;
    background: #e2e8f0;
    color: #334155;
    text-transform: capitalize;
  }

  /* Highlight Card (Onboard College) */
  .sa-card-highlight {
    border-left: 4px solid var(--sa-teal-accent);
    background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 40%);
  }

  .sa-card-converted {
    border-left: 4px solid #10b981;
    background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 40%);
  }

  .sa-icon-converted {
    background: #ecfdf5;
    color: #10b981;
  }

  .sa-converted-tag {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(16, 185, 129, 0.15);
    color: #047857;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .sa-priority-tag {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(61, 181, 230, 0.15);
    color: #0369a1;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .sa-highlight-copy {
    font-size: 0.875rem;
    color: #334155;
    line-height: 1.55;
    margin-bottom: 1.15rem;
  }

  .sa-btn-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--sa-teal-base) 0%, var(--sa-teal-dark) 100%);
    color: #ffffff;
    border: none;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(15, 58, 74, 0.25);
    transition: all 0.2s ease;
  }

  .sa-btn-cta:hover {
    background: linear-gradient(135deg, #134d63 0%, #082029 100%);
    box-shadow: 0 4px 12px rgba(15, 58, 74, 0.35);
    transform: translateY(-1px);
  }

  .sa-btn-cta:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 2px;
  }

  /* Lead Status Card Controls */
  .sa-label-muted {
    font-size: 0.825rem;
    color: #64748b;
    font-weight: 500;
  }

  .sa-quiet-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #64748b;
  }

  .sa-step-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .sa-step-action-btn:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 2px;
  }

  .sa-btn-contacted {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }
  .sa-btn-contacted:hover:not(:disabled) {
    background: #bae6fd;
    color: #0284c7;
  }

  .sa-btn-closed {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }
  .sa-btn-closed:hover:not(:disabled) {
    background: #d1fae5;
    color: #047857;
  }

  .sa-btn-reopen {
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
  }
  .sa-btn-reopen:hover:not(:disabled) {
    background: #fef3c7;
    color: #92400e;
  }

  .sa-status-select {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.825rem;
    background-color: #f8fafc;
  }

  .sa-status-select:focus {
    border-color: var(--sa-teal-accent);
    box-shadow: 0 0 0 2px rgba(61, 181, 230, 0.2);
  }

  /* Communication Items */
  .sa-comm-item {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.75rem 0.9rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    text-decoration: none;
    color: #1e293b;
    transition: all 0.15s ease;
  }

  .sa-comm-item:hover:not(.sa-comm-disabled) {
    background: #ffffff;
    border-color: var(--sa-teal-accent);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    transform: translateX(2px);
  }

  .sa-comm-item:focus-visible {
    outline: 2px solid var(--sa-teal-accent);
    outline-offset: 1px;
  }

  .sa-comm-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .sa-comm-email-wrap {
    background: rgba(15, 58, 74, 0.1);
    color: var(--sa-teal-base);
  }

  .sa-comm-call-wrap {
    background: #ecfdf5;
    color: #059669;
  }

  .sa-comm-disabled-wrap {
    background: #f1f5f9;
    color: #94a3b8;
  }

  .sa-comm-disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .sa-comm-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .sa-comm-heading {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e293b;
  }

  .sa-comm-sub {
    font-size: 0.725rem;
    color: #64748b;
    word-break: break-all;
  }

  /* Status Badges */
  .sa-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .sa-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .sa-badge-new {
    background: #fef3c7;
    color: #92400e;
  }
  .sa-badge-dot-new { background: #f59e0b; }

  .sa-badge-contacted {
    background: #e0f2fe;
    color: #0369a1;
  }
  .sa-badge-dot-contacted { background: #0284c7; }

  .sa-badge-closed {
    background: #ecfdf5;
    color: #065f46;
  }
  .sa-badge-dot-closed { background: #10b981; }

  .sa-badge-converted {
    background: #ecfdf5;
    color: #047857;
  }
  .sa-badge-dot-converted { background: #10b981; }

  .sa-badge-default {
    background: #f1f5f9;
    color: #475569;
  }

  /* Skeleton shimmer */
  .sa-skeleton {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: sa-shimmer 1.5s infinite;
    border-radius: 4px;
    display: inline-block;
  }

  @keyframes sa-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .sa-spin {
    animation: sa-rotate 1s linear infinite;
  }

  @keyframes sa-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ================= STICKY MOBILE ACTION BAR ================= */
  .sa-mobile-sticky-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid var(--sa-card-border);
    padding: 0.65rem 1rem;
    box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
    z-index: 999;
  }

  .sa-mobile-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.55rem 0.75rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .sa-mobile-btn-primary {
    background: var(--sa-teal-accent);
    color: var(--sa-teal-dark);
  }

  .sa-mobile-btn-contacted {
    background: #e0f2fe;
    color: #0369a1;
  }

  .sa-mobile-btn-closed {
    background: #ecfdf5;
    color: #065f46;
  }

  .sa-mobile-btn-reopen {
    background: #fffbeb;
    color: #b45309;
  }

  /* Responsive Rules */
  @media (max-width: 768px) {
    .sa-header-band {
      padding: 1rem 1rem 1.25rem 1rem;
    }
    .sa-main-content {
      padding: 0 1rem;
    }
    .sa-institution-title {
      font-size: 1.25rem;
    }
    .sa-stepper-card {
      padding: 1rem;
    }
    .sa-step-desc {
      display: none;
    }
    .sa-step-date {
      display: none;
    }
  }

  @media (max-width: 520px) {
    .sa-stepper-track {
      gap: 0.5rem;
    }
    .sa-step-title {
      font-size: 0.75rem;
    }
    .sa-step-indicator {
      width: 28px;
      height: 28px;
      font-size: 0.75rem;
    }
    .sa-step-line {
      left: 28px;
    }
  }

  /* Prefers Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .sa-skeleton,
    .sa-spin,
    .sa-header-btn,
    .sa-step-indicator,
    .sa-btn-cta,
    .sa-comm-item {
      animation: none !important;
      transition: none !important;
    }
  }
`;
