import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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

export default function EditFeeStructure() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  const [department_id, setDepartmentId] = useState("");
  const [course_id, setCourseId] = useState("");
  const [category, setCategory] = useState("");
  const [totalFee, setTotalFee] = useState("");
  const [installments, setInstallments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= LOAD ================= */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [feeRes, deptRes] = await Promise.all([
        api.get(`/fees/structure/${id}`),
        api.get("/departments"),
      ]);

      const fee = feeRes.data;

      setCategory(fee.category);
      setTotalFee(fee.totalFee);
      setInstallments(fee.installments);

      setDepartmentId(fee.course_id?.department_id);
      setCourseId(fee.course_id?._id);

      setDepartments(deptRes.data || []);

      // load courses of department
      if (fee.course_id?.department_id) {
        loadCourses(fee.course_id.department_id);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load fee structure");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOAD COURSES ================= */
  const loadCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch {
      setCourses([]);
    }
  };

  /* ================= HANDLERS ================= */
  const addInstallment = () =>
    setInstallments([...installments, { name: "", amount: "", dueDate: "" }]);

  const removeInstallment = (i) =>
    setInstallments(installments.filter((_, index) => index !== i));

  const handleInstallmentChange = (i, field, value) => {
    const updated = [...installments];
    updated[i][field] = value;
    setInstallments(updated);
  };

  const installmentSum = installments.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  );

  /* ================= UPDATE ================= */
  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!course_id || !category || !totalFee) {
      setError("All fields are required");
      return;
    }

    if (installmentSum !== Number(totalFee)) {
      setError("Installment total must match total fee");
      return;
    }

    try {
      setSaving(true);

      await api.put(`/fees/structure/${id}`, {
        course_id,
        category,
        totalFee: Number(totalFee),
        installments,
      });

      setSuccess("Fee structure updated successfully");
      setTimeout(() => navigate("/fees/list"), 1200);

    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid">

      <div className="gradient-header p-4 rounded-4 text-white mb-4">
        <h3 className="fw-bold">
          <FaMoneyBillWave className="me-2 blink" />
          Edit Fee Structure
        </h3>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card shadow-lg rounded-4 glass-card">
        <div className="card-body">

          {/* Department */}
          <div className="row g-3 mb-3">
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
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className="col-md-4">
              <label className="fw-semibold">
                <FaLayerGroup className="me-2" /> Course
              </label>
              <select
                className="form-select"
                value={course_id}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="col-md-4">
              <label className="fw-semibold">
                <FaUsers className="me-2" /> Category
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>GEN</option>
                <option>OBC</option>
                <option>SC</option>
                <option>ST</option>
              </select>
            </div>
          </div>

          {/* Total */}
          <input
            type="number"
            className="form-control mb-3"
            placeholder="Total Fee"
            value={totalFee}
            onChange={(e) => setTotalFee(e.target.value)}
          />

          <h6 className="fw-bold">Installments</h6>

          {installments.map((i, idx) => (
            <div className="row g-2 mb-2" key={idx}>
              <div className="col-md-4">
                <input className="form-control" value={i.name}
                  onChange={(e) => handleInstallmentChange(idx, "name", e.target.value)} />
              </div>
              <div className="col-md-3">
                <input type="number" className="form-control" value={i.amount}
                  onChange={(e) => handleInstallmentChange(idx, "amount", e.target.value)} />
              </div>
              <div className="col-md-3">
                <input type="date" className="form-control"
                  value={i.dueDate?.substring(0, 10)}
                  onChange={(e) => handleInstallmentChange(idx, "dueDate", e.target.value)} />
              </div>
              <div className="col-md-2">
                <button className="btn btn-danger" onClick={() => removeInstallment(idx)}>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}

          <button className="btn btn-outline-primary mt-2" onClick={addInstallment}>
            <FaPlus /> Add Installment
          </button>

          <hr />

          <div className="d-flex justify-content-between">
            <strong>Total: ₹ {installmentSum}</strong>
            <button className="btn btn-success" onClick={handleSubmit}>
              <FaSave /> Update
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
