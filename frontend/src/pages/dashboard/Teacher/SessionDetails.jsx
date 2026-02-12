// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../../../api/axios";

// export default function SessionDetails() {
//   const { sessionId } = useParams();
//   const [session, setSession] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [attendance, setAttendance] = useState({});

//   const fetchSession = async () => {
//     const res = await api.get(`/attendance/sessions/${sessionId}`);
//     setSession(res.data);
//   };

//   const fetchStudents = async () => {
//     const res = await api.get(
//       `/attendance/sessions/${sessionId}/students`
//     );
//     setStudents(res.data);
//   };

//   useEffect(() => {
//     fetchSession();
//     fetchStudents();
//   }, []);

//   const markAttendance = async () => {
//     const payload = {
//       attendance: Object.keys(attendance).map((id) => ({
//         student_id: id,
//         status: attendance[id]
//       }))
//     };

//     await api.post(
//       `/attendance/sessions/${sessionId}/mark`,
//       payload
//     );

//     alert("Attendance marked");
//   };

//   const closeSession = async () => {
//     await api.put(
//       `/attendance/sessions/${sessionId}/close`
//     );
//     alert("Session closed");
//     fetchSession();
//   };

//   if (!session) return <p>Loading...</p>;

//   return (
//     <div className="container py-4">
//       <h4>Session Details</h4>

//       <div className="mb-3">
//         <strong>Date:</strong>{" "}
//         {new Date(session.lectureDate).toLocaleDateString()}
//       </div>

//       <div className="mb-3">
//         <strong>Status:</strong> {session.status}
//       </div>

//       {session.status === "OPEN" && (
//         <>
//           <table className="table table-bordered">
//             <thead>
//               <tr>
//                 <th>Student</th>
//                 <th>Mark</th>
//               </tr>
//             </thead>
//             <tbody>
//               {students.map((s) => (
//                 <tr key={s._id}>
//                   <td>{s.fullName}</td>
//                   <td>
//                     <select
//                       className="form-select"
//                       onChange={(e) =>
//                         setAttendance({
//                           ...attendance,
//                           [s._id]: e.target.value
//                         })
//                       }
//                     >
//                       <option value="">Select</option>
//                       <option value="PRESENT">Present</option>
//                       <option value="ABSENT">Absent</option>
//                     </select>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <button
//             className="btn btn-success me-2"
//             onClick={markAttendance}
//           >
//             Save Attendance
//           </button>

//           <button
//             className="btn btn-warning"
//             onClick={closeSession}
//           >
//             Close Session
//           </button>
//         </>
//       )}
//     </div>
//   );
// }




// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../../../api/axios";

// export default function SessionDetails() {
//   const { sessionId } = useParams();
//   const [session, setSession] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [attendance, setAttendance] = useState({});
//   const [loading, setLoading] = useState(true);

//   const fetchSession = async () => {
//     const res = await api.get(`/attendance/sessions/${sessionId}`);
//     setSession(res.data);
//   };

//   const fetchStudents = async () => {
//     try {
//       const res = await api.get(
//         `/attendance/sessions/${sessionId}/students`
//       );
//       setStudents(res.data);
//     } catch (err) {
//       console.log("Students route mismatch");
//     }
//   };

//   useEffect(() => {
//     const load = async () => {
//       await fetchSession();
//       await fetchStudents();
//       setLoading(false);
//     };
//     load();
//   }, []);

//   const markAttendance = async () => {
//     const payload = {
//       attendance: Object.keys(attendance).map((id) => ({
//         student_id: id,
//         status: attendance[id]
//       }))
//     };

//     await api.post(
//       `/attendance/sessions/${sessionId}/mark`,
//       payload
//     );

//     alert("Attendance marked successfully");
//   };

//   const closeSession = async () => {
//     await api.put(
//       `/attendance/sessions/${sessionId}/close`
//     );
//     alert("Session closed");
//     fetchSession();
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!session) return <p>No session found</p>;

//   return (
//     <div className="container py-4">
//       <h4 className="fw-bold mb-4">Session Details</h4>

//       <div className="card p-3 mb-4 shadow-sm">
//         <p><strong>Date:</strong> {new Date(session.lectureDate).toLocaleDateString()}</p>
//         <p><strong>Lecture No:</strong> {session.lectureNumber}</p>
//         <p><strong>Subject:</strong> {session.subject_id?.name}</p>
//         <p><strong>Course:</strong> {session.course_id?.name}</p>
//         <p><strong>Status:</strong> 
//           <span className={`badge ms-2 ${session.status === "OPEN" ? "bg-success" : "bg-secondary"}`}>
//             {session.status}
//           </span>
//         </p>
//         <p><strong>Total Students:</strong> {session.totalStudents}</p>
//       </div>

//       {session.status === "OPEN" && (
//         <>
//           <table className="table table-bordered">
//             <thead className="table-dark">
//               <tr>
//                 <th>Student</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {students.map((s) => (
//                 <tr key={s._id}>
//                   <td>{s.fullName}</td>
//                   <td>
//                     <select
//                       className="form-select"
//                       value={attendance[s._id] || ""}
//                       onChange={(e) =>
//                         setAttendance({
//                           ...attendance,
//                           [s._id]: e.target.value
//                         })
//                       }
//                     >
//                       <option value="">Select</option>
//                       <option value="PRESENT">Present</option>
//                       <option value="ABSENT">Absent</option>
//                     </select>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <button
//             className="btn btn-success me-2"
//             onClick={markAttendance}
//           >
//             Save Attendance
//           </button>

//           <button
//             className="btn btn-warning"
//             onClick={closeSession}
//           >
//             Close Session
//           </button>
//         </>
//       )}

//       {session.status === "CLOSED" && (
//         <div className="alert alert-info">
//           This session is closed. Attendance cannot be modified.
//         </div>
//       )}
//     </div>
//   );
// }





// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../../../api/axios";

// export default function SessionDetails() {
//   const { sessionId } = useParams();

//   const [session, setSession] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [records, setRecords] = useState([]); // ✅ attendance records
//   const [attendance, setAttendance] = useState({});
//   const [loading, setLoading] = useState(true);

//   /* ================= FETCH SESSION ================= */
//   const fetchSession = async () => {
//     const res = await api.get(`/attendance/sessions/${sessionId}`);
//     setSession(res.data);
//   };

//   /* ================= FETCH STUDENTS (OPEN ONLY) ================= */
//   const fetchStudents = async () => {
//     const res = await api.get(
//       `/attendance/sessions/${sessionId}/students`
//     );
//     setStudents(res.data);
//   };

//   /* ================= FETCH MARKED RECORDS ================= */
//   const fetchRecords = async () => {
//     const res = await api.get(
//       `/attendance/sessions/${sessionId}/records`
//     );
//     setRecords(res.data);
//   };

//   /* ================= LOAD DATA ================= */
//   useEffect(() => {
//     const load = async () => {
//       await fetchSession();
//       await fetchRecords(); // ✅ always fetch records

//       // If OPEN → also fetch students
//       const sessionRes = await api.get(
//         `/attendance/sessions/${sessionId}`
//       );

//       if (sessionRes.data.status === "OPEN") {
//         await fetchStudents();
//       }

//       setLoading(false);
//     };

//     load();
//   }, []);

//   /* ================= MARK ATTENDANCE ================= */
//   const markAttendance = async () => {
//     const payload = {
//       attendance: Object.keys(attendance).map((id) => ({
//         student_id: id,
//         status: attendance[id],
//       })),
//     };

//     await api.post(
//       `/attendance/sessions/${sessionId}/mark`,
//       payload
//     );

//     alert("Attendance marked successfully");
//     fetchRecords(); // refresh records
//   };

//   /* ================= CLOSE SESSION ================= */
//   const closeSession = async () => {
//     await api.put(
//       `/attendance/sessions/${sessionId}/close`
//     );

//     alert("Session closed");

//     await fetchSession();
//     await fetchRecords();
//   };

//   if (loading) return <p>Loading...</p>;
//   if (!session) return <p>No session found</p>;

//   return (
//     <div className="container py-4">
//       <h4 className="fw-bold mb-4">Session Details</h4>

//       {/* ================= SESSION INFO CARD ================= */}
//       <div className="card p-3 mb-4 shadow-sm">
//         <p>
//           <strong>Date:</strong>{" "}
//           {new Date(session.lectureDate).toLocaleDateString()}
//         </p>

//         <p>
//           <strong>Lecture No:</strong> {session.lectureNumber}
//         </p>

//         <p>
//           <strong>Subject:</strong> {session.subject_id?.name}
//         </p>

//         <p>
//           <strong>Course:</strong> {session.course_id?.name}
//         </p>

//         <p>
//           <strong>Status:</strong>
//           <span
//             className={`badge ms-2 ${
//               session.status === "OPEN"
//                 ? "bg-success"
//                 : "bg-secondary"
//             }`}
//           >
//             {session.status}
//           </span>
//         </p>

//         <p>
//           <strong>Total Students:</strong>{" "}
//           {records.length}
//         </p>
//       </div>

//       {/* =====================================================
//             OPEN SESSION → MARK ATTENDANCE UI
//       ===================================================== */}
//       {session.status === "OPEN" && (
//         <>
//           <table className="table table-bordered">
//             <thead className="table-dark">
//               <tr>
//                 <th>Student</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {students.map((s) => (
//                 <tr key={s._id}>
//                   <td>{s.fullName}</td>
//                   <td>
//                     <select
//                       className="form-select"
//                       value={attendance[s._id] || ""}
//                       onChange={(e) =>
//                         setAttendance({
//                           ...attendance,
//                           [s._id]: e.target.value,
//                         })
//                       }
//                     >
//                       <option value="">Select</option>
//                       <option value="PRESENT">
//                         Present
//                       </option>
//                       <option value="ABSENT">
//                         Absent
//                       </option>
//                     </select>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <button
//             className="btn btn-success me-2"
//             onClick={markAttendance}
//           >
//             Save Attendance
//           </button>

//           <button
//             className="btn btn-warning"
//             onClick={closeSession}
//           >
//             Close Session
//           </button>
//         </>
//       )}

//       {/* =====================================================
//             CLOSED SESSION → SHOW MARKED STUDENTS
//       ===================================================== */}
//       {session.status === "CLOSED" && (
//         <>
//           <div className="alert alert-info">
//             This session is closed. Attendance cannot
//             be modified.
//           </div>

//           <h5 className="mt-4 mb-3">
//             Marked Students
//           </h5>

//           <ul className="list-group">
//             {records.map((r) => (
//               <li
//                 key={r._id}
//                 className="list-group-item d-flex justify-content-between align-items-center"
//               >
//                 <span>
//                   {r.student_id?.fullName}
//                 </span>

//                 <span
//                   className={`badge ${
//                     r.status === "PRESENT"
//                       ? "bg-success"
//                       : "bg-danger"
//                   }`}
//                 >
//                   {r.status}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         </>
//       )}
//     </div>
//   );
// }





import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axios";

export default function SessionDetails() {
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH SESSION ================= */
  const fetchSession = async () => {
    const res = await api.get(`/attendance/sessions/${sessionId}`);
    setSession(res.data);
  };

  /* ================= FETCH ATTENDANCE RECORDS ================= */
  const fetchRecords = async () => {
    const res = await api.get(
      `/attendance/sessions/${sessionId}/records`
    );
    setRecords(res.data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchSession();
      await fetchRecords();
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!session) return <p>No session found</p>;

  /* ================= CALCULATIONS ================= */
  const total = records.length;
  const present = records.filter(r => r.status === "PRESENT").length;
  const absent = records.filter(r => r.status === "ABSENT").length;
  const percentage =
    total > 0 ? ((present / total) * 100).toFixed(2) : 0;

  return (
    <div className="container py-4">
      <h4 className="fw-bold mb-4">Session Details</h4>

      {/* ================= SESSION INFO CARD ================= */}
      <div className="card shadow-sm p-4 mb-4">
        <div className="row">
          <div className="col-md-6">
            <p><strong>Date:</strong> {new Date(session.lectureDate).toLocaleDateString()}</p>
            <p><strong>Lecture No:</strong> {session.lectureNumber}</p>
            <p><strong>Subject:</strong> {session.subject_id?.name}</p>
            <p><strong>Course:</strong> {session.course_id?.name}</p>
          </div>

          <div className="col-md-6">
            <p>
              <strong>Status:</strong>
              <span className={`badge ms-2 ${session.status === "OPEN" ? "bg-success" : "bg-secondary"}`}>
                {session.status}
              </span>
            </p>

            <p><strong>Total Students:</strong> {total}</p>
            <p><strong>Present:</strong> {present}</p>
            <p><strong>Absent:</strong> {absent}</p>
            <p><strong>Attendance %:</strong> {percentage}%</p>
          </div>
        </div>
      </div>

      {/* ================= CLOSED MESSAGE ================= */}
      {session.status === "CLOSED" && (
        <div className="alert alert-info">
          This session is closed. Attendance cannot be modified.
        </div>
      )}

      {/* ================= ATTENDANCE RECORD TABLE ================= */}
      <h5 className="mb-3">Attendance Records</h5>

      {records.length === 0 ? (
        <div className="alert alert-warning">
          No attendance records found.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-dark">
              <tr>
                <th>Student Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Marked By</th>
                <th>Marked At</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{r.student_id?.fullName}</td>
                  <td>{r.student_id?.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === "PRESENT"
                          ? "bg-success"
                          : "bg-danger"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.markedBy?.name}</td>
                  <td>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
