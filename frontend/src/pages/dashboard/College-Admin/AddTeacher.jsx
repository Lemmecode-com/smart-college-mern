import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaArrowLeft,
  FaCheckCircle,
  FaIdCard,
  FaUserTie,
  FaUpload,
  FaMapMarkerAlt
} from "react-icons/fa";

export default function AddTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const [departments, setDepartments] = useState([]);
  const [documents, setDocuments] = useState({
    aadhar: null,
    pan: null,
    degree: null,
    photo: null
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    password: "",

    gender: "",
    bloodGroup: "",
    employmentType: "FULL_TIME",
    address: "",
    city: "",
    state: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch {
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    setDocuments({ ...documents, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      await api.post("/teachers", {
        ...formData,
        experienceYears: Number(formData.experienceYears)
      });

      setSuccess(true);
      setTimeout(() => navigate("/teachers"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create teacher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaChalkboardTeacher className="blink me-2" />
          Add New Teacher
        </h3>
        <p className="opacity-75 mb-0">
          Register faculty member for your college
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle /> Teacher created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">

            {/* BASIC INFO */}
            <h5 className="fw-bold mb-3"><FaUserTie className="me-2" /> Basic Info</h5>
            <div className="row g-3 mb-4">
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
              <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} />
              <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
              <Input label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} />
              <Input label="Experience (Years)" name="experienceYears" type="number" value={formData.experienceYears} onChange={handleChange} />
              <Input label="Password" name="password" type="password" value={formData.password} onChange={handleChange} />
            </div>

            {/* PERSONAL */}
            <h5 className="fw-bold mb-3"><FaIdCard className="me-2" /> Personal Info</h5>
            <div className="row g-3 mb-4">
              <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={["Male","Female","Other"]} />
              <Select label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} options={["A+","B+","O+","AB+","A-","B-","O-","AB-"]} />
              <Select label="Employment Type" name="employmentType" value={formData.employmentType} onChange={handleChange} options={["FULL_TIME","PART_TIME","VISITING"]} />
            </div>

            {/* ADDRESS */}
            <h5 className="fw-bold mb-3"><FaMapMarkerAlt className="me-2" /> Address</h5>
            <div className="row g-3 mb-4">
              <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
              <Input label="City" name="city" value={formData.city} onChange={handleChange} />
              <Input label="State" name="state" value={formData.state} onChange={handleChange} />
            </div>

            {/* DOCUMENTS */}
            <h5 className="fw-bold mb-3"><FaUpload className="me-2" /> Upload Documents</h5>
            <div className="row g-3 mb-4">
              <File label="Aadhar" name="aadhar" onChange={handleFile} />
              <File label="PAN" name="pan" onChange={handleFile} />
              <File label="Degree Certificate" name="degree" onChange={handleFile} />
              <File label="Photo" name="photo" onChange={handleFile} />
            </div>

            {/* DEPARTMENT */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Department</label>
                <select className="form-select" name="department_id" value={formData.department_id} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/teachers")}>
              <FaArrowLeft className="me-1" /> Back
            </button>
            <button className="btn btn-success px-4 rounded-pill" disabled={loading}>
              {loading ? "Creating..." : "Create Teacher"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .gradient-header { background: linear-gradient(180deg, #0f3a4a, #134952); }
        .glass-card { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); }
        .blink { animation: blink 1.5s infinite; }
        @keyframes blink { 0%{opacity:1} 50%{opacity:.4} 100%{opacity:1} }
      `}</style>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div className="col-md-4">
      <label className="form-label fw-semibold">{label}</label>
      <select className="form-select" {...props}>
        <option value="">Select</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function File({ label, ...props }) {
  return (
    <div className="col-md-3">
      <label className="form-label fw-semibold">{label}</label>
      <input type="file" className="form-control" {...props} />
    </div>
  );
}
