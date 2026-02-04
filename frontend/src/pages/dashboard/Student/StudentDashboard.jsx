import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaUserGraduate,
  FaClipboardList,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

export default function StudentDashboard() {
  // ✅ Safe defaults (no null crash)
  const [attendance, setAttendance] = useState({
    total: 0,
    present: 0,
    absent: 0
  });

  const [fees, setFees] = useState({
    totalFee: 0,
    paid: 0,
    due: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FETCH DASHBOARD ================= */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard/student");

        setAttendance(res.data.attendanceSummary || {
          total: 0,
          present: 0,
          absent: 0
        });

        setFees(res.data.feeSummary || {
          totalFee: 0,
          paid: 0,
          due: 0
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <h6 className="text-muted">Loading dashboard...</h6>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h4 className="fw-bold mb-1">
          <FaUserGraduate className="me-2" /> Student Dashboard
        </h4>
        <p className="opacity-75 mb-0">
          Attendance & Fee Overview
        </p>
      </div>

      <div className="row g-4">
        {/* ================= ATTENDANCE ================= */}
        <div className="col-md-6">
          <div className="card shadow border-0 rounded-4 glass-card h-100">
            <div className="card-body p-4 text-center">
              <h5 className="fw-bold mb-3">
                <FaClipboardList className="me-2 text-primary" />
                Attendance Summary
              </h5>

              <div className="row">
                <div className="col-4">
                  <h6 className="text-muted">Total</h6>
                  <h4 className="fw-bold">{attendance.total}</h4>
                </div>
                <div className="col-4">
                  <h6 className="text-success">
                    <FaCheckCircle className="me-1" />
                    Present
                  </h6>
                  <h4 className="fw-bold text-success">
                    {attendance.present}
                  </h4>
                </div>
                <div className="col-4">
                  <h6 className="text-danger">
                    <FaTimesCircle className="me-1" />
                    Absent
                  </h6>
                  <h4 className="fw-bold text-danger">
                    {attendance.absent}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= FEES ================= */}
        <div className="col-md-6">
          <div className="card shadow border-0 rounded-4 glass-card h-100">
            <div className="card-body p-4 text-center">
              <h5 className="fw-bold mb-3">
                <FaMoneyBillWave className="me-2 text-success" />
                Fee Summary
              </h5>

              <div className="row">
                <div className="col-4">
                  <h6 className="text-muted">Total</h6>
                  <h4 className="fw-bold">
                    ₹ {fees.totalFee.toLocaleString()}
                  </h4>
                </div>
                <div className="col-4">
                  <h6 className="text-success">Paid</h6>
                  <h4 className="fw-bold text-success">
                    ₹ {fees.paid.toLocaleString()}
                  </h4>
                </div>
                <div className="col-4">
                  <h6 className="text-danger">Due</h6>
                  <h4 className="fw-bold text-danger">
                    ₹ {fees.due.toLocaleString()}
                  </h4>
                </div>
              </div>

              {fees.due > 0 && (
                <button
                  className="btn btn-danger mt-4 rounded-pill"
                  onClick={() =>
                    (window.location.href = "/student/make-payment")
                  }
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}
