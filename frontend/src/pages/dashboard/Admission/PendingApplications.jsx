import React, { useEffect, useState } from "react";
import { Container, Table, Badge, Button, Pagination } from "react-bootstrap";
import { FaFileAlt, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";

export default function PendingApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/students/registered", {
          params: { page, limit: 10, search },
        });
        setApplications(res.data.data?.students || []);
        setTotalPages(res.data.data?.pages || 1);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load applications");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    // fetch will be triggered by page change? Actually search changes page too. Let's just setPage triggers fetch
    setPage(1);
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4">{error}</div>;

  return (
    <Container className="p-4">
      <h2 className="mb-4"><FaFileAlt /> Pending Applications</h2>

      <form onSubmit={handleSearch} className="mb-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="primary" type="submit"><FaSearch /> Search</Button>
        </div>
      </form>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Course</th>
            <th>Applied On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, idx) => (
            <tr key={app._id}>
              <td>{(page - 1) * 10 + idx + 1}</td>
              <td>{app.fullName || `${app.firstName} ${app.lastName}`}</td>
              <td>{app.email}</td>
              <td>{app.department_id?.name || "-"}</td>
              <td>{app.course_id?.name || "-"}</td>
              <td>{new Date(app.createdAt).toLocaleDateString()}</td>
              <td>
                <Link to={`/admission/application/${app._id}`} className="btn btn-sm btn-primary">
                  Review
                </Link>
              </td>
            </tr>
          ))}
          {applications.length === 0 && (
            <tr><td colSpan="7" className="text-center">No applications found</td></tr>
          )}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <Pagination.Prev onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
          <Pagination.Item active={page === i} onClick={() => setPage(i)} key={i}>
            {i}
          </Pagination.Item>
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item key={i} active={page === i} onClick={() => setPage(i)}>{i + 1}</Pagination.Item>
          ))}
          <Pagination.Next onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
        </Pagination>
      )}
    </Container>
  );
}
