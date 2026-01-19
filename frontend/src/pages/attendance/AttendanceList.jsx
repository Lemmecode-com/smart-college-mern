// import { useEffect, useState } from "react";
// import api from "../../api/axios";

// export default function AttendanceList() {
//   const [attendance, setAttendance] = useState([]);
//   const [date, setDate] = useState("");

//   useEffect(() => {
//     api
//       .get("/attendance", { params: { date } })
//       .then((res) => setAttendance(res.data.data));
//   }, [date]);

//   return (
//     <div className="card shadow-sm">
//       <div className="card-body">
//         <h5 className="mb-3">Attendance Records</h5>

//         <input
//           type="date"
//           className="form-control mb-3"
//           onChange={(e) => setDate(e.target.value)}
//         />

//         <table className="table table-bordered">
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Student</th>
//               <th>Course</th>
//               <th>Teacher</th>
//               <th>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {attendance.length === 0 && (
//               <tr>
//                 <td colSpan="5" className="text-center">
//                   No attendance records found
//                 </td>
//               </tr>
//             )}

//             {attendance.map((a) => (
//               <tr key={a._id}>
//                 <td>{a.date}</td>
//                 <td>{a.studentId?.name}</td>
//                 <td>{a.courseId?.name}</td>
//                 <td>{a.markedBy?.name}</td>
//                 <td>
//                   <span
//                     className={`badge ${
//                       a.status === "Present"
//                         ? "bg-success"
//                         : "bg-danger"
//                     }`}
//                   >
//                     {a.status}
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
import api from "../../api/axios";

export default function AttendanceList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/attendance/report").then((res) => setData(res.data.data || []));
  }, []);

  return (
    <>
      <h3>Attendance Records</h3>
      <ul className="list-group">
        {data.map((a) => (
          <li key={a._id} className="list-group-item">
            {a.date} – {a.subject?.name}
          </li>
        ))}
      </ul>
    </>
  );
}
