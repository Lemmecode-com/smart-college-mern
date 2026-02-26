import { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaUserGraduate,
  FaCalendarAlt,
  FaReceipt,
  FaBell,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaDownload,
  FaPrint,
  FaExclamationTriangle,
  FaSpinner,
  FaClock,
  FaGraduationCap,
  FaLayerGroup,
  FaIdCard,
  FaEnvelope,
  FaPhoneAlt,
  FaCopy,
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const loadTimeoutRef = useRef(null);
  const [toastShown, setToastShown] = useState({ success: false, error: false });
  const [copiedId, setCopiedId] = useState(null);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= DATA VALIDATION HELPER ================= */
  const validateFeeDashboard = (data) => {
    const errors = [];
    
    if (!data) {
      errors.push("Dashboard data is missing");
    } else {
      if (typeof data.totalFee === 'undefined') errors.push("Total fee is missing");
      if (typeof data.totalPaid === 'undefined') errors.push("Total paid is missing");
      if (typeof data.totalDue === 'undefined') errors.push("Total due is missing");
      if (!Array.isArray(data.installments)) errors.push("Installments array is missing");
      if (!data.course) errors.push("Course information is missing");
    }
    
    return errors;
  };

  /* ================= FETCH STUDENT PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");
        if (res.data?.student) {
          setStudentProfile(res.data.student);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        // Continue without profile - use AuthContext data
      }
    };
    fetchProfile();
  }, []);

  /* ================= CLEANUP TIMEOUT ================= */
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  /* ================= FETCH FEE DASHBOARD ================= */
  const loadFees = async () => {
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set timeout for 30 seconds
    loadTimeoutRef.current = setTimeout(() => {
      setError("Request timed out. Please check your connection and try again.");
      setLoading(false);
      toast.error("Request timed out. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    }, 30000);

    try {
      setLoading(true);
      setError("");

      const res = await api.get("/student/payments/my-fee-dashboard");

      if (!res.data) {
        throw new Error("Invalid fee dashboard response");
      }

      // Validate dashboard data
      const validation = validateFeeDashboard(res.data);
      if (validation.length > 0) {
        throw new Error(`Invalid dashboard data: ${validation.join(', ')}`);
      }

      setDashboard(res.data);

      // Show success toast only once per session
      if (!toastShown.success) {
        toast.success("Fee dashboard loaded successfully!", {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />,
        });
        setToastShown({ ...toastShown, success: true });
      }

      // Clear timeout on success
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    } catch (err) {
      console.error("Fee dashboard error:", err);

      // Clear timeout on error
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      const errorMsg =
        err.response?.status === 401
          ? "Session expired. Please login again."
          : err.response?.status === 404
          ? "Fee structure not found for your course. Contact administration."
          : err.response?.data?.message ||
            "Unable to load fee dashboard. Please try again.";

      setError(errorMsg);

      // Show error toast only once per session
      if (!toastShown.error) {
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
        setToastShown({ ...toastShown, error: true });
      }

      if (err.response?.status === 401) {
        setTimeout(() => navigate("/login"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, [retryCount]);

  /* ================= CALCULATIONS ================= */
  const progress = dashboard?.totalFee > 0
    ? Math.min(100, Math.round((dashboard.totalPaid / dashboard.totalFee) * 100))
    : dashboard?.totalPaid === 0 ? 100 : 0;

  // Copy to clipboard handler
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Transaction ID copied!", {
        position: "top-right",
        autoClose: 2000,
        icon: <FaCheckCircle />
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Failed to copy Transaction ID", {
        position: "top-right",
        autoClose: 2000,
        icon: <FaTimesCircle />
      });
    }
  };

  const isNearDue = (date) => {
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  const getInstallmentStatusColor = (status, dueDate) => {
    if (status === "PAID") return "success";
    if (status === "PENDING") {
      if (new Date(dueDate) < new Date()) return "danger"; // Overdue
      if (isNearDue(dueDate)) return "warning"; // Due soon
      return "info";
    }
    return "secondary";
  };

  /* ================= PAYMENT HANDLER ================= */
  const handleRedirectPayment = (installment) => {
    if (!installment?._id || installment.status !== "PENDING") {
      toast.warning("Invalid payment request", {
        toastId: "payment-warning",
      });
      return;
    }

    navigate("/student/make-payment", {
      state: {
        installmentId: installment._id,
        installmentName: installment.name,
        amount: installment.amount,
        dueDate: installment.dueDate,
      },
    });
  };

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    // Reset toast flags for retry
    setToastShown({ success: false, error: false });
    setCopiedId(null);
    setRetryCount((prev) => prev + 1);
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="fees-container" role="main">
        <div className="loading-wrapper" role="status" aria-live="polite">
          <div className="loading-spinner">
            <FaSpinner className="spin-icon" aria-hidden="true" />
            <p>Loading Fee Dashboard...</p>
          </div>
          <div className="skeleton-cards" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
          <div className="skeleton-table" aria-hidden="true">
            <div className="skeleton-table-header" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-table-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="fees-container" role="main">
        <div className="error-wrapper fade-in" role="alert" aria-live="assertive">
          <div className="error-content">
            <FaExclamationTriangle className="error-icon" aria-hidden="true" />
            <h3>Fee Dashboard Error</h3>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button onClick={handleRetry} className="retry-btn" aria-label="Try loading fee dashboard again">
                <FaSync className="me-2" />
                Try Again
              </button>
              <button
                onClick={() => navigate("/student/dashboard")}
                className="back-btn"
                aria-label="Go back to student dashboard"
              >
                <FaArrowLeft className="me-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="fees-container">
        <div className="empty-wrapper fade-in">
          <div className="empty-content">
            <FaMoneyCheckAlt className="empty-icon" />
            <h3>No Fee Data Available</h3>
            <p className="empty-message">
              Your fee structure has not been configured yet. Please contact
              your college administration.
            </p>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="back-btn"
            >
              <FaArrowLeft className="me-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fees-container" role="main">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Skip Link for Screen Readers */}
      <a href="#fee-content" className="sr-only sr-only-focusable">
        Skip to fee content
      </a>

      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="fees-header fade-in" role="banner">
        <div className="header-left">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="btn-back"
            aria-label="Back to Dashboard"
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
          <div className="header-info">
            <div className="header-icon-wrapper">
              <FaMoneyCheckAlt aria-hidden="true" />
            </div>
            <div>
              <h1 className="header-title">Fee Management</h1>
              <p className="header-subtitle">
                <FaGraduationCap className="me-1" aria-hidden="true" />
                {studentProfile?.fullName || user.name || "Student"} |{" "}
                {dashboard.course?.name || "Course"}
              </p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn-action"
            aria-label={showHelp ? "Close fee dashboard help" : "Show fee dashboard help"}
            aria-expanded={showHelp}
          >
            <FaInfoCircle aria-hidden="true" />
            <span className="btn-text">Help</span>
          </button>
        </div>
      </header>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="help-section fade-in-up">
          <div className="help-content">
            <div className="help-header">
              <FaInfoCircle className="help-icon" />
              <h4>Fee Dashboard Guide</h4>
              <button className="help-close" onClick={() => setShowHelp(false)}>
                <FaTimesCircle />
              </button>
            </div>
            <div className="help-body">
              <ul>
                <li>
                  <strong>Fee Summary</strong>: Overview of total fees, amount
                  paid, and pending dues
                </li>
                <li>
                  <strong>Progress Bar</strong>: Visual representation of
                  payment completion
                </li>
                <li>
                  <strong>Installments</strong>: Detailed breakdown of payment
                  schedule
                </li>
                <li>
                  <strong>Status Indicators</strong>:
                  <ul className="help-sublist">
                    <li>
                      <span className="badge bg-success">PAID</span> - Payment
                      completed
                    </li>
                    <li>
                      <span className="badge bg-warning">PENDING</span> - Due
                      soon (yellow)
                    </li>
                    <li>
                      <span className="badge bg-danger">PENDING</span> -
                      Overdue (red)
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Actions</strong>: Pay pending installments or download
                  receipts for paid ones
                </li>
                <li>
                  <FaBell className="text-warning me-1" /> Bell icon indicates
                  payment due within 7 days
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================= FEE SUMMARY CARDS ================= */}
      <section className="summary-section" aria-label="Fee summary">
        <div className="summary-grid">
          <FeeSummaryCard
            title="Total Fee"
            amount={dashboard.totalFee}
            icon={<FaUniversity className="blink-fast" aria-hidden="true" />}
            color="primary"
            subtitle="Complete academic year fee"
            delay="0.1s"
          />
          <FeeSummaryCard
            title="Amount Paid"
            amount={dashboard.totalPaid}
            icon={<FaCheckCircle aria-hidden="true" />}
            color="success"
            subtitle="Successfully paid installments"
            delay="0.2s"
          />
          <FeeSummaryCard
            title="Pending Due"
            amount={dashboard.totalDue}
            icon={<FaTimesCircle aria-hidden="true" />}
            color="danger"
            subtitle="Remaining payment amount"
            delay="0.3s"
          />
          <FeeSummaryCard
            title="Payment Progress"
            amount={`${progress}%`}
            icon={<FaCreditCard aria-hidden="true" />}
            color={
              progress === 100
                ? "success"
                : progress > 50
                ? "warning"
                : "info"
            }
            subtitle={`${dashboard.totalPaid.toLocaleString()}/${dashboard.totalFee.toLocaleString()} paid`}
            delay="0.4s"
          />
        </div>
      </section>

      {/* ================= PROGRESS BAR SECTION ================= */}
      <section className="progress-section fade-in-up" aria-label="Payment progress">
        <div className="progress-card">
          <div className="progress-header">
            <h3>
              <FaCreditCard className="me-2" aria-hidden="true" />
              Payment Progress
            </h3>
          </div>
          <div className="progress-body">
            <div className="progress-info">
              <span className="progress-label">Fee Payment Status</span>
              <span
                className={`progress-value ${
                  progress === 100 ? "text-success" : "text-primary"
                }`}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
              >
                {progress}% Complete
              </span>
            </div>
            <div className="progress-bar-wrapper">
              <div
                className={`progress-bar ${
                  progress === 100
                    ? "bg-success"
                    : progress > 75
                    ? "bg-primary"
                    : progress > 50
                    ? "bg-warning"
                    : "bg-info"
                }`}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ width: `${progress}%` }}
              >
                <span className="progress-text">{progress}%</span>
              </div>
            </div>
            <div className="progress-stats">
              <div className="stat-item">
                <FaCheckCircle className="text-success me-1" aria-hidden="true" />
                <span>
                  {
                    dashboard.installments?.filter(
                      (i) => i.status === "PAID"
                    ).length || 0
                  }{" "}
                  Paid
                </span>
              </div>
              <div className="stat-item">
                <FaClock className="text-warning me-1" aria-hidden="true" />
                <span>
                  {
                    dashboard.installments?.filter(
                      (i) => i.status === "PENDING"
                    ).length || 0
                  }{" "}
                  Pending
                </span>
              </div>
              <div className="stat-item">
                <FaMoneyCheckAlt className="text-primary me-1" aria-hidden="true" />
                <span>
                  {dashboard.installments?.length || 0} Total Installments
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INSTALLMENTS TABLE ================= */}
      <section className="installments-section fade-in-up" aria-label="Fee installments">
        <div className="installments-card">
          <div className="installments-header">
            <h3 id="installments-heading">
              <FaCalendarAlt className="me-2" aria-hidden="true" />
              Fee Installments
            </h3>
          </div>
          <div 
            className="installments-body" 
            role="region" 
            aria-labelledby="installments-heading"
          >
            {dashboard.installments?.length === 0 ? (
              <div className="empty-installments">
                <FaMoneyCheckAlt className="empty-icon" aria-hidden="true" />
                <h4>No Installments Found</h4>
                <p>
                  Your fee structure has not been configured with installments.
                  Please contact administration.
                </p>
                <button
                  onClick={() => navigate("/student/dashboard")}
                  className="back-btn"
                  aria-label="Go back to dashboard"
                >
                  <FaArrowLeft className="me-2" aria-hidden="true" />
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="fees-table" role="table" aria-label="Fee installments table">
                  <thead>
                    <tr>
                      <th className="col-installment" scope="col">Installment</th>
                      <th className="col-amount" scope="col">Amount</th>
                      <th className="col-due" scope="col">Due Date</th>
                      <th className="col-status" scope="col">Status</th>
                      <th className="col-payment" scope="col">Payment Date</th>
                      <th className="col-action" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.installments.map((installment, idx) => (
                      <tr
                        key={installment._id}
                        className={`installment-row ${
                          installment.status === "PAID" ? "paid-row" : ""
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <td className="cell-installment">
                          {installment.name}
                        </td>
                        <td className="cell-amount">
                          ₹{installment.amount.toLocaleString()}
                        </td>
                        <td className="cell-due">
                          <div className="due-date">
                            {new Date(
                              installment.dueDate
                            ).toLocaleDateString()}
                          </div>
                          {isNearDue(installment.dueDate) &&
                            installment.status !== "PAID" && (
                              <small className="due-warning">
                                <FaClock className="me-1" aria-hidden="true" />
                                Due in{" "}
                                {Math.ceil(
                                  (new Date(installment.dueDate) -
                                    new Date()) /
                                    (1000 * 60 * 60 * 24)
                                )}{" "}
                                days
                              </small>
                            )}
                          {new Date(installment.dueDate) < new Date() &&
                            installment.status !== "PAID" && (
                              <small className="due-overdue">
                                <FaExclamationTriangle className="me-1" aria-hidden="true" />
                                Overdue by{" "}
                                {Math.ceil(
                                  (new Date() -
                                    new Date(installment.dueDate)) /
                                    (1000 * 60 * 60 * 24)
                                )}{" "}
                                days
                              </small>
                            )}
                        </td>
                        <td className="cell-status">
                          <span
                            className={`status-badge bg-${getInstallmentStatusColor(
                              installment.status,
                              installment.dueDate
                            )}`}
                            aria-label={`Status: ${installment.status}`}
                          >
                            {installment.status === "PAID" && (
                              <FaCheckCircle className="me-1" aria-hidden="true" />
                            )}
                            {installment.status}
                          </span>
                        </td>
                        <td className="cell-payment">
                          {installment.status === "PAID" ? (
                            <div className="payment-info">
                              <div className="payment-date">
                                {installment.paidAt
                                  ? new Date(
                                      installment.paidAt
                                    ).toLocaleString("en-IN")
                                  : "N/A"}
                              </div>
                              <small className="payment-ref">
                                Ref:{" "}
                                <span
                                  className={`ref-id ${copiedId === installment._id ? 'copied' : ''}`}
                                  onClick={() => copyToClipboard(installment.transactionId, installment._id)}
                                  title="Click to copy Transaction ID"
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Copy transaction ID: ${installment.transactionId}`}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      copyToClipboard(installment.transactionId, installment._id);
                                    }
                                  }}
                                >
                                  {copiedId === installment._id ? (
                                    <><FaCheckCircle className="me-1" /> Copied!</>
                                  ) : (
                                    installment.transactionId || "N/A"
                                  )}
                                </span>
                              </small>
                              <span className="payment-method">
                                {installment.paymentMethod || 'Card'}
                              </span>
                            </div>
                          ) : (
                            <span className="not-paid">Not paid yet</span>
                          )}
                        </td>
                        <td className="cell-action">
                          {installment.status === "PAID" ? (
                            <button
                              className="btn-receipt"
                              onClick={() =>
                                navigate(
                                  `/student/fee-receipt/${installment._id}`
                                )
                              }
                              aria-label={`View receipt for ${installment.name}`}
                              title="View Receipt"
                            >
                              <FaReceipt aria-hidden="true" /> Receipt
                            </button>
                          ) : (
                            <button
                              className="btn-pay"
                              onClick={() =>
                                handleRedirectPayment(installment)
                              }
                              aria-label={`Pay ${installment.name} - ₹${installment.amount}`}
                              title="Pay Now"
                            >
                              <FaCreditCard aria-hidden="true" /> Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="fees-footer fade-in-up">
        <div className="footer-content">
          <div className="footer-info">
            <p>
              <small>
                <FaMoneyCheckAlt className="me-1" />
                Student Fee Dashboard | Smart College ERP System
              </small>
            </p>
            <p>
              <small>
                <FaSync className="spin-icon me-1" />
                Fee data last updated:{" "}
                <strong>{new Date().toLocaleString()}</strong>
              </small>
            </p>
          </div>
          <div className="footer-actions">
            <button
              className="btn-footer"
              onClick={handleRetry}
              disabled={loading}
            >
              <FaSync size={12} className={loading ? "spin" : ""} />{" "}
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
            <button
              className="btn-footer"
              onClick={() => navigate("/student/dashboard")}
            >
              <FaArrowLeft size={12} /> Back to Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* ================= CSS ================= */}
      <style>{`
        /* ================= CONTAINER ================= */
        .fees-container {
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
        }

        /* ================= LOADING ================= */
        .loading-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          gap: 2rem;
        }

        .loading-spinner {
          text-align: center;
        }

        .spin-icon {
          font-size: 1rem;
          color: #1a4b6d;
          animation: spin 1s linear infinite;
        }

        .loading-spinner p {
          margin-top: 1rem;
          color: #6c757d;
          font-weight: 500;
          font-size: 1.1rem;
        }

        .skeleton-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          width: 100%;
          max-width: 1200px;
        }

        .skeleton-card {
          height: 150px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 16px;
        }

        .skeleton-table {
          width: 100%;
          max-width: 1200px;
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .skeleton-table-header {
          height: 50px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .skeleton-table-row {
          height: 60px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* ================= ERROR ================= */
        .error-wrapper,
        .empty-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .error-content,
        .empty-content {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          max-width: 500px;
        }

        .error-icon,
        .empty-icon {
          font-size: 5rem;
          color: #dc3545;
          margin-bottom: 1.5rem;
        }

        .empty-icon {
          color: #6c757d;
        }

        .error-content h3,
        .empty-content h3 {
          margin: 0 0 1rem;
          color: #1a4b6d;
          font-size: 1.75rem;
        }

        .error-message,
        .empty-message {
          color: #6c757d;
          margin-bottom: 2rem;
          font-size: 1rem;
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .retry-btn,
        .back-btn {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .retry-btn:hover,
        .back-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        .back-btn {
          background: white;
          border: 2px solid #6c757d;
          color: #6c757d;
        }

        .back-btn:hover {
          background: #6c757d;
          color: white;
        }

        /* ================= HEADER ================= */
        .fees-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem 2rem;
          background: linear-gradient(180deg, #0f3a4a, #134952);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 58, 74, 0.3);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .btn-back {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-back:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-3px);
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon-wrapper {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4fc3f7;
          font-size: 1.5rem;
        }

        .header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .header-subtitle {
          margin: 0.25rem 0 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-action {
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .btn-action:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .btn-primary-action {
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          border: none;
        }

        .btn-primary-action:hover {
          background: linear-gradient(135deg, #29b6f6, #0288d1);
          box-shadow: 0 6px 20px rgba(79, 195, 247, 0.4);
        }

        .btn-text {
          display: none;
        }

        @media (min-width: 768px) {
          .btn-text {
            display: inline;
          }
        }

        /* ================= HELP SECTION ================= */
        .help-section {
          margin-bottom: 2rem;
        }

        .help-content {
          background: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .help-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .help-icon {
          font-size: 1.5rem;
          color: #17a2b8;
        }

        .help-header h4 {
          margin: 0;
          color: #1a4b6d;
          font-size: 1.1rem;
        }

        .help-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          font-size: 1.25rem;
          transition: color 0.3s ease;
        }

        .help-close:hover {
          color: #dc3545;
        }

        .help-body ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #495057;
          line-height: 1.6;
        }

        .help-body .help-sublist {
          margin-top: 0.5rem;
          padding-left: 1.5rem;
        }

        /* ================= PROFILE SECTION ================= */
        .profile-section {
          margin-bottom: 2rem;
        }

        .profile-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .profile-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
          padding: 2rem;
          color: white;
        }

        .profile-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .profile-details {
          flex: 1;
        }

        .profile-name {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .profile-meta {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .profile-contact {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .profile-footer {
          padding: 1rem 2rem;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-info {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #495057;
        }

        .last-updated {
          color: #6c757d;
          font-size: 0.85rem;
        }

        /* ================= SUMMARY SECTION ================= */
        .summary-section {
          margin-bottom: 2rem;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .fee-summary-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: none;
        }

        .fee-summary-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .fee-summary-card .fs-2 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .fee-summary-card h6 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #6c757d;
          margin-bottom: 0.25rem;
        }

        .fee-summary-card .amount {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }

        .fee-summary-card .subtitle {
          font-size: 0.8rem;
          color: #6c757d;
        }

        /* ================= PROGRESS SECTION ================= */
        .progress-section {
          margin-bottom: 2rem;
        }

        .progress-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .progress-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-bottom: 1px solid #e9ecef;
        }

        .progress-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
        }

        .progress-body {
          padding: 1.5rem;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .progress-label {
          font-weight: 600;
          color: #495057;
        }

        .progress-value {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .progress-bar-wrapper {
          width: 100%;
          height: 24px;
          background: #e9ecef;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 1rem;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          border-radius: 12px;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-text {
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #6c757d;
        }

        /* ================= INSTALLMENTS SECTION ================= */
        .installments-section {
          margin-bottom: 2rem;
        }

        .installments-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .installments-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(180deg, #0f3a4a, #134952);
          color: white;
        }

        .installments-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .installments-body {
          padding: 0;
        }

        .empty-installments {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .empty-installments .empty-icon {
          font-size: 4rem;
          color: #6c757d;
          margin-bottom: 1rem;
        }

        .empty-installments h4 {
          margin: 0 0 0.5rem;
          color: #1a4b6d;
          font-size: 1.25rem;
        }

        .empty-installments p {
          color: #6c757d;
          margin-bottom: 1.5rem;
        }

        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .fees-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .fees-table th {
          padding: 1rem 1.25rem;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #495057;
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
          text-align: left;
        }

        .fees-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .fees-table tbody tr {
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .fees-table tbody tr:hover {
          background: rgba(26, 75, 109, 0.03);
        }

        .installment-row.paid-row {
          background: rgba(40, 167, 69, 0.05);
        }

        .cell-installment {
          font-weight: 600;
          color: #1a4b6d;
        }

        .cell-amount {
          font-weight: 700;
          color: #1a4b6d;
        }

        .cell-due {
          font-size: 0.9rem;
        }

        .due-date {
          font-weight: 500;
        }

        .due-warning,
        .due-overdue {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.8rem;
        }

        .due-warning {
          color: #856404;
        }

        .due-overdue {
          color: #721c24;
        }

        .cell-status {
          text-align: center;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .cell-payment {
          font-size: 0.9rem;
        }

        .payment-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .payment-date {
          font-weight: 600;
          color: #1a4b6d;
        }

        .payment-ref {
          color: #6c757d;
        }

        .ref-id {
          color: #1a4b6d;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .ref-id:hover {
          color: #0f3a4a;
          text-decoration: underline;
        }

        .payment-method {
          display: inline-block;
          background: #e9ecef;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          color: #495057;
          margin-top: 0.25rem;
        }

        .not-paid {
          color: #6c757d;
          font-style: italic;
        }

        .cell-action {
          text-align: center;
        }

        .btn-receipt,
        .btn-pay {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          border: none;
        }

        .btn-receipt {
          background: white;
          color: #28a745;
          border: 2px solid #28a745;
        }

        .btn-receipt:hover {
          background: #28a745;
          color: white;
        }

        .btn-pay {
          background: linear-gradient(135deg, #28a745, #1e7e34);
          color: white;
        }

        .btn-pay:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }

        /* ================= FOOTER ================= */
        .fees-footer {
          background: white;
          border-radius: 16px;
          padding: 1.5rem 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-info p {
          margin: 0;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .footer-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-footer {
          padding: 0.5rem 1rem;
          background: white;
          border: 2px solid #6c757d;
          color: #6c757d;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .btn-footer:hover {
          background: #6c757d;
          color: white;
        }

        /* ================= ANIMATIONS ================= */
        .fade-in {
          animation: fadeIn 0.6s ease forwards;
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .fade-in-up:nth-child(1) {
          animation-delay: 0.1s;
        }
        .fade-in-up:nth-child(2) {
          animation-delay: 0.2s;
        }
        .fade-in-up:nth-child(3) {
          animation-delay: 0.3s;
        }
        .fade-in-up:nth-child(4) {
          animation-delay: 0.4s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .blink {
          animation: blink 2s infinite;
        }

        .blink-fast {
          animation: blink 0.9s infinite;
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* ================= SCREEN READER ONLY ================= */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-only-focusable:focus {
          position: static;
          width: auto;
          height: auto;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }

        /* ================= COPIED STATE ================= */
        .ref-id.copied {
          color: #28a745;
          font-weight: 600;
        }

        .ref-id.copied:hover {
          color: #1e7e34;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .fees-container {
            padding: 1rem;
          }

          .fees-header {
            padding: 1.25rem;
            flex-direction: column;
            text-align: center;
          }

          .header-left {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: center;
          }

          .profile-info {
            flex-direction: column;
            text-align: center;
          }

          .profile-meta,
          .profile-contact {
            justify-content: center;
          }

          .profile-footer {
            flex-direction: column;
            text-align: center;
          }

          .footer-info {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .fees-table th,
          .fees-table td {
            padding: 0.75rem 0.5rem;
            font-size: 0.85rem;
          }

          .col-installment,
          .col-amount,
          .col-due,
          .col-status {
            display: table-cell;
          }

          .col-payment,
          .col-action {
            display: none;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .fee-summary-card .amount {
            font-size: 1.5rem;
          }

          .progress-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 1.25rem;
          }

          .header-subtitle {
            font-size: 0.85rem;
          }

          .header-icon-wrapper {
            width: 40px;
            height: 40px;
            font-size: 1.25rem;
          }

          .profile-avatar {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }

          .profile-name {
            font-size: 1.25rem;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .fees-table {
            min-width: 600px;
          }

          .col-installment,
          .col-amount,
          .col-due,
          .col-status {
            display: table-cell;
          }

          .col-payment,
          .col-action {
            display: none;
          }
        }

        /* ================= PRINT STYLES ================= */
        @media print {
          .fees-container {
            background: white;
            padding: 0;
          }

          .fees-header {
            background: #1a4b6d !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .header-actions,
          .help-section,
          .btn-back {
            display: none !important;
          }

          .profile-card,
          .progress-card,
          .installments-card,
          .fees-footer {
            box-shadow: none;
            border: 1px solid #ddd;
            page-break-inside: avoid;
          }

          .fees-table {
            page-break-inside: avoid;
          }

          .installment-row {
            break-inside: avoid;
          }
        }

        /* ================= TOASTIFY OVERRIDES ================= */
        .Toastify__toast {
          border-radius: 10px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .Toastify__toast--success {
          background: linear-gradient(135deg, #28a745, #1e7e34);
        }

        .Toastify__toast--error {
          background: linear-gradient(135deg, #dc3545, #c82333);
        }

        .Toastify__toast--warning {
          background: linear-gradient(135deg, #ffc107, #e0a800);
        }

        .Toastify__toast--info {
          background: linear-gradient(135deg, #17a2b8, #117a8b);
        }

        /* ================= ACCESSIBILITY ================= */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .btn-back:focus-visible,
        .btn-action:focus-visible,
        .btn-receipt:focus-visible,
        .btn-pay:focus-visible {
          outline: 2px solid #1a4b6d;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

/* ================= FEE SUMMARY CARD COMPONENT ================= */
function FeeSummaryCard({ title, amount, icon, color, subtitle, delay }) {
  return (
    <div
      className="fee-summary-card scale-on-hover"
      style={{ animationDelay: delay }}
    >
      <div className={`fs-2 text-${color}`}>{icon}</div>
      <h6 className="text-muted mb-1">{title}</h6>
      <div className={`amount text-${color}`}>
        ₹{typeof amount === "number" ? amount.toLocaleString() : amount}
      </div>
      {subtitle && <div className="subtitle text-muted mt-1">{subtitle}</div>}
    </div>
  );
}