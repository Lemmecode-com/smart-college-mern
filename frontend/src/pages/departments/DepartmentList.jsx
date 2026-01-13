import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Failed to load departments");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return (
    <div
      className="container-fluid py-2"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff, #ffffff)"
      }}
    >
      <div className="container">
        <div
          className="card shadow-lg border-0"
          style={{ borderRadius: "16px" }}
        >
          <div className="card-body p-4 p-md-5">
            <h4 className="mb-4 fw-bold text-dark">
              Departments
            </h4>

            {loading ? (
              <p>Loading departments...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "60%" }}>Department Name</th>
                      <th style={{ width: "40%" }}>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 && (
                      <tr>
                        <td
                          colSpan="2"
                          className="text-center text-muted py-4"
                        >
                          No departments found
                        </td>
                      </tr>
                    )}

                    {departments.map((d) => (
                      <tr key={d._id}>
                        <td className="fw-semibold">{d.name}</td>
                        <td>{d.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
