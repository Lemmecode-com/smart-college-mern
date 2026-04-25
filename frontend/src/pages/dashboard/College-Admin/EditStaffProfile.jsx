import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { FaSave, FaArrowLeft } from "react-icons/fa";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
};

export default function EditStaffProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // If no param, editing own profile
  const actualUserId = userId || currentUser?.id;

  // Auth check
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    const isSelf = currentUser.id === actualUserId;
    const isCollegeAdmin = currentUser.role === "COLLEGE_ADMIN";
    if (!isSelf && !isCollegeAdmin) {
      navigate("/dashboard");
    }
  }, [currentUser, actualUserId, navigate]);

  const [formData, setFormData] = useState({
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/staff/profile/${actualUserId}`);
        const p = res.data.data;
        if (p) {
          setFormData({
            mobileNumber: p.mobileNumber || "",
            designation: p.designation || "",
            employmentType: p.employmentType || "FULL_TIME",
            joiningDate: p.joiningDate ? p.joiningDate.split("T")[0] : "",
            gender: p.gender || "",
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
            bloodGroup: p.bloodGroup || "",
            address: p.address || "",
            city: p.city || "",
            state: p.state || "",
            pincode: p.pincode || "",
            emergencyContactName: p.emergencyContactName || "",
            emergencyContactPhone: p.emergencyContactPhone || "",
            emergencyRelation: p.emergencyRelation || "",
            qualification: p.qualification || "",
            experienceYears: p.experienceYears?.toString() || "",
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      }
    };
    if (actualUserId) fetchProfile();
  }, [actualUserId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        ...formData,
        experienceYears: formData.experienceYears ? Number(formData.experienceYears) : 0,
      };
      await api.put(`/staff/profile/${actualUserId}`, payload);
      setSuccess(true);
      setTimeout(() => navigate(`/staff/profile/${actualUserId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <FaArrowLeft /> Back
          </Button>
          <h2 style={{ color: BRAND_COLORS.primary.main }}>
            <FaSave className="me-2" /> Edit Staff Profile
          </h2>
        </div>
      </div>

      <Card className="shadow-sm" style={{ borderRadius: "1rem" }}>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row xs={1} md={2} className="g-3">
              {/* Mobile */}
              <Col>
                <Form.Group>
                  <Form.Label>Mobile Number</Form.Label>
                  <Form.Control
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                  />
                </Form.Group>
              </Col>

              {/* Designation */}
              <Col>
                <Form.Group>
                  <Form.Label>Designation</Form.Label>
                  <Form.Control
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g., Senior Accountant"
                  />
                </Form.Group>
              </Col>

              {/* Employment Type */}
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

              {/* Joining Date */}
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

              {/* Gender */}
              <Col>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* DOB */}
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

              {/* Blood Group */}
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

              {/* Qualification */}
              <Col>
                <Form.Group>
                  <Form.Label>Qualification</Form.Label>
                  <Form.Control
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g., B.Com, MCA"
                  />
                </Form.Group>
              </Col>

              {/* Experience */}
              <Col>
                <Form.Group>
                  <Form.Label>Experience (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    name="experienceYears"
                    min="0"
                    value={formData.experienceYears}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>

              {/* Address (full width) */}
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full address"
                  />
                </Form.Group>
              </Col>

              {/* City, State, Pincode */}
              <Col md={4}>
                <Form.Group>
                  <Form.Label>City</Form.Label>
                  <Form.Control type="text" name="city" value={formData.city} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>State</Form.Label>
                  <Form.Control type="text" name="state" value={formData.state} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Pincode</Form.Label>
                  <Form.Control type="text" name="pincode" value={formData.pincode} onChange={handleChange} />
                </Form.Group>
              </Col>

              {/* Emergency Contact */}
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Emergency Contact Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Emergency Contact Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Relation</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyRelation"
                    value={formData.emergencyRelation}
                    onChange={handleChange}
                    placeholder="e.g., Father"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Error */}
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

            {/* Success */}
            {success && (
              <Alert variant="success" className="mt-3">
                Profile updated successfully! Redirecting...
              </Alert>
            )}

            {/* Actions */}
            <div className="mt-4 text-end">
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                style={{
                  background: BRAND_COLORS.primary.gradient,
                  border: "none",
                  padding: "0.75rem 2rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                {loading ? "Saving..." : <> <FaSave className="me-2" /> Save Changes </>}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}