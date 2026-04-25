import React, { useState, useEffect } from "react";
import { Container, Table, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { FaUser, FaKey, FaCheckCircle, FaTimesCircle, FaEye, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/college/staff");
        setStaff(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load staff list");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><FaUser /> Staff Accounts</h2>
        <Button variant="primary" onClick={() => navigate("/college/staff/create")}>
          Add New Staff
        </Button>
      </div>

      <Table striped bordered hover responsive className="bg-white">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Mobile</th>
            <th>Designation</th>
            <th>Employment</th>
            <th>Status</th>
            <th>Password</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td className="fw-medium">{s.name}</td>
              <td>{s.email}</td>
              <td><Badge bg="secondary">{s.role?.replace("_", " ")}</Badge></td>
              <td>{s.mobileNumber || "-"}</td>
              <td>{s.designation || "-"}</td>
              <td>{s.employmentType?.replace("_", " ")}</td>
              <td>
                <Badge bg={s.isActive ? "success" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                {s.mustChangePassword ? (
                  <Badge bg="warning" text="dark">
                    <FaKey /> Temp password
                  </Badge>
                ) : (
                  <Badge bg="success">
                    <FaCheckCircle /> Set
                  </Badge>
                )}
              </td>
              <td>{new Date(s.createdAt).toLocaleDateString()}</td>
              <td>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => navigate(`/staff/profile/${s.id}`)}
                  title="View Profile"
                >
                  <FaEye />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => navigate(`/staff/profile/edit/${s.id}`)}
                  title="Edit Profile"
                >
                  <FaEdit />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
