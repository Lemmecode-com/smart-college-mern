// import React, { useState } from "react";
// import { Container, Row, Col, Card, Form, Button, Alert, Badge } from "react-bootstrap";
// import { FaUserPlus, FaKey, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
// import api from "../../../api/axios";

// export default function CreateStaff() {
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     role: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null); // { user, temporaryPassword }
//   const [error, setError] = useState(null);
//   const [showPassword, setShowPassword] = useState(false);

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setResult(null);
//     try {
//       const res = await api.post("/college/staff", formData);
//       setResult(res.data.data);
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to create staff account");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const allowedRoles = [
//     "ACCOUNTANT",
//     "ADMISSION_OFFICER",
//     "PRINCIPAL",
//     "HOD",
//     "EXAM_COORDINATOR",
//     "PARENT_GUARDIAN",
//     "PLATFORM_SUPPORT",
//   ];

//   return (
//     <Container className="p-4">
//       <h2 className="mb-4"><FaUserPlus /> Create Staff Account</h2>

//       <button onClick={() => useNavigate("/college/staff")}>StaffList</button>
//       <Card className="shadow-sm">
//         <Card.Body>
//           <Form onSubmit={handleSubmit}>
//             <Row xs={1} md={2} className="g-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Full Name</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="name"
//                     placeholder="Enter staff name"
//                     value={formData.name}
//                     onChange={handleChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Email Address</Form.Label>
//                   <Form.Control
//                     type="email"
//                     name="email"
//                     placeholder="Enter staff email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Role</Form.Label>
//                   <Form.Select
//                     name="role"
//                     value={formData.role}
//                     onChange={handleChange}
//                     required
//                   >
//                     <option value="">Select Role</option>
//                     {allowedRoles.map((r) => (
//                       <option key={r} value={r}>{r.replace("_", " ")}</option>
//                     ))}
//                   </Form.Select>
//                 </Form.Group>
//               </Col>
//               <Col className="align-self-end">
//                 <Button variant="primary" type="submit" disabled={loading}>
//                   {loading ? "Creating..." : <><FaUserPlus /> Create Account</>}
//                 </Button>
//               </Col>
//             </Row>
//           </Form>

//           {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

//           {result && (
//             <Alert variant="success" className="mt-3">
//               <h5><FaCheckCircle /> Staff account created successfully!</h5>
//               <hr />
//               <p><strong>Name:</strong> {result.user.name}</p>
//               <p><strong>Email:</strong> {result.user.email}</p>
//               <p><strong>Role:</strong> {result.user.role}</p>
//               <p>
//                 <strong>Temporary Password:</strong>{' '}
//                 <Badge bg="warning" className="text-dark">
//                   {showPassword ? result.temporaryPassword : "••••••••••••"}
//                 </Badge>{' '}
//                 <Button variant="outline-secondary btn-sm" onClick={() => setShowPassword(!showPassword)}>
//                   {showPassword ? "Hide" : "Show"}
//                 </Button>
//                 <Button variant="outline-primary btn-sm ms-2" onClick={() => { navigator.clipboard.writeText(result.temporaryPassword); }}>
//                   Copy
//                 </Button>
//               </p>
//               <p className="text-muted mb-0">
//                 <small>⚠️ Please securely share the temporary password with the staff member. They will be required to change it on first login.</small>
//               </p>
//             </Alert>
//           )}
//         </Card.Body>
//       </Card>
//     </Container>
//   );
// }



import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from "react-bootstrap";
import { FaUserPlus, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";

export default function CreateStaff() {
  const navigate = useNavigate(); // ✅ FIXED

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const allowedRoles = [
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "PRINCIPAL",
    "HOD",
    "EXAM_COORDINATOR",
    "PARENT_GUARDIAN",
    "PLATFORM_SUPPORT",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post("/college/staff", formData);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create staff account");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
    }
  };

  return (
    <Container className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><FaUserPlus /> Create Staff Account</h2>

        {/* ✅ FIXED NAVIGATION BUTTON */}
        <Button variant="secondary" onClick={() => navigate("/college/staff")}>
          Staff List
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row xs={1} md={2} className="g-3">
              
              {/* Name */}
              <Col>
                <Form.Group>
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Enter staff name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Email */}
              <Col>
                <Form.Group>
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter staff email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              {/* Role */}
              <Col>
                <Form.Group>
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Role</option>
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {r.replaceAll("_", " ")}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Submit */}
              <Col className="align-self-end">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Creating..." : (
                    <>
                      <FaUserPlus /> Create Account
                    </>
                  )}
                </Button>
              </Col>

            </Row>
          </Form>

          {/* Error */}
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}

          {/* Success */}
          {result && (
            <Alert variant="success" className="mt-3">
              <h5><FaCheckCircle /> Staff account created successfully!</h5>
              <hr />

              <p><strong>Name:</strong> {result.user.name}</p>
              <p><strong>Email:</strong> {result.user.email}</p>
              <p><strong>Role:</strong> {result.user.role}</p>

              <p>
                <strong>Temporary Password:</strong>{" "}
                <Badge bg="warning" className="text-dark">
                  {showPassword ? result.temporaryPassword : "••••••••••••"}
                </Badge>{" "}

                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>

                <Button
                  variant="outline-primary"
                  size="sm"
                  className="ms-2"
                  onClick={handleCopy}
                >
                  Copy
                </Button>
              </p>

              <p className="text-muted mb-0">
                <small>
                  ⚠️ Please securely share the temporary password with the staff member.
                  They must change it on first login.
                </small>
              </p>

              {/* ✅ BONUS: Redirect button */}
              <div className="mt-3">
                <Button variant="success" onClick={() => navigate("/college/staff")}>
                  Go to Staff List
                </Button>
              </div>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}