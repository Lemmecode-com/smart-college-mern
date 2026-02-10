// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../../api/axios";

// export default function TimetableList() {
//   const navigate = useNavigate();

//   const [timetables, setTimetables] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   /* ================= LOAD TIMETABLES ================= */
//   useEffect(() => {
//     const loadTimetables = async () => {
//       try {
//         const res = await api.get("/timetable"); // ✅ CORRECT ENDPOINT
//         setTimetables(res.data);
//       } catch (err) {
//         setError("Failed to load timetables");
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadTimetables();
//   }, []);

//   /* ================= PUBLISH ================= */
//   const publishTimetable = async (id) => {
//     if (!window.confirm("Publish this timetable?")) return;

//     try {
//       await api.put(`/timetable/${id}/publish`);
//       setTimetables((prev) =>
//         prev.map((t) =>
//           t._id === id ? { ...t, status: "PUBLISHED" } : t
//         )
//       );
//     } catch {
//       alert("Failed to publish timetable");
//     }
//   };

//   /* ================= DELETE ================= */
//   const deleteTimetable = async (id) => {
//     if (!window.confirm("Delete this timetable?")) return;

//     try {
//       await api.delete(`/timetable/${id}`);
//       setTimetables((prev) => prev.filter((t) => t._id !== id));
//     } catch {
//       alert("Failed to delete timetable");
//     }
//   };

//   if (loading) return <p className="text-center mt-5">Loading...</p>;

//   return (
//     <div className="container py-4">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h4 className="fw-bold">Timetables</h4>
//         <button
//           className="btn btn-primary"
//           onClick={() => navigate("/timetable/create")}
//         >
//           + Create Timetable
//         </button>
//       </div>

//       {error && <div className="alert alert-danger">{error}</div>}

//       {timetables.length === 0 ? (
//         <div className="alert alert-info">No timetables found</div>
//       ) : (
//         <div className="table-responsive">
//           <table className="table table-bordered align-middle">
//             <thead className="table-light">
//               <tr>
//                 <th>Name</th>
//                 <th>Semester</th>
//                 <th>Academic Year</th>
//                 <th>Status</th>
//                 <th width="260">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {timetables.map((t) => (
//                 <tr key={t._id}>
//                   <td>{t.name}</td>
//                   <td>Semester {t.semester}</td>
//                   <td>{t.academicYear}</td>
//                   <td>
//                     <span
//                       className={`badge ${
//                         t.status === "PUBLISHED"
//                           ? "bg-success"
//                           : "bg-warning text-dark"
//                       }`}
//                     >
//                       {t.status}
//                     </span>
//                   </td>
//                   <td>
//                     <div className="d-flex gap-2">
//                       <button
//                         className="btn btn-outline-primary btn-sm"
//                         onClick={() =>
//                           navigate(`/timetable/add-slot?timetable=${t._id}`)
//                         }
//                       >
//                         Add Slots
//                       </button>

//                       {t.status === "DRAFT" && (
//                         <button
//                           className="btn btn-success btn-sm"
//                           onClick={() => publishTimetable(t._id)}
//                         >
//                           Publish
//                         </button>
//                       )}

//                       <button
//                         className="btn btn-danger btn-sm"
//                         onClick={() => deleteTimetable(t._id)}
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }



// import { useContext, useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { AuthContext } from "../../../auth/AuthContext";
// import api from "../../../api/axios";

// import {
//   FaCalendarAlt,
//   FaCheckCircle,
//   FaTrash,
//   FaEye
// } from "react-icons/fa";

// export default function TimetableList() {
//   const { user } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const [timetables, setTimetables] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const isTeacher = user?.role === "TEACHER";

//   useEffect(() => {
//     fetchTimetables();
//   }, []);

//   const fetchTimetables = async () => {
//     try {
//       const res = await api.get("/timetable");
//       setTimetables(res.data);
//     } catch {
//       setError("Failed to load timetables");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const publishTimetable = async (id) => {
//     if (!window.confirm("Publish this timetable?")) return;

//     await api.put(`/timetable/publish/${id}`);
//     fetchTimetables();
//   };

//   const deleteTimetable = async (id) => {
//     if (!window.confirm("Delete this timetable?")) return;

//     await api.delete(`/timetable/${id}`);
//     fetchTimetables();
//   };

//   if (loading) return <p className="text-center mt-4">Loading...</p>;

//   return (
//     <div className="container py-4">

//       <h4 className="fw-bold mb-3">
//         <FaCalendarAlt className="me-2" />
//         Timetables
//       </h4>

//       {error && <div className="alert alert-danger">{error}</div>}

//       <div className="table-responsive">
//         <table className="table table-bordered align-middle">
//           <thead className="table-dark">
//             <tr>
//               <th>Name</th>
//               <th>Semester</th>
//               <th>Academic Year</th>
//               <th>Status</th>
//               <th width="220">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {timetables.map((t) => (
//               <tr key={t._id}>
//                 <td className="fw-semibold">{t.name}</td>
//                 <td>{t.semester}</td>
//                 <td>{t.academicYear}</td>
//                 <td>
//                   <span
//                     className={`badge ${
//                       t.status === "PUBLISHED"
//                         ? "bg-success"
//                         : "bg-warning"
//                     }`}
//                   >
//                     {t.status}
//                   </span>
//                 </td>
//                 <td>
//                   <button
//                     className="btn btn-sm btn-outline-primary me-2"
//                     onClick={() =>
//                       navigate(
//                         `/timetable/weekly?dept=${t.department_id}&course=${t.course_id}&sem=${t.semester}`
//                       )
//                     }
//                   >
//                     <FaEye /> View
//                   </button>

//                   {isTeacher && t.status === "DRAFT" && (
//                     <>
//                       <button
//                         className="btn btn-sm btn-success me-2"
//                         onClick={() => publishTimetable(t._id)}
//                       >
//                         <FaCheckCircle /> Publish
//                       </button>

//                       <button
//                         className="btn btn-sm btn-danger"
//                         onClick={() => deleteTimetable(t._id)}
//                       >
//                         <FaTrash />
//                       </button>
//                     </>
//                   )}
//                 </td>
//               </tr>
//             ))}

//             {timetables.length === 0 && (
//               <tr>
//                 <td colSpan="5" className="text-center text-muted">
//                   No timetables found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTrash,
  FaEye
} from "react-icons/fa";

export default function TimetableList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isTeacher = user?.role === "TEACHER";

  useEffect(() => {
    fetchTimetables();
  }, []);

  /* ================= FETCH ================= */
  const fetchTimetables = async () => {
    try {
      const res = await api.get("/timetable");
      setTimetables(res.data);
    } catch (err) {
      setError("Failed to load timetables");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUBLISH ================= */
  const publishTimetable = async (id) => {
    if (!window.confirm("Publish this timetable?")) return;

    try {
      await api.put(`/timetable/${id}/publish`);
      fetchTimetables();
    } catch {
      alert("Failed to publish timetable");
    }
  };

  /* ================= DELETE ================= */
  const deleteTimetable = async (id) => {
    if (!window.confirm("Delete this timetable?")) return;

    try {
      await api.delete(`/timetable/${id}`);
      fetchTimetables();
    } catch {
      alert("Failed to delete timetable");
    }
  };

  if (loading) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  return (
    <div className="container py-4">

      <h4 className="fw-bold mb-3">
        <FaCalendarAlt className="me-2" />
        Timetables
      </h4>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Semester</th>
              <th>Academic Year</th>
              <th>Status</th>
              <th width="220">Actions</th>
            </tr>
          </thead>

          <tbody>
            {timetables.map((t) => (
              <tr key={t._id}>
                <td className="fw-semibold">{t.name}</td>
                <td>{t.semester}</td>
                <td>{t.academicYear}</td>
                <td>
                  <span
                    className={`badge ${
                      t.status === "PUBLISHED"
                        ? "bg-success"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>

                <td>
                  {/* VIEW WEEKLY TIMETABLE */}
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() =>
                      navigate(`/timetable/${t._id}/weekly`)
                    }
                  >
                    <FaEye /> View
                  </button>

                  {/* HOD ACTIONS (BACKEND WILL VERIFY) */}
                  {isTeacher && t.status === "DRAFT" && (
                    <>
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={() => publishTimetable(t._id)}
                      >
                        <FaCheckCircle /> Publish
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteTimetable(t._id)}
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {timetables.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No timetables found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
