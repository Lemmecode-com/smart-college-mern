import React from "react";

const AcademicSetting = () => {
  return (
    <div
      className="container-fluid p-4"
      style={{ background: "#f5f7fb", minHeight: "100vh" }}
    >
      {/* HEADER */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Academic Settings</h4>
        <p className="text-muted mb-0">
          Configure academic rules, attendance, grading, and sessions
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">

          {/* ================= ACADEMIC STRUCTURE ================= */}
          {/* <h6 className="fw-bold mb-3">Academic Structure</h6>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Academic System</label>
              <select className="form-select">
                <option>Semester</option>
                <option>Trimester</option>
                <option>Yearly</option> 
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Terms Per Year</label>
              <input type="number" className="form-control" placeholder="e.g. 2" />
            </div>

            <div className="col-md-4">
              <label className="form-label">Max Subjects Per Term</label>
              <input type="number" className="form-control" placeholder="e.g. 6" />
            </div>
          </div>

          <hr /> */}

          {/* ================= ATTENDANCE RULES ================= */}
          <h6 className="fw-bold mb-3">Attendance Rules</h6>

          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Minimum Attendance (%)</label>
              <input type="number" className="form-control" placeholder="75" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Grace Attendance (%)</label>
              <input type="number" className="form-control" placeholder="5" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Attendance Calculation</label>
              <select className="form-select">
                <option>Daily</option>
                <option>Session Wise</option>
                <option>Subject Wise</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Auto Block Exam</label>
              <select className="form-select">
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <div className="row mb-3">
            

            <div className="col-md-4">
              <label className="form-label">Late Attendance Time (Minutes)</label>
              <input type="number" className="form-control" placeholder="10" />
            </div>

            <div className="col-md-4">
              <label className="form-label">Auto Mark Absent After</label>
              <select className="form-select">
                <option>Session End</option>
                <option>Fixed Time</option>
              </select>
            </div>
          </div>

          <hr />

          {/* ================= GRADING RULES ================= */}
          <h6 className="fw-bold mb-3">Grading Rules</h6>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Grading System</label>
              <select className="form-select">
                <option>Percentage</option>
                <option>CGPA</option>
                <option>Grade Based</option>
              </select>
            </div>

           

            <div className="col-md-4">
              <label className="form-label">Allow Grace Marks</label>
              <select className="form-select">
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Max Grace Marks</label>
              <input type="number" className="form-control" placeholder="5" />
            </div>

            <div className="col-md-4">
              <label className="form-label">Internal + External Split</label>
              <input type="text" className="form-control" placeholder="30 + 70" />
            </div>

            <div className="col-md-4">
              <label className="form-label">Round Off Marks</label>
              <select className="form-select">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>

          <hr />

          {/* ================= SESSION & TIMETABLE ================= */}
          <h6 className="fw-bold mb-3">Session & Timetable Rules</h6>

          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Max Lectures Per Day</label>
              <input type="number" className="form-control" placeholder="6" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Lecture Duration (Minutes)</label>
              <input type="number" className="form-control" placeholder="60" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Break Duration (Minutes)</label>
              <input type="number" className="form-control" placeholder="15" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Auto Close Session</label>
              <select className="form-select">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-md-6">
              <label className="form-label">Allow Teacher Session Edit</label>
              <select className="form-select">
                <option>Before Session End</option>
                <option>After Session End</option>
                <option>Not Allowed</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Student Attendance Visibility</label>
              <select className="form-select">
                <option>Real Time</option>
                <option>End of Day</option>
                <option>End of Term</option>
              </select>
            </div>
          </div>

          {/* SAVE */}
          <button className="btn btn-primary px-4">
            Save Academic Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademicSetting;