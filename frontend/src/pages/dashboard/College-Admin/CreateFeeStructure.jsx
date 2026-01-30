import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaMoneyBillWave,
  FaLayerGroup,
  FaUsers,
  FaPlus,
  FaTrash,
  FaSave,
  FaUniversity
} from "react-icons/fa";

export default function CreateFeeStructure() {
  const { user } = useContext(AuthContext);

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [department_id, setDepartmentId] = useState("");
  const [course_id, setCourseId] = useState("");
  const [category, setCategory] = useState("");
  const [totalFee, setTotalFee] = useState("");

  const [installments, setInstallments] = useState([
    { name: "", amount: "", dueDate: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data || []);
      } catch {
        setDepartments([]);
      }
    };
    loadDepartments();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  const loadCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch {
      setCourses([]);
    }
  };

  /* ================= INSTALLMENTS ================= */
  const addInstallment = () => {
    setInstallments([...installments, { name: "", amount: "", dueDate: "" }]);
  };

  const removeInstallment = (index) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleInstallmentChange = (index, field, value) => {
    const updated = [...installments];
    updated[index][field] = value;
    setInstallments(updated);
  };

  /* ================= TOTAL CHECK ================= */
  const installmentSum = installments.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!department_id || !course_id || !category || !totalFee) {
      setError("All fields are required");
      return;
    }

    if (installmentSum !== Number(totalFee)) {
      setError("Installments total must equal Total Fee");
      return;
    }

    try {
      setLoading(true);

      await api.post("/fees/structure", {
        course_id,
        category,
        totalFee: Number(totalFee),
        installments: installments.map((i) => ({
          name: i.name,
          amount: Number(i.amount),
          dueDate: i.dueDate
        }))
      });

      setSuccess("Fee structure created successfully");
      setDepartmentId("");
      setCourseId("");
      setCategory("");
      setTotalFee("");
      setInstallments([{ name: "", amount: "", dueDate: "" }]);
      setCourses([]);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to create structure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaMoneyBillWave className="me-2 blink" />
          Create Fee Structure
        </h3>
        <p className="opacity-75 mb-0">
          Configure course-wise & category-based fee system
        </p>
      </div>

      {error && <div className="alert alert-danger text-center">{error}</div>}
      {success && <div className="alert alert-success text-center">{success}</div>}

      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          {/* BASIC INFO */}
          <div className="row g-3 mb-4">

            <div className="col-md-4">
              <label className="fw-semibold">
                <FaUniversity className="me-2" /> Department
              </label>
              <select
                className="form-select"
                value={department_id}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setCourseId("");
                  loadCourses(e.target.value);
                }}
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="fw-semibold">
                <FaLayerGroup className="me-2" /> Course
              </label>
              <select
                className="form-select"
                value={course_id}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={!department_id}
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="fw-semibold">
                <FaUsers className="me-2" /> Category
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">-- Select Category --</option>
                <option>GEN</option>
                <option>OBC</option>
                <option>SC</option>
                <option>ST</option>
                <option>EWS</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="fw-semibold">Total Fee</label>
              <input
                type="number"
                className="form-control"
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
              />
            </div>
          </div>

          {/* INSTALLMENTS */}
          <h5 className="fw-bold mb-3">Installments</h5>

          {installments.map((i, index) => (
            <div className="row g-2 mb-2" key={index}>
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Installment Name"
                  value={i.name}
                  onChange={(e) =>
                    handleInstallmentChange(index, "name", e.target.value)
                  }
                />
              </div>

              <div className="col-md-3">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Amount"
                  value={i.amount}
                  onChange={(e) =>
                    handleInstallmentChange(index, "amount", e.target.value)
                  }
                />
              </div>

              <div className="col-md-3">
                <input
                  type="date"
                  className="form-control"
                  value={i.dueDate}
                  onChange={(e) =>
                    handleInstallmentChange(index, "dueDate", e.target.value)
                  }
                />
              </div>

              <div className="col-md-2 text-center">
                {installments.length > 1 && (
                  <button
                    className="btn btn-danger"
                    onClick={() => removeInstallment(index)}
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button className="btn btn-outline-primary mt-3" onClick={addInstallment}>
            <FaPlus className="me-2" />
            Add Installment
          </button>

          <hr />

          <div className="d-flex justify-content-between align-items-center">
            <h6>Installment Total: ₹ {installmentSum}</h6>

            <button
              className="btn btn-success px-4"
              onClick={handleSubmit}
              disabled={loading}
            >
              <FaSave className="me-2" />
              {loading ? "Saving..." : "Create Structure"}
            </button>
          </div>

        </div>
      </div>

      {/* CSS */}
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
