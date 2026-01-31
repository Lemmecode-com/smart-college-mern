import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaBook,
  FaBuilding
} from "react-icons/fa";

export default function CreateTimetable() {
  const { user } = useContext(AuthContext);

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    department_id: "",
    course_id: "",
    subject_id: "",
    teacher_id: "",
    dayOfWeek: "MON",
    startTime: "",
    endTime: "",
    academicYear: "2024-2025",
    semester: "",
    lectureType: "THEORY",
    room: ""
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH INITIAL DATA ================= */
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const deptRes = await api.get("/departments");
        const teacherRes = await api.get("/teachers");

        setDepartments(deptRes.data || []);
        setTeachers(teacherRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  /* ================= FETCH COURSES ================= */
  const fetchCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      setCourses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= FETCH SUBJECTS ================= */
  const fetchSubjects = async (courseId) => {
    try {
      const res = await api.get(`/subjects/course/${courseId}`);
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post("/timetable", form);
      alert("Timetable slot created successfully");

      setForm({
        department_id: "",
        course_id: "",
        subject_id: "",
        teacher_id: "",
        dayOfWeek: "MON",
        startTime: "",
        endTime: "",
        academicYear: "2024-2025",
        semester: "",
        lectureType: "THEORY",
        room: ""
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create timetable slot");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Timetable Module...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaCalendarAlt className="me-2 blink" />
          Create Timetable
        </h3>
        <p className="opacity-75 mb-0">
          Create lecture slots for departments & courses
        </p>
      </div>

      {/* ================= FORM ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              {/* Department */}
              <div className="col-md-6">
                <label className="fw-semibold">Department</label>
                <select
                  className="form-select"
                  name="department_id"
                  value={form.department_id}
                  onChange={(e) => {
                    handleChange(e);
                    fetchCourses(e.target.value);
                    setSubjects([]);
                  }}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="col-md-6">
                <label className="fw-semibold">Course</label>
                <select
                  className="form-select"
                  name="course_id"
                  value={form.course_id}
                  onChange={(e) => {
                    handleChange(e);
                    fetchSubjects(e.target.value);
                  }}
                  required
                  disabled={!form.department_id}
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="col-md-6">
                <label className="fw-semibold">Subject</label>
                <select
                  className="form-select"
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                  required
                  disabled={!form.course_id}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div className="col-md-6">
                <label className="fw-semibold">Teacher</label>
                <select
                  className="form-select"
                  name="teacher_id"
                  value={form.teacher_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div className="col-md-4">
                <label className="fw-semibold">Day</label>
                <select
                  className="form-select"
                  name="dayOfWeek"
                  value={form.dayOfWeek}
                  onChange={handleChange}
                >
                  <option value="MON">Monday</option>
                  <option value="TUE">Tuesday</option>
                  <option value="WED">Wednesday</option>
                  <option value="THU">Thursday</option>
                  <option value="FRI">Friday</option>
                  <option value="SAT">Saturday</option>
                </select>
              </div>

              {/* Time */}
              <div className="col-md-4">
                <label className="fw-semibold">Start Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="fw-semibold">End Time</label>
                <input
                  type="time"
                  className="form-control"
                  name="endTime"
                  value={form.endTime}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Semester & Year */}
              <div className="col-md-4">
                <label className="fw-semibold">Semester</label>
                <input
                  type="number"
                  className="form-control"
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="fw-semibold">Academic Year</label>
                <input
                  className="form-control"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4">
                <label className="fw-semibold">Room</label>
                <input
                  className="form-control"
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Lecture Type */}
              <div className="col-md-12">
                <label className="fw-semibold">Lecture Type</label>
                <select
                  className="form-select"
                  name="lectureType"
                  value={form.lectureType}
                  onChange={handleChange}
                >
                  <option value="THEORY">Theory</option>
                  <option value="PRACTICAL">Practical</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>

            </div>

            <button
              className="btn btn-success w-100 mt-4"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Timetable Slot"}
            </button>

          </form>
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
