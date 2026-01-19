import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api.get("/students/my").then((res) => setStudents(res.data));
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4>My Students</h4>

        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Roll No</th>
              <th>Course</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center">
                  No students found
                </td>
              </tr>
            )}

            {students.map((s) => (
              <tr key={s._id}>
                <td>{s.name}</td>
                <td>{s.rollNo}</td>
                <td>{s.courseId?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
