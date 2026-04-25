import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Table, Badge, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft, FaCalendarCheck } from "react-icons/fa";
import api from "../../../api/axios";

export default function ChildAttendance() {
  const { studentId } = useParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get(`/parent/student/${studentId}/attendance`);
        setRecords(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [studentId]);

  if (loading) return <Spinner animation="border" className="m-4" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="p-4">
      <div className="mb-3">
        <Link to="/dashboard/parent" className="btn btn-outline-secondary"><FaArrowLeft /> Back to Dashboard</Link>
      </div>
      <h2 className="mb-4"><FaCalendarCheck /> Attendance Records</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Date</th>
            <th>Slot</th>
            <th>Course</th>
            <th>Topic</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr><td colSpan="5" className="text-center">No attendance records found</td></tr>
          )}
          {records.map((rec) => (
            <tr key={rec._id}>
              <td>{new Date(rec.session_id?.date).toLocaleDateString()}</td>
              <td>{rec.session_id?.slotNumber || "N/A"}</td>
              <td>{rec.course_id?.name || "N/A"}</td>
              <td>{rec.session_id?.topic || "N/A"}</td>
              <td>
                <Badge bg={rec.status === 'PRESENT' ? 'success' : rec.status === 'ABSENT' ? 'danger' : 'warning'}>
                  {rec.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
