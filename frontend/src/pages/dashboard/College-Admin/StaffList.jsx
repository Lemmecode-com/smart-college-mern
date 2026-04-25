import React, { useState, useEffect } from "react";
import { Container, Table, Badge, Button, Spinner, Alert } from "react-bootstrap";
import { FaUser, FaKey, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import api from "../../../api/axios";

export default function StaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/college/staff");
        setStaff(res.data);
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
      <h2 className="mb-4"><FaUser /> Staff Accounts</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Password</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.role?.replace("_", " ")}</td>
              <td>
                <Badge bg={s.isActive ? "success" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                {s.mustChangePassword ? (
                  <Badge bg="warning" text="dark">
                    <FaKey /> Temp password set
                  </Badge>
                ) : (
                  <Badge bg="success">
                    <FaCheckCircle /> Changed
                  </Badge>
                )}
              </td>
              <td>{new Date(s.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
