import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
   FaMoneyBillWave,
   FaSearch,
   FaUser,
   FaFileInvoiceDollar,
   FaReceipt,
   FaCheckCircle,
   FaExclamationTriangle,
} from "react-icons/fa";
import "./RecordOfflinePayment.css";

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
   const [proofFile, setProofFile] = useState(null);
   const [proofPreview, setProofPreview] = useState(null);

   useEffect(() => {
      if (!searchTerm || searchTerm.length < 2) {
         setStudents([]);
         return;
      }

      const searchStudents = async () => {
         try {
            const res = await api.get(`/admin/payments/report?search=${searchTerm}`);
          const results = res.data?.report || [];
             setStudents(results);
          } catch (err) {
             logger.warn("Search error:", err);
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
          const res = await api.get(`/admin/payments/report?studentId=${studentId}`);
          setFeeDetails(res.data?.report?.[0]);
       } catch (err) {
          logger.warn("Fee details error:", err);
          toast.error("Failed to load fee details");
      }
   };

   const handlePaymentSubmit = async (e) => {
      if (e) e.preventDefault();

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
         const formData = new FormData();
         formData.append("studentId", studentId);
         formData.append("installmentId", selectedInstallment);
         formData.append("paymentMode", paymentMode);
         formData.append("referenceNumber", paymentMode === "CASH" ? "" : referenceNumber);
         formData.append("remarks", remarks || "");

         if (proofFile) {
            formData.append("proof", proofFile);
         }

         const res = await api.post("/admin/payments/mark-paid", formData, {
            headers: {
               "Content-Type": "multipart/form-data",
            },
         });

         setSuccessData(res.data.data);
         setShowSuccess(true);
         toast.success("Payment recorded successfully!");
       } catch (err) {
          logger.error("Payment error:", err);
          const errorMsg = "Your payment could not be processed. Please try again or contact your bank.";
           setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
          toast.error(errorMsg);
      } finally {
         setLoading(false);
      }
   };

   const handleProofChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
         toast.error("Invalid file type. Only PDF, JPG, JPEG, PNG are allowed.", {
            position: "top-right",
            autoClose: 3000,
         });
         e.target.value = "";
         return;
      }

      if (file.size > 5 * 1024 * 1024) {
         toast.error("File size must be less than 5MB", {
            position: "top-right",
            autoClose: 3000,
         });
         e.target.value = "";
         return;
      }

      setProofFile(file);

      if (file.type.startsWith("image/")) {
         const reader = new FileReader();
         reader.onloadend = () => setProofPreview(reader.result);
         reader.readAsDataURL(file);
      } else {
         setProofPreview(null);
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
      setProofFile(null);
      setProofPreview(null);
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

   const canPayInstallment = (installment) => {
      const order = installment.order || 0;
      if (order <= 1) return true;
      return !feeDetails?.installments?.some(
         (i) => i.order < order && i.status !== "PAID",
      );
   };

    return (
       <div className="record-offline-payment erp-page erp-viewport-min-100">
          <Breadcrumb
             items={[
                { label: "Accountant Dashboard", path: "/dashboard/accountant" },
                { label: "Record Offline Payment" },
             ]}
          />

          <div className="dashboard-header">
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
                      {successData?.proofUrl && (
                         <button
                            className="action-btn primary"
                            onClick={() => {
                              const installmentId = successData.installmentId;
                              if (installmentId) {
                                window.open(
                                  `${api.defaults.baseURL}/admin/payments/proof/${installmentId}`,
                                  "_blank",
                                );
                              }
                            }}
                         >
                            <FaReceipt /> View Proof
                         </button>
                      )}
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
                                 const isBlocked = !canPayInstallment(inst);
                                 return (
                                     <div
                                        key={instId || idx}
                                        className={`installment-item ${selectedInstallment === instId ? "selected" : ""} ${isBlocked ? "blocked" : ""}`}
                                        onClick={(e) => {
                                           e.stopPropagation();
                                           if (!isBlocked) {
                                              setSelectedInstallment(instId);
                                           }
                                        }}
                                        title={isBlocked ? "Previous installments must be paid first" : ""}
                                     >
                                       <div className="d-flex justify-content-between align-items-center">
                                          <div>
                                             <strong>{inst.name}</strong>
                                             <br />
                                             <small>Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : "N/A"}</small>
                                             {isBlocked && (
                                                <div className="text-warning small mt-1">
                                                   <FaExclamationTriangle /> Pay previous installments first
                                                </div>
                                             )}
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
                        <div className="mb-4">
                           <label className="form-label">
                              <FaReceipt /> Proof of Payment <span className="text-danger">*</span>
                           </label>
                           <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleProofChange}
                              className="form-input"
                              style={{ padding: "0.5rem" }}
                           />
                           <small className="text-muted">
                              Upload receipt, deposit slip, or payment confirmation (PDF, JPG, PNG — max 5MB)
                           </small>

                           {proofFile && (
                              <div className="mt-2 p-2 border rounded" style={{ background: "#f8f9fa" }}>
                                 <div className="d-flex align-items-center gap-2">
                                    {proofPreview ? (
                                       <img
                                          src={proofPreview}
                                          alt="Proof preview"
                                          style={{
                                             width: "60px",
                                             height: "60px",
                                             objectFit: "cover",
                                             borderRadius: "6px",
                                             border: "1px solid #dee2e6"
                                          }}
                                       />
                                    ) : (
                                       <div
                                          style={{
                                             width: "60px",
                                             height: "60px",
                                             background: "#dc3545",
                                             color: "white",
                                             borderRadius: "6px",
                                             display: "flex",
                                             alignItems: "center",
                                             justifyContent: "center",
                                             fontWeight: "bold",
                                             fontSize: "0.75rem"
                                          }}
                                       >
                                          PDF
                                       </div>
                                    )}
                                    <div>
                                       <strong>{proofFile.name}</strong>
                                       <br />
                                       <small className="text-muted">
                                          {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                                       </small>
                                    </div>
                                    <button
                                       type="button"
                                       className="btn btn-sm btn-outline-danger ms-auto"
                                       onClick={() => {
                                          setProofFile(null);
                                          setProofPreview(null);
                                       }}
                                    >
                                       Remove
                                    </button>
                                 </div>
                              </div>
                           )}
                        </div>

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
                           type="submit"
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
                errorCode={error.errorCode}
                onRetry={() => setError(null)}
               onGoBack={() => navigate("/dashboard/accountant")}
            />
         )}
      </div>
   );
}
