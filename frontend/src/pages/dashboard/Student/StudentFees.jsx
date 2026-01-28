import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaSpinner,
  FaUserGraduate
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= STATIC DATA (BACKEND READY) =================
     ⚠️ These values will come from backend later
  */
  const feeDetails = {
    studentName: user.name || "Student",
    courseName: "Bachelor of Arts",
    academicYear: "2024 - 2025",

    totalFees: 2500,
    paidFees: 0,
    pendingFees: 2500,

    courseId: "TEMP_COURSE_ID", // backend requires this
    caste: "OPEN"               // backend requires this
  };

  /* ================= INITIATE PAYMENT ================= */
  const handlePayment = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/payment/initiate", {
        courseId: feeDetails.courseId,
        caste: feeDetails.caste
      });

      const { orderId, amount, currency, keyId } = res.data;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency,
        order_id: orderId,
        name: "Smart College ERP",
        description: "College Fees Payment",
        handler: function () {
          setSuccess("🎉 Payment successful! Receipt will be available soon.");
        },
        theme: { color: "#0f3a4a" }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        "Unable to initiate payment"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaMoneyCheckAlt className="me-2" />
          Student Fees
        </h3>
        <p className="opacity-75 mb-0">
          View & pay your academic fees
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ================= STUDENT INFO ================= */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaUserGraduate className="me-2" />
            Student Information
          </h5>

          <div className="row">
            <Info label="Student Name" value={feeDetails.studentName} />
            <Info label="Course" value={feeDetails.courseName} />
            <Info label="Academic Year" value={feeDetails.academicYear} />
          </div>
        </div>
      </div>

      {/* ================= FEES SUMMARY ================= */}
      <div className="row mb-4">
        <FeeCard
          title="Total Fees"
          amount={feeDetails.totalFees}
          icon={<FaUniversity />}
          color="primary"
        />
        <FeeCard
          title="Paid"
          amount={feeDetails.paidFees}
          icon={<FaCheckCircle />}
          color="success"
        />
        <FeeCard
          title="Pending"
          amount={feeDetails.pendingFees}
          icon={<FaTimesCircle />}
          color="danger"
        />
      </div>

      {/* ================= PAYMENT ================= */}
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-body text-center">
          <button
            className="btn btn-success btn-lg px-5"
            onClick={handlePayment}
            disabled={loading || feeDetails.pendingFees === 0}
          >
            {loading ? (
              <>
                <FaSpinner className="me-2 spin" />
                Processing...
              </>
            ) : (
              <>
                <FaCreditCard className="me-2" />
                Pay Now
              </>
            )}
          </button>

          {feeDetails.pendingFees === 0 && (
            <p className="text-success mt-3">
              <FaCheckCircle className="me-1" />
              Fees fully paid
            </p>
          )}
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
          .gradient-header {
            background: linear-gradient(180deg, #0f3a4a, #134952);
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function FeeCard({ title, amount, icon, color }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="card shadow-sm border-0 rounded-4 text-center">
        <div className="card-body">
          <div className={`fs-2 text-${color} mb-2`}>
            {icon}
          </div>
          <h6 className="text-muted">{title}</h6>
          <h3 className="fw-bold">₹ {amount}</h3>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="col-md-4 mb-2">
      <strong>{label}:</strong>
      <br />
      {value || "N/A"}
    </div>
  );
}
