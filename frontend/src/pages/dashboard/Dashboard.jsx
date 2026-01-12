import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (user?.role === "teacher") {
      api
        .get("/courses/my")
        .then((res) => {
          setCourses(res.data?.data || []);
        })
        .catch(() => setCourses([]));
    }
  }, [user]);

  return (
    <div>
      <h4 className="mb-3">Dashboard</h4>

      {user?.role === "admin" && (
        <div className="alert alert-info">
          Welcome Admin. Use sidebar to manage college data.
        </div>
      )}

      {user?.role === "teacher" && (
        <>
          <h6 className="mb-2">My Courses</h6>

          <div className="row">
            {courses.length > 0 ? (
              courses.map((c) => (
                <div key={c._id} className="col-md-4 mb-3">
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h6>{c.name}</h6>
                      <p className="text-muted mb-1">
                        Department: {c.departmentId?.name || "-"}
                      </p>
                      <span className="badge bg-success">Active</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No courses assigned.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
