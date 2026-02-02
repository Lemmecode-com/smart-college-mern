import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaMoneyBillWave,
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaReceipt,
  FaUniversity
} from "react-icons/fa";

export default function MakePayments() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [installmentName, setInstallmentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= SUBMIT PAYMENT ================= */
  const handlePay = async () => {
    if (!installmentName.trim()) {
      toast.warning("Please enter installment name");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const res = await api.post(
        "/student/payments/mock-success",
        { installmentName }
      );

      setResult(res.data);
      toast.success("🎉 Payment successful!");
      setInstallmentName("");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
        "Mock payment failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 fade-in">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">
            <FaMoneyBillWave className="me-2 blink" />
            Make Mock Payment
          </h4>
          <p className="opacity-75 mb-0">
            Test your installment payment flow
          </p>
        </div>

        <button
          className="btn btn-light"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft className="me-1" />
          Back
        </button>
      </div>

      {/* ================= FORM ================= */}
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-8 col-sm-12">
          <div className="card shadow-lg border-0 rounded-4 glass-card">
            <div className="card-body p-4 text-center">

              <h5 className="fw-bold mb-3">
                Enter Installment Name
              </h5>

              <input
                type="text"
                className="form-control mb-3"
                placeholder="e.g. Installment 2"
                value={installmentName}
                onChange={(e) =>
                  setInstallmentName(e.target.value)
                }
              />

              <button
                className="btn btn-success w-100 py-2 rounded-pill"
                onClick={handlePay}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="me-2 spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaMoneyBillWave className="me-2" />
                    Pay Now
                  </>
                )}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* ================= RESULT ================= */}
      {result && result.installment && (
        <div className="row justify-content-center mt-4 slide-up">
          <div className="col-lg-7 col-md-9">
            <div className="card border-0 shadow rounded-4">
              <div className="card-body text-center">
                <FaCheckCircle size={40} className="text-success mb-2" />
                <h5 className="fw-bold">Payment Successful</h5>

                <p className="mb-1">
                  <strong>Installment:</strong> {result.installment.name}
                </p>
                <p className="mb-1">
                  <strong>Amount:</strong> ₹{result.installment.amount}
                </p>
                <p className="mb-1">
                  <strong>Status:</strong> {result.installment.status}
                </p>
                <p className="mb-2">
                  <strong>Paid At:</strong>{" "}
                  {new Date(result.installment.paidAt).toLocaleString()}
                </p>

                <hr />

                {/* TOTALS */}
                <div className="row text-center">
                  <div className="col-4">
                    <FaUniversity className="text-primary" />
                    <p className="mb-0 fw-bold">₹{result.totalFee}</p>
                    <small>Total</small>
                  </div>
                  <div className="col-4">
                    <FaCheckCircle className="text-success" />
                    <p className="mb-0 fw-bold">₹{result.paidAmount}</p>
                    <small>Paid</small>
                  </div>
                  <div className="col-4">
                    <FaMoneyBillWave className="text-danger" />
                    <p className="mb-0 fw-bold">₹{result.remainingAmount}</p>
                    <small>Remaining</small>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() =>
                      navigate(`/student/fee-receipt/${result.installment._id}`)
                    }
                  >
                    <FaReceipt className="me-1" />
                    View Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
        }
        .fade-in { animation: fade 0.6s; }
        .slide-up { animation: slideUp 0.6s; }
        .blink { animation: blink 1.5s infinite; }
        .spin { animation: spin 1s linear infinite; }

        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity:0 }
          to { transform: translateY(0); opacity:1 }
        }
        @keyframes blink {
          50% { opacity: 0.4 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  );
}
