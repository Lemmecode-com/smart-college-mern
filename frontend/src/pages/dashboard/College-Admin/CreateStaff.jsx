// import React, { useState } from "react";
// import { Container, Row, Col, Card, Form, Button, Alert, Badge } from "react-bootstrap";
// import { FaUserPlus, FaCheckCircle } from "react-icons/fa";
// import { useNavigate } from "react-router-dom";
// import api from "../../../api/axios";

// export default function CreateStaff() {
//   const navigate = useNavigate(); // ✅ FIXED

//    const [formData, setFormData] = useState({
//      name: "",
//      email: "",
//      role: "",
//      // Profile fields
//      mobileNumber: "",
//      designation: "",
//      employmentType: "FULL_TIME",
//      joiningDate: "",
//      gender: "",
//      dateOfBirth: "",
//      bloodGroup: "",
//      address: "",
//      city: "",
//      state: "",
//      pincode: "",
//      emergencyContactName: "",
//      emergencyContactPhone: "",
//      emergencyRelation: "",
//      qualification: "",
//      experienceYears: "",
//    });

//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState(null);
//   const [showPassword, setShowPassword] = useState(false);

//   const allowedRoles = [
//     "ACCOUNTANT",
//     "ADMISSION_OFFICER",
//     "PRINCIPAL",
//     "HOD",
//     "EXAM_COORDINATOR",
//     "PARENT_GUARDIAN",
//     "PLATFORM_SUPPORT",
//   ];

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
//       setResult(res.data);
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to create staff account");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCopy = () => {
//     if (result?.temporaryPassword) {
//       navigator.clipboard.writeText(result.temporaryPassword);
//     }
//   };

//   return (
//     <Container className="p-4">
//       <div className="d-flex justify-content-between align-items-center mb-4">
//         <h2><FaUserPlus /> Create Staff Account</h2>
//         <Button variant="secondary" onClick={() => navigate("/college/staff")}>
//           Staff List
//         </Button>
//       </div>

//       <Card className="shadow-sm">
//         <Card.Body>
//           <Form onSubmit={handleSubmit}>
//             {/* === ROW 1: Basic Info === */}
//             <Row xs={1} md={2} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Full Name *</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="name"
//                     placeholder="Enter full name"
//                     value={formData.name}
//                     onChange={handleChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Email Address *</Form.Label>
//                   <Form.Control
//                     type="email"
//                     name="email"
//                     placeholder="Enter email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     required
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>

//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Role *</Form.Label>
//                   <Form.Select
//                     name="role"
//                     value={formData.role}
//                     onChange={handleChange}
//                     required
//                   >
//                     <option value="">Select Role</option>
//                     {allowedRoles.map((r) => (
//                       <option key={r} value={r}>
//                         {r.replaceAll("_", " ")}
//                       </option>
//                     ))}
//                   </Form.Select>
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Mobile Number</Form.Label>
//                   <Form.Control
//                     type="tel"
//                     name="mobileNumber"
//                     placeholder="10-digit mobile"
//                     value={formData.mobileNumber}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Designation</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="designation"
//                     placeholder="e.g., Senior Accountant"
//                     value={formData.designation}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>

//             {/* === ROW 2: Employment & Personal === */}
//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Employment Type</Form.Label>
//                   <Form.Select
//                     name="employmentType"
//                     value={formData.employmentType}
//                     onChange={handleChange}
//                   >
//                     <option value="FULL_TIME">Full Time</option>
//                     <option value="PART_TIME">Part Time</option>
//                     <option value="CONTRACT">Contract</option>
//                     <option value="INTERN">Intern</option>
//                   </Form.Select>
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Joining Date</Form.Label>
//                   <Form.Control
//                     type="date"
//                     name="joiningDate"
//                     value={formData.joiningDate}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Gender</Form.Label>
//                   <Form.Select
//                     name="gender"
//                     value={formData.gender}
//                     onChange={handleChange}
//                   >
//                     <option value="">Select Gender</option>
//                     <option value="Male">Male</option>
//                     <option value="Female">Female</option>
//                     <option value="Other">Other</option>
//                   </Form.Select>
//                 </Form.Group>
//               </Col>
//             </Row>

//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Date of Birth</Form.Label>
//                   <Form.Control
//                     type="date"
//                     name="dateOfBirth"
//                     value={formData.dateOfBirth}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Blood Group</Form.Label>
//                   <Form.Select
//                     name="bloodGroup"
//                     value={formData.bloodGroup}
//                     onChange={handleChange}
//                   >
//                     <option value="">Select</option>
//                     <option value="A+">A+</option>
//                     <option value="A-">A-</option>
//                     <option value="B+">B+</option>
//                     <option value="B-">B-</option>
//                     <option value="AB+">AB+</option>
//                     <option value="AB-">AB-</option>
//                     <option value="O+">O+</option>
//                     <option value="O-">O-</option>
//                   </Form.Select>
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Qualification</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="qualification"
//                     placeholder="e.g., B.Com, MCA"
//                     value={formData.qualification}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>

//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Experience (Years)</Form.Label>
//                   <Form.Control
//                     type="number"
//                     name="experienceYears"
//                     placeholder="0"
//                     min="0"
//                     value={formData.experienceYears}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col md={6}>
//                 <Form.Group>
//                   <Form.Label>Address</Form.Label>
//                   <Form.Control
//                     as="textarea"
//                     rows={2}
//                     name="address"
//                     placeholder="Full address"
//                     value={formData.address}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 {/* Empty spacing to balance row */}
//               </Col>
//             </Row>

//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Label>City</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="city"
//                   placeholder="City"
//                   value={formData.city}
//                   onChange={handleChange}
//                 />
//               </Col>
//               <Col>
//                 <Form.Label>State</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="state"
//                   placeholder="State"
//                   value={formData.state}
//                   onChange={handleChange}
//                 />
//               </Col>
//               <Col>
//                 <Form.Label>Pincode</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="pincode"
//                   placeholder="PIN"
//                   value={formData.pincode}
//                   onChange={handleChange}
//                 />
//               </Col>
//             </Row>

//             {/* === ROW: Emergency Contact === */}
//             <Row xs={1} md={3} className="g-3 mb-3">
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Emergency Contact Name</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="emergencyContactName"
//                     placeholder="Contact person"
//                     value={formData.emergencyContactName}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Emergency Contact Phone</Form.Label>
//                   <Form.Control
//                     type="tel"
//                     name="emergencyContactPhone"
//                     placeholder="Phone number"
//                     value={formData.emergencyContactPhone}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//               <Col>
//                 <Form.Group>
//                   <Form.Label>Relation</Form.Label>
//                   <Form.Control
//                     type="text"
//                     name="emergencyRelation"
//                     placeholder="e.g., Father, Spouse"
//                     value={formData.emergencyRelation}
//                     onChange={handleChange}
//                   />
//                 </Form.Group>
//               </Col>
//             </Row>

//             {/* === SUBMIT === */}
//             <Row>
//               <Col className="text-end">
//                 <Button variant="primary" type="submit" disabled={loading} style={{ minWidth: "200px" }}>
//                   {loading ? "Creating..." <> <motion.div variants={spinVariants} animate="animate"><FaSyncAlt size={18} className="ms-2"/></motion.div> </> : (
//                     <> <FaUserPlus /> Create Account </>
//                   )}
//                 </Button>
//               </Col>
//             </Row>

//           </Form>

//           {/* Error */}
//           {error && (
//             <Alert variant="danger" className="mt-3">
//               {error}
//             </Alert>
//           )}

//           {/* Success */}
//           {result && (
//             <Alert variant="success" className="mt-3">
//               <h5><FaCheckCircle /> Staff account created successfully!</h5>
//               <hr />
//               <p><strong>Name:</strong> {result.user.name}</p>
//               <p><strong>Email:</strong> {result.user.email}</p>
//               <p><strong>Role:</strong> {result.user.role}</p>
//               <p>
//                 <strong>Temporary Password:</strong>{" "}
//                 <Badge bg="warning" className="text-dark">
//                   {showPassword ? result.temporaryPassword : "••••••••••••"}
//                 </Badge>{" "}
//                 <Button variant="outline-secondary" size="sm" onClick={() => setShowPassword(!showPassword)}>
//                   {showPassword ? "Hide" : "Show"}
//                 </Button>
//                 <Button variant="outline-primary" size="sm" className="ms-2" onClick={handleCopy}>
//                   Copy
//                 </Button>
//               </p>
//               <p className="text-muted mb-0">
//                 <small>
//                   ⚠️ Share the temporary password securely. User must change it on first login.
//                 </small>
//               </p>
//               <div className="mt-3">
//                 <Button variant="success" onClick={() => navigate("/college/staff")}>
//                   Go to Staff List
//                 </Button>
//               </div>
//             </Alert>
//           )}
//         </Card.Body>
//       </Card>
//     </Container>
//   );
// }



import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from "react-bootstrap";
import { FaUserPlus, FaCheckCircle, FaSync } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export default function CreateStaff() {
  const navigate = useNavigate(); // ✅ FIXED

   const [formData, setFormData] = useState({
     name: "",
     email: "",
     role: "",
     // Profile fields
     mobileNumber: "",
     designation: "",
     employmentType: "FULL_TIME",
     joiningDate: "",
     gender: "",
     dateOfBirth: "",
     bloodGroup: "",
     address: "",
     city: "",
     state: "",
     pincode: "",
     emergencyContactName: "",
     emergencyContactPhone: "",
     emergencyRelation: "",
     qualification: "",
     experienceYears: "",
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
        <Button variant="secondary" onClick={() => navigate("/college/staff")}>
          Staff List
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* === ROW 1: Basic Info === */}
            <Row xs={1} md={2} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Role *</Form.Label>
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
              <Col>
                <Form.Group>
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control
                    type="tel"
                    name="mobileNumber"
                    placeholder="10-digit mobile"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Designation</Form.Label>
                  <Form.Control
                    type="text"
                    name="designation"
                    placeholder="e.g., Senior Accountant"
                    value={formData.designation}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* === ROW 2: Employment & Personal === */}
            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Employment Type</Form.Label>
                  <Form.Select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Joining Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Blood Group</Form.Label>
                  <Form.Select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Qualification</Form.Label>
                  <Form.Control
                    type="text"
                    name="qualification"
                    placeholder="e.g., B.Com, MCA"
                    value={formData.qualification}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Experience (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    name="experienceYears"
                    placeholder="0"
                    min="0"
                    value={formData.experienceYears}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                {/* Empty spacing to balance row */}
              </Col>
            </Row>

            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Label>City</Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                />
              </Col>
              <Col>
                <Form.Label>State</Form.Label>
                <Form.Control
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                />
              </Col>
              <Col>
                <Form.Label>Pincode</Form.Label>
                <Form.Control
                  type="text"
                  name="pincode"
                  placeholder="PIN"
                  value={formData.pincode}
                  onChange={handleChange}
                />
              </Col>
            </Row>

            {/* === ROW: Emergency Contact === */}
            <Row xs={1} md={3} className="g-3 mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Emergency Contact Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyContactName"
                    placeholder="Contact person"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Emergency Contact Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="emergencyContactPhone"
                    placeholder="Phone number"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Relation</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyRelation"
                    placeholder="e.g., Father, Spouse"
                    value={formData.emergencyRelation}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* === SUBMIT === */}
            <Row>
              <Col className="text-end">
                <Button variant="primary" type="submit" disabled={loading} style={{ minWidth: "200px" }}>
                  {loading ? (
                    <>
                      Creating... <motion.span variants={spinVariants} animate="animate" style={{ display: "inline-block" }}><FaSync size={18} className="ms-2"/></motion.span>
                    </>
                  ) : (
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
                <Button variant="outline-secondary" size="sm" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </Button>
                <Button variant="outline-primary" size="sm" className="ms-2" onClick={handleCopy}>
                  Copy
                </Button>
              </p>
              <p className="text-muted mb-0">
                <small>
                  ⚠️ Share the temporary password securely. User must change it on first login.
                </small>
              </p>
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