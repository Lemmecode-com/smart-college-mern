import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teachers")
      .then(res => setTeachers(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center mt-4">Loading teachers...</div>;
  }

  return (
    <div className="container-fluid px-3 px-md-4">
      <div
        className="card shadow-lg"
        style={{
          background: "linear-gradient(180deg, #0f3a4a, #134952)",
          color: "#fff",
          borderRadius: "16px"
        }}
      >
        <div className="card-body">
          <h4 className="mb-4 text-center text-md-start">
            👨‍🏫 Teachers List
          </h4>

          <div className="table-responsive">
            <table className="table table-borderless table-hover text-white align-middle">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Subjects</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {teachers.map((t, index) => (
                  <tr key={t._id}>
                    <td>{index + 1}</td>
                    <td>{t.userId?.name}</td>
                    <td>{t.departmentId?.name}</td>
                    <td>
                      {t.subjects?.length > 0
                        ? t.subjects.map(s => s.name).join(", ")
                        : "—"}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark px-3 py-2">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {teachers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No teachers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
