import { useEffect, useState, useContext, useRef } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { AuthContext } from "../../../auth/AuthContext";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCreditCard,
  FaPrint,
  FaDownload,
  FaCopy,
  FaUserGraduate,
  FaReceipt,
  FaCalendarAlt,
  FaUniversity,
  FaSpinner,
} from "react-icons/fa";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function PaymentSuccess() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const receiptRef = useRef(null);

  const sessionId = searchParams.get("session_id");
  const paymentGatewayParam = searchParams.get("gateway") || "stripe";
  const orderId = searchParams.get("order_id");

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [receiptDetails, setReceiptDetails] = useState(null);

  /* ========== FETCH STUDENT PROFILE ========== */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");
        if (res.data?.student) {
          setStudentProfile({
            ...res.data.student,
            courseName: res.data.course?.name || res.data.course?.courseName,
            collegeName: res.data.college?.name,
          });
        }
      } catch {
        // Non-critical
      }
    };
    fetchProfile();
  }, []);

  /* ========== FETCH RECEIPT DETAILS ========== */
  useEffect(() => {
    const fetchReceipt = async () => {
      if (!payment?.installmentId) return;
      try {
        const res = await api.get(`/student/payments/receipt/${payment.installmentId}`);
        setReceiptDetails(res.data);
      } catch {
        // Non-critical
      }
    };
    fetchReceipt();
  }, [payment?.installmentId]);

  /* ========== CONFIRM STRIPE PAYMENT ========== */
  useEffect(() => {
    if (!sessionId || paymentGatewayParam === "razorpay") {
      if (paymentGatewayParam !== "razorpay") {
        setError("No session ID provided");
        setLoading(false);
      }
      return;
    }

    let statusInterval;
    let attempts = 0;
    const maxAttempts = 15;

    const confirmAndPoll = async () => {
      try {
        const confirmRes = await api.post("/stripe/confirm-payment", { sessionId });

        if (confirmRes.data?.installment?.status === "PAID") {
          const inst = confirmRes.data.installment;
          setPayment({
            installmentId: inst._id,
            installmentName: inst.installmentName || inst.name,
            amount: inst.amount,
            paidAt: inst.paidAt,
            transactionId: inst.transactionId,
            paymentGateway: inst.paymentGateway || "STRIPE",
            totalFee: confirmRes.data.totalFee,
            paidAmount: confirmRes.data.paidAmount,
            remainingAmount: confirmRes.data.remainingAmount,
          });
          toast.success("Payment confirmed successfully!", {
            position: "top-right",
            autoClose: 3000,
            icon: <FaCheckCircle />,
          });
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to polling
      }

      statusInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await api.get(`/student/payments/status?sessionId=${sessionId}`);
          if (res.data.status === "PAID") {
            clearInterval(statusInterval);
            setPayment({
              installmentId: res.data.installmentId,
              installmentName: res.data.installmentName,
              amount: res.data.amount,
              paidAt: res.data.paidAt,
              transactionId: res.data.transactionId,
              paymentGateway: res.data.paymentGateway || "STRIPE",
              totalFee: res.data.totalFee,
              paidAmount: res.data.paidAmount,
              remainingAmount: res.data.remainingAmount,
            });
            toast.success("Payment confirmed successfully!", {
              position: "top-right",
              autoClose: 3000,
              icon: <FaCheckCircle />,
            });
            setLoading(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(statusInterval);
            setError("Payment is still processing. Please check back in a few moments.");
            setLoading(false);
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            clearInterval(statusInterval);
            const errorMsg = err.response?.data?.message || "Payment confirmation timeout";
            setError(errorMsg);
            toast.error(errorMsg, {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
            setLoading(false);
          }
        }
      }, 2000);
    };

    confirmAndPoll();
    return () => clearInterval(statusInterval);
  }, [sessionId, paymentGatewayParam]);

  /* ========== POLL RAZORPAY ========== */
  useEffect(() => {
    if (paymentGatewayParam !== "razorpay" || !orderId) {
      if (paymentGatewayParam === "razorpay" && !orderId) {
        setError("No order ID provided");
        setLoading(false);
      }
      return;
    }

    let interval;
    let attempts = 0;
    const maxAttempts = 30;

    const pollRazorpay = async () => {
      interval = setInterval(async () => {
        attempts++;
        try {
          const res = await api.get(`/student/payments/status?orderId=${orderId}&gateway=razorpay`);
          if (res.data.status === "PAID") {
            clearInterval(interval);
            setPayment({
              installmentId: res.data.installmentId,
              installmentName: res.data.installmentName,
              amount: res.data.amount,
              paidAt: res.data.paidAt,
              transactionId: res.data.transactionId,
              paymentGateway: "RAZORPAY",
              totalFee: res.data.totalFee,
              paidAmount: res.data.paidAmount,
              remainingAmount: res.data.remainingAmount,
            });
            toast.success("Payment confirmed successfully!", {
              position: "top-right",
              autoClose: 3000,
              icon: <FaCheckCircle />,
            });
            setLoading(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setError("Payment is still processing. Please check back in a few moments.");
            setLoading(false);
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            const errorMsg = err.response?.data?.message || "Payment confirmation timeout";
            setError(errorMsg);
            toast.error(errorMsg, {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
            setLoading(false);
          }
        }
      }, 2000);
    };

    pollRazorpay();
    return () => clearInterval(interval);
  }, [paymentGatewayParam, orderId]);

  /* ========== SECURITY ========== */
  if (authLoading) {
    return <Loading fullScreen text="Verifying your session..." />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" replace />;

  /* ========== LOADING ========== */
  if (loading) {
    return (
      <div className="ps-wrapper">
        <Loading fullScreen size="lg" text="Confirming your payment..." />
      </div>
    );
  }

  /* ========== ERROR ========== */
  if (error) {
    return (
      <div className="ps-wrapper">
        <ToastContainer position="top-right" />
        <motion.div
          className="ps-error-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="ps-error-icon-circle">
            <FaTimesCircle className="ps-error-icon" />
          </div>
          <h3 className="ps-error-title">Payment Not Confirmed</h3>
          <p className="ps-error-msg">{error}</p>
          <button className="ps-btn-primary" onClick={handleBack}>
            <FaArrowLeft /> Back to Fees
          </button>
        </motion.div>
        <style>{`
          .ps-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fee2e2, #fecaca); padding: 20px; }
          .ps-error-card { background: white; padding: 48px 40px; border-radius: 24px; box-shadow: 0 20px 60px rgba(220,53,69,0.2); max-width: 480px; width: 100%; text-align: center; }
          .ps-error-icon-circle { width: 88px; height: 88px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
          .ps-error-icon { font-size: 44px; color: #dc3545; }
          .ps-error-title { margin: 0 0 8px; color: #dc3545; font-weight: 700; font-size: 1.5rem; }
          .ps-error-msg { color: #6b7280; margin: 0 0 28px; line-height: 1.6; }
          .ps-btn-primary { padding: 12px 28px; border-radius: 12px; border: none; background: linear-gradient(135deg, #0f3a4a, #1a4b6d); color: white; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease; }
          .ps-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,58,74,0.4); }
        `}</style>
      </div>
    );
  }

  /* ========== DERIVED DATA ========== */
  const displayStudentName = studentProfile?.fullName || user?.name || "Student";
  const displayCollegeName = receiptDetails?.college?.name || studentProfile?.collegeName || "N/A";
  const displayEnrollment = receiptDetails?.student?.enrollment || studentProfile?.enrollmentNumber || "N/A";
  const displayCourse = receiptDetails?.student?.course || studentProfile?.courseName || "N/A";
  const displaySemester = studentProfile?.currentSemester ?? receiptDetails?.student?.semester ?? "N/A";
  const displayAcademicYear = receiptDetails?.student?.academicYear || studentProfile?.currentAcademicYear || "N/A";
  const displayFeeCategory = studentProfile?.category || "N/A";
  const displayInstallmentName = payment?.installmentName || receiptDetails?.installmentName || "N/A";
  const displayReceiptNumber = receiptDetails?.receiptNumber || payment?.transactionId || receiptDetails?.transactionId || "N/A";
  const displayPaymentMethod = (() => {
    const gateway = payment?.paymentGateway || "STRIPE";
    const mode = receiptDetails?.paymentMode || "ONLINE";
    if (gateway === "RAZORPAY") return "📱 UPI/Card (Razorpay)";
    if (gateway === "STRIPE") return "💳 Card (Stripe)";
    if (gateway === "OFFLINE") {
      const labels = { CASH: "💵 Cash", CHEQUE: "📝 Cheque", DD: "🏦 Demand Draft" };
      return labels[mode] || "💵 Cash";
    }
    return "💳 Online Payment";
  })();
  const displayTransactionId = payment?.transactionId || "N/A";
  const displayPaymentDate = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : receiptDetails?.paidAt
      ? new Date(receiptDetails.paidAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : "N/A";
  const displayPaymentStatus = "SUCCESS";
  const displayAmountPaid = payment?.amount || 0;
  const displayTotalPaid = payment?.paidAmount || 0;
  const displayRemaining = payment?.remainingAmount || 0;
  const displayTotalFee = payment?.totalFee || 0;

  /* ========== HANDLERS ========== */
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!", { position: "top-right", autoClose: 2000, icon: <FaCheckCircle /> });
    } catch {
      toast.error("Failed to copy", { position: "top-right", autoClose: 2000, icon: <FaTimesCircle /> });
    }
  };

  const handleViewReceipt = () => {
    if (payment?.installmentId) {
      navigate(`/student/fee-receipt/${payment.installmentId}`);
    } else {
      toast.error("Receipt ID not found. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    }
  };

  const handleBack = () => navigate("/student/fees");

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) {
      toast.error("Receipt not ready. Please try again.", { position: "top-right", autoClose: 3000, icon: <FaExclamationTriangle /> });
      return;
    }
    const toastId = toast.loading("Generating PDF...");
    try {
      const canvas = await Promise.race([
        html2canvas(receiptRef.current, { scale: 3, useCORS: true, allowTaint: true, logging: false, imageTimeout: 15000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Canvas timeout")), 30000)),
      ]);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Fee_Receipt_${displayTransactionId || "unknown"}.pdf`);
      toast.update(toastId, { render: "PDF downloaded!", type: "success", isLoading: false, autoClose: 3000 });
    } catch {
      toast.update(toastId, { render: "Failed to generate PDF. Please try Print instead.", type: "error", isLoading: false, autoClose: 5000 });
    }
  };

  const handlePrint = () => window.print();

  const progressPercent = displayTotalFee > 0 ? Math.min(100, Math.round((displayTotalPaid / displayTotalFee) * 100)) : 0;

  /* ========== SUCCESS UI ========== */
  return (
    <div className="ps-wrapper">
      <ToastContainer position="top-right" />
      <motion.div
        className="ps-main-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* HEADER */}
        <div className="ps-success-header">
          <motion.div
            className="ps-check-circle-wrapper"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="ps-check-bg">
              <FaCheckCircle className="ps-check-icon" />
            </div>
          </motion.div>
          <h1 className="ps-success-title">Payment Successful</h1>
          <p className="ps-success-subtitle">Your payment has been processed securely.</p>
          <div className="ps-gateway-badge-wrapper">
            <span className={`ps-gateway-badge ${payment?.paymentGateway?.toLowerCase() || "stripe"}`}>
              <FaCreditCard /> {payment?.paymentGateway || "STRIPE"}
            </span>
            <span className="ps-status-badge">
              <FaCheckCircle className="ps-status-dot" /> {displayPaymentStatus}
            </span>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="ps-summary-grid">
          <motion.div className="ps-summary-card ps-total" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="ps-summary-icon-wrap"><FaUniversity /></div>
            <div className="ps-summary-content">
              <span className="ps-summary-label">Total Fee</span>
              <h3 className="ps-summary-value">₹{displayTotalFee.toLocaleString("en-IN")}</h3>
            </div>
          </motion.div>
          <motion.div className="ps-summary-card ps-paid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="ps-summary-icon-wrap"><FaCheckCircle /></div>
            <div className="ps-summary-content">
              <span className="ps-summary-label">Total Paid</span>
              <h3 className="ps-summary-value">₹{displayTotalPaid.toLocaleString("en-IN")}</h3>
            </div>
          </motion.div>
          <motion.div className="ps-summary-card ps-remaining" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="ps-summary-icon-wrap"><FaCreditCard /></div>
            <div className="ps-summary-content">
              <span className="ps-summary-label">Remaining</span>
              <h3 className="ps-summary-value">₹{displayRemaining.toLocaleString("en-IN")}</h3>
            </div>
          </motion.div>
        </div>

        {/* PROGRESS BAR */}
        <div className="ps-progress-section">
          <div className="ps-progress-header">
            <span className="ps-progress-label">Payment Progress</span>
            <span className="ps-progress-percent">{progressPercent}%</span>
          </div>
          <div className="ps-progress-bar-outer">
            <motion.div
              className="ps-progress-bar-inner"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* RECEIPT CARD */}
        <div className="ps-receipt-card" ref={receiptRef} id="payment-success-receipt">
          <div className="ps-receipt-watermark">PAID</div>
          <div className="ps-receipt-header">
            <h3 className="ps-receipt-title">
              <FaReceipt className="ps-receipt-title-icon" /> Payment Receipt
            </h3>
            <span className="ps-receipt-number">#{displayReceiptNumber}</span>
          </div>

          <div className="ps-receipt-body">
            {/* STUDENT INFO */}
            <section className="ps-info-section">
              <h4 className="ps-section-heading">
                <FaUserGraduate /> Student Information
              </h4>
              <div className="ps-info-grid">
                <div className="ps-info-item">
                  <span className="ps-info-label">College</span>
                  <span className="ps-info-value">{displayCollegeName}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Student Name</span>
                  <span className="ps-info-value">{displayStudentName}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Enrollment No.</span>
                  <span className="ps-info-value">{displayEnrollment}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Course</span>
                  <span className="ps-info-value">{displayCourse}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Semester</span>
                  <span className="ps-info-value">{displaySemester}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Academic Year</span>
                  <span className="ps-info-value">{displayAcademicYear}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Category</span>
                  <span className="ps-info-value">{displayFeeCategory}</span>
                </div>
              </div>
            </section>

            {/* PAYMENT INFO */}
            <section className="ps-info-section">
              <h4 className="ps-section-heading">
                <FaCreditCard /> Payment Details
              </h4>
              <div className="ps-info-grid">
                <div className="ps-info-item">
                  <span className="ps-info-label">Installment</span>
                  <span className="ps-info-value ps-highlight">{displayInstallmentName}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Amount Paid</span>
                  <span className="ps-info-value ps-amount-highlight">₹{displayAmountPaid.toLocaleString("en-IN")}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Payment Method</span>
                  <span className="ps-info-value">{displayPaymentMethod}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Transaction ID</span>
                  <span className="ps-info-value ps-txn-id">
                    {displayTransactionId}
                    {displayTransactionId !== "N/A" && (
                      <button className="ps-copy-btn" onClick={() => handleCopy(displayTransactionId)} title="Copy Transaction ID" type="button">
                        <FaCopy />
                      </button>
                    )}
                  </span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Payment Date</span>
                  <span className="ps-info-value">{displayPaymentDate}</span>
                </div>
                <div className="ps-info-item">
                  <span className="ps-info-label">Payment Status</span>
                  <span className="ps-badge-success">{displayPaymentStatus}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="ps-actions">
          <button className="ps-btn-outline" onClick={handleBack}>
            <FaArrowLeft /> Back to Fees
          </button>
          <button className="ps-btn-outline" onClick={handleViewReceipt}>
            <FaReceipt /> View Receipt
          </button>
          <button className="ps-btn-outline" onClick={handlePrint}>
            <FaPrint /> Print
          </button>
          <button className="ps-btn-primary" onClick={handleDownloadPDF}>
            <FaDownload /> Download PDF
          </button>
        </div>
      </motion.div>

      {/* STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .ps-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #eef2f7, #d9e2ec);
          padding: 32px 16px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .ps-main-card {
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 820px;
          padding: 40px 36px;
          animation: psFadeIn 0.6s ease-out;
        }

        /* SUCCESS HEADER */
        .ps-success-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .ps-check-circle-wrapper {
          display: inline-block;
          margin-bottom: 16px;
        }
        .ps-check-bg {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(34,197,94,0.25);
        }
        .ps-check-icon {
          font-size: 44px;
          color: #16a34a;
        }
        .ps-success-title {
          font-size: 2rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px;
        }
        .ps-success-subtitle {
          color: #64748b;
          margin: 0 0 20px;
          font-size: 1rem;
        }
        .ps-gateway-badge-wrapper {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ps-gateway-badge, .ps-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .ps-gateway-badge.stripe {
          background: linear-gradient(135deg, #635bff, #7c73ff);
          color: white;
          box-shadow: 0 4px 12px rgba(99,91,255,0.3);
        }
        .ps-gateway-badge.razorpay {
          background: linear-gradient(135deg, #528bff, #3b82f6);
          color: white;
          box-shadow: 0 4px 12px rgba(82,138,255,0.3);
        }
        .ps-status-badge {
          background: #dcfce7;
          color: #16a34a;
          box-shadow: 0 4px 12px rgba(34,197,94,0.2);
        }
        .ps-status-dot {
          font-size: 0.7rem;
        }

        /* SUMMARY GRID */
        .ps-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .ps-summary-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ps-summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
        }
        .ps-summary-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .ps-total .ps-summary-icon-wrap { background: #e0f2fe; color: #0284c7; }
        .ps-paid .ps-summary-icon-wrap { background: #dcfce7; color: #16a34a; }
        .ps-remaining .ps-summary-icon-wrap { background: #fee2e2; color: #dc2626; }
        .ps-summary-content { flex: 1; min-width: 0; }
        .ps-summary-label { display: block; font-size: 0.8rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .ps-summary-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 2px 0 0; }

        /* PROGRESS */
        .ps-progress-section { margin-bottom: 28px; }
        .ps-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ps-progress-label { font-size: 0.9rem; font-weight: 600; color: #334155; }
        .ps-progress-percent { font-size: 0.9rem; font-weight: 700; color: #0f3a4a; }
        .ps-progress-bar-outer { width: 100%; height: 10px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
        .ps-progress-bar-inner { height: 100%; background: linear-gradient(90deg, #0f3a4a, #3db5e6); border-radius: 10px; }

        /* RECEIPT CARD */
        .ps-receipt-card {
          position: relative;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 28px;
          overflow: hidden;
        }
        .ps-receipt-watermark {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 130px;
          font-weight: 900;
          color: rgba(34,197,94,0.04);
          pointer-events: none;
          user-select: none;
        }
        .ps-receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ps-receipt-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f3a4a;
        }
        .ps-receipt-title-icon {
          color: #3db5e6;
        }
        .ps-receipt-number {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          background: #f1f5f9;
          padding: 6px 14px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }
        .ps-receipt-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .ps-info-section { }
        .ps-section-heading {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #0f3a4a;
          margin: 0 0 14px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ps-info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .ps-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 10px;
          gap: 12px;
        }
        .ps-info-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          white-space: nowrap;
        }
        .ps-info-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          text-align: right;
          word-break: break-word;
        }
        .ps-highlight {
          color: #0f3a4a;
          background: #e0f2fe;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .ps-amount-highlight {
          color: #16a34a;
          background: #dcfce7;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .ps-txn-id {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0f3a4a;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.82rem;
        }
        .ps-copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #3db5e6;
          padding: 2px;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          transition: color 0.2s;
        }
        .ps-copy-btn:hover { color: #0f3a4a; }
        .ps-badge-success {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          background: #dcfce7;
          color: #16a34a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ACTIONS */
        .ps-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ps-btn-primary {
          padding: 12px 28px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #0f3a4a, #1a4b6d);
          color: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        .ps-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15,58,74,0.45);
        }
        .ps-btn-outline {
          padding: 12px 22px;
          border-radius: 14px;
          border: 2px solid #cbd5e1;
          background: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          color: #334155;
        }
        .ps-btn-outline:hover {
          border-color: #0f3a4a;
          color: #0f3a4a;
          background: #f8fafc;
        }

        /* ANIMATIONS */
        @keyframes psFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .ps-main-card { padding: 24px 16px; }
          .ps-summary-grid { grid-template-columns: 1fr; }
          .ps-receipt-body { grid-template-columns: 1fr; gap: 20px; }
          .ps-receipt-header { flex-direction: column; }
          .ps-actions { flex-direction: column; align-items: center; }
          .ps-btn-primary, .ps-btn-outline { width: 100%; justify-content: center; max-width: 320px; }
          .ps-success-title { font-size: 1.5rem; }
          .ps-summary-value { font-size: 1.25rem; }
        }
        @media (max-width: 480px) {
          .ps-wrapper { padding: 12px 8px; }
          .ps-main-card { padding: 20px 12px; border-radius: 16px; }
          .ps-summary-card { padding: 14px 16px; }
          .ps-info-item { flex-direction: column; align-items: flex-start; gap: 4px; }
          .ps-info-value { text-align: left; }
        }

        /* PRINT STYLES */
        @media print {
          .ps-actions { display: none !important; }
          .ps-wrapper { background: white; padding: 0; }
          .ps-main-card { box-shadow: none; max-width: 100%; border-radius: 0; }
          .ps-receipt-card { border: 1px solid #ddd; }
        }
      `}</style>
    </div>
  );
}
