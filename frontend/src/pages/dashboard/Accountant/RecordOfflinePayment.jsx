import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import Pagination from "../../../components/Pagination";
import {
   FaMoneyBillWave,
   FaSearch,
   FaUser,
   FaFileInvoiceDollar,
   FaReceipt,
   FaCheckCircle,
   FaExclamationTriangle,
   FaSyncAlt,
   FaRupeeSign,
   FaUsers,
} from "react-icons/fa";
import "./RecordOfflinePayment.css";

const PAGE_LOAD_TOAST_ID = "record-offline-payment-load";
const PAGE_SIZE = 10;

export default function RecordOfflinePayment() {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [allReportData, setAllReportData] = useState(null);
   const [searchQuery, setSearchQuery] = useState("");
   const [selectedStudent, setSelectedStudent] = useState(null);
   const [feeDetails, setFeeDetails] = useState(null);
   const [paymentMode, setPaymentMode] = useState("CASH");
   const [referenceNumber, setReferenceNumber] = useState("");
   const [remarks, setRemarks] = useState("");
   const [selectedInstallment, setSelectedInstallment] = useState("");
   const [proofFile, setProofFile] = useState(null);
   const [proofPreview, setProofPreview] = useState(null);
   const [submitting, setSubmitting] = useState(false);
   const [currentPage, setCurrentPage] = useState(1);
   const tableRef = useRef(null);

   const fetchReport = useCallback(async () => {
      try {
         setLoading(true);
         setError(null);
         const res = await api.get("/admin/payments/report");
         setAllReportData(res.data);
         toast.success("Students loaded successfully!", {
            position: "top-right",
            autoClose: 3000,
            toastId: PAGE_LOAD_TOAST_ID,
         });
      } catch (err) {
         const errorMsg = err.response?.data?.message || "Failed to load students";
         setError({ message: errorMsg, statusCode: err.response?.status, errorCode: err.response?.data?.code });
         toast.error(errorMsg, {
            position: "top-right",
            autoClose: 5000,
            toastId: "record-offline-payment-error",
         });
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchReport();
      return () => {
         toast.dismiss(PAGE_LOAD_TOAST_ID);
         toast.dismiss("record-offline-payment-error");
      };
   }, [fetchReport]);

   const pendingStudents = useMemo(() => {
      if (!allReportData?.report) return [];
      return allReportData.report.filter(
         (record) => record.pendingAmount > 0 && record.installments?.some((inst) => inst.status === "PENDING"),
      );
   }, [allReportData]);

   const summaryStats = useMemo(() => {
      const totalPending = pendingStudents.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
      const totalStudents = pendingStudents.length;

      const allStudents = allReportData?.report || [];
      const paidStudents = allStudents.filter(
         (record) => record.paidAmount > 0 && record.totalFee > 0,
      );
      const totalCollected = allStudents.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

      return {
         totalStudents,
         totalPending,
         paidStudentsCount: paidStudents.length,
         totalCollected,
      };
   }, [pendingStudents, allReportData]);

   const filteredStudents = useMemo(() => {
      if (!searchQuery.trim()) return pendingStudents;

      const query = searchQuery.toLowerCase().trim();

      const scored = pendingStudents.map((student) => {
         const name = (student.student?.fullName || "").toLowerCase();
         const email = (student.student?.email || "").toLowerCase();
         const enrollment = (student.student?.enrollment_number || "").toLowerCase();
         const course = (student.course?.name || "").toLowerCase();

         let score = 3;
         if (name === query) score = 0;
         else if (name.startsWith(query)) score = 1;
         else if (name.includes(query)) score = 2;

         if (email === query) score = Math.min(score, 0);
         else if (email.startsWith(query)) score = Math.min(score, 1);
         else if (email.includes(query)) score = Math.min(score, 2);

         if (enrollment === query) score = Math.min(score, 0);
         else if (enrollment.startsWith(query)) score = Math.min(score, 1);
         else if (enrollment.includes(query)) score = Math.min(score, 2);

         if (course === query) score = Math.min(score, 1);
         else if (course.includes(query)) score = Math.min(score, 2);

         const matches = name.includes(query) || email.includes(query) || enrollment.includes(query) || course.includes(query);
         return { student, matches, score };
      });

      return scored
         .filter((s) => s.matches)
         .sort((a, b) => a.score - b.score)
         .map((s) => s.student);
   }, [pendingStudents, searchQuery]);

   const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
   const paginatedStudents = filteredStudents.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
   );

   useEffect(() => {
      setCurrentPage(1);
   }, [searchQuery]);

   const handleSelectStudent = async (record) => {
      setSelectedStudent(record);
      setFeeDetails(record);
      setSelectedInstallment("");
      setPaymentMode("CASH");
      setReferenceNumber("");
      setRemarks("");
      setProofFile(null);
      setProofPreview(null);
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

          setSubmitting(true);
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

             toast.success("Payment recorded successfully!");
             fetchReport();

             const installmentId = res.data?.installmentId;
             if (installmentId) {
                setTimeout(() => {
                   navigate(`/student/fee-receipt/${installmentId}`);
                }, 600);
             }
          } catch (err) {
             logger.error("Payment error:", err);
             const errorMsg = err.response?.data?.message || "Your payment could not be processed. Please try again or contact your bank.";
             toast.error(errorMsg);
          } finally {
             setSubmitting(false);
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

    const handleAnotherPayment = () => {
       setSelectedStudent(null);
       setFeeDetails(null);
       setSearchQuery("");
       setPaymentMode("CASH");
       setReferenceNumber("");
       setRemarks("");
       setSelectedInstallment("");
       setProofFile(null);
       setProofPreview(null);

       setTimeout(() => {
          tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
       }, 100);
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

   if (loading) {
      return <Loading fullScreen size="lg" text="Loading students..." />;
   }

   if (error) {
      return (
         <ApiError
            title="Error Loading Students"
            message={error.message}
            statusCode={error.statusCode}
            errorCode={error.errorCode}
            onRetry={fetchReport}
            onGoBack={() => navigate("/dashboard/accountant")}
         />
      );
   }

   return (
      <div className="record-offline-payment erp-page erp-viewport-min-100">
         <Breadcrumb
            items={[
               { label: "Accountant Dashboard", path: "/dashboard/accountant" },
               { label: "Record Offline Payment" },
            ]}
         />

         {/* ================= HEADER ================= */}
         <div className="record-header">
            <div>
               <h1>
                  <FaMoneyBillWave />
                  Record Offline Payment
               </h1>
               <p>Search and select a student to record an offline payment</p>
            </div>
            <button className="refresh-btn" onClick={fetchReport}>
               <FaSyncAlt /> Refresh
            </button>
         </div>

          {/* ================= SUMMARY CARDS ================= */}
          <div className="summary-grid">
             <div className="stat-card students">
                <div className="stat-icon">
                   <FaUsers />
                </div>
                <div className="stat-content">
                   <div className="stat-label">Students with Pending Fees</div>
                   <div className="stat-value">{summaryStats.totalStudents}</div>
                </div>
             </div>
             <div className="stat-card amount">
                <div className="stat-icon">
                   <FaRupeeSign />
                </div>
                <div className="stat-content">
                   <div className="stat-label">Total Pending Amount</div>
                   <div className="stat-value">{formatCurrency(summaryStats.totalPending)}</div>
                </div>
             </div>
             <div className="stat-card paid">
                <div className="stat-icon">
                   <FaCheckCircle />
                </div>
                <div className="stat-content">
                   <div className="stat-label">Students with Paid Fees</div>
                   <div className="stat-value">{summaryStats.paidStudentsCount}</div>
                </div>
             </div>
             <div className="stat-card collected">
                <div className="stat-icon">
                   <FaMoneyBillWave />
                </div>
                <div className="stat-content">
                   <div className="stat-label">Total Collected Amount</div>
                   <div className="stat-value">{formatCurrency(summaryStats.totalCollected)}</div>
                </div>
             </div>
          </div>

         {/* ================= CONTROLS ================= */}
         <div className="record-controls-card">
            <div className="record-controls-body">
               <div className="record-search-box">
                  <FaSearch className="record-search-icon" />
                  <input
                     type="text"
                     placeholder="Search by name, email, enrollment, or course..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="record-search-input"
                  />
               </div>
            </div>
         </div>

          {/* ================= STUDENTS TABLE ================= */}
          <div className="record-table-card" ref={tableRef}>
            <div className="record-table-header">
               <h3>
                  <FaFileInvoiceDollar />
                  Students with Pending Fees
               </h3>
               <span className="record-count-badge">
                  {filteredStudents.length} record{filteredStudents.length !== 1 ? "s" : ""}
               </span>
            </div>

            {filteredStudents.length === 0 ? (
               <div className="record-empty-state">
                  <FaFileInvoiceDollar style={{ fontSize: "3rem", color: "#cbd5e1", marginBottom: "1rem" }} />
                  <h4>No Students Found</h4>
                  <p>Students with pending fees will appear here.</p>
               </div>
             ) : (
                <>
                   <div className="record-table-container">
                      <table className="record-table">
                         <thead>
                            <tr>
                               <th>Student</th>
                               <th>Course</th>
                               <th>Total Fee</th>
                               <th>Paid</th>
                               <th>Pending</th>
                               <th>Action</th>
                            </tr>
                         </thead>
                         <tbody>
                            {paginatedStudents.map((record, idx) => {
                               const studentId = record.student?._id || record.student_id?._id;
                               const isSelected = selectedStudent?.student?._id === studentId || selectedStudent?.student_id?._id === studentId;
                               return (
                                  <tr
                                     key={studentId || idx}
                                     className={isSelected ? "record-row-selected" : ""}
                                     onClick={() => handleSelectStudent(record)}
                                  >
                                     <td>
                                        <div>
                                           <strong>{record.student?.fullName || "N/A"}</strong>
                                           <br />
                                           <small>{record.student?.email}</small>
                                           <br />
                                           <small>{record.student?.enrollment_number}</small>
                                        </div>
                                     </td>
                                     <td>{record.course?.name || "N/A"}</td>
                                     <td>{formatCurrency(record.totalFee)}</td>
                                     <td>{formatCurrency(record.paidAmount)}</td>
                                     <td>
                                        <span className="record-pending-badge">
                                           {formatCurrency(record.pendingAmount)}
                                        </span>
                                     </td>
                                 <td>
                                    <button
                                       type="button"
                                       className={`record-action-btn ${isSelected ? "selected" : ""}`}
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectStudent(record);
                                       }}
                                    >
                                       {isSelected ? "Selected" : "Record Payment"}
                                    </button>
                                 </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>

                   {totalPages > 1 && (
                      <Pagination
                         page={currentPage}
                         totalPages={totalPages}
                         setPage={setCurrentPage}
                      />
                   )}
                </>
             )}
          </div>

      {/* ================= PAYMENT FORM ================= */}
         {selectedStudent && feeDetails && (
            <div className="record-form-card">
               <div className="record-form-header">
                  <h2>
                     <FaReceipt />
                     Record Payment for {feeDetails?.student?.fullName || "Student"}
                  </h2>
                  <button className="record-close-btn" onClick={handleAnotherPayment}>
                     Cancel
                  </button>
                </div>

                <>
                   <div className="record-student-info">
                      <h5>
                         <FaUser /> Student: {feeDetails?.student?.fullName}
                      </h5>
                      <p>Course: {feeDetails?.course?.name}</p>
                      <p>
                         Total Fee: {formatCurrency(feeDetails?.totalFee)} | Paid: {formatCurrency(feeDetails?.paidAmount)} | Pending:{" "}
                         {formatCurrency(feeDetails?.pendingAmount)}
                      </p>
                   </div>

                   <div className="record-installments-section">
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
                                     className={`record-installment-item ${selectedInstallment === instId ? "selected" : ""} ${isBlocked ? "blocked" : ""}`}
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
                                           <span className="record-pending-badge">
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
                      <div className="record-form-row">
                         <div className="record-form-group">
                            <label className="record-form-label">
                               <FaReceipt /> Proof of Payment <span className="text-danger">*</span>
                            </label>
                            <input
                               type="file"
                               accept=".pdf,.jpg,.jpeg,.png"
                               onChange={handleProofChange}
                               className="record-form-input"
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
                                        className="record-btn-sm btn-outline-danger ms-auto"
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

                         <div className="record-form-group">
                            <label className="record-form-label">Payment Mode</label>
                            <select
                               className="record-form-select"
                               value={paymentMode}
                               onChange={(e) => setPaymentMode(e.target.value)}
                            >
                               <option value="CASH">Cash</option>
                               <option value="CHEQUE">Cheque</option>
                               <option value="DD">Demand Draft</option>
                            </select>
                         </div>

                         {(paymentMode === "CHEQUE" || paymentMode === "DD") && (
                            <div className="record-form-group">
                               <label className="record-form-label">Reference Number *</label>
                               <input
                                  type="text"
                                  className="record-form-input"
                                  value={referenceNumber}
                                  onChange={(e) => setReferenceNumber(e.target.value)}
                                  placeholder="Enter cheque/DD number"
                                  required
                               />
                            </div>
                         )}

                         <div className="record-form-group">
                            <label className="record-form-label">Remarks (Optional)</label>
                            <textarea
                               className="record-form-input"
                               rows={3}
                               value={remarks}
                               onChange={(e) => setRemarks(e.target.value)}
                               placeholder="Add any notes about this payment..."
                            />
                         </div>

                         <button
                            type="submit"
                            className="record-action-btn primary"
                            disabled={!selectedInstallment || submitting}
                         >
                            {submitting ? <span>Processing...</span> : <span>Record Payment</span>}
                         </button>
                      </div>
                   </form>
                </>
            </div>
         )}
      </div>
   );
}
