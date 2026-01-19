// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function StudentList() {
//   const [students, setStudents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     api
//       .get("/students")
//       .then((res) => setStudents(res.data))
//       .catch(() => setError("Failed to load students"))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <p>Loading students...</p>;
//   if (error) return <p className="text-danger">{error}</p>;

//   const getDepartmentName = (id) => {
//     if (!id) return '—';
//     const dept = departments.find((d) => d._id === id);
//     return dept ? dept.name : '—';
//   };

//   return (
//     <div className="card shadow-sm mt-4">
//       <div className="card-body">
//         <h5 className="mb-3">Students</h5>

//         <div className="table-responsive">
//           <table className="table table-bordered align-middle">
//             <thead className="table-light">
//               <tr>
//                 <th>Name</th>
//                 <th>Roll No</th>
//                 <th>Department</th>
//                 <th>Course</th>
//                 <th>Status</th>
//               </tr>
//             </thead>

//             <tbody>
//               {students.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="text-center">
//                     No students found
//                   </td>
//                 </tr>
//               )}

//               {students.map((s) => (
//                 <tr key={s._id}>
//                   <td>{s.name}</td>
//                   <td>{s.rollNo}</td>
//                   <td>{s.departmentId?.name || "-"}</td>
//                   <td>{s.courseId?.name || "-"}</td>
//                   <td>
//                     <span
//                       className={`badge ${
//                         s.status === "Active"
//                           ? "bg-success"
//                           : "bg-secondary"
//                       }`}
//                     >
//                       {s.status}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>

//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    loadStudents();
    api.get("/courses").then((res) => setCourses(res.data));
  }, []);

  const loadStudents = (cid = "") => {
    const url = cid ? `/students?courseId=${cid}` : "/students";
    api.get(url).then((res) => setStudents(res.data.data));
  };

  const handleFilter = (e) => {
    const value = e.target.value;
    setCourseId(value);
    loadStudents(value);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="mb-3">Students</h4>

        {/* Filter */}
        <select
          className="form-select mb-3"
          value={courseId}
          onChange={handleFilter}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Roll No</th>
                <th>Department</th>
                <th>Course</th>
                <th>Status</th>
                <th>Assign Parent</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No students found
                  </td>
                </tr>
              )}

              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}</td>
                  <td>{s.rollNo}</td>
                  <td>{s.departmentId?.name || "-"}</td>
                  <td>{s.courseId?.name || "-"}</td>
                  <td>
                    <span className="badge bg-success">
                      {s.status || "Active"}
                    </span>
                  </td>

                  <td>
                    <NavLink
                      to={`/students/${s._id}/assign-parent`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Assign Parent
                    </NavLink>
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
