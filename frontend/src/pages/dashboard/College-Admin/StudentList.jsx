import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaCalendarAlt
} from "react-icons/fa";

export default function StudentList() {
  const { user } = useContext(AuthContext);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/students/registered");
        setStudents(res.data.students || []);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Students...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUsers className="me-2 blink" />
          Registered Students
        </h3>
        <p className="opacity-75 mb-0">
          Complete list of students registered in college
        </p>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">

          {students.length === 0 ? (
            <div className="alert alert-info">
              No students found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Gender</th>
                    <th>DOB</th>
                    <th>Department</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Semester</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td className="fw-bold">
                        <FaGraduationCap className="me-1 text-primary" />
                        {s.fullName}
                      </td>

                      <td>
                        <FaEnvelope className="me-1 text-success" />
                        {s.email}
                      </td>

                      <td>
                        <FaPhone className="me-1 text-warning" />
                        {s.mobileNumber}
                      </td>

                      <td>{s.gender}</td>

                      <td>
                        {new Date(s.dateOfBirth).toLocaleDateString()}
                      </td>

                      <td>{s.department_id?.name}</td>

                      <td>{s.course_id?.name}</td>

                      <td>{s.admissionYear}</td>

                      <td>{s.currentSemester}</td>

                      <td>
                        <FaMapMarkerAlt className="me-1 text-danger" />
                        {s.city}, {s.state}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            s.status === "APPROVED"
                              ? "bg-success"
                              : s.status === "PENDING"
                              ? "bg-warning text-dark"
                              : "bg-danger"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td>
                        <FaCalendarAlt className="me-1" />
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
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
