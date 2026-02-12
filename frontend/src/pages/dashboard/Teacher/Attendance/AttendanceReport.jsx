import { useEffect, useState } from "react";
import api from "../../../../api/axios";

export default function AttendanceReport() {
  const [report, setReport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [filters, setFilters] = useState({
    courseId: "",
    subjectId: "",
    startDate: "",
    endDate: "",
  });

  /* ================= FETCH COURSES ================= */
  const fetchCourses = async () => {
    const res = await api.get("/attendance/report/courses");
    setCourses(res.data);
  };

  /* ================= FETCH SUBJECTS ================= */
  const fetchSubjects = async (courseId) => {
    if (!courseId) return;
    const res = await api.get(`/attendance/report/subjects/${courseId}`);
    setSubjects(res.data);
  };

  /* ================= FETCH REPORT ================= */
  const fetchReport = async () => {
    const res = await api.get("/attendance/report", {
      params: filters,
    });
    setReport(res.data);
  };

  useEffect(() => {
    fetchCourses();
    fetchReport();
  }, []);

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setFilters({
      ...filters,
      courseId,
      subjectId: "", // reset subject
    });
    fetchSubjects(courseId);
  };

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  if (!report) return <p className="text-center mt-4">Loading...</p>;

  const { summary, sessions } = report;

  return (
    <div className="container py-4">
      {/* HEADER */}
      <div
        className="mb-4 p-4 rounded-4 text-white shadow"
        style={{ background: "linear-gradient(180deg,#0f3a4a,#134952)" }}
      >
        <h4 className="fw-bold mb-1">📊 Teacher Attendance Report</h4>
      </div>

      {/* FILTER SECTION */}
      <div className="card p-3 mb-4 shadow-sm">
        <div className="row g-3">
          {/* Course Dropdown */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={filters.courseId}
              onChange={handleCourseChange}
            >
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Dropdown */}
          <div className="col-md-3">
            <select
              className="form-select"
              name="subjectId"
              value={filters.subjectId}
              onChange={handleChange}
              disabled={!filters.courseId}
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <input
              type="date"
              name="startDate"
              className="form-control"
              value={filters.startDate}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-3">
            <input
              type="date"
              name="endDate"
              className="form-control"
              value={filters.endDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mt-3 text-end">
          <button className="btn btn-primary" onClick={fetchReport}>
            VIEW REPORT
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="row text-center mb-4">
        <Summary title="Total Lectures" value={summary.totalLectures} />
        <Summary title="Total Students" value={summary.totalStudents} />
        <Summary
          title="Total Present"
          value={summary.totalPresent}
          className="text-success"
        />
        <Summary
          title="Total Absent"
          value={summary.totalAbsent}
          className="text-danger"
        />
      </div>

      {/* SESSION TABLE */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5>Session-wise Report</h5>

          <table className="table table-bordered">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Lecture</th>
                <th>Present</th>
                <th>Absent</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No attendance records found.
                  </td>
                </tr>
              )}

              {sessions.map((s, i) => (
                <tr key={i}>
                  <td>{new Date(s.date).toLocaleDateString()}</td>
                  <td>{s.subject}</td>
                  <td>{s.lectureNumber}</td>
                  <td className="text-success">{s.present}</td>
                  <td className="text-danger">{s.absent}</td>
                  <td>
                    <span className="badge bg-primary">
                      {(s.percentage ?? 0).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value, className }) {
  return (
    <div className="col-md-3">
      <div className={`card p-3 shadow-sm ${className || ""}`}>
        <h6>{title}</h6>
        <h3>{value}</h3>
      </div>
    </div>
  );
}
