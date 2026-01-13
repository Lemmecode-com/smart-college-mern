import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ParentDashboard() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/parents/child")
      .then((res) => setStudent(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!student) return <p>No child linked</p>;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="mb-3">Child Profile</h5>

        <p><strong>Name:</strong> {student.name}</p>
        <p><strong>Roll No:</strong> {student.rollNo}</p>
        <p><strong>Department:</strong> {student.departmentId?.name}</p>
        <p><strong>Course:</strong> {student.courseId?.name}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span className="badge bg-success">{student.status}</span>
        </p>
      </div>
    </div>
  );
}
