import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import "react-toastify/dist/ReactToastify.css";
import "./FeeReceipt.css";

import {
  FaReceipt,
  FaCheckCircle,
  FaDownload,
  FaPrint,
  FaUniversity,
  FaExclamationTriangle,
  FaArrowLeft,
  FaRedo,
  FaSpinner,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import LogoImage from "../../../components/common/LogoImage";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Authentication / session error codes that must NOT surface a toast.
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

/* ================= CURRENCY FORMATTER (INR) ================= */
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

/* ================= DATE FORMATTER (ASIA/KOLKATA) ================= */
// Format date in Asia/Kolkata timezone: e.g. "23 Oct 2026, 12:47 PM IST"
function formatDateTimeKolkata(dateInput) {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "N/A";

  try {
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";
    const hour = parts.find((p) => p.type === "hour")?.value || "";
    const minute = parts.find((p) => p.type === "minute")?.value || "";
    const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() || "";

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} IST`;
  } catch {
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  }
}

/* ================= NUMBER TO WORDS (INR FORMAT) ================= */
function convertBelowThousand(n) {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  let str = "";
  if (n >= 100) {
    str += `${ones[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${tens[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    str += `${ones[n]} `;
  }
  return str.trim();
}

function convertNumberToWords(num) {
  if (num === 0) return "Zero";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  let result = "";
  if (crore > 0) {
    result += `${convertNumberToWords(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertBelowThousand(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertBelowThousand(thousand)} Thousand `;
  }
  if (remainder > 0) {
    result += `${convertBelowThousand(remainder)} `;
  }
  return result.trim();
}

function amountToWordsINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "";
  }
  const num = Number(amount);
  if (num === 0) return "Rupees Zero Only";

  const isNegative = num < 0;
  const abs = Math.abs(num);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  let words = "";
  if (rupees > 0) {
    words = `Rupees ${convertNumberToWords(rupees)}`;
  }
  if (paise > 0) {
    const paiseWords = `${convertBelowThousand(paise)} Paise`;
    words = words ? `${words} and ${paiseWords}` : `${paiseWords}`;
  }

  return `${isNegative ? "Minus " : ""}${words} Only`;
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

/* ================= STATUS CHIP HELPER ================= */
function getStatusChipInfo(status) {
  const norm = String(status || "").toUpperCase();
  if (norm === "SUCCESS" || norm === "PAID" || norm === "COMPLETED") {
    return {
      label: "Payment Successful",
      className: "fr-status-paid",
      icon: <FaCheckCircle aria-hidden="true" />,
    };
  }
  if (norm === "PENDING" || norm === "PROCESSING") {
    return {
      label: "Payment Pending",
      className: "fr-status-pending",
      icon: <FaClock aria-hidden="true" />,
    };
  }
  return {
    label: norm ? `Payment ${norm}` : "Payment Failed",
    className: "fr-status-failed",
    icon: <FaTimesCircle aria-hidden="true" />,
  };
}

/* ================= DETAIL ROW HELPER ================= */
function DetailRow({ label, value, mono = false }) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  return (
    <div className="fr-dl-row">
      <dt className="fr-dt">{label}</dt>
      <dd className={`fr-dd ${mono ? "fr-font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

export default function FeeReceipt() {
  /* ================= ALL HOOKS FIRST (REACT RULES OF HOOKS) ================= */
  const { user, loading: authLoading } = useContext(AuthContext);
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const receiptRef = useRef(null);

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fetchIdRef = useRef(0);

  // Navigate back action
  const handleGoBack = useCallback(() => {
    if (
      user?.role === "COLLEGE_ADMIN" ||
      user?.role === "ACCOUNTANT" ||
      user?.role === "PRINCIPAL"
    ) {
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

  // PDF Download with html2canvas (scale 2, A4 fit, multi-page split if tall)
  const downloadPDF = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const toastId = toast.loading("Generating PDF...");

    try {
      if (!receiptRef.current) {
        throw new Error("Receipt element not found");
      }

      const canvas = await Promise.race([
        html2canvas(receiptRef.current, {
          scale: 2,
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

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const mmToPx = canvasWidth / pageWidth;
      const pageCanvasHeight = Math.floor(pageHeight * mmToPx);

      if (canvasHeight <= pageCanvasHeight) {
        const imgData = canvas.toDataURL("image/png");
        const renderedHeightMm = (canvasHeight * pageWidth) / canvasWidth;
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, renderedHeightMm, undefined, "FAST");
      } else {
        let currentY = 0;
        let pageIndex = 0;

        while (currentY < canvasHeight) {
          if (pageIndex > 0) {
            pdf.addPage();
          }

          const sliceHeight = Math.min(pageCanvasHeight, canvasHeight - currentY);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvasWidth;
          pageCanvas.height = sliceHeight;

          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              currentY,
              canvasWidth,
              sliceHeight,
              0,
              0,
              canvasWidth,
              sliceHeight,
            );

            const pageImgData = pageCanvas.toDataURL("image/png");
            const sliceHeightMm = (sliceHeight * pageWidth) / canvasWidth;
            pdf.addImage(pageImgData, "PNG", 0, 0, pageWidth, sliceHeightMm, undefined, "FAST");
          }

          currentY += sliceHeight;
          pageIndex += 1;
        }
      }

      const cleanReceiptNum = String(
        receipt?.receiptNumber || receipt?.transactionId || "Receipt",
      ).replace(/[^a-zA-Z0-9_-]/g, "_");

      const studentIdentifier = String(
        receipt?.student?.enrollment || receipt?.student?.name || "Student",
      ).replace(/[^a-zA-Z0-9_-]/g, "_");

      const fileName = `Receipt_${cleanReceiptNum}_${studentIdentifier}.pdf`;
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
    } finally {
      setIsDownloading(false);
    }
  }, [receipt, isDownloading, logErrorToMonitoring]);

  const backButtonLabel =
    user?.role === "COLLEGE_ADMIN" ||
    user?.role === "PRINCIPAL" ||
    user?.role === "ACCOUNTANT"
      ? "Back to Payment History"
      : "Back to Fees";

  /* ================= CONDITIONAL EARLY RETURNS AFTER ALL HOOKS ================= */
  if (authLoading) {
    return (
      <div className="fee-receipt-page fr-state-page">
        <div className="fr-loading-card" role="status" aria-live="polite">
          <FaSpinner className="fr-loading-icon fr-spin" aria-hidden="true" />
          <h2 className="fr-loading-title">Verifying Session</h2>
          <p className="fr-loading-subtitle">
            Please wait while we verify your credentials...
          </p>
        </div>
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
      <div className="fee-receipt-page fr-state-page">
        <div className="fr-state-card" role="alert">
          <FaExclamationTriangle
            className="fr-state-icon fr-state-icon-error"
            aria-hidden="true"
          />
          <h2 className="fr-state-title">Invalid Receipt URL</h2>
          <p className="fr-state-message">
            Payment ID is missing from the URL.
          </p>
          <div className="fr-state-actions">
            <button
              type="button"
              className="fr-btn fr-btn-primary"
              onClick={handleGoBack}
            >
              <FaArrowLeft aria-hidden="true" /> {backButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fee-receipt-page fr-state-page">
        <div className="fr-state-card" role="alert">
          <FaExclamationTriangle
            className="fr-state-icon fr-state-icon-error"
            aria-hidden="true"
          />
          <h2 className="fr-state-title">Unable to Load Receipt</h2>
          <p className="fr-state-message">
            {error.message || "Unable to fetch receipt. Please try again."}
          </p>
          <div className="fr-state-actions">
            {retryCount < 3 && (
              <button
                type="button"
                className="fr-btn fr-btn-primary"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <FaSpinner className="fr-spin" aria-hidden="true" />{" "}
                    Retrying...
                  </>
                ) : (
                  <>
                    <FaRedo aria-hidden="true" /> Retry ({3 - retryCount} left)
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="fr-btn fr-btn-secondary"
              onClick={handleGoBack}
            >
              <FaArrowLeft aria-hidden="true" /> {backButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fee-receipt-page fr-state-page">
        <div className="fr-loading-card" role="status" aria-live="polite">
          <FaSpinner className="fr-loading-icon fr-spin" aria-hidden="true" />
          <h2 className="fr-loading-title">Loading Receipt</h2>
          <p className="fr-loading-subtitle">
            Fetching payment receipt details...
          </p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="fee-receipt-page fr-state-page">
        <div className="fr-state-card">
          <FaReceipt
            className="fr-state-icon fr-state-icon-muted"
            aria-hidden="true"
          />
          <h2 className="fr-state-title">Receipt Not Available</h2>
          <p className="fr-state-message">
            Receipt not available for this payment.
          </p>
          <div className="fr-state-actions">
            <button
              type="button"
              className="fr-btn fr-btn-primary"
              onClick={handleGoBack}
            >
              <FaArrowLeft aria-hidden="true" /> {backButtonLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= COMPUTED VALUES ================= */
  const statusChip = getStatusChipInfo(receipt.status);
  const isPaid =
    String(receipt.status || "").toUpperCase() === "SUCCESS" ||
    String(receipt.status || "").toUpperCase() === "PAID";

  const paymentMethodLabel = (() => {
    const gateway = receipt.paymentGateway || "STRIPE";
    const mode = receipt.paymentMode || "ONLINE";

    if (gateway === "OFFLINE" || mode !== "ONLINE") {
      const modeLabels = {
        CASH: "Cash",
        CHEQUE: "Cheque",
        DD: "Demand Draft",
      };
      return modeLabels[mode] || `Offline (${mode})`;
    }
    const gatewayLabels = {
      STRIPE: "Card (Stripe)",
      RAZORPAY: "UPI / Card (Razorpay)",
      MOCK: "Mock Payment",
    };
    return gatewayLabels[gateway] || "Online Card / Netbanking";
  })();

  const isInterState =
    receipt.taxDetails?.taxSplit?.type === "INTER_STATE" ||
    (receipt.taxDetails?.taxSplit?.igstAmount &&
      receipt.taxDetails.taxSplit.igstAmount > 0);

  const amountInWords = amountToWordsINR(receipt.amount);

  const isTaxInvoice =
    receipt?.taxDetails?.isTaxApplicable &&
    receipt?.college?.gstin &&
    typeof receipt.college.gstin === "string" &&
    receipt.college.gstin.trim().length === 15;

  /* ================= MAIN RECEIPT VIEW ================= */
  return (
    <div className="fee-receipt-page" role="main">
      <div className="fr-container">

        {/* RECEIPT CARD */}
        <div
          ref={receiptRef}
          className="fr-card"
          id="receipt-content"
          role="article"
          aria-label="Payment receipt details"
        >
          {/* WATERMARK (PAID ONLY) */}
          {isPaid && (
            <div className="fr-watermark" aria-hidden="true" role="presentation">
              PAID
            </div>
          )}

          <div className="fr-card-inner">
            {/* 1. CARD HEADER */}
            <header className="fr-header">
              <div className="fr-header-brand">
                <div className="fr-logo-wrap" aria-hidden="true">
                  {receipt.college?.logo ? (
                    <LogoImage
                      documentId={receipt.college.logo}
                      alt={receipt.college?.name || "College Logo"}
                      size={56}
                    />
                  ) : (
                    <FaUniversity className="fr-logo-fallback" />
                  )}
                </div>
                <div className="fr-header-info">
                  <h1 className="fr-college-title">
                    {receipt.college?.name || "College Name Not Available"}
                  </h1>
                  {receipt.college?.address && (
                    <address className="fr-college-meta">
                      {receipt.college.address}
                    </address>
                  )}
                  {(receipt.college?.email || receipt.college?.contact) && (
                    <div className="fr-college-contacts">
                      {receipt.college?.email && (
                        <a
                          href={`mailto:${receipt.college.email}`}
                          aria-label={`Email: ${receipt.college.email}`}
                        >
                          {receipt.college.email}
                        </a>
                      )}
                      {receipt.college?.email &&
                        receipt.college?.contact &&
                        " | "}
                      {receipt.college?.contact && (
                        <a
                          href={`tel:${receipt.college.contact}`}
                          aria-label={`Phone: ${receipt.college.contact}`}
                        >
                          {receipt.college.contact}
                        </a>
                      )}
                    </div>
                  )}
                  {receipt.college?.gstin && (
                    <div className="fr-gstin-badge">
                      GSTIN: {receipt.college.gstin}
                    </div>
                  )}
                </div>
              </div>

              <div className="fr-header-receipt-meta">
                <span className="fr-receipt-badge">
                  {isTaxInvoice ? "TAX INVOICE" : "RECEIPT"}
                </span>
                <div className="fr-receipt-num">
                  Receipt No:{" "}
                  <strong>
                    {receipt.receiptNumber || receipt.transactionId || "N/A"}
                  </strong>
                </div>
                <div className="fr-receipt-date">
                  Paid On: {formatDateTimeKolkata(receipt.paidAt)}
                </div>
              </div>
            </header>

            {/* 2. STATUS BAND */}
            <div className="fr-status-band" aria-label="Payment status">
              <span className={`fr-status-chip ${statusChip.className}`}>
                {statusChip.icon}
                <span>{statusChip.label}</span>
              </span>
            </div>

            {/* 3. AMOUNT HERO */}
            <div className="fr-amount-hero">
              <span className="fr-amount-label">Amount Paid</span>
              <div className="fr-amount-value">
                {formatCurrencyINR(receipt.amount)}
              </div>
              {amountInWords && (
                <p className="fr-amount-words">{amountInWords}</p>
              )}
            </div>

            {/* 4. DETAIL CARDS (GRID 2 COLS >= 768px, 1 COL BELOW) */}
            <div className="fr-grid">
              {/* Student Details */}
              <section
                className="fr-detail-card"
                aria-labelledby="fr-student-heading"
              >
                <h2 id="fr-student-heading" className="fr-section-title">
                  Student Details
                </h2>
                <dl className="fr-dl">
                  <DetailRow label="Name" value={receipt.student?.name} />
                  <DetailRow
                    label="Enrollment No"
                    value={receipt.student?.enrollment}
                    mono
                  />
                  <DetailRow label="Course" value={receipt.student?.course} />
                  <DetailRow
                    label="Department"
                    value={receipt.student?.department}
                  />
                  <DetailRow
                    label="Academic Year"
                    value={receipt.student?.academicYear}
                  />
                </dl>
              </section>

              {/* Payment Details */}
              <section
                className="fr-detail-card"
                aria-labelledby="fr-payment-heading"
              >
                <h2 id="fr-payment-heading" className="fr-section-title">
                  Payment Details
                </h2>
                <dl className="fr-dl">
                  <DetailRow
                    label="Installment"
                    value={receipt.installmentName}
                  />
                  <DetailRow
                    label="Payment Method"
                    value={paymentMethodLabel}
                  />
                  <DetailRow
                    label="Transaction Ref"
                    value={receipt.transactionId}
                    mono
                  />
                  {receipt.paymentMode &&
                    receipt.paymentMode !== "ONLINE" && (
                      <>
                        <DetailRow
                          label="Reference / Cheque No"
                          value={receipt.referenceNumber}
                          mono
                        />
                        <DetailRow
                          label="Remarks"
                          value={receipt.remarks}
                        />
                      </>
                    )}
                  {receipt.taxDetails?.isTaxApplicable && (
                    <>
                      <DetailRow
                        label="SAC Code"
                        value={receipt.taxDetails.sacCode}
                        mono
                      />
                      <DetailRow
                        label="Place of Supply"
                        value={receipt.taxDetails.placeOfSupply}
                      />
                      <DetailRow
                        label="Base Fee"
                        value={formatCurrencyINR(receipt.taxDetails.baseAmount)}
                      />
                      {isInterState ? (
                        <DetailRow
                          label={
                            receipt.taxDetails.taxSplit?.isUniformRate &&
                            receipt.taxDetails.taxSplit?.igstRate
                              ? `IGST (${receipt.taxDetails.taxSplit.igstRate}%)`
                              : "IGST"
                          }
                          value={formatCurrencyINR(
                            receipt.taxDetails.taxSplit?.igstAmount ||
                              receipt.taxDetails.totalTax,
                          )}
                        />
                      ) : (
                        <>
                          <DetailRow
                            label={
                              receipt.taxDetails.taxSplit?.isUniformRate &&
                              receipt.taxDetails.taxSplit?.cgstRate
                                ? `CGST (${receipt.taxDetails.taxSplit.cgstRate}%)`
                                : "CGST"
                            }
                            value={formatCurrencyINR(
                              receipt.taxDetails.taxSplit?.cgstAmount ||
                                receipt.taxDetails.totalTax / 2,
                            )}
                          />
                          <DetailRow
                            label={
                              receipt.taxDetails.taxSplit?.isUniformRate &&
                              receipt.taxDetails.taxSplit?.sgstRate
                                ? `SGST (${receipt.taxDetails.taxSplit.sgstRate}%)`
                                : "SGST"
                            }
                            value={formatCurrencyINR(
                              receipt.taxDetails.taxSplit?.sgstAmount ||
                                receipt.taxDetails.totalTax / 2,
                            )}
                          />
                        </>
                      )}
                      <DetailRow
                        label="Total GST"
                        value={formatCurrencyINR(receipt.taxDetails.totalTax)}
                      />
                    </>
                  )}
                </dl>
              </section>
            </div>

            {/* 5. TAX INVOICE & GST BREAKDOWN TABLE (IF PRESENT) */}
            {receipt.taxDetails?.isTaxApplicable &&
              Array.isArray(receipt.taxDetails.lineItems) &&
              receipt.taxDetails.lineItems.length > 0 && (
                <section
                  className="fr-tax-section"
                  aria-labelledby="fr-tax-heading"
                >
                  <h2 id="fr-tax-heading" className="fr-section-title">
                    Fee Component &amp; GST Breakdown
                  </h2>
                  <div className="fr-table-responsive">
                    <table className="fr-table">
                      <thead>
                        <tr>
                          <th>Fee Component</th>
                          <th className="fr-text-right">Base Amount</th>
                          <th className="fr-text-right">GST Rate</th>
                          {isInterState ? (
                            <th className="fr-text-right">IGST</th>
                          ) : (
                            <>
                              <th className="fr-text-right">CGST</th>
                              <th className="fr-text-right">SGST</th>
                            </>
                          )}
                          <th className="fr-text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.taxDetails.lineItems.map((item, idx) => {
                          const cRate =
                            item.cgstRate !== undefined
                              ? item.cgstRate
                              : item.gstRate / 2;
                          const cAmt =
                            item.cgstAmount !== undefined
                              ? item.cgstAmount
                              : item.gstAmount / 2;
                          const sRate =
                            item.sgstRate !== undefined
                              ? item.sgstRate
                              : item.gstRate / 2;
                          const sAmt =
                            item.sgstAmount !== undefined
                              ? item.sgstAmount
                              : item.gstAmount / 2;
                          const iRate =
                            item.igstRate !== undefined
                              ? item.igstRate
                              : item.gstRate;
                          const iAmt =
                            item.igstAmount !== undefined
                              ? item.igstAmount
                              : item.gstAmount;

                          return (
                            <tr key={idx}>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td className="fr-text-right">
                                {formatCurrencyINR(item.baseAmount)}
                              </td>
                              <td className="fr-text-right">
                                {item.gstRate}%
                              </td>
                              {isInterState ? (
                                <td className="fr-text-right">
                                  {formatCurrencyINR(iAmt)}{" "}
                                  <span className="fr-text-muted">
                                    ({iRate}%)
                                  </span>
                                </td>
                              ) : (
                                <>
                                  <td className="fr-text-right">
                                    {formatCurrencyINR(cAmt)}{" "}
                                    <span className="fr-text-muted">
                                      ({cRate}%)
                                    </span>
                                  </td>
                                  <td className="fr-text-right">
                                    {formatCurrencyINR(sAmt)}{" "}
                                    <span className="fr-text-muted">
                                      ({sRate}%)
                                    </span>
                                  </td>
                                </>
                              )}
                              <td className="fr-text-right">
                                <strong>
                                  {formatCurrencyINR(item.totalAmount)}
                                </strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

            {/* 6. FEE SUMMARY STRIP */}
            {receipt.summary &&
              (receipt.summary.totalFee !== undefined ||
                receipt.summary.totalPaid !== undefined) && (
                <section
                  className="fr-summary-section"
                  aria-labelledby="fr-summary-heading"
                >
                  <h2 id="fr-summary-heading" className="fr-section-title">
                    Fee Summary
                  </h2>
                  <div className="fr-summary-grid">
                    <div className="fr-summary-col">
                      <span className="fr-summary-label">Total Fee</span>
                      <span className="fr-summary-value">
                        {formatCurrencyINR(receipt.summary.totalFee)}
                      </span>
                    </div>
                    <div className="fr-summary-col">
                      <span className="fr-summary-label">Paid So Far</span>
                      <span className="fr-summary-value fr-value-success">
                        {formatCurrencyINR(receipt.summary.totalPaid)}
                      </span>
                    </div>
                    <div className="fr-summary-col">
                      <span className="fr-summary-label">Balance Due</span>
                      <span
                        className={`fr-summary-value ${
                          (receipt.summary.remaining || 0) > 0
                            ? "fr-value-danger"
                            : "fr-value-success"
                        }`}
                      >
                        {formatCurrencyINR(receipt.summary.remaining)}
                      </span>
                      {receipt.summary.remaining <= 0 && (
                        <span className="fr-badge-paid">
                          <FaCheckCircle aria-hidden="true" /> Fully Paid
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

            {/* 7. FOOTER */}
            <footer className="fr-footer">
              <p className="fr-footer-text">
                This is a system-generated receipt. No signature required.
              </p>
            </footer>
          </div>
        </div>

        {/* ACTIONS TOOLBAR (SCREEN ONLY) */}
        <div className="fr-toolbar no-print">
          <button
            type="button"
            className="fr-btn fr-btn-secondary"
            onClick={handleGoBack}
            aria-label={backButtonLabel}
          >
            <FaArrowLeft aria-hidden="true" />
            <span>{backButtonLabel}</span>
          </button>

          <div className="fr-toolbar-actions">
            <button
              type="button"
              className="fr-btn fr-btn-outline"
              onClick={() => window.print()}
              aria-label="Print receipt"
              disabled={isDownloading}
            >
              <FaPrint aria-hidden="true" />
              <span>Print</span>
            </button>

            <button
              type="button"
              className="fr-btn fr-btn-primary"
              onClick={downloadPDF}
              disabled={isDownloading}
              aria-label="Download receipt as PDF"
            >
              {isDownloading ? (
                <FaSpinner className="fr-spin" aria-hidden="true" />
              ) : (
                <FaDownload aria-hidden="true" />
              )}
              <span>{isDownloading ? "Generating PDF..." : "Download PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
