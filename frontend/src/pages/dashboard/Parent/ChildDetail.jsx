// Child Detail - Shows individual child profile, attendance, and fees
import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";

import {
  FaUser,
  FaCalendarCheck,
  FaRupeeSign,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaSchool,
  FaIdCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";

export default function ChildDetail() {
  const { user } = useContext(AuthContext);
  const { childId } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fees");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    if (childId) {
      fetchChildData();
    }
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);

      // Fetch child profile
      const profileResponse = await api.get(
        `/parent/student/${childId}/profile`,
      );
      setChild(profileResponse.data);

      // Fetch attendance and fees (fees are important, so always fetch)
      if (activeTab === "attendance") {
        await fetchAttendance();
      }
      await fetchFees(); // Always fetch fees as it's important information
    } catch (error) {
      toast.error("Failed to load child information");
      console.error("Error fetching child data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/parent/student/${childId}/attendance`);
      setAttendance(response.data.attendance || []);
    } catch (error) {
      toast.error("Failed to load attendance data");
      console.error("Error fetching attendance:", error);
    }
  };

  const fetchFees = async () => {
    try {
      console.log("🔄 Fetching fees for childId:", childId);
      const response = await api.get(`/parent/student/${childId}/fees`);
      // The axios interceptor unwraps the response, so response.data is the feeRecord directly
      setFees(response.data);
    } catch (error) {
      console.error("❌ Error fetching fees:", error);
      toast.error("Failed to load fee information");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "attendance" && attendance.length === 0) {
      fetchAttendance();
    } else if (tab === "fees" && !fees) {
      fetchFees();
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      APPROVED: { label: "Active", className: "bg-success" },
      PENDING: { label: "Pending", className: "bg-warning" },
      REJECTED: { label: "Rejected", className: "bg-danger" },
      DEACTIVATED: { label: "Inactive", className: "bg-secondary" },
    };

    const config = statusConfig[status] || {
      label: status,
      className: "bg-secondary",
    };
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 0;
    const presentCount = attendance.filter(
      (record) => record.status === "PRESENT",
    ).length;
    return Math.round((presentCount / attendance.length) * 100);
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading child information..." />;
  }

  if (!child) {
    return (
      <div className="child-detail-page">
        <div className="erp-container">
          <div className="text-center py-5">
            <FaUser size={48} className="text-muted mb-3" />
            <h5 className="text-muted">Child Not Found</h5>
            <p className="text-muted">
              The requested child information could not be found.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard/parent/children")}
            >
              <FaArrowLeft className="me-2" />
              Back to Children
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="child-detail-page">
      <div className="erp-container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="erp-page-title">
              <FaUser className="me-3" />
              {child.fullName}
            </h1>
            <p className="text-muted mb-0">
              {child.course_id?.name} - Semester {child.currentSemester}
            </p>
          </div>
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
              { label: "My Children", path: "/dashboard/parent/children" },
              {
                label: child.fullName,
                path: `/dashboard/parent/child/${childId}`,
              },
            ]}
          />
        </div>

        {/* Quick Stats */}
        <div className="row mb-4">

          <div className="col-md-3 mb-3">
            <div className="card border-success h-100">
              <div className="card-body text-center">
                <FaGraduationCap className="text-success mb-2" size={30} />
                <div className="mb-1">{getStatusBadge(child.status)}</div>
                <p className="card-text text-muted small">Status</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card border-info h-100">
              <div className="card-body text-center">
                <FaCalendarCheck className="text-info mb-2" size={30} />
                <h6 className="card-title mb-1">
                  {calculateAttendancePercentage()}%
                </h6>
                <p className="card-text text-muted small">Attendance</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card border-warning h-100">
              <div className="card-body text-center">
                <FaRupeeSign className="text-warning mb-2" size={30} />
                <h6 className="card-title mb-1">
                  {fees ? `₹${(fees.totalFee - fees.paidAmount).toLocaleString()}` : "--"}
                </h6>
                <p className="card-text text-muted small">Pending Fees</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "profile" ? "active" : ""}`}
                  onClick={() => handleTabChange("profile")}
                >
                  <FaUser className="me-2" />
                  Profile
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => handleTabChange("attendance")}
                >
                  <FaCalendarCheck className="me-2" />
                  Attendance
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "fees" ? "active" : ""}`}
                  onClick={() => handleTabChange("fees")}
                >
                  <FaRupeeSign className="me-2" />
                  Fees
                </button>
              </li>
            </ul>
          </div>

          <div className="card-body">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="profile-tab">
                <div className="row">
                  <div className="col-md-6">
                    <h5 className="mb-3">Personal Information</h5>
                    <div className="info-item">
                      <strong>Full Name:</strong> {child.fullName}
                    </div>
                    <div className="info-item">
                      <strong>Email:</strong>
                      <a href={`mailto:${child.email}`} className="ms-1">
                        <FaEnvelope className="me-1" />
                        {child.email}
                      </a>
                    </div>
                    <div className="info-item">
                      <strong>Mobile:</strong>
                      <a href={`tel:${child.mobileNumber}`} className="ms-1">
                        <FaPhone className="me-1" />
                        {child.mobileNumber}
                      </a>
                    </div>
                    <div className="info-item">
                      <strong>Date of Birth:</strong>{" "}
                      {new Date(child.dateOfBirth).toLocaleDateString()}
                    </div>
                    <div className="info-item">
                      <strong>Gender:</strong> {child.gender}
                    </div>
                    <div className="info-item">
                      <strong>Blood Group:</strong>{" "}
                      {child.bloodGroup || "Not specified"}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h5 className="mb-3">Academic Information</h5>
                    <div className="info-item">
                      <strong>Course:</strong> {child.course_id?.name}
                    </div>
                    <div className="info-item">
                      <strong>Department:</strong> {child.department_id?.name}
                    </div>
                    <div className="info-item">
                      <strong>Current Semester:</strong> {child.currentSemester}
                    </div>
                    <div className="info-item">
                      <strong>Admission Year:</strong> {child.admissionYear}
                    </div>
                    <div className="info-item">
                      <strong>Category:</strong> {child.category}
                    </div>
                  </div>
                </div>

                <hr />

                <div className="row">
                  <div className="col-md-6">
                    <h5 className="mb-3">Address Information</h5>
                    <div className="info-item">
                      <FaMapMarkerAlt className="me-2 text-muted" />
                      {child.addressLine}
                      <br />
                      {child.city}, {child.state} - {child.pincode}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h5 className="mb-3">Parent Information</h5>
                    <div className="info-item">
                      <strong>Father:</strong> {child.fatherName}
                      {child.fatherMobile && (
                        <a href={`tel:${child.fatherMobile}`} className="ms-2">
                          <FaPhone className="me-1" />
                          {child.fatherMobile}
                        </a>
                      )}
                    </div>
                    <div className="info-item">
                      <strong>Mother:</strong> {child.motherName}
                      {child.motherMobile && (
                        <a href={`tel:${child.motherMobile}`} className="ms-2">
                          <FaPhone className="me-1" />
                          {child.motherMobile}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === "attendance" && (
              <div className="attendance-tab">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Attendance Records</h5>
                  <div className="text-muted">
                    Overall Attendance:{" "}
                    <strong>{calculateAttendancePercentage()}%</strong>
                  </div>
                </div>

                {attendance.length === 0 ? (
                  <div className="text-center py-4">
                    <FaCalendarCheck size={48} className="text-muted mb-3" />
                    <h6 className="text-muted">No Attendance Records</h6>
                    <p className="text-muted small">
                      Attendance data will appear here once classes begin.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Session</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((record, index) => (
                          <tr key={index}>
                            <td>
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td>{record.subject_id?.name || "N/A"}</td>
                            <td>
                              {record.status === "PRESENT" ? (
                                <span className="text-success">
                                  <FaCheckCircle className="me-1" />
                                  Present
                                </span>
                              ) : (
                                <span className="text-danger">
                                  <FaTimesCircle className="me-1" />
                                  Absent
                                </span>
                              )}
                            </td>
                            <td>
                              <small className="text-muted">
                                <FaClock className="me-1" />
                                {record.session_type}
                              </small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Fees Tab */}
            {activeTab === "fees" && (
              <div className="fees-tab">
                <h5 className="mb-3">Fee Information</h5>

                {!fees ? (
                  <div className="text-center py-4">
                    <FaRupeeSign size={48} className="text-muted mb-3" />
                    <h6 className="text-muted">
                      Fee Information Not Available
                    </h6>
                    <p className="text-muted small">
                      Fee details will be displayed here once processed.
                    </p>
                  </div>
                ) : (
                  <div className="row">
                    <div className="col-md-6">
                      <div className="card border-primary">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">Fee Summary</h6>
                        </div>
                        <div className="card-body">
                          <div className="fee-item">
                            <strong>Total Fee:</strong> ₹
                            {fees.totalFee?.toLocaleString()}
                          </div>
                          <div className="fee-item">
                            <strong>Paid Amount:</strong> ₹
                            {fees.paidAmount?.toLocaleString()}
                          </div>
                          <div className="fee-item">
                            <strong>Pending Amount:</strong> ₹
                            {(
                              fees.totalFee - fees.paidAmount
                            )?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="card border-info">
                        <div className="card-header bg-info text-white">
                          <h6 className="mb-0">Installments</h6>
                        </div>
                        <div className="card-body">
                          {fees.installments?.map((installment, index) => (
                            <div key={index} className="installment-item mb-2">
                              <div className="d-flex justify-content-between">
                                <span>{installment.name}</span>
                                <span
                                  className={`badge ${
                                    installment.status === "PAID"
                                      ? "bg-success"
                                      : installment.status === "PENDING"
                                        ? "bg-warning"
                                        : "bg-secondary"
                                  }`}
                                >
                                  {installment.status}
                                </span>
                              </div>
                              <div className="d-flex justify-content-between text-muted small">
                                <span>
                                  ₹{installment.amount?.toLocaleString()}
                                </span>
                                <span>
                                  Due:{" "}
                                  {new Date(
                                    installment.dueDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-4">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate("/dashboard/parent/children")}
          >
            <FaArrowLeft className="me-2" />
            Back to Children
          </button>
        </div>
      </div>

      <style jsx>{`
        .child-detail-page {
          padding: 20px;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .erp-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .erp-page-title {
          color: #2d3748;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .card {
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .nav-tabs .nav-link {
          border: none;
          color: #12191e;
          font-weight: 500;
        }

        .nav-tabs .nav-link.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .info-item {
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .fee-item,
        .installment-item {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .installment-item:last-child {
          border-bottom: none;
        }

        .table th {
          background-color: #f8f9fa;
          font-weight: 600;
          border-top: none;
        }

        .table-responsive {
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
