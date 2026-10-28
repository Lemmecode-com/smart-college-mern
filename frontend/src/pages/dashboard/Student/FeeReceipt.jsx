import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import "react-toastify/dist/ReactToastify.css";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

import {
  FaReceipt,
  FaCheckCircle,
  FaDownload,
  FaPrint,
  FaUniversity,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import { formatDateTime } from "../../../utils/format";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ================= CURRENCY FORMATTER ================= */
// Local Indian currency formatter with grouping and two decimals (e.g. ₹30,000.00)
function formatCurrencyINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "₹ --";
  const num = Number(amount);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const lastThree = intPart.slice(-3);
  const remaining = intPart.slice(0, -3);
  let grouped = lastThree;
  if (remaining) {
    const parts = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${parts},${grouped}`;
  }
  return `${isNegative ? "-" : ""}₹${grouped}.${decPart}`;
}

/* ================= VALIDATION HELPER ================= */
const validateReceiptData = (data) => {
  const errors = [];

  if (!data) {
    errors.push("Receipt data is missing");
  } else {
    if (!data.college?.name) errors.push("College name is missing");
    if (!data.student?.name) errors.push("Student name is missing");
    if (!data.installmentName) errors.push("Installment name is missing");
    if (data.amount === undefined || data.amount === null) errors.push("Payment amount is missing");
    if (!data.transactionId && !data.receiptNumber) errors.push("Transaction / Receipt ID is missing");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default function FeeReceipt() {
  /* ================= ALL HOOKS FIRST (REACT RULES OF HOOKS) ================= */
  const { user, loading: authLoading } = useContext(AuthContext);
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const receiptRef = useRef();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const fetchIdRef = useRef(0);

  // Navigate back action
  const handleGoBack = useCallback(() => {
    if (user?.role === "COLLEGE_ADMIN" || user?.role === "ACCOUNTANT" || user?.role === "PRINCIPAL") {
      navigate("/college-admin/payment-history");
    } else {
      navigate("/student/fees");
    }
  }, [user?.role, navigate]);

  // Fetch receipt callback in component scope
  const fetchReceipt = useCallback(async () => {
    if (!paymentId || !user) return;

    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    const toastId = `fee-receipt-loading-${paymentId}`;
    toast.loading("Loading receipt...", { toastId });
    let errorToastShown = false;

    try {
      const endpoint =
        user.role === "COLLEGE_ADMIN" ||
        user.role === "ACCOUNTANT" ||
        user.role === "PRINCIPAL"
          ? `/admin/payments/receipt/${paymentId}`
          : `/student/payments/receipt/${paymentId}`;

      const res = await api.get(endpoint);

      if (currentFetchId !== fetchIdRef.current) {
        return;
      }

      if (!res.data) {
        throw new Error("Invalid response from server");
      }

      const validation = validateReceiptData(res.data);
      if (!validation.isValid) {
        throw new Error(
          `Invalid receipt data: ${validation.errors.join(", ")}`,
        );
      }

      setReceipt(res.data);
      setError(null);
      toast.dismiss(toastId);
    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) {
        return;
      }

      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Fee receipt load error:", {
        statusCode,
        errorCode,
        backendMessage,
        page: "FeeReceipt",
        role: user?.role,
      });

      let errorMessage = "Unable to fetch receipt. ";

      if (statusCode === 404) {
        errorMessage = "Receipt not available for this payment.";
      } else if (statusCode === 403) {
        errorMessage = "You don't have permission to view this receipt.";
      } else if (statusCode === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (statusCode === 401) {
        errorMessage = "Your session has expired. Please sign in again.";
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message?.includes("Network Error")
      ) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (
        err.name === "AbortError" ||
        err.message?.includes("timeout")
      ) {
        errorMessage =
          "Request timeout. The server took too long to respond. Please try again.";
      } else {
        errorMessage += "Please check your connection and try again.";
      }

      setError({ message: errorMessage, statusCode, errorCode });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.update(toastId, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        errorToastShown = true;
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
        if (!errorToastShown) toast.dismiss(toastId);
      }
    }
  }, [paymentId, user]);

  // Retry action
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
    await fetchReceipt();
    setIsRetrying(false);
  }, [retryCount, fetchReceipt]);

  // Initial fetch effect
  useEffect(() => {
    if (!authLoading && user && paymentId) {
      fetchReceipt();
    }
  }, [authLoading, user, paymentId, fetchReceipt]);

  // Helper function for error logging
  const logErrorToMonitoring = useCallback((err, context) => {
    logger.error("[FeeReceipt] Error:", {
      error: err.message,
      context,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // PDF Download
  const downloadPDF = useCallback(async () => {
    const toastId = toast.loading("Generating PDF...");

    try {
      if (!receiptRef.current) {
        throw new Error("Receipt element not found");
      }

      const canvas = await Promise.race([
        html2canvas(receiptRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            const images = clonedDoc.getElementsByTagName("img");
            return Promise.all(
              Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = () => {
                    resolve();
                  };
                });
              }),
            );
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Canvas generation timeout")),
            30000,
          ),
        ),
      ]);

      if (!canvas || !canvas.toDataURL) {
        throw new Error("Canvas generation failed");
      }

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      try {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } catch {
        throw new Error("Failed to add receipt to PDF");
      }

      const receiptIdForName = receipt?.receiptNumber || receipt?.transactionId || "receipt";
      const cleanReceiptId = String(receiptIdForName).replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Fee_Receipt_${cleanReceiptId}.pdf`;
      pdf.save(fileName);

      toast.update(toastId, {
        render: "PDF downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      let errorMessage = "Failed to generate PDF. ";

      if (err.message.includes("timeout")) {
        errorMessage += "Operation timed out. Please try again.";
      } else if (
        err.message.includes("CORS") ||
        err.message.includes("taint")
      ) {
        errorMessage +=
          "Image loading failed. Please ensure all images are accessible.";
      } else if (err.message.includes("Canvas")) {
        errorMessage +=
          "Browser compatibility issue. Please try Chrome or Firefox.";
      } else if (err.message.includes("element")) {
        errorMessage +=
          "Receipt not ready. Please wait a moment and try again.";
      } else {
        errorMessage += "Please check your connection and try again.";
      }

      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });

      logErrorToMonitoring(err, {
        component: "FeeReceipt",
        action: "downloadPDF",
        receiptId: receipt?._id,
      });
    }
  }, [receipt, logErrorToMonitoring]);

  /* ================= CONDITIONAL EARLY RETURNS AFTER ALL HOOKS ================= */
  if (authLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Verifying your session..."
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (
    user.role !== "STUDENT" &&
    user.role !== "COLLEGE_ADMIN" &&
    user.role !== "ACCOUNTANT" &&
    user.role !== "PRINCIPAL"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!paymentId) {
    return (
      <div className="receipt-empty-wrapper">
        <div className="empty-card">
          <FaExclamationTriangle className="empty-icon" />
          <h3>Invalid Receipt URL</h3>
          <p>Payment ID is missing from the URL</p>
          <button className="btn-back" onClick={handleGoBack}>
            <FaArrowLeft />{" "}
            {user.role === "COLLEGE_ADMIN" || user.role === "PRINCIPAL" || user.role === "ACCOUNTANT"
              ? "Back to Payment History"
              : "Back to Fees"}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ApiError
        title="Unable to Load Receipt"
        message={error.message || "Unable to fetch receipt. Please try again."}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading Receipt..."
        />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="receipt-empty-wrapper">
        <div className="empty-card">
          <FaReceipt className="empty-icon" />
          <h3>Receipt Not Found</h3>
          <p>Receipt not available for this payment.</p>
          <button className="btn-back" onClick={handleGoBack}>
            <FaArrowLeft />{" "}
            {user.role === "COLLEGE_ADMIN" || user.role === "PRINCIPAL" || user.role === "ACCOUNTANT"
              ? "Back to Payment History"
              : "Back to Fees"}
          </button>
        </div>
      </div>
    );
  }

  /* ================= MAIN RECEIPT VIEW ================= */
  return (
    <div className="container py-4" role="main">
      {/* BACK BUTTON (HIDDEN DURING PRINT) */}
      <div className="mb-3 no-print">
        <button
          className="btn-back-to-fees"
          onClick={handleGoBack}
          aria-label="Go back to fees page"
        >
          <FaArrowLeft />{" "}
          {user.role === "COLLEGE_ADMIN" || user.role === "ACCOUNTANT" || user.role === "PRINCIPAL"
            ? "Back to Payment History"
            : "Back to Fees"}
        </button>
      </div>

      {/* Skip Link for Screen Readers */}
      <a href="#receipt-content" className="sr-only sr-only-focusable">
        Skip to receipt content
      </a>

      <div className="text-center mb-4" role="banner">
        <h1 className="h3 fw-bold">
          <FaReceipt className="me-2 text-primary" aria-hidden="true" />
          {receipt?.taxDetails?.isTaxApplicable &&
          receipt?.college?.gstin &&
          typeof receipt.college.gstin === "string" &&
          receipt.college.gstin.trim().length === 15
            ? "Fee Payment Receipt / Tax Invoice"
            : "Fee Payment Receipt"}
        </h1>
      </div>

      {/* RECEIPT CARD */}
      <div
        ref={receiptRef}
        className="receipt-card position-relative"
        id="receipt-content"
        role="article"
        aria-label="Payment receipt details"
      >
        {/* WATERMARK */}
        <div className="watermark" aria-hidden="true" role="presentation">
          PAID
        </div>

        {/* HEADER */}
        <header className="text-center mb-4">
          <h4 className="fw-bold">
            <FaUniversity className="me-2" aria-hidden="true" />
            {receipt.college?.name || "College Name Not Available"}
          </h4>
          <address className="small text-muted mb-1">
            {receipt.college?.address || "Address Not Available"}
          </address>
          {receipt.college?.gstin && (
            <div className="small fw-bold text-secondary mb-1">
              GSTIN: {receipt.college.gstin}
            </div>
          )}
          <div className="small">
            {receipt.college?.email && (
              <a
                href={`mailto:${receipt.college.email}`}
                aria-label={`Email: ${receipt.college.email}`}
              >
                {receipt.college.email}
              </a>
            )}
            {receipt.college?.email && receipt.college?.contact && " | "}
            {receipt.college?.contact && (
              <a
                href={`tel:${receipt.college.contact}`}
                aria-label={`Phone: ${receipt.college.contact}`}
              >
                {receipt.college.contact}
              </a>
            )}
          </div>
        </header>

        <hr />

        {/* STATUS */}
        <section className="text-center mb-4" aria-label="Payment status">
          <FaCheckCircle
            className="text-success display-5 mb-2"
            aria-hidden="true"
            role="img"
          />
          <h5 className="text-success fw-bold">Payment Successful</h5>
          <div className="small text-muted">
            Receipt No: <strong>{receipt.receiptNumber || receipt.transactionId || "N/A"}</strong>
          </div>
        </section>

        {/* DETAILS GRID */}
        <div className="row g-4">
          {/* Student Details */}
          <section className="col-md-6" aria-label="Student details">
            <h6 className="section-title">Student Details</h6>
            <Info label="Name" value={receipt.student?.name} />
            {receipt.student?.enrollment && (
              <Info label="Enrollment No" value={receipt.student.enrollment} />
            )}
            <Info label="Course" value={receipt.student?.course} />
            <Info label="Department" value={receipt.student?.department} />
            <Info label="Academic Year" value={receipt.student?.academicYear} />
          </section>

          {/* Payment Details */}
          <section className="col-md-6" aria-label="Payment details">
            <h6 className="section-title">Payment Details</h6>
            <Info label="Installment" value={receipt.installmentName} />
            {receipt.transactionId && (
              <Info label="Transaction Ref" value={receipt.transactionId} />
            )}
            {receipt.taxDetails?.isTaxApplicable ? (
              <>
                {receipt.taxDetails.sacCode && (
                  <Info label="SAC Code" value={receipt.taxDetails.sacCode} />
                )}
                {receipt.taxDetails.placeOfSupply && (
                  <Info label="Place of Supply" value={receipt.taxDetails.placeOfSupply} />
                )}
                <Info label="Base Fee" value={formatCurrencyINR(receipt.taxDetails.baseAmount)} />
                {receipt.taxDetails.taxSplit?.type === "INTER_STATE" || receipt.taxDetails.taxSplit?.igstAmount > 0 ? (
                  <Info
                    label={receipt.taxDetails.taxSplit?.isUniformRate && receipt.taxDetails.taxSplit?.igstRate ? `IGST (${receipt.taxDetails.taxSplit.igstRate}%)` : "IGST"}
                    value={formatCurrencyINR(receipt.taxDetails.taxSplit?.igstAmount || receipt.taxDetails.totalTax)}
                  />
                ) : (
                  <>
                    <Info
                      label={receipt.taxDetails.taxSplit?.isUniformRate && receipt.taxDetails.taxSplit?.cgstRate ? `CGST (${receipt.taxDetails.taxSplit.cgstRate}%)` : "CGST"}
                      value={formatCurrencyINR(receipt.taxDetails.taxSplit?.cgstAmount || (receipt.taxDetails.totalTax / 2))}
                    />
                    <Info
                      label={receipt.taxDetails.taxSplit?.isUniformRate && receipt.taxDetails.taxSplit?.sgstRate ? `SGST (${receipt.taxDetails.taxSplit.sgstRate}%)` : "SGST"}
                      value={formatCurrencyINR(receipt.taxDetails.taxSplit?.sgstAmount || (receipt.taxDetails.totalTax / 2))}
                    />
                  </>
                )}
                <Info label="Total GST" value={formatCurrencyINR(receipt.taxDetails.totalTax)} />
                <Info label="Gross Paid Amount" value={formatCurrencyINR(receipt.amount)} />
              </>
            ) : (
              <Info
                label="Amount"
                value={formatCurrencyINR(receipt.amount)}
              />
            )}
            <Info
              label="Payment Method"
              value={(() => {
                const gateway = receipt.paymentGateway || "STRIPE";
                const mode = receipt.paymentMode || "ONLINE";

                if (gateway === "OFFLINE" || mode !== "ONLINE") {
                  const modeLabels = {
                    CASH: "💵 Cash",
                    CHEQUE: "📝 Cheque",
                    DD: "🏦 Demand Draft",
                  };
                  return modeLabels[mode] || `💵 Offline (${mode})`;
                } else {
                  const gatewayLabels = {
                    STRIPE: "💳 Card (Stripe)",
                    RAZORPAY: "📱 UPI/Card (Razorpay)",
                    MOCK: "🧪 Mock Payment",
                  };
                  return gatewayLabels[gateway] || "💳 Card";
                }
              })()}
            />
            {receipt.paymentMode && receipt.paymentMode !== "ONLINE" && receipt.referenceNumber && (
              <Info label="Reference / Cheque No" value={receipt.referenceNumber} />
            )}
            {receipt.paymentMode && receipt.paymentMode !== "ONLINE" && receipt.remarks && (
              <Info label="Remarks" value={receipt.remarks} />
            )}
            <Info
              label="Paid On"
              value={formatDateTime(receipt.paidAt)}
            />
            <Info label="Status" value={receipt.status} />
          </section>

          {/* GST LINE ITEMS BREAKDOWN */}
          {receipt.taxDetails?.isTaxApplicable &&
            Array.isArray(receipt.taxDetails.lineItems) &&
            receipt.taxDetails.lineItems.length > 0 && (
              <section className="col-12 mt-2" aria-label="Fee component breakdown">
                <h6 className="section-title">Fee Component & GST Breakdown</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fee Component</th>
                        <th className="text-end">Base Amount</th>
                        <th className="text-end">GST Rate</th>
                        {receipt.taxDetails.taxSplit?.type === "INTER_STATE" ? (
                          <th className="text-end">IGST</th>
                        ) : (
                          <>
                            <th className="text-end">CGST</th>
                            <th className="text-end">SGST</th>
                          </>
                        )}
                        <th className="text-end">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.taxDetails.lineItems.map((item, idx) => {
                        const isInterState = receipt.taxDetails.taxSplit?.type === "INTER_STATE";
                        const cRate = item.cgstRate !== undefined ? item.cgstRate : (item.gstRate / 2);
                        const cAmt = item.cgstAmount !== undefined ? item.cgstAmount : (item.gstAmount / 2);
                        const sRate = item.sgstRate !== undefined ? item.sgstRate : (item.gstRate / 2);
                        const sAmt = item.sgstAmount !== undefined ? item.sgstAmount : (item.gstAmount / 2);
                        const iRate = item.igstRate !== undefined ? item.igstRate : item.gstRate;
                        const iAmt = item.igstAmount !== undefined ? item.igstAmount : item.gstAmount;

                        return (
                          <tr key={idx}>
                            <td className="fw-medium">{item.name}</td>
                            <td className="text-end">{formatCurrencyINR(item.baseAmount)}</td>
                            <td className="text-end">{item.gstRate}%</td>
                            {isInterState ? (
                              <td className="text-end">
                                {formatCurrencyINR(iAmt)} <span className="text-muted small">({iRate}%)</span>
                              </td>
                            ) : (
                              <>
                                <td className="text-end">
                                  {formatCurrencyINR(cAmt)} <span className="text-muted small">({cRate}%)</span>
                                </td>
                                <td className="text-end">
                                  {formatCurrencyINR(sAmt)} <span className="text-muted small">({sRate}%)</span>
                                </td>
                              </>
                            )}
                            <td className="text-end fw-semibold">{formatCurrencyINR(item.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          {/* FEE SUMMARY BLOCK */}
          {receipt.summary && (receipt.summary.totalFee !== undefined || receipt.summary.totalPaid !== undefined) && (
            <section className="col-12 mt-2" aria-label="Fee summary">
              <h6 className="section-title">Fee Summary</h6>
              <div className="fee-summary-card">
                <div className="row text-center g-3">
                  <div className="col-4">
                    <div className="small text-muted mb-1">Total Course Fee</div>
                    <div className="fw-bold fs-6">
                      {formatCurrencyINR(receipt.summary.totalFee)}
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="small text-muted mb-1">Paid So Far</div>
                    <div className="fw-bold fs-6 text-success">
                      {formatCurrencyINR(receipt.summary.totalPaid)}
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="small text-muted mb-1">Balance Due</div>
                    <div className={`fw-bold fs-6 ${(receipt.summary.remaining || 0) > 0 ? "text-danger" : "text-success"}`}>
                      {formatCurrencyINR(receipt.summary.remaining)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <hr />

        <p className="text-center small text-muted mt-4">
          This is a system-generated receipt. No signature required.
        </p>
      </div>

      {/* ACTION BUTTONS (HIDDEN DURING PRINT) */}
      <nav
        className="d-flex justify-content-center gap-3 mt-4 no-print"
        aria-label="Receipt actions"
      >
        <button
          className="btn btn-outline-primary"
          onClick={() => window.print()}
          aria-label="Print receipt"
          disabled={loading}
        >
          <FaPrint className="me-1" aria-hidden="true" /> Print
        </button>

        <button
          className="btn btn-success"
          onClick={downloadPDF}
          disabled={loading}
          aria-label="Download receipt as PDF"
        >
          <FaDownload className="me-1" aria-hidden="true" /> Download PDF
        </button>
      </nav>

      {/* Styles */}
      <style>{`
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
        .receipt-empty-wrapper {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 20px;
        }
        .empty-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 500px;
          text-align: center;
        }
        .empty-icon {
          font-size: 5rem;
          color: #cbd5e1;
          margin-bottom: 20px;
        }
        .empty-card h3 {
          margin: 0 0 10px 0;
          color: #1e293b;
          font-weight: 700;
        }
        .empty-card p {
          color: #64748b;
          margin: 0 0 25px 0;
        }
        .btn-back {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #0f3a4a, #1a4b6d);
          color: white;
          cursor: pointer;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        .btn-back:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 58, 74, 0.4);
        }
        .receipt-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        
        /* Back Button Styling */
        .btn-back-to-fees {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border: 2px solid #6c757d;
          background: white;
          color: #6c757d;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-back-to-fees:hover {
          background: #6c757d;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(108, 117, 125, 0.3);
        }

        .section-title {
          font-weight: 700;
          margin-bottom: 12px;
          color: #1a4b6d;
        }

        .info-row {
          margin-bottom: 10px;
        }

        .fee-summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .watermark {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(16, 185, 129, 0.08);
          pointer-events: none;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            padding: 24px !important;
          }
          .watermark {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: rgba(16, 185, 129, 0.12) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* Helper */
function Info({ label, value }) {
  return (
    <div className="info-row">
      <strong>{label}:</strong> {value || "N/A"}
    </div>
  );
}
