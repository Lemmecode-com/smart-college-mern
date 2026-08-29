import { useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="mb-2">Welcome, {user?.name}</h4>
        <p className="text-muted mb-0">
          You are logged in as <strong>Student</strong>.
        </p>
        <hr />
        <p>
          You can view your attendance records using the Attendance section.
        </p>
      </div>
    </div>
  );
}
