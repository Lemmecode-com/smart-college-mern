import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import {
  getPromotionEligibleStudents,
  promoteStudent,
  bulkPromoteStudents,
  getCollegePromotionHistory,
} from "../../../api/promotion";
import api from "../../../api/axios";

import {
  FaGraduationCap,
  FaMoneyBillWave,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaArrowUp,
  FaUsers,
  FaHistory,
  FaClipboardCheck,
} from "react-icons/fa";

const PAGE_SIZE = 10;

export default function StudentPromotion() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [feeStatusFilter, setFeeStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [promotionRemarks, setPromotionRemarks] = useState("");
  const [overrideFeeCheck, setOverrideFeeCheck] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewMode, setViewMode] = useState("LIST"); // LIST or HISTORY

  // Security check
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  // Fetch eligible students
  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getPromotionEligibleStudents();
      setStudents(res.students || []);
      
      // Extract unique courses for filter
      const uniqueCourses = [...new Set(res.students.map(s => s.course_id?.name).filter(Boolean))];
      setCourses(uniqueCourses);
    } catch (err) {
      console.error("Error fetching eligible students:", err);
      setError(err.response?.data?.message || "Failed to load students for promotion.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch promotion history
  const fetchPromotionHistory = async () => {
    try {
      const res = await getCollegePromotionHistory({ limit: 50 });
      setPromotionHistory(res.promotions || []);
    } catch (err) {
      console.error("Error fetching promotion history:", err);
    }
  };

  useEffect(() => {
    fetchEligibleStudents();
  }, []);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        `${student.fullName} ${student.email} ${student.course_id?.name || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesSemester =
        semesterFilter === "ALL" || student.currentSemester.toString() === semesterFilter;

      const matchesCourse =
        courseFilter === "ALL" || student.course_id?.name === courseFilter;

      const matchesFeeStatus =
        feeStatusFilter === "ALL" || student.feeStatus === feeStatusFilter;

      return matchesSearch && matchesSemester && matchesCourse && matchesFeeStatus;
    });
  }, [students, search, semesterFilter, courseFilter, feeStatusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, semesterFilter, courseFilter, feeStatusFilter]);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(paginatedStudents.map((s) => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle select individual
  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Open promote modal for single student
  const openPromoteModal = (student) => {
    setSelectedStudent(student);
    setPromotionRemarks("");
    setOverrideFeeCheck(false);
    setShowPromoteModal(true);
  };

  // Handle single promotion
  const handlePromoteStudent = async () => {
    try {
      setLoading(true);
      await promoteStudent(selectedStudent._id, {
        remarks: promotionRemarks,
        overrideFeeCheck,
      });
      setSuccessMessage(`Successfully promoted ${selectedStudent.fullName} to Semester ${selectedStudent.currentSemester + 1}`);
      setShowPromoteModal(false);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to promote student.");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk promotion
  const handleBulkPromote = async () => {
    if (selectedStudents.length === 0) {
      setError("Please select at least one student for promotion.");
      return;
    }

    try {
      setLoading(true);
      const res = await bulkPromoteStudents({
        studentIds: selectedStudents,
        remarks: promotionRemarks || `Bulk promotion - ${new Date().toLocaleDateString()}`,
        overrideFeeCheck,
      });
      
      setSuccessMessage(res.message);
      setShowBulkPromoteModal(false);
      setSelectedStudents([]);
      fetchEligibleStudents();
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to promote students.");
    } finally {
      setLoading(false);
    }
  };

  // Get fee status badge color
  const getFeeStatusBadge = (status) => {
    switch (status) {
      case "FULLY_PAID":
        return "bg-green-100 text-green-800";
      case "PARTIALLY_PAID":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const fullyPaid = students.filter((s) => s.feeStatus === "FULLY_PAID").length;
    const partiallyPaid = students.filter((s) => s.feeStatus === "PARTIALLY_PAID").length;
    const pending = students.filter((s) => s.feeStatus === "PENDING").length;
    const eligibleForPromotion = students.filter((s) => s.allInstallmentsPaid).length;

    return { total, fullyPaid, partiallyPaid, pending, eligibleForPromotion };
  }, [students]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaGraduationCap className="text-indigo-600" />
            Student Promotion
          </h1>
          <p className="text-gray-600 mt-1">
            Promote students to next semester based on fee payment status
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setViewMode("HISTORY");
              fetchPromotionHistory();
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FaHistory />
            Promotion History
          </button>
          {selectedStudents.length > 0 && (
            <button
              onClick={() => setShowBulkPromoteModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <FaArrowUp />
              Bulk Promote ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
          <FaCheckCircle />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
          <FaExclamationTriangle />
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Total Students</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Fully Paid</div>
          <div className="text-2xl font-bold text-green-600">{stats.fullyPaid}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Partially Paid</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.partiallyPaid}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Fee Pending</div>
          <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500 text-sm">Eligible for Promotion</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.eligibleForPromotion}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={feeStatusFilter}
            onChange={(e) => setFeeStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Fee Status</option>
            <option value="FULLY_PAID">Fully Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PENDING">Pending</option>
          </select>

          <div className="flex items-center gap-2 text-gray-600">
            <FaFilter />
            <span className="text-sm">
              {filteredStudents.length} of {students.length} students
            </span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {viewMode === "LIST" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
              <p>No students found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Current Semester
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Fee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Paid Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fee Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => handleSelectStudent(student._id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {student.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">
                            Sem {student.currentSemester}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {student.course_id?.name || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          ₹{student.fee?.totalFee || 0}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={student.fee?.paidAmount >= (student.fee?.totalFee || 0) ? "text-green-600 font-medium" : "text-gray-600"}>
                            ₹{student.fee?.paidAmount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getFeeStatusBadge(student.feeStatus)}`}>
                            {student.feeStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openPromoteModal(student)}
                            disabled={!student.allInstallmentsPaid && !overrideFeeCheck}
                            className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${
                              student.allInstallmentsPaid
                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                            title={!student.allInstallmentsPaid ? "Student has pending fees" : "Promote to next semester"}
                          >
                            <FaArrowUp />
                            Promote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(page * PAGE_SIZE, filteredStudents.length)} of{" "}
                    {filteredStudents.length} students
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronLeft />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 border rounded ${
                          page === i + 1
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Promotion History View */}
      {viewMode === "HISTORY" && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaHistory />
              Promotion History
            </h2>
            <button
              onClick={() => setViewMode("LIST")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Back to Students
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    From → To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fee Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Promoted By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotionHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {record.student_id?.fullName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.student_id?.email || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-600">Sem {record.fromSemester}</span>
                      <FaChevronRight className="inline mx-1 text-xs" />
                      <span className="text-indigo-600 font-medium">Sem {record.toSemester}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getFeeStatusBadge(record.feeStatus)}`}>
                        {record.feeStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.promotedByName || "Admin"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(record.promotionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {record.remarks || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Promote Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaGraduationCap className="text-indigo-600" />
              Promote Student
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{selectedStudent.fullName}</div>
              <div className="text-sm text-gray-600">
                Current: Semester {selectedStudent.currentSemester} → Next: Semester{" "}
                {selectedStudent.currentSemester + 1}
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Fee Status: </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getFeeStatusBadge(selectedStudent.feeStatus)}`}>
                  {selectedStudent.feeStatus.replace("_", " ")}
                </span>
              </div>
              {!selectedStudent.allInstallmentsPaid && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <FaExclamationTriangle />
                  Pending Amount: ₹{selectedStudent.pendingAmount}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={promotionRemarks}
                onChange={(e) => setPromotionRemarks(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Add any notes about this promotion..."
              />
            </div>

            {!selectedStudent.allInstallmentsPaid && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideFeeCheck}
                    onChange={(e) => setOverrideFeeCheck(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Override fee check (Admin discretion)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Enable this to promote students with pending fees
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePromoteStudent}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Promoting...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Confirm Promotion
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Promote Modal */}
      {showBulkPromoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaClipboardCheck className="text-indigo-600" />
              Bulk Promotion
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-700">
                You are about to promote <strong>{selectedStudents.length}</strong> students to their next semester.
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Students with pending fees will be skipped unless you enable the override option.
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={promotionRemarks}
                onChange={(e) => setPromotionRemarks(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Add any notes about this bulk promotion..."
              />
            </div>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideFeeCheck}
                  onChange={(e) => setOverrideFeeCheck(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  Override fee check for all students
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Enable this to promote students with pending fees
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBulkPromote}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Promoting...
                  </>
                ) : (
                  <>
                    <FaArrowUp />
                    Promote All
                  </>
                )}
              </button>
              <button
                onClick={() => setShowBulkPromoteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
