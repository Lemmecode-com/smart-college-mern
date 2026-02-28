import { useContext, useEffect, useRef, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaReceipt,
  FaCheckCircle,
  FaDownload,
  FaPrint,
  FaUniversity,
  FaCreditCard,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSync,
  FaArrowLeft,
  FaSpinner
} from "react-icons/fa";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function FeeReceipt() {
  const { user } = useContext(AuthContext);
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const receiptRef = useRef();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= VALIDATION HELPER ================= */
  const validateReceiptData = (data) => {
    const errors = [];
    
    if (!data) {
      errors.push("Receipt data is missing");
    } else {
      if (!data.college?.name) errors.push("College name is missing");
      if (!data.student?.name) errors.push("Student name is missing");
      if (!data.installmentName) errors.push("Installment name is missing");
      if (!data.amount) errors.push("Payment amount is missing");
      if (!data.transactionId) errors.push("Transaction ID is missing");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /* ================= FETCH RECEIPT ================= */
  useEffect(() => {
    const fetchReceipt = async () => {
      const toastId = toast.loading("Loading receipt...");
      
      try {
        // Validate paymentId
        if (!paymentId) {
          throw new Error("Payment ID is required");
        }

        const res = await api.get(`/student/payments/receipt/${paymentId}`);
        
        // Validate response structure
        if (!res.data) {
          throw new Error("Invalid response from server");
        }

        // Validate receipt data
        const validation = validateReceiptData(res.data);
        if (!validation.isValid) {
          throw new Error(`Invalid receipt data: ${validation.errors.join(', ')}`);
        }

        setReceipt(res.data);
        setError(null);

        toast.update(toastId, {
          render: "Receipt loaded successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000
        });

      } catch (err) {
        console.error("Fetch receipt error:", err);
        
        let errorMessage = "Unable to fetch receipt. ";
        
        if (err.response?.status === 404) {
          errorMessage = "Receipt not found. It may have been deleted or never existed.";
        } else if (err.response?.status === 403) {
          errorMessage = "You don't have permission to view this receipt.";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (err.response?.status === 401) {
          errorMessage = "Session expired. Please login again.";
          setTimeout(() => navigate("/login"), 2000);
        } else if (err.message) {
          errorMessage += err.message;
        } else {
          errorMessage += "Please check your connection and try again.";
        }

        setError(errorMessage);

        toast.update(toastId, {
          render: errorMessage,
          type: "error",
          isLoading: false,
          autoClose: 5000
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [paymentId, navigate]);

  /* ================= PDF DOWNLOAD ================= */
  const downloadPDF = async () => {
    const toastId = toast.loading("Generating PDF...");
    
    try {
      // Step 1: Validate receipt element
      if (!receiptRef.current) {
        throw new Error("Receipt element not found");
      }

      // Step 2: Generate canvas with timeout
      const canvas = await Promise.race([
        html2canvas(receiptRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Ensure all images are loaded
            const images = clonedDoc.getElementsByTagName('img');
            return Promise.all(
              Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = () => {
                    console.warn('Image failed to load:', img.src);
                    resolve(); // Continue even if image fails
                  };
                });
              })
            );
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Canvas generation timeout")), 30000)
        )
      ]);

      // Step 3: Validate canvas
      if (!canvas || !canvas.toDataURL) {
        throw new Error("Canvas generation failed");
      }

      const imgData = canvas.toDataURL("image/png");

      // Step 4: Generate PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Step 5: Add image to PDF with error handling
      try {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      } catch (pdfError) {
        console.error("PDF addImage error:", pdfError);
        throw new Error("Failed to add receipt to PDF");
      }

      // Step 6: Save PDF
      const fileName = `Fee_Receipt_${receipt.transactionId || 'unknown'}.pdf`;
      pdf.save(fileName);

      toast.update(toastId, {
        render: "PDF downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });

    } catch (error) {
      console.error("PDF Generation Error:", error);
      
      let errorMessage = "Failed to generate PDF. ";
      
      if (error.message.includes("timeout")) {
        errorMessage += "Operation timed out. Please try again.";
      } else if (error.message.includes("CORS") || error.message.includes("taint")) {
        errorMessage += "Image loading failed. Please ensure all images are accessible.";
      } else if (error.message.includes("Canvas")) {
        errorMessage += "Browser compatibility issue. Please try Chrome or Firefox.";
      } else if (error.message.includes("element")) {
        errorMessage += "Receipt not ready. Please wait a moment and try again.";
      } else {
        errorMessage += "Please check your connection and try again.";
      }

      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000
      });

      // Log error for monitoring
      logErrorToMonitoring(error, {
        component: 'FeeReceipt',
        action: 'downloadPDF',
        receiptId: receipt?._id
      });
    }
  };

  // Helper function for error logging
  const logErrorToMonitoring = (error, context) => {
    // TODO: Integrate with Sentry/monitoring service
    console.error('[FeeReceipt Error]', {
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString()
    });
  };

  if (loading) {
    return (
      <div className="receipt-loading">
        <ToastContainer position="top-right" />
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="spin-icon" />
          <h3>Loading Receipt...</h3>
          <p>Fetching your payment details</p>
          <div className="loading-progress-bar">
            <div className="loading-progress"></div>
          </div>
        </motion.div>
        <style>{`
          .receipt-loading {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
          }
          .loading-content {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .spin-icon {
            font-size: 4rem;
            color: #1a4b6d;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
          }
          .loading-content h3 {
            margin: 0 0 0.5rem 0;
            color: #1e293b;
            font-weight: 700;
          }
          .loading-content p {
            color: #64748b;
            margin: 0 0 1.5rem 0;
          }
          .loading-progress-bar {
            width: 200px;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 0 auto;
            overflow: hidden;
          }
          .loading-progress {
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #1a4b6d, #2d6f8f);
            animation: loading 1.5s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="receipt-error-wrapper">
        <ToastContainer position="top-right" />
        <motion.div
          className="error-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="error-icon-wrapper">
            <FaExclamationTriangle className="error-icon" />
          </div>
          <h3 className="error-title">Unable to Load Receipt</h3>
          <p className="error-message">{error}</p>
          
          <div className="error-actions">
            <button 
              className="btn-retry"
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
            >
              <FaSync /> Try Again
            </button>
            
            <button 
              className="btn-back"
              onClick={() => navigate("/student/fees")}
            >
              <FaArrowLeft /> Back to Fees
            </button>
          </div>

          <div className="error-help">
            <FaInfoCircle className="help-icon" />
            <p>If the problem persists, please contact support with your transaction ID.</p>
          </div>
        </motion.div>

        <style>{`
          .receipt-error-wrapper {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            padding: 20px;
          }
          .error-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 15px 40px rgba(220, 53, 69, 0.2);
            width: 100%;
            max-width: 500px;
            text-align: center;
          }
          .error-icon-wrapper {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .error-icon {
            font-size: 40px;
            color: #dc3545;
          }
          .error-title {
            margin: 0 0 10px 0;
            color: #dc3545;
            font-weight: 700;
          }
          .error-message {
            color: #6b7280;
            margin: 0 0 25px 0;
            line-height: 1.6;
          }
          .error-actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }
          .btn-retry {
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
          .btn-retry:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(15, 58, 74, 0.4);
          }
          .btn-back {
            padding: 12px 24px;
            border-radius: 10px;
            border: 2px solid #0f3a4a;
            background: white;
            color: #0f3a4a;
            cursor: pointer;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
          }
          .btn-back:hover {
            background: #0f3a4a;
            color: white;
          }
          .error-help {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            text-align: left;
            font-size: 0.9rem;
            color: #0369a1;
          }
          .help-icon {
            font-size: 1.2rem;
            flex-shrink: 0;
          }
        `}</style>
      </div>
    );
  }

  /* ================= EMPTY STATE ================= */
  if (!receipt) {
    return (
      <div className="receipt-empty-wrapper">
        <motion.div
          className="empty-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaReceipt className="empty-icon" />
          <h3>Receipt Not Found</h3>
          <p>The receipt you're looking for doesn't exist or has been removed.</p>
          <button 
            className="btn-back"
            onClick={() => navigate("/student/fees")}
          >
            <FaArrowLeft /> Back to Fees
          </button>
        </motion.div>
        <style>{`
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
        `}</style>
      </div>
    );
  }

  return (
    <div className="container py-4" role="main">
      <ToastContainer position="top-right" />

      {/* Skip Link for Screen Readers */}
      <a href="#receipt-content" className="sr-only sr-only-focusable">
        Skip to receipt content
      </a>

      <div className="text-center mb-4" role="banner">
        <h3 className="fw-bold">
          <FaReceipt className="me-2 text-primary" aria-hidden="true" />
          Fee Payment Receipt
        </h3>
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
            {receipt.college?.name || 'College Name Not Available'}
          </h4>
          <address className="small text-muted">
            {receipt.college?.address || 'Address Not Available'}
          </address>
          <div className="small">
            {receipt.college?.email && (
              <a href={`mailto:${receipt.college.email}`} aria-label={`Email: ${receipt.college.email}`}>
                {receipt.college.email}
              </a>
            )}
            {receipt.college?.email && receipt.college?.contact && ' | '}
            {receipt.college?.contact && (
              <a href={`tel:${receipt.college.contact}`} aria-label={`Phone: ${receipt.college.contact}`}>
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
            Receipt No: <strong>{receipt.transactionId}</strong>
          </div>
        </section>

        {/* DETAILS GRID */}
        <div className="row g-4">
          {/* Student Details */}
          <section className="col-md-6" aria-label="Student details">
            <h6 className="section-title">Student Details</h6>
            <Info label="Name" value={receipt.student?.name} />
            <Info label="Course" value={receipt.student?.course} />
            <Info label="Department" value={receipt.student?.department} />
            <Info label="Academic Year" value={receipt.student?.academicYear} />
          </section>

          {/* Payment Details */}
          <section className="col-md-6" aria-label="Payment details">
            <h6 className="section-title">Payment Details</h6>
            <Info label="Installment" value={receipt.installmentName} />
            <Info label="Amount" value={`₹ ${receipt.amount?.toLocaleString()}`} />
            <Info label="Payment Method" value="Stripe (Card)" />
            <Info
              label="Paid On"
              value={new Date(receipt.paidAt).toLocaleString("en-IN")}
            />
            <Info label="Status" value={receipt.status} />
          </section>
        </div>

        <hr />

        <p className="text-center small text-muted mt-4">
          This is a system-generated receipt. No signature required.
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <nav className="d-flex justify-content-center gap-3 mt-4 no-print" aria-label="Receipt actions">
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

      {/* Screen Reader Only Styles */}
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
        .receipt-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .section-title {
          font-weight: 700;
          margin-bottom: 12px;
          color: #1a4b6d;
        }

        .info-row {
          margin-bottom: 10px;
        }

        .watermark {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(0, 128, 0, 0.05);
          pointer-events: none;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
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
