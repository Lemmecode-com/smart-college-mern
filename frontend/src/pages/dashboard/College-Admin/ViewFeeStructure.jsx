import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { exportToPDF, exportToExcel } from "../../../utils/exportHelpers";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import {
  FaMoneyBillWave,
  FaLayerGroup,
  FaUsers,
  FaArrowLeft,
  FaDownload,
  FaFilePdf,
  FaFileExcel,
  FaFileCsv
} from "react-icons/fa";

export default function ViewFeeStructure() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();        // ✅ correct param
  const navigate = useNavigate();

  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= LOAD STRUCTURE ================= */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/fees/structure/${id}`);
        setFee(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load fee structure");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ================= EXPORT HANDLERS ================= */
  const handleExport = async (format) => {
    if (!fee) {
      toast.warning('No data to export!');
      return;
    }

    try {
      // Prepare flattened data with installments
      const columns = [
        { header: 'Course', key: 'course' },
        { header: 'Category', key: 'category' },
        { header: 'Installment #', key: 'installmentNum' },
        { header: 'Installment Name', key: 'installmentName' },
        { header: 'Amount (₹)', key: 'amount' },
        { header: 'Due Date', key: 'dueDate' }
      ];

      const rows = fee.installments.map((inst, idx) => ({
        course: fee.course_id?.name || 'N/A',
        category: fee.category || 'N/A',
        installmentNum: idx + 1,
        installmentName: inst.name,
        amount: `₹ ${inst.amount}`,
        dueDate: new Date(inst.dueDate).toLocaleDateString()
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `fee_structure_${fee.course_id?.name?.replace(/\s+/g, '_') || 'unknown'}_${timestamp}`;

      let result;
      switch (format) {
        case 'pdf':
          result = await exportToPDF(
            `Fee Structure: ${fee.course_id?.name || 'Unknown'}`,
            columns,
            rows,
            `${filename}.pdf`
          );
          break;
        case 'excel':
          result = await exportToExcel(
            `Fee Structure: ${fee.course_id?.name || 'Unknown'}`,
            columns,
            rows,
            `${filename}.xlsx`
          );
          break;
        default:
          result = { success: false, message: 'Unknown format' };
      }

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.');
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Fee Structure...</h5>
      </div>
    );
  }

  if (!fee) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="d-flex justify-content-between align-items-center gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <FaMoneyBillWave className="me-2 blink" />
            View Fee Structure
          </h3>
          <p className="opacity-75 mb-0">
            Course-wise & category-based fee plan
          </p>
        </div>

        <div className="d-flex gap-2">
          {/* Export Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-light fw-semibold dropdown-toggle"
              type="button"
              id="exportDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <FaDownload className="me-1" />
              Export
            </button>
            <ul className="dropdown-menu" aria-labelledby="exportDropdown">
              <li>
                <button className="dropdown-item" onClick={() => handleExport('pdf')}>
                  <FaFilePdf className="me-2 text-danger" />
                  PDF
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={() => handleExport('excel')}>
                  <FaFileExcel className="me-2 text-success" />
                  Excel
                </button>
              </li>
            </ul>
          </div>

          <button
            className="btn btn-light fw-semibold"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-1" />
            Back
          </button>
        </div>
      </div>

      {/* ================= CARD ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          {/* BASIC INFO */}
          <div className="row g-3 mb-4">
            <Info
              icon={<FaLayerGroup />}
              label="Course"
              value={fee.course_id?.name}
            />
            <Info
              icon={<FaUsers />}
              label="Category"
              value={fee.category}
            />
            <Info
              icon={<FaMoneyBillWave />}
              label="Total Fee"
              value={`₹ ${fee.totalFee}`}
            />
          </div>

          <hr />

          {/* INSTALLMENTS */}
          <h5 className="fw-bold mb-3">Installments</h5>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Installment</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {fee.installments.map((i, index) => (
                  <tr key={i._id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold">{i.name}</td>
                    <td>₹ {i.amount}</td>
                    <td>
                      {new Date(i.dueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

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
        `}
      </style>

    </div>
  );
}

/* ================= INFO BOX ================= */
function Info({ label, value, icon }) {
  return (
    <div className="col-md-4">
      <div className="p-3 border rounded-3 text-center bg-light">
        <div className="fs-4 text-primary mb-1">{icon}</div>
        <div className="text-muted small">{label}</div>
        <div className="fw-bold">{value || "-"}</div>
      </div>
    </div>
  );
}
