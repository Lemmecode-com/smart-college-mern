

import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get("/departments").then((res) => setDepartments(res.data));
  }, []);

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <h5>Departments</h5>
        <table className="table table-bordered mt-3">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d._id}>
                <td>{d.name}</td>
                <td>{d.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
