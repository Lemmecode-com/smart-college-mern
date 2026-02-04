import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaUserGraduate,
  FaCalendarAlt,
  FaReceipt,
  FaBell,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaDownload,
  FaPrint,
  FaExclamationTriangle,
  FaSpinner,
  FaClock,
  FaGraduationCap,
  FaLayerGroup,
  FaIdCard,
  FaEnvelope,
  FaPhoneAlt
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH STUDENT PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");
        if (res.data?.student) {
          setStudentProfile(res.data.student);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        // Continue without profile - use AuthContext data
      }
    };
    fetchProfile();
  }, []);

  /* ================= FETCH FEE DASHBOARD ================= */
  const loadFees = async () => {
    try {
      const res = await api.get("/student/payments/my-fee-dashboard");
      
      if (!res.data) {
        throw new Error("Invalid fee dashboard response");
      }
      
      setDashboard(res.data);
      setError("");
    } catch (err) {
      console.error("Fee dashboard error:", err);
      
      const errorMsg = err.response?.status === 401 
        ? "Session expired. Please login again." 
        : err.response?.status === 404
          ? "Fee structure not found for your course. Contact administration."
          : err.response?.data?.message || "Unable to load fee dashboard. Please try again.";
      
      setError(errorMsg);
      toast.error(errorMsg);
      
      if (err.response?.status === 401) {
        setTimeout(() => navigate("/login"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  /* ================= CALCULATIONS ================= */
  const progress = dashboard?.totalFee > 0 
    ? Math.round((dashboard.totalPaid / dashboard.totalFee) * 100)
    : 0;

  const isNearDue = (date) => {
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  const getInstallmentStatusColor = (status, dueDate) => {
    if (status === "PAID") return "success";
    if (status === "PENDING") {
      if (new Date(dueDate) < new Date()) return "danger"; // Overdue
      if (isNearDue(dueDate)) return "warning"; // Due soon
      return "info";
    }
    return "secondary";
  };

  /* ================= PAYMENT HANDLER ================= */
  const handleRedirectPayment = (installment) => {
    if (!installment?._id || installment.status !== "PENDING") {
      toast.warning("Invalid payment request");
      return;
    }
    
    navigate("/student/make-payment", {
      state: { 
        installmentId: installment._id,
        installmentName: installment.name,
        amount: installment.amount,
        dueDate: installment.dueDate
      }
    });
  };

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading Fee Dashboard...</h5>
                <p className="text-muted small">Fetching your fee information and payment history</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <div className="text-danger mb-3">
                  <FaTimesCircle size={64} />
                </div>
                <h4 className="fw-bold mb-2">Fee Dashboard Error</h4>
                <p className="text-muted mb-4">{error}</p>
                <div className="d-flex justify-content-center gap-3">
                  <button 
                    onClick={loadFees}
                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaSync className="spin-icon" /> Retry
                  </button>
                  <button 
                    onClick={() => navigate("/student/dashboard")}
                    className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center gap-2"
                  >
                    <FaArrowLeft /> Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <FaMoneyCheckAlt className="text-muted mb-3" size={64} />
                <h4 className="fw-bold mb-2">No Fee Data Available</h4>
                <p className="text-muted mb-4">Your fee structure has not been configured yet. Please contact your college administration.</p>
                <button 
                  onClick={() => navigate("/student/dashboard")}
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
                >
                  <FaArrowLeft /> Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 py-md-4 animate-fade-in">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ================= TOP NAVIGATION BAR ================= */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4 animate-slide-down">
        <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
          <button 
            onClick={() => navigate("/student/dashboard")}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Back to Dashboard"
          >
            <FaArrowLeft size={16} /> Back
          </button>
          
          <div className="d-flex align-items-center gap-3">
            <div className="fees-logo-container bg-gradient-primary text-white rounded-circle d-flex align-items-center justify-content-center pulse-icon">
              <FaMoneyCheckAlt size={28} />
            </div>
            <div>
              <h1 className="h4 h3-md fw-bold mb-1 text-dark">Fee Management</h1>
              <p className="text-muted mb-0 small">
                <FaGraduationCap className="me-1" />
                {studentProfile?.fullName || user.name || "Student"} | {dashboard.course?.name || "Course"}
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="btn btn-outline-info d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Fee Dashboard Help"
          >
            <FaInfoCircle size={16} /> Help
          </button>
          
          <button 
            onClick={loadFees}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Refresh Fee Data"
            disabled={loading}
          >
            <FaSync className={loading ? "spin-icon" : ""} size={16} /> 
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          
          <button 
            onClick={() => window.print()}
            className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 hover-lift"
            title="Print Fee Summary"
          >
            <FaPrint size={16} /> Print
          </button>
        </div>
      </div>

      {/* ================= HELP SECTION ================= */}
      {showHelp && (
        <div className="alert alert-info border-0 bg-info bg-opacity-10 rounded-4 mb-3 mb-md-4 animate-fade-in">
          <div className="d-flex align-items-start gap-2">
            <FaInfoCircle className="mt-1 flex-shrink-0" size={20} />
            <div>
              <h6 className="fw-bold mb-1">Fee Dashboard Guide</h6>
              <ul className="mb-0 small ps-3">
                <li><strong>Fee Summary</strong>: Overview of total fees, amount paid, and pending dues</li>
                <li><strong>Progress Bar</strong>: Visual representation of payment completion</li>
                <li><strong>Installments</strong>: Detailed breakdown of payment schedule</li>
                <li><strong>Status Indicators</strong>: 
                  <ul className="mt-1 mb-0 ps-3">
                    <li><span className="badge bg-success me-1">PAID</span> - Payment completed</li>
                    <li><span className="badge bg-warning me-1">PENDING</span> - Due soon (yellow)</li>
                    <li><span className="badge bg-danger me-1">PENDING</span> - Overdue (red)</li>
                  </ul>
                </li>
                <li><strong>Actions</strong>: Pay pending installments or download receipts for paid ones</li>
                <li><FaBell className="text-warning me-1" /> Bell icon indicates payment due within 7 days</li>
              </ul>
              <button 
                onClick={() => setShowHelp(false)} 
                className="btn btn-sm btn-outline-info mt-2 px-3"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STUDENT PROFILE HEADER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="card-header bg-gradient-primary text-white py-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
            <div className="d-flex align-items-center gap-4 mb-3 mb-md-0">
              <div className="profile-avatar-container">
                <div className="profile-avatar bg-white d-flex align-items-center justify-content-center text-primary">
                  <FaUserGraduate size={48} />
                </div>
              </div>
              <div>
                <h2 className="h4 fw-bold mb-1">{studentProfile?.fullName || user.name || "Student Name"}</h2>
                <div className="d-flex flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-1">
                    <FaIdCard className="text-white opacity-75" /> 
                    <span className="opacity-75">{studentProfile?.enrollmentNumber || "N/A"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FaGraduationCap className="text-white opacity-75" /> 
                    <span className="opacity-75">{dashboard.course?.name || "N/A"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FaLayerGroup className="text-white opacity-75" /> 
                    <span className="opacity-75">{dashboard.course?.code || "N/A"}</span>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <div className="d-flex align-items-center gap-2">
                    <FaEnvelope className="text-white opacity-75" />
                    <span className="opacity-75">{studentProfile?.email || user.email || "N/A"}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <FaPhoneAlt className="text-white opacity-75" />
                    <span className="opacity-75">{studentProfile?.mobileNumber || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card-body bg-light py-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center text-center text-md-start">
            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-4 mb-2 mb-md-0">
              <div className="d-flex align-items-center gap-2">
                <FaUniversity className="text-primary" /> 
                <span className="fw-medium">{dashboard.college?.name || "N/A"}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaCalendarAlt className="text-success" /> 
                <span className="fw-medium">Academic Year: {dashboard.academicYear || "2025-2026"}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <FaLayerGroup className="text-info" /> 
                <span className="fw-medium">Semester: {studentProfile?.currentSemester || "N/A"}</span>
              </div>
            </div>
            <small className="text-muted">
              <FaSync className="spin-icon me-1" />
              Last updated: {new Date().toLocaleString()}
            </small>
          </div>
        </div>
      </div>

      {/* ================= FEE SUMMARY CARDS ================= */}
      <div className="row g-3 g-md-4 mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <FeeSummaryCard
          title="Total Fee"
          amount={dashboard.totalFee}
          icon={<FaUniversity className="blink-fast" />}
          color="primary"
          subtitle="Complete academic year fee"
        />
        <FeeSummaryCard
          title="Amount Paid"
          amount={dashboard.totalPaid}
          icon={<FaCheckCircle />}
          color="success"
          subtitle="Successfully paid installments"
        />
        <FeeSummaryCard
          title="Pending Due"
          amount={dashboard.totalDue}
          icon={<FaTimesCircle />}
          color="danger"
          subtitle="Remaining payment amount"
        />
        <FeeSummaryCard
          title="Payment Progress"
          amount={`${progress}%`}
          icon={<FaCreditCard />}
          color={progress === 100 ? "success" : progress > 50 ? "warning" : "info"}
          subtitle={`${dashboard.totalPaid.toLocaleString()}/${dashboard.totalFee.toLocaleString()} paid`}
        />
      </div>

      {/* ================= PROGRESS BAR SECTION ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-3 mb-md-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="card-header bg-light py-3">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <FaCreditCard /> Payment Progress
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between mb-2">
            <span className="fw-semibold">Fee Payment Status</span>
            <span className="fw-bold text-{progress === 100 ? 'success' : 'primary'}">{progress}% Complete</span>
          </div>
          <div className="progress" style={{ height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
            <div 
              className={`progress-bar ${progress === 100 ? 'bg-success' : progress > 75 ? 'bg-primary' : progress > 50 ? 'bg-warning' : 'bg-info'}`} 
              role="progressbar" 
              style={{ width: `${progress}%` }}
            >
              <div className="progress-text">{progress}%</div>
            </div>
          </div>
          
          <div className="d-flex justify-content-between mt-3 text-muted small">
            <div>
              <FaCheckCircle className="me-1 text-success" />
              {dashboard.installments?.filter(i => i.status === "PAID").length || 0} Paid
            </div>
            <div>
              <FaClock className="me-1 text-warning" />
              {dashboard.installments?.filter(i => i.status === "PENDING").length || 0} Pending
            </div>
            <div>
              <FaMoneyCheckAlt className="me-1 text-primary" />
              {dashboard.installments?.length || 0} Total Installments
            </div>
          </div>
        </div>
      </div>

      {/* ================= INSTALLMENTS TABLE ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <div className="card-header bg-gradient-primary text-white py-3 py-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3">
            <h2 className="h5 h6-md fw-bold mb-0 d-flex align-items-center gap-2">
              <FaCalendarAlt /> Fee Installments
            </h2>
          </div>
        </div>
        
        <div className="card-body p-0">
          {dashboard.installments?.length === 0 ? (
            <div className="text-center py-5 px-3">
              <FaMoneyCheckAlt className="text-muted mb-3" size={64} />
              <h5 className="text-muted mb-2">No Installments Found</h5>
              <p className="text-muted mb-4">Your fee structure has not been configured with installments. Please contact administration.</p>
              <button 
                onClick={() => navigate("/student/dashboard")}
                className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
              >
                <FaArrowLeft /> Back to Dashboard
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th width="15%" className="ps-4">Installment</th>
                    <th width="15%">Amount</th>
                    <th width="15%">Due Date</th>
                    <th width="15%">Status</th>
                    <th width="20%">Payment Date</th>
                    {/* <th width="15%" className="text-center">Reminder</th> */}
                    <th width="15%" className="text-center pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.installments.map((installment, idx) => (
                    <tr 
                      key={installment._id} 
                      className={`animate-fade-in ${installment.status === "PAID" ? "table-success" : ""}`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <td className="ps-4 fw-semibold">{installment.name}</td>
                      <td>₹{installment.amount.toLocaleString()}</td>
                      <td>
                        <div>{new Date(installment.dueDate).toLocaleDateString()}</div>
                        {isNearDue(installment.dueDate) && installment.status !== "PAID" && (
                          <small className="text-warning d-block mt-1">
                            <FaClock className="me-1" size={10} />
                            Due in {Math.ceil((new Date(installment.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                          </small>
                        )}
                        {new Date(installment.dueDate) < new Date() && installment.status !== "PAID" && (
                          <small className="text-danger d-block mt-1">
                            <FaExclamationTriangle className="me-1" size={10} />
                            Overdue by {Math.ceil((new Date() - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24))} days
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${getInstallmentStatusColor(installment.status, installment.dueDate)}`}>
                          {installment.status === "PAID" && <FaCheckCircle className="me-1" />}
                          {installment.status}
                        </span>
                      </td>
                      <td>
                        {installment.status === "PAID" ? (
                          <div>
                            <div>{new Date(installment.paymentDate).toLocaleDateString()}</div>
                            <small className="text-muted">Ref: {installment.transactionId || "N/A"}</small>
                          </div>
                        ) : (
                          <span className="text-muted">Not paid yet</span>
                        )}
                      </td>
                      {/* <td className="text-center">
                        {installment.status === "PENDING" && isNearDue(installment.dueDate) && (
                          <FaBell className="text-warning blink" title="Payment due soon" size={20} />
                        )}
                        {installment.status === "PENDING" && new Date(installment.dueDate) < new Date() && (
                          <FaExclamationTriangle className="text-danger blink" title="Payment overdue" size={20} />
                        )}
                      </td> */}
                      <td className="text-center pe-4">
                        {installment.status === "PAID" ? (
                          <button
                            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 mx-auto"
                            onClick={() => navigate(`/student/fee-receipt/${installment._id}`)}
                            title="View Receipt"
                          >
                            <FaReceipt size={14} /> Receipt
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-success d-flex align-items-center gap-1 mx-auto hover-lift"
                            onClick={() => handleRedirectPayment(installment)}
                            title="Pay Now"
                          >
                            <FaCreditCard size={14} /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaMoneyCheckAlt className="me-1" />
                  Student Fee Dashboard | Smart College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" />
                  Fee data last updated: <strong>{new Date().toLocaleString()}</strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button 
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={loadFees}
              >
                <FaSync size={12} /> Refresh Data
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => navigate("/student/dashboard")}
              >
                <FaArrowLeft size={12} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(26, 75, 109, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes lift {
          to { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .blink { animation: blink 1.5s infinite; }
        .blink-fast { animation: blink 0.9s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        .fees-logo-container {
          width: 60px;
          height: 60px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .profile-avatar-container {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          font-size: 2rem;
        }

        .progress-text {
          position: absolute;
          width: 100%;
          text-align: center;
          color: white;
          font-weight: 600;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .fee-summary-card {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          height: 100%;
          border: none;
        }
        .fee-summary-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        .fee-summary-card .card-body {
          padding: 1.5rem;
        }
        .fee-summary-card .fs-2 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .fee-summary-card h6 {
          font-size: 0.95rem;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 0.25rem;
        }
        .fee-summary-card .amount {
          font-size: 2rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }
        .fee-summary-card .subtitle {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        @media (max-width: 992px) {
          .fees-logo-container {
            width: 50px;
            height: 50px;
          }
          .profile-avatar {
            width: 70px;
            height: 70px;
            font-size: 1.75rem;
          }
        }

        @media (max-width: 768px) {
          .fee-summary-card .fs-2 {
            font-size: 2rem;
          }
          .fee-summary-card .amount {
            font-size: 1.75rem;
          }
          .btn-sm {
            padding: 0.25rem 0.5rem !important;
            font-size: 0.75rem !important;
          }
        }

        @media (max-width: 576px) {
          .fees-logo-container {
            width: 45px;
            height: 45px;
          }
          .profile-avatar {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }
          .fee-summary-card {
            border-radius: 12px;
          }
          table thead th:nth-child(n+5),
          table tbody td:nth-child(n+5) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= FEE SUMMARY CARD ================= */
function FeeSummaryCard({ title, amount, icon, color, subtitle }) {
  return (
    <div className="col-6 col-md-3 mb-3">
      <div className={`card h-100 border-0 fee-summary-card bg-light-${color} animate-fade-in-up`}>
        <div className="card-body text-center">
          <div className={`fs-2 text-${color} mb-2`}>{icon}</div>
          <h6 className="text-muted mb-1">{title}</h6>
          <div className={`amount text-${color}`}>₹{typeof amount === 'number' ? amount.toLocaleString() : amount}</div>
          {subtitle && <div className="subtitle text-muted mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}