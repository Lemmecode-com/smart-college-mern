// import { useContext, useEffect, useState } from "react";
// import { AuthContext } from "../../auth/AuthContext";
// import api from "../../api/axios";

// export default function Dashboard() {
//   const { user } = useContext(AuthContext);
//   const [courses, setCourses] = useState([]);

//   useEffect(() => {
//     if (user?.role === "teacher") {
//       api
//         .get("/courses/my")
//         .then((res) => {
//           setCourses(res.data?.data || []);
//         })
//         .catch(() => setCourses([]));
//     }
//   }, [user]);

//   return (
//     <div>
//       <h4 className="mb-3">Dashboard</h4>

//       {user?.role === "admin" && (
//         <div className="alert alert-info">
//           Welcome Admin. Use sidebar to manage college data.
//         </div>
//       )}

//       {user?.role === "teacher" && (
//         <>
//           <h6 className="mb-2">My Courses</h6>

//           <div className="row">
//             {courses.length > 0 ? (
//               courses.map((c) => (
//                 <div key={c._id} className="col-md-4 mb-3">
//                   <div className="card shadow-sm">
//                     <div className="card-body">
//                       <h6>{c.name}</h6>
//                       <p className="text-muted mb-1">
//                         Department: {c.departmentId?.name || "-"}
//                       </p>
//                       <span className="badge bg-success">Active</span>
//                     </div>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <p className="text-muted">No courses assigned.</p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }




// src/pages/dashboard/Dashboard.jsx
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";
import { Card, Row, Col, Spinner, Alert } from "react-bootstrap";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    departments: 0,
  });

  const [teacherCourses, setTeacherCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [studentsRes, coursesRes, departmentsRes] = await Promise.all([
          api.get("/students"),
          api.get("/courses"),
          api.get("/departments"),
        ]);

        setStats({
          students:
            studentsRes.data?.data?.length ||
            studentsRes.data?.length ||
            0,
          courses:
            coursesRes.data?.data?.length ||
            coursesRes.data?.length ||
            0,
          departments:
            departmentsRes.data?.data?.length ||
            departmentsRes.data?.length ||
            0,
        });
      } catch (err) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    const fetchTeacherCourses = async () => {
      try {
        const res = await api.get("/courses");
        setTeacherCourses(res.data?.data || res.data || []);
      } catch (err) {
        setError("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      fetchAdminData();
    } else if (user?.role === "teacher") {
      fetchTeacherCourses();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f3a4a, #134952)",
        padding: "20px",
      }}
    >
      <h3 className="text-white mb-4">Dashboard</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ADMIN DASHBOARD */}
      {user?.role === "admin" && (
        <>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Students</h6>
                  <h2 className="text-primary">{stats.students}</h2>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Courses</h6>
                  <h2 className="text-success">{stats.courses}</h2>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow border-0">
                <Card.Body>
                  <h6>Total Departments</h6>
                  <h2 className="text-warning">{stats.departments}</h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Alert variant="info">
            Welcome Admin 👋  
            Use the sidebar to manage Students, Courses, Departments & more.
          </Alert>
        </>
      )}

      {/* TEACHER DASHBOARD */}
      {user?.role === "teacher" && (
        <>
          <h5 className="text-white mb-3">My Courses</h5>

          <Row>
            {teacherCourses.length > 0 ? (
              teacherCourses.map((course) => (
                <Col md={4} key={course._id} className="mb-3">
                  <Card className="shadow border-0">
                    <Card.Body>
                      <h6>{course.name}</h6>
                      <p className="text-muted mb-1">
                        Department: {course.departmentId?.name || "N/A"}
                      </p>
                      <span className="badge bg-success">
                        {course.status || "Active"}
                      </span>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            ) : (
              <p className="text-light">No courses available.</p>
            )}
          </Row>
        </>
      )}
    </div>
  );
}

