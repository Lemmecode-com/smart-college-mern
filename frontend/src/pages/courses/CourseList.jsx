<<<<<<< HEAD
=======
// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function CourseList() {
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     api
//       .get("/courses")
//       .then((res) => setCourses(res.data))
//       .catch(() => setError("Failed to load courses"))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <p>Loading courses...</p>;
//   if (error) return <p className="text-danger">{error}</p>;

//   return (
//     <div className="card shadow-sm mt-4">
//       <div className="card-body">
//         <h5 className="mb-3">Courses</h5>

//         <div className="table-responsive">
//           <table className="table table-bordered align-middle">
//             <thead className="table-light">
//               <tr>
//                 <th>Name</th>
//                 <th>Code</th>
//                 <th>Department</th>
//                 <th>Teacher</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {courses.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="text-center">
//                     No courses found
//                   </td>
//                 </tr>
//               )}

//               {courses.map((c) => (
//                 <tr key={c._id}>
//                   <td>{c.name}</td>
//                   <td>{c.code}</td>
//                   <td>{c.departmentId?.name || "-"}</td>
//                   <td>{c.teacherId?.name || "-"}</td>
//                   <td>
//                     <span
//                       className={`badge ${
//                         c.status === "Active"
//                           ? "bg-success"
//                           : "bg-secondary"
//                       }`}
//                     >
//                       {c.status}
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

// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function CourseList() {
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     api
//       .get("/courses")
//       .then((res) => {
//         // ✅ IMPORTANT FIX
//         setCourses(res.data?.data || []);
//       })
//       .catch(() => setError("Failed to load courses"))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <p>Loading courses...</p>;
//   if (error) return <p className="text-danger">{error}</p>;

//   return (
//     <div className="card shadow-sm mt-4">
//       <div className="card-body">
//         <h5 className="mb-3">Courses</h5>

//         <div className="table-responsive">
//           <table className="table table-bordered align-middle">
//             <thead className="table-light">
//               <tr>
//                 <th>Name</th>
//                 <th>Code</th>
//                 <th>Department</th>
//                 <th>Teacher</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {courses.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="text-center">
//                     No courses found
//                   </td>
//                 </tr>
//               )}

//               {courses.map((c) => (
//                 <tr key={c._id}>
//                   <td>{c.name}</td>
//                   <td>{c.code || "-"}</td>
//                   <td>{c.departmentId?.name || "-"}</td>
//                   <td>{c.teacherId?.name || "-"}</td>
//                   <td>
//                     <span
//                       className={`badge ${
//                         c.status === "Active"
//                           ? "bg-success"
//                           : "bg-secondary"
//                       }`}
//                     >
//                       {c.status}
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

>>>>>>> e2e73d1b800bf20e34dc2d4ea78c9e9b0950d9d6
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CourseList() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
<<<<<<< HEAD
    api
      .get("/courses")
      .then((res) => setCourses(res.data))
      .catch(() => setError("Failed to load courses"))
      .finally(() => setLoading(false));
=======
    api.get("/courses").then((res) => {
      setCourses(res.data.data || []);
    });
>>>>>>> e2e73d1b800bf20e34dc2d4ea78c9e9b0950d9d6
  }, []);

  return (
<<<<<<< HEAD
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h5 className="mb-3">Courses</h5>

        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Department</th>
                <th>Teacher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">
                    No courses found
                  </td>
                </tr>
              )}

              {courses.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.code}</td>
                  <td>{c.departmentId?.name || "-"}</td>
                  <td>{c.teacherId?.name || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.status === "Active"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
=======
    <>
      <h3>Courses</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.department?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
>>>>>>> e2e73d1b800bf20e34dc2d4ea78c9e9b0950d9d6
  );
}








// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function CourseList() {
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     api
//       .get("/courses")
//       .then((res) => {
//         // ✅ IMPORTANT FIX
//         setCourses(res.data?.data || []);
//       })
//       .catch(() => setError("Failed to load courses"))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <p>Loading courses...</p>;
//   if (error) return <p className="text-danger">{error}</p>;

//   return (
//     <div className="card shadow-sm mt-4">
//       <div className="card-body">
//         <h5 className="mb-3">Courses</h5>

//         <div className="table-responsive">
//           <table className="table table-bordered align-middle">
//             <thead className="table-light">
//               <tr>
//                 <th>Name</th>
//                 <th>Code</th>
//                 <th>Department</th>
//                 <th>Teacher</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {courses.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="text-center">
//                     No courses found
//                   </td>
//                 </tr>
//               )}

//               {courses.map((c) => (
//                 <tr key={c._id}>
//                   <td>{c.name}</td>
//                   <td>{c.code || "-"}</td>
//                   <td>{c.departmentId?.name || "-"}</td>
//                   <td>{c.teacherId?.name || "-"}</td>
//                   <td>
//                     <span
//                       className={`badge ${
//                         c.status === "Active"
//                           ? "bg-success"
//                           : "bg-secondary"
//                       }`}
//                     >
//                       {c.status}
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
