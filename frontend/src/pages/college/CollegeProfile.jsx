import { useEffect, useState, useContext } from "react";
import api from "../../api/axios";
import { AuthContext } from "../../auth/AuthContext";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const [college, setCollege] = useState(null);
  const [form, setForm] = useState({});
  const editable = ["admin", "collegeAdmin"].includes(user.role);

  useEffect(() => {
    api.get("/college")
      .then(res => {
        setCollege(res.data);
        setForm(res.data);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await api.post("/admin/college", form);
    alert("College profile updated");
  };

  if (!college) return <p>Loading...</p>;

  return (
    <>
      <h3>College Profile</h3>

      <input className="form-control mb-2" disabled={!editable}
        value={form.name || ""}
        onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder="College Name" />

      <input className="form-control mb-2" disabled={!editable}
        value={form.address || ""}
        onChange={e => setForm({ ...form, address: e.target.value })}
        placeholder="Address" />

      <input className="form-control mb-2" disabled={!editable}
        value={form.contactEmail || ""}
        onChange={e => setForm({ ...form, contactEmail: e.target.value })}
        placeholder="Contact Email" />

      <input className="form-control mb-3" disabled={!editable}
        value={form.contactPhone || ""}
        onChange={e => setForm({ ...form, contactPhone: e.target.value })}
        placeholder="Contact Phone" />

      {editable && (
        <button className="btn btn-primary" onClick={save}>
          Save Profile
        </button>
      )}
    </>
  );
}
