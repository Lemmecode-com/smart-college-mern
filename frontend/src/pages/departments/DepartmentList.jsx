import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";
import {
  FaEdit,
  FaTrash,
  FaSearch,
  FaSave,
  FaTimes
} from "react-icons/fa";

export default function DepartmentList() {
  const { user } = useContext(AuthContext);

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editDept, setEditDept] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  /* ================= ROLE GUARD ================= */
  if (!user || !["admin", "collegeAdmin"].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= FETCH DEPARTMENTS ================= */
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/departments");

      setDepartments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setMessage("Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* ================= UPDATE ================= */
  const updateDepartment = async () => {
    if (!editDept?.name || !editDept?.code) {
      setMessage("All fields are required");
      return;
    }

    try {
      await api.put(`/departments/${editDept._id}`, {
        name: editDept.name,
        code: editDept.code
      });

      setEditDept(null);
      setMessage("Department updated successfully");
      fetchDepartments();
    } catch {
      setMessage("Update failed");
    }
  };

  /* ================= DELETE ================= */
  const deleteDepartment = async (id) => {
    if (!window.confirm("Delete this department?")) return;

    try {
      await api.delete(`/departments/${id}`);
      setMessage("Department deleted successfully");
      fetchDepartments();
    } catch {
      setMessage("Delete failed");
    }
  };

  /* ================= FILTER ================= */
  const filteredDepartments = Array.isArray(departments)
    ? departments.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div style={wrapper}>
      <div style={card}>
        <h3 style={title}>Departments</h3>
        <p style={subtitle}>Manage college departments</p>

        {message && <div style={alert}>{message}</div>}

        <div style={searchBox}>
          <FaSearch />
          <input
            placeholder="Search department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", width: "100%" }}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th width="160">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan="4" style={empty}>
                      No departments found
                    </td>
                  </tr>
                )}

                {filteredDepartments.map((d) => (
                  <tr key={d._id}>
                    <td>{d.name}</td>
                    <td>{d.code}</td>
                    <td>
                      <span style={badge}>Active</span>
                    </td>
                    <td>
                      <button style={iconBtn} onClick={() => setEditDept(d)}>
                        <FaEdit />
                      </button>
                      <button
                        style={{ ...iconBtn, background: "#d9534f" }}
                        onClick={() => deleteDepartment(d._id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editDept && (
        <div style={overlay}>
          <div style={modal}>
            <h4>Edit Department</h4>

            <input
              style={input}
              value={editDept.name}
              onChange={(e) =>
                setEditDept({ ...editDept, name: e.target.value })
              }
              placeholder="Department Name"
            />

            <input
              style={input}
              value={editDept.code}
              onChange={(e) =>
                setEditDept({ ...editDept, code: e.target.value })
              }
              placeholder="Department Code"
            />

            <div style={{ textAlign: "right" }}>
              <button style={saveBtn} onClick={updateDepartment}>
                <FaSave /> Save
              </button>
              <button
                style={cancelBtn}
                onClick={() => setEditDept(null)}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const wrapper = { padding: "40px 20px" };

const card = {
  background: "#fff",
  borderRadius: "16px",
  padding: "24px",
  maxWidth: "1000px",
  margin: "auto",
  boxShadow: "0 12px 30px rgba(0,0,0,.2)"
};

const title = { color: "#0f3a4a", fontWeight: "700" };

const subtitle = { color: "#666", marginBottom: "15px" };

const alert = {
  background: "#e8f6f3",
  color: "#0f3a4a",
  padding: "10px",
  borderRadius: "8px",
  marginBottom: "15px",
  textAlign: "center"
};

const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px",
  marginBottom: "20px"
};

const table = { width: "100%", borderCollapse: "collapse" };

const empty = { textAlign: "center", padding: "20px", color: "#777" };

const badge = {
  background: "#e0f7f4",
  color: "#0f3a4a",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600"
};

const iconBtn = {
  background: "#0f3a4a",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: "8px",
  marginRight: "6px",
  cursor: "pointer"
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modal = {
  background: "#fff",
  padding: "25px",
  borderRadius: "14px",
  width: "350px"
};

const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #ccc"
};

const saveBtn = {
  background: "#0f3a4a",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  marginRight: "10px"
};

const cancelBtn = {
  background: "#999",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px"
};
