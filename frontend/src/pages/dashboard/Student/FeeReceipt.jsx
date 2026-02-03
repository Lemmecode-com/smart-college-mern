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
  FaPrint
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
        const res = await api.get(`/payments/${paymentId}`);
        setReceipt(res.data);
        toast.success("Receipt loaded successfully");
      } catch {
        toast.warning("API not ready. Showing demo receipt.");

        setReceipt({
          receiptNo: paymentId,
          status: "SUCCESS",
          amount: 25000,
          paymentMethod: "PhonePe",
          paymentDate: new Date(),

          student: {
            name: user.name,
            email: user.email,
            enrollment: "STU-2025-001",
            department: "Bachelor Of Arts",
            course: "Ancient History",
            academicYear: "2024-25"
          },

          college: {
            name: "NCK College",
            address: "Kolhapur, Maharashtra",
            email: "nck@gmail.com",
            contact: "9090909090"
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [paymentId]);

  /* ================= PDF ================= */
  const downloadPDF = async () => {
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const width = 210;
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`Fee_Receipt_${paymentId}.pdf`);

      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Loading receipt...</div>;
  }

  if (!receipt) {
    return <div className="alert alert-danger text-center">Receipt not found</div>;
  }

  return (
    <div className="container py-4">
      <ToastContainer position="top-right" />

      {/* HEADER */}
      <div className="text-center mb-4">
        <h3 className="fw-bold">
          <FaReceipt className="me-2 blink" />
          Fee Payment Receipt
        </h3>
      </div>

      {/* RECEIPT */}
      <div ref={receiptRef} className="card shadow p-4 rounded-4">
        <div className="text-center mb-3">
          <h4 className="fw-bold">{receipt.college.name}</h4>
          <p className="mb-0">{receipt.college.address}</p>
          <p className="small">{receipt.college.email} | {receipt.college.contact}</p>
        </div>

        <hr />

        <div className="text-center mb-3">
          <FaCheckCircle className="text-success fs-2" />
          <h5 className="text-success fw-bold">Payment Successful</h5>
          <p>Receipt No: <strong>{receipt.receiptNo}</strong></p>
        </div>

        <Section title="Student Details">
          <Info label="Name" value={receipt.student.name} />
          <Info label="Email" value={receipt.student.email} />
          <Info label="Enrollment" value={receipt.student.enrollment} />
          <Info label="Department" value={receipt.student.department} />
          <Info label="Course" value={receipt.student.course} />
          <Info label="Academic Year" value={receipt.student.academicYear} />
        </Section>

        <Section title="Payment Details">
          <Info label="Amount" value={`₹ ${receipt.amount}`} />
          <Info label="Method" value={receipt.paymentMethod} />
          <Info label="Date" value={new Date(receipt.paymentDate).toLocaleDateString()} />
          <Info label="Status" value={receipt.status} />
        </Section>

        <p className="text-center mt-4 small text-muted">
          This is a system generated receipt.
        </p>
      </div>

      {/* ACTIONS */}
      <div className="d-flex justify-content-center gap-3 mt-4">
        <button className="btn btn-outline-primary" onClick={() => window.print()}>
          <FaPrint /> Print
        </button>
        <button className="btn btn-success" onClick={downloadPDF}>
          <FaDownload /> Download PDF
        </button>
      </div>

      <style>{`
        .blink { animation: blink 1.5s infinite; }
        @keyframes blink { 50% { opacity: 0.4; } }

        @media print {
          button { display: none; }
        }
      `}</style>
    </div>
  );
}

/* ===== Helpers ===== */
function Section({ title, children }) {
  return (
    <>
      <h6 className="fw-bold mt-3">{title}</h6>
      <div className="row">{children}</div>
      <hr />
    </>
  );
}

function Info({ label, value }) {
  return (
    <div className="col-md-6 mb-2">
      <strong>{label}:</strong><br />
      {value || "N/A"}
    </div>
  );
}
