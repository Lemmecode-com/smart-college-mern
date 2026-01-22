import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentProfile() {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    api.get("/students/me").then((res) => setStudent(res.data));
  }, []);

  if (!student) return <p>Loading...</p>;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4>My Profile</h4>

        <ul className="list-group">
          <li className="list-group-item">
            <strong>Name:</strong> {student.name}
          </li>
          <li className="list-group-item">
            <strong>Roll No:</strong> {student.rollNo}
          </li>
          <li className="list-group-item">
            <strong>Department:</strong> {student.departmentId?.name}
          </li>
          <li className="list-group-item">
            <strong>Course:</strong> {student.courseId?.name}
          </li>
          <li className="list-group-item">
            <strong>Status:</strong>{" "}
            <span className="badge bg-success">{student.status}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
