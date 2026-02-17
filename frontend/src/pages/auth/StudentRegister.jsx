import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUniversity,
  FaUserGraduate,
  FaSpinner
} from "react-icons/fa";

/* ================= PUBLIC AXIOS (NO TOKEN) ================= */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

export default function StudentRegister() {
  const { collegeCode } = useParams();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collegeName, setCollegeName] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    gender: "Female",
    dateOfBirth: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    department_id: "",
    course_id: "",
    admissionYear: new Date().getFullYear(),
    currentSemester: 1,
    category: "GEN"
  });

  /* ================= LOAD COLLEGE NAME ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        // Get college info from departments endpoint which now returns college name
        const res = await publicApi.get(`/public/departments/${collegeCode}`);
        // Extract college name from the response
        if (res.data && res.data.collegeName) {
          setCollegeName(res.data.collegeName);
        }
      } catch (err) {
        console.error("Failed to load college info:", err);
        // Don't set an error for this since it's not critical for functionality
      }
    };

    if (collegeCode) {
      fetchCollege(); 
    }
  }, [collegeCode]);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await publicApi.get(`/public/departments/${collegeCode}`);
        // The new response format includes departments array inside the response
        setDepartments(res.data.departments || res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load departments");
      }
    };

    fetchDepartments();
  }, [collegeCode]);

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!form.department_id || !collegeCode) return;

    const fetchCourses = async () => {
      try {
        const res = await publicApi.get(
          `/public/courses/${collegeCode}/department/${form.department_id}`
        );
        setCourses(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load courses");
      }
    };

    fetchCourses();
  }, [form.department_id, collegeCode]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await publicApi.post(
        `/students/register/${collegeCode}`,
        form
      );

      alert(response.data.message || "🎉 Registration successful! Wait for college approval.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!collegeCode) {
    return (
      <div className="container mt-5 text-center">
        <h3>Invalid Registration Link</h3>
      </div>
    );
  }

  return (
    <div className="m-0">
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        minHeight: "100vh",
        padding:"20px",
      }}
    >
      <div
        className="card  p-4"
        style={{ width: "1000px", borderRadius: "16px" ,boxShadow:"10px 10px 45px gray"}}
      >
        <div className="text-center mb-4">
          <FaUniversity size={48} className="mb-2"/>
          <h3 className="fw-bold">{collegeName || "NOVAA"}</h3>
          <p className="text-muted mb-1">Student Self Registration</p>
          <div className="d-flex gap-2 justify-content-center">
            <span className="badge bg-dark">{collegeCode}</span>
            {collegeName && (
              <span className="badge bg-success">{collegeName}</span>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h5 className="fw-bold mb-2">Personal Details</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <input className="form-control" name="fullName" placeholder="Full Name" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input className="form-control" name="email" placeholder="Email" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input type="password" className="form-control" name="password" placeholder="Password" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <input className="form-control" name="mobileNumber" placeholder="Mobile Number" onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <select className="form-select" name="gender" onChange={handleChange}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
            <div className="col-md-6">
              <input type="date" className="form-control" name="dateOfBirth" onChange={handleChange} required />
            </div>
          </div>

          <h5 className="fw-bold mt-4 mb-2">Address</h5>
          <div className="row g-3">
            <div className="col-md-12">
              <input className="form-control" name="addressLine" placeholder="Address" onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <input className="form-control" name="city" placeholder="City" onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <input className="form-control" name="state" placeholder="State" onChange={handleChange} required />
            </div>
            <div className="col-md-4">
              <input className="form-control" name="pincode" placeholder="Pincode" onChange={handleChange} required />
            </div>
          </div>

          <h5 className="fw-bold mt-4 mb-2">Academic Details</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <select className="form-select" name="department_id" value={form.department_id} onChange={handleChange} required>
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <select className="form-select" name="course_id" value={form.course_id} onChange={handleChange} required>
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-6">
              <select className="form-select" name="category" value={form.category} onChange={handleChange} required>
                <option value="GEN">General (GEN)</option>
                <option value="OBC">Other Backward Classes (OBC)</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div className="col-md-6">
              <input 
                type="number" 
                className="form-control" 
                name="admissionYear" 
                placeholder="Admission Year" 
                value={form.admissionYear} 
                onChange={handleChange} 
                min="1900" 
                max="2100" 
                required 
              />
            </div>
            
            <div className="col-md-6">
              <select className="form-select" name="currentSemester" value={form.currentSemester} onChange={handleChange} required>
                {!form.course_id && <option value="">Select a course first</option>}
                {form.course_id && courses.length > 0 && (() => {
                  const selectedCourse = courses.find(course => course._id === form.course_id);
                  if (selectedCourse && selectedCourse.semester) {
                    return Array.from({ length: selectedCourse.semester }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ));
                  } else {
                    // Default to 8 semesters if course semester info is not available
                    return Array.from({ length: 8 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                    ));
                  }
                })()}
                {form.course_id && courses.length === 0 && <option value="">No semesters available</option>}
              </select>
            </div>
          </div>

          <button
            className="btn w-25 mt-4 d-flex align-items-center justify-content-center gap-2 text-light fw-semibold" style={{position:"relative",left:"350px",background:"linear-gradient(45deg, #286079, #5798b7, #09567f)"}}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="spin" />
            ) : (
              <>
                <FaUserGraduate />
                Register Now
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-3 text-muted">
          After registration, wait for college approval.
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </div>
  );
}
