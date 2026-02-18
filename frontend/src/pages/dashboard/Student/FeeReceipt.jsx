import { useContext, useEffect, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast, ToastContainer } from "react-toastify";

import {
  FaReceipt,
  FaCheckCircle,
  FaDownload,
  FaPrint,
  FaUniversity,
  FaCreditCard
} from "react-icons/fa";

export default function FeeReceipt() {
  const { user } = useContext(AuthContext);
  const { paymentId } = useParams();
  const receiptRef = useRef();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH RECEIPT ================= */
  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await api.get(`/student/payments/receipt/${paymentId}`);
        setReceipt(res.data);
      } catch (err) {
        toast.error("Unable to fetch receipt");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [paymentId]);

  /* ================= PDF DOWNLOAD ================= */
  const downloadPDF = async () => {
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight =
        (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Fee_Receipt_${receipt.transactionId}.pdf`);

      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (!receipt) return <div className="alert alert-danger">Receipt not found</div>;

  return (
    <div className="container py-4">
      <ToastContainer position="top-right" />

      <div className="text-center mb-4">
        <h3 className="fw-bold">
          <FaReceipt className="me-2 text-primary" />
          Fee Payment Receipt
        </h3>
      </div>

      {/* RECEIPT CARD */}
      <div ref={receiptRef} className="receipt-card position-relative">

        {/* WATERMARK */}
        <div className="watermark">PAID</div>

        {/* HEADER */}
        <div className="text-center mb-4">
          <h4 className="fw-bold">
            <FaUniversity className="me-2" />
            {receipt.college?.name}
          </h4>
          <div className="small text-muted">
            {receipt.college?.address}
          </div>
          <div className="small">
            {receipt.college?.email} | {receipt.college?.contact}
          </div>
        </div>

        <hr />

        {/* STATUS */}
        <div className="text-center mb-4">
          <FaCheckCircle className="text-success display-5 mb-2" />
          <h5 className="text-success fw-bold">Payment Successful</h5>
          <div className="small text-muted">
            Receipt No: <strong>{receipt.transactionId}</strong>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="row g-4">

          <div className="col-md-6">
            <h6 className="section-title">Student Details</h6>
            <Info label="Name" value={receipt.student?.name} />
            <Info label="Course" value={receipt.student?.course} />
            <Info label="Department" value={receipt.student?.department} />
            <Info label="Academic Year" value={receipt.student?.academicYear} />
          </div>

          <div className="col-md-6">
            <h6 className="section-title">Payment Details</h6>
            <Info label="Installment" value={receipt.installmentName} />
            <Info label="Amount" value={`₹ ${receipt.amount?.toLocaleString()}`} />
            <Info label="Payment Method" value="Stripe (Card)" />
            <Info
              label="Paid On"
              value={new Date(receipt.paidAt).toLocaleString("en-IN")}
            />
            <Info label="Status" value={receipt.status} />
          </div>
        </div>

        <hr />

        <p className="text-center small text-muted mt-4">
          This is a system-generated receipt. No signature required.
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="d-flex justify-content-center gap-3 mt-4 no-print">
        <button className="btn btn-outline-primary" onClick={() => window.print()}>
          <FaPrint className="me-1" /> Print
        </button>

        <button className="btn btn-success" onClick={downloadPDF}>
          <FaDownload className="me-1" /> Download PDF
        </button>
      </div>

      {/* STYLES */}
      <style>{`
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
