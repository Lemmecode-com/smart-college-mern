// import { useContext } from "react";
// import { AuthContext } from "../../auth/AuthContext";

// export default function StudentDashboard() {
//   const { user } = useContext(AuthContext);

//   return (
//     <div className="card shadow-sm">
//       <div className="card-body">
//         <h4 className="mb-2">Welcome, {user?.name}</h4>
//         <p className="text-muted mb-0">
//           You are logged in as <strong>Student</strong>.
//         </p>
//         <hr />
//         <p>
//           You can view your attendance records using the Attendance section.
//         </p>
//       </div>
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/attendance/my/summary")
      .then(res => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <>
      <h3 className="mb-4">Student Dashboard</h3>

      <div className="row">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6>Total Classes</h6>
              <h3>{stats?.total || 0}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6>Present</h6>
              <h3 className="text-success">{stats?.present || 0}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6>Attendance %</h6>
              <h3>{stats?.percentage || 0}%</h3>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
