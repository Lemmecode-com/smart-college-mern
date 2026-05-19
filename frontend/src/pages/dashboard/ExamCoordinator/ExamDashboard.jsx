import React from "react";
import { Container, Card, Alert } from "react-bootstrap";
import { FaClock, FaTools } from "react-icons/fa";

export default function ExamDashboard() {
  return (
    <Container className="p-4">
      <h2 className="mb-4">
        <FaClock /> Exam Coordinator Dashboard
      </h2>

      <Alert variant="info">
        <Alert.Heading>
          <FaTools /> Under Development
        </Alert.Heading>

        <p>
          The full exam management module is planned for <strong>V1.1</strong>.
          Currently, you have access to view students, teachers, and timetables for exam planning.
        </p>

        <hr />

        <div className="mb-0">
          Available now:
          <br />
          - View approved student lists
          <br />
          - View teacher details
          <br />
          - View timetable and schedule
          <br />
          - Access attendance records for planning
        </div>
      </Alert>

      <Card className="mt-4 shadow-sm">
        <Card.Body>
          <Card.Title>Quick Links</Card.Title>

          <ul className="list-unstyled">
            <li>
              <a href="/students/approved-students">View Approved Students</a>
            </li>
            <li>
              <a href="/teachers">View Teachers</a>
            </li>
            <li>
              <a href="/timetable/list">View Timetable</a>
            </li>
            <li>
              <a href="/attendance/report">Attendance Reports</a>
            </li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
}