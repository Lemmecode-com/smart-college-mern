// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function ChildAttendance() {
//   const [records, setRecords] = useState([]);

//   useEffect(() => {
//     api.get("/parents/attendance").then((res) => {
//       setRecords(res.data);
//     });
//   }, []);

//   return (
//     <div className="card shadow-sm">
//       <div className="card-body">
//         <h5>Attendance Records</h5>

//         <table className="table table-bordered mt-3">
//           <thead className="table-light">
//             <tr>
//               <th>Date</th>
//               <th>Course</th>
//               <th>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {records.length === 0 && (
//               <tr>
//                 <td colSpan="3" className="text-center">
//                   No records found
//                 </td>
//               </tr>
//             )}

//             {records.map((r) => (
//               <tr key={r._id}>
//                 <td>{new Date(r.date).toLocaleDateString()}</td>
//                 <td>{r.courseId?.name}</td>
//                 <td>
//                   <span
//                     className={`badge ${
//                       r.status === "Present"
//                         ? "bg-success"
//                         : "bg-danger"
//                     }`}
//                   >
//                     {r.status}
//                   </span>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }









import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";

export default function ChildAttendance() {
  const [params] = useSearchParams();
  const studentId = params.get("studentId");
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!studentId) return;

    api.get(`/attendance/student/${studentId}`)
      .then(res => setRecords(res.data))
      .catch(() => {});
  }, [studentId]);

  return (
    <>
      <h3>Child Attendance</h3>

      <table className="table mt-3">
        <thead>
          <tr>
            <th>Date</th>
            <th>Subject</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r._id}>
              <td>{r.date}</td>
              <td>{r.subject?.name}</td>
              <td>
                <span className={`badge ${
                  r.status === "Present" ? "bg-success" : "bg-danger"
                }`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
