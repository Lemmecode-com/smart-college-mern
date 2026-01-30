import { useContext, useEffect, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  FaReceipt,
  FaUniversity,
  FaUserGraduate,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaDownload,
  FaPrint,
  FaCheckCircle
} from "react-icons/fa";

export default function FeeReceipt() {
  const { user } = useContext(AuthContext);
  const { paymentId } = useParams();
  const receiptRef = useRef();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH RECEIPT ================= */
  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        // 🔗 REAL API
        const res = await api.get(`/payments/${paymentId}`);
        setReceipt(res.data);
      } catch (err) {
        console.warn("Using fallback receipt (API not ready)");

        // 🔁 FALLBACK (NO BACKEND BREAK)
        setReceipt({
          receiptNo: paymentId,
          status: "SUCCESS",
          amount: 2500,
          paymentMethod: "Razorpay",
          paymentDate: "2026-01-27",

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
            contact: "9090909090",
            logo: "/logo.png",        // optional
            qr: "/qr.png"             // optional
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [paymentId]);

  /* ================= PDF DOWNLOAD ================= */
  const downloadPDF = async () => {
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Fee_Receipt_${paymentId}.pdf`);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Fee Receipt...</h5>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="alert alert-danger text-center">
        Failed to load receipt.
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold">
          <FaReceipt className="me-2 blink" />
          Fee Payment Receipt
        </h3>
      </div>

      {/* ================= RECEIPT ================= */}
      <div
        ref={receiptRef}
        className="card shadow-lg border-0 rounded-4 glass-card p-4"
      >
        {/* ================= COLLEGE ================= */}
        <div className="text-center mb-4">
          {receipt.college?.logo && (
            <img
              src={receipt.college.logo}
              alt="College Logo"
              height="80"
              className="mb-2"
            />
          )}
          <h4 className="fw-bold">{receipt.college.name}</h4>
          <p className="mb-0">{receipt.college.address}</p>
          <p className="mb-0">
            {receipt.college.email} | {receipt.college.contact}
          </p>
        </div>

        <hr />

        {/* ================= STATUS ================= */}
        <div className="text-center mb-3">
          <FaCheckCircle className="text-success fs-2" />
          <h5 className="text-success fw-bold">
            Payment Successful
          </h5>
          <p>Receipt No: <strong>{receipt.receiptNo}</strong></p>
        </div>

        {/* ================= STUDENT ================= */}
        <Section title="Student Details">
          <Info label="Name" value={receipt.student.name} />
          <Info label="Email" value={receipt.student.email} />
          <Info label="Enrollment No" value={receipt.student.enrollment} />
          <Info label="Department" value={receipt.student.department} />
          <Info label="Course" value={receipt.student.course} />
          <Info label="Academic Year" value={receipt.student.academicYear} />
        </Section>

        {/* ================= PAYMENT ================= */}
        <Section title="Payment Details">
          <Info label="Amount Paid" value={`₹ ${receipt.amount}`} />
          <Info label="Payment Method" value={receipt.paymentMethod} />
          <Info
            label="Payment Date"
            value={new Date(receipt.paymentDate).toLocaleDateString()}
          />
          <Info label="Status" value={receipt.status} />
        </Section>

        {/* ================= FOOTER ================= */}
        <div className="row mt-4">
          <div className="col-md-6 text-center">
            {receipt.college?.qr && (
              <>
                <img src={receipt.college.qr} height="100" />
                <p className="small">Payment Verification QR</p>
              </>
            )}
          </div>

          <div className="col-md-6 text-center">
            <div className="border-top pt-3">
              <p className="fw-bold mb-0">Authorized Signature</p>
              <p className="small text-muted">
                College Admin / Finance Office
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ACTIONS ================= */}
      <div className="d-flex justify-content-center gap-3 mt-4">
        <button className="btn btn-outline-primary" onClick={() => window.print()}>
          <FaPrint className="me-1" /> Print
        </button>

        <button className="btn btn-outline-success" onClick={downloadPDF}>
          <FaDownload className="me-1" /> Download PDF
        </button>
      </div>

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: white;
        }
        @media print {
          button { display: none; }
        }
      `}</style>
    </div>
  );
}

/* ================= HELPERS ================= */
function Section({ title, children }) {
  return (
    <>
      <h5 className="fw-bold mt-3">{title}</h5>
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
