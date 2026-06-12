import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import {
  FaMoneyBillWave,
  FaSearch,
  FaUser,
  FaFileInvoiceDollar,
  FaReceipt,
  FaCheckCircle,
} from "react-icons/fa";

export default function RecordOfflinePayment() {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);
   const [students, setStudents] = useState([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedStudent, setSelectedStudent] = useState(null);
   const [feeDetails, setFeeDetails] = useState(null);
   const [paymentMode, setPaymentMode] = useState("CASH");
   const [referenceNumber, setReferenceNumber] = useState("");
   const [remarks, setRemarks] = useState("");
   const [selectedInstallment, setSelectedInstallment] = useState("");
   const [showSuccess, setShowSuccess] = useState(false);
   const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setStudents([]);
      return;
    }

const searchStudents = async () => {
       try {
         const res = await api.get(`/admin/payments/report?search=${searchTerm}`);
         const results = res.data?.report || [];
         console.log("Search results:", results);
         setStudents(results);
       } catch (err) {
         console.error("Search error:", err);
         setStudents([]);
       }
     };

    const debounceTimer = setTimeout(searchStudents, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

const handleSelectStudent = async (student) => {
     setSelectedStudent(student);
     setSearchTerm("");
     setStudents([]);

     try {
       const studentId = student?.student?._id || student?.student_id?._id;
       console.log("Fetching fee details for studentId:", studentId);
       const res = await api.get(`/admin/payments/report?studentId=${studentId}`);
       console.log("Fee details response:", res.data);
       setFeeDetails(res.data?.report?.[0]);
     } catch (err) {
       console.error("Fee details error:", err);
       toast.error("Failed to load fee details");
     }
   };

const handlePaymentSubmit = async (e) => {
     if (e) e.preventDefault();

     console.log("Form submit - selectedStudent:", selectedStudent, "selectedInstallment:", selectedInstallment);

     if (!selectedStudent || !selectedInstallment) {
       toast.error("Please select a student and installment");
       return;
     }

     if ((paymentMode === "CHEQUE" || paymentMode === "DD") && !referenceNumber) {
       toast.error(`Reference number required for ${paymentMode} payments`);
       return;
     }

     setLoading(true);
     try {
       const studentId = selectedStudent?.student?._id || selectedStudent?.student_id?._id;
       console.log("Submitting payment with studentId:", studentId, "installmentId:", selectedInstallment);
       const res = await api.post("/admin/payments/mark-paid", {
         studentId,
         installmentId: selectedInstallment,
         paymentMode,
         referenceNumber: paymentMode === "CASH" ? null : referenceNumber,
         remarks,
       });

       setSuccessData(res.data.data);
       setShowSuccess(true);
       toast.success("Payment recorded successfully!");
     } catch (err) {
       console.error("Payment error:", err);
       const errorMsg = err.response?.data?.message || err.message || "Failed to record payment";
       setError({ message: errorMsg, statusCode: err.response?.status });
       toast.error(errorMsg);
     } finally {
       setLoading(false);
     }
   };

  const handleViewReceipt = () => {
    navigate(`/student/fee-receipt/${successData?.installmentId || successData?.installment_id}`);
  };

  const handleAnotherPayment = () => {
    setSelectedStudent(null);
    setFeeDetails(null);
    setSearchTerm("");
    setPaymentMode("CASH");
    setReferenceNumber("");
    setRemarks("");
    setSelectedInstallment("");
    setShowSuccess(false);
    setSuccessData(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const pendingInstallments = feeDetails?.installments?.filter(
    (inst) => inst.status === "PENDING",
  ) || [];

  return (
    <div className="record-offline-payment-container">
      <style>{`
        .record-offline-payment-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .offline-payment-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          color: white;
        }
        .offline-payment-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .form-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 1.75rem;
          margin-bottom: 1.5rem;
        }
        .form-label {
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 0.5rem;
        }
        .form-input, .form-select {
          padding: 0.75rem 1rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
          width: 100%;
          transition: border-color 0.3s ease;
        }
        .form-input:focus, .form-select:focus {
          border-color: #1a4b6d;
          outline: none;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }
        .student-search-results {
          position: absolute;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .student-result-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f3f4;
          transition: background 0.2s ease;
        }
        .student-result-item:hover {
          background: #f8f9fa;
        }
        .student-result-item:last-child {
          border-bottom: none;
        }
        .pending-badge {
          background: linear-gradient(135deg, #dc3545 0%, #c62828 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .success-card {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border: 1px solid #28a745;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .success-icon {
          font-size: 4rem;
          color: #28a745;
          margin-bottom: 1rem;
        }
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0.25rem;
        }
        .action-btn.primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        .action-btn.success {
          background: linear-gradient(135deg, #28a745 0%, #218838 100%);
          color: white;
        }
        .action-btn.primary:hover, .action-btn.success:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .installment-item {
          padding: 1rem;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .installment-item:hover {
          border-color: #1a4b6d;
          background: #f8f9fa;
        }
        .installment-item.selected {
          border-color: #28a745;
          background: #e8f5e9;
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Accountant Dashboard", path: "/dashboard/accountant" },
          { label: "Record Offline Payment" },
        ]}
      />

      <div className="offline-payment-header">
        <h1>
          <FaMoneyBillWave />
          Record Offline Payment
        </h1>
      </div>

      {showSuccess && successData ? (
        <div className="success-card">
          <FaCheckCircle className="success-icon" />
          <h3>Payment Recorded Successfully!</h3>
          <p className="mb-3">
            Student: <strong>{successData?.studentName || "N/A"}</strong>
          </p>
          <p className="mb-3">
            Amount: <strong>{formatCurrency(successData?.amount || 0)}</strong>
          </p>
          <p className="mb-4">
            Mode: <strong>{successData?.paymentMode}</strong>
          </p>
          <div>
            <button className="action-btn primary" onClick={handleViewReceipt}>
              <FaReceipt /> View Receipt
            </button>
            <button className="action-btn success" onClick={handleAnotherPayment}>
              Record Another Payment
            </button>
          </div>
        </div>
      ) : (
        <div className="form-card">
          <div className="mb-4">
            <label className="form-label">
              <FaSearch /> Search Student (Name/Email/Enrollment)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type to search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {students.length > 0 && (
                <div className="student-search-results">
                  {students.map((s, idx) => (
                    <div
                      key={idx}
                      className="student-result-item"
                      onClick={() => handleSelectStudent(s)}
                    >
                      <strong>{s.student?.fullName}</strong>
                      <br />
                      <small>{s.course?.name} | {s.student?.email}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {feeDetails && (
            <>
              <div className="mb-4">
                <h5>
                  <FaUser /> Student: {feeDetails?.student?.fullName}
                </h5>
                <p>Course: {feeDetails?.course?.name}</p>
              </div>

<div className="mb-4">
                 <h5>
                   <FaFileInvoiceDollar /> Select Pending Installment
                 </h5>
                 {pendingInstallments.length === 0 ? (
                   <p className="text-muted">No pending installments found for this student.</p>
                 ) : (
                   <div>
                     {pendingInstallments.map((inst, idx) => {
                       const instId = inst._id?.$oid || inst._id || inst.id;
                       return (
                         <div
                           key={instId || idx}
                           className={`installment-item ${selectedInstallment === instId ? "selected" : ""}`}
                           onClick={(e) => {
                             e.stopPropagation();
                             setSelectedInstallment(instId);
                           }}
                         >
                           <div className="d-flex justify-content-between align-items-center">
                             <div>
                               <strong>{inst.name}</strong>
                               <br />
                               <small>Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : "N/A"}</small>
                             </div>
                             <div>
                               <span className="pending-badge">
                                 {formatCurrency(inst.amount)}
                               </span>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>

              <form onSubmit={handlePaymentSubmit}>
                <div className="mb-3">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DD">Demand Draft</option>
                  </select>
                </div>

                {(paymentMode === "CHEQUE" || paymentMode === "DD") && (
                  <div className="mb-3">
                    <label className="form-label">Reference Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Enter cheque/DD number"
                      required
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Remarks (Optional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any notes about this payment..."
                  />
                </div>

<button
                   type="button"
                   className="action-btn primary"
                   disabled={!selectedInstallment || loading}
                   onClick={handlePaymentSubmit}
                 >
                   {loading ? <span>Processing...</span> : <span>Record Payment</span>}
                 </button>
               </form>
            </>
          )}
        </div>
      )}

      {error && (
        <ApiError
          title="Payment Error"
          message={error.message}
          statusCode={error.statusCode}
          onRetry={() => setError(null)}
          onGoBack={() => navigate("/dashboard/accountant")}
        />
      )}
    </div>
  );
}