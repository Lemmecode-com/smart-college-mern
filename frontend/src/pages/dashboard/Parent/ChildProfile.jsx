// import React, { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { Container, Row, Col, Card, Badge, Spinner, Alert } from "react-bootstrap";
// import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGraduationCap } from "react-icons/fa";
// import api from "../../api/axios";

// export default function ChildProfile() {
//   const { studentId } = useParams();
//   const [student, setStudent] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         const res = await api.get(`/parent/student/${studentId}/profile`);
//         setStudent(res.data.data);
//       } catch (err) {
//         setError(err.response?.data?.message || "Failed to load profile");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchProfile();
//   }, [studentId]);

//   if (loading) return <Spinner animation="border" className="m-4" />;
//   if (error) return <Alert variant="danger">{error}</Alert>;

//   const { firstName, lastName, email, phone, dateOfBirth, gender, address, department_id, course_id, enrollmentNo, status } = student;

//   return (
//     <Container className="p-4">
//       <div className="mb-3">
//         <Link to="/dashboard/parent" className="btn btn-outline-secondary"><FaArrowLeft /> Back to Dashboard</Link>
//       </div>
//       <h2 className="mb-4"><FaUser /> {firstName} {lastName}'s Profile</h2>
//       <Row xs={1} md={2} className="g-4">
//         <Col>
//           <Card className="shadow-sm">
//             <Card.Header>Personal Information</Card.Header>
//             <Card.Body>
//               <p><FaEnvelope /> <strong>Email:</strong> {email}</p>
//               <p><FaPhone /> <strong>Phone:</strong> {phone || "N/A"}</p>
//               <p><FaGraduationCap /> <strong>Date of Birth:</strong> {dateOfBirth || "N/A"}</p>
//               <p><strong>Gender:</strong> {gender || "N/A"}</p>
//               <p><FaMapMarkerAlt /> <strong>Address:</strong> {address || "N/A"}</p>
//               <p><strong>Enrollment No:</strong> {enrollmentNo || "N/A"}</p>
//               <p><strong>Status:</strong> <Badge bg={status === 'APPROVED' ? 'success' : 'warning'}>{status}</Badge></p>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col>
//           <Card className="shadow-sm">
//             <Card.Header>Academic Details</Card.Body>
//               <p><strong>Department:</strong> {department_id?.name || "N/A"}</p>
//               <p><strong>Course:</strong> {course_id?.name || "N/A"}</p>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>
//     </Container>
//   );
// }



import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaGraduationCap } from "react-icons/fa";
import api from "../../../api/axios";

export default function ChildProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/parent/student/${studentId}/profile`);
        setStudent(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [studentId]);

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    gender,
    address,
    department_id,
    course_id,
    enrollmentNo,
    status,
  } = student;

  return (
    <Container className="p-4">
      <div className="mb-3">
        <Link to="/dashboard/parent" className="btn btn-outline-secondary">
          <FaArrowLeft /> Back to Dashboard
        </Link>
      </div>

      <h2 className="mb-4">
        <FaUser /> {firstName} {lastName}'s Profile
      </h2>

      <Row xs={1} md={2} className="g-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header>Personal Information</Card.Header>

            <Card.Body>
              <p><FaEnvelope /> <strong>Email:</strong> {email}</p>
              <p><FaPhone /> <strong>Phone:</strong> {phone || "N/A"}</p>
              <p><FaGraduationCap /> <strong>Date of Birth:</strong> {dateOfBirth || "N/A"}</p>
              <p><strong>Gender:</strong> {gender || "N/A"}</p>
              <p><FaMapMarkerAlt /> <strong>Address:</strong> {address || "N/A"}</p>
              <p><strong>Enrollment No:</strong> {enrollmentNo || "N/A"}</p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge bg={status === "APPROVED" ? "success" : "warning"}>
                  {status}
                </Badge>
              </p>
            </Card.Body>
          </Card>
        </Col>

        <Col>
          <Card className="shadow-sm">
            <Card.Header>Academic Details</Card.Header>

            <Card.Body>
              <p><strong>Department:</strong> {department_id?.name || "N/A"}</p>
              <p><strong>Course:</strong> {course_id?.name || "N/A"}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}