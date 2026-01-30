import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaMoneyBillWave,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus
} from "react-icons/fa";

export default function FeeStructureList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH ================= */
  const loadStructures = async () => {
    try {
      const res = await api.get("/fee-structures");
      setStructures(res.data || []);
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this fee structure?"
    );
    if (!confirm) return;

    try {
      await api.delete(`/fee-structures/${id}`);
      loadStructures();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Fee Structures...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <FaMoneyBillWave className="me-2 blink" />
            Fee Structures
          </h3>
          <p className="opacity-75 mb-0">
            Manage course-wise & category-based fees
          </p>
        </div>

        <button
          className="btn btn-light fw-semibold"
          onClick={() => navigate("/fees/create")}
        >
          <FaPlus className="me-2" />
          Create Structure
        </button>
      </div>

      {/* TABLE */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body table-responsive">

          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Course</th>
                <th>Category</th>
                <th>Total Fee</th>
                <th>Installments</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {structures.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No fee structures found
                  </td>
                </tr>
              )}

              {structures.map((f, i) => (
                <tr key={f._id}>
                  <td>{i + 1}</td>
                  <td className="fw-semibold">
                    {f.course_id?.name}
                  </td>
                  <td>{f.category}</td>
                  <td>₹ {f.totalFee}</td>
                  <td>{f.installments.length}</td>
                  <td className="text-center">

                    <button
                      className="btn btn-sm btn-info me-2"
                      onClick={() => setViewData(f)}
                    >
                      <FaEye />
                    </button>

                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() =>
                        navigate(`/fees/edit/${f._id}`)
                      }
                    >
                      <FaEdit />
                    </button>

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(f._id)}
                    >
                      <FaTrash />
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      {/* ================= VIEW MODAL ================= */}
      {viewData && (
        <div className="modal-backdrop-custom">
          <div className="modal-card">

            <h4 className="fw-bold mb-3">
              {viewData.course_id?.name} ({viewData.category})
            </h4>

            <p>
              <strong>Total Fee:</strong> ₹ {viewData.totalFee}
            </p>

            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {viewData.installments.map((i) => (
                  <tr key={i._id}>
                    <td>{i.name}</td>
                    <td>₹ {i.amount}</td>
                    <td>
                      {new Date(i.dueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="btn btn-secondary w-100"
              onClick={() => setViewData(null)}
            >
              Close
            </button>

          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(10px);
        }
        .blink {
          animation: blink 1.5s infinite;
        }
        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
        .modal-backdrop-custom {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 100vw;
          background: rgba(0,0,0,0.4);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }
        .modal-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          width: 450px;
          max-width: 95%;
        }
        `}
      </style>

    </div>
  );
}
