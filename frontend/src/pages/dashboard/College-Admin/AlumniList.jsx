import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getAlumni } from "../../../api/alumni";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";
import { TableSkeleton } from "../../../components/Skeleton";
import { showSuccess, showError } from "../../../utils/toast";
import "./AlumniList.css";

import {
  FaGraduationCap,
  FaSearch,
  FaFileExcel,
  FaTimes,
  FaDownload,
  FaAward,
  FaUniversity,
  FaSpinner,
  FaUsers,
  FaCalendarAlt,
  FaStar,
  FaCertificate,
  FaQrcode,
  FaPrint,
  FaEye,
  FaInfoCircle,
  FaFilePdf,
} from "react-icons/fa";

/* ================= CERTIFICATE COMPONENT ================= */

function Certificate({ alumnus, college }) {
  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const certificateNumber = `CERT-${alumnus.graduationYear}-${String(alumnus._id).slice(-6).toUpperCase()}`;

  return (
    <div id="certificate-content" className="cert-a4">
      <div className="cert-border">
        <div className="cert-inner">
          {/* Top Logo */}
          <div className="cert-logo">
            <div className="logo-circle">
              <FaUniversity />
            </div>
          </div>

          {/* College Name */}
          <h1 className="cert-college">{college?.name}</h1>
          <p className="cert-sub">
            Established {college?.establishedYear} • Code: {college?.code}
          </p>

          <div className="divider"></div>

          {/* Title */}
          <h2 className="cert-title">CERTIFICATE OF ACHIEVEMENT</h2>

          <p className="cert-subtitle">This is to certify that</p>

          {/* Name */}
          <h2 className="cert-name">{alumnus.fullName}</h2>

          {/* Content */}
          <p className="cert-text">
            has successfully completed the program of study in
          </p>

          <h3 className="cert-course">{alumnus.course_id?.name}</h3>

          <p className="cert-text">from the {alumnus.department_id?.name}</p>

          {/* Info Row */}
          <div className="cert-info-row">
            <div>
              <span>Graduation Year</span>
              <strong>{alumnus.graduationYear}</strong>
            </div>
            <div>
              <span>Alumni Since</span>
              <strong>{issueDate}</strong>
            </div>
            <div>
              <span>Certificate No</span>
              <strong>{certificateNumber}</strong>
            </div>
          </div>

          {/* Signature */}
          <div className="cert-sign">
            <div>
              <div className="line"></div>
              <span>Principal / Director</span>
            </div>
            <div>
              <div className="line"></div>
              <span>Head of Department</span>
            </div>
            <div>
              <div className="line"></div>
              <span>Date Issued</span>
            </div>
          </div>

          {/* Footer */}
          <div className="cert-footer">
            Verify Certificate No: {certificateNumber}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= CERTIFICATE MODAL ================= */
function CertificateModal({
  alumnus,
  college,
  isOpen,
  onClose,
  onDownload,
  isDownloading,
}) {
  const handleDownload = async () => {
    await onDownload(alumnus, college);
  };

  if (!isOpen || !alumnus || !college) return null;

  return (
    <div className="cert-modal-overlay" onClick={onClose}>
      <div
        className="cert-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cert-modal-header">
          <div className="header-left">
            <FaCertificate className="header-icon" />
            <span>Certificate Preview</span>
          </div>

          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="cert-modal-body">
          <div className="cert-preview-wrapper">
            <Certificate alumnus={alumnus} college={college} />
          </div>
        </div>

        {/* Floating Footer */}
        <div className="cert-modal-footer">
          <button
            className="cert-btn cert-btn-download"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? <FaSpinner className="spin" /> : <FaFilePdf />}
            Download PDF
          </button>

          <button className="cert-btn cert-btn-print" onClick={() => window.print()}>
            <FaPrint /> Print
          </button>

          <button className="cert-btn cert-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= ALUMNI TABLE ROW ================= */
function AlumniTableRow({ alumnus, onGenerateCertificate, onViewDetails }) {
  const formattedDate = alumnus.alumniDate
    ? new Date(alumnus.alumniDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return (
    <tr className="alumni-row">
      <td className="cell-student">
        <div className="student-info">
          <span className="student-name-cell">{alumnus.fullName}</span>
          <span className="student-email">{alumnus.email}</span>
        </div>
      </td>
      <td className="cell-course">
        <span className="badge badge-course">
          {alumnus.course_id?.name || "N/A"}
        </span>
      </td>
      <td className="cell-department">
        <span className="department-name">
          {alumnus.department_id?.name || "N/A"}
        </span>
      </td>
      <td className="cell-year">
        <span className="badge badge-graduation-year">
          <FaGraduationCap className="badge-icon" />
          {alumnus.graduationYear || "N/A"}
        </span>
      </td>
      <td className="cell-date">
        <span className="alumni-date">
          <FaCalendarAlt className="date-icon" />
          {formattedDate}
        </span>
      </td>
      <td className="cell-actions">
        <div className="action-buttons">
          <button
            className="btn btn-action btn-generate-cert"
            onClick={() => onGenerateCertificate(alumnus)}
            title="Generate Certificate"
          >
            <FaCertificate />
            <span className="btn-text">Certificate</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ================= ALUMNI DETAILS MODAL ================= */
function AlumniDetailsModal({ alumnus, isOpen, onClose }) {
  if (!isOpen || !alumnus) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <FaUsers className="title-icon" />
            <span>Alumni Details</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="alumni-details-content">
            <div className="details-section">
              <h4 className="section-title">
                <FaInfoCircle /> Personal Information
              </h4>
              <div className="details-grid-2">
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value-text">{alumnus.fullName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value-text">{alumnus.email}</span>
                </div>
                {alumnus.mobileNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value-text">
                      {alumnus.mobileNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h4 className="section-title">
                <FaGraduationCap /> Academic Information
              </h4>
              <div className="details-grid-2">
                <div className="detail-row">
                  <span className="detail-label">Course:</span>
                  <span className="detail-value-text">
                    {alumnus.course_id?.name || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value-text">
                    {alumnus.department_id?.name || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Graduation Year:</span>
                  <span className="detail-value-text">
                    {alumnus.graduationYear || "N/A"}
                  </span>
                </div>
                {alumnus.admissionYear && (
                  <div className="detail-row">
                    <span className="detail-label">Admission Year:</span>
                    <span className="detail-value-text">
                      {alumnus.admissionYear}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h4 className="section-title">
                <FaCalendarAlt /> Alumni Information
              </h4>
              <div className="details-grid-2">
                <div className="detail-row">
                  <span className="detail-label">Alumni Since:</span>
                  <span className="detail-value-text">
                    {alumnus.alumniDate
                      ? new Date(alumnus.alumniDate).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="badge badge-status">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STATS CARD ================= */
function StatCard({ icon, label, value, accent }) {
  return (
    <div className="stat-card stat-card-themed">
      <div className={`stat-icon stat-icon-${accent ? "accent" : "default"}`}>
        {icon}
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function AlumniList() {
  const { user } = useContext(AuthContext);

  const [alumni, setAlumni] = useState([]);
  const [college, setCollege] = useState(null);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAlumni();
      setAlumni(res.alumni || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load alumni records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollege = async () => {
    try {
      const res = await api.get("/college/my-college");
      setCollege(res.data);
    } catch (err) {
      // Silently fail - college data is optional
    }
  };

  useEffect(() => {
    fetchAlumni();
    fetchCollege();
  }, []);

  // Get unique departments
  const getUniqueDepartments = () => {
    const departments = [
      ...new Set(alumni.map((a) => a.department_id?.name).filter(Boolean)),
    ];
    return departments.sort();
  };

  const filteredAlumni = alumni.filter((alumnus) => {
    const courseName = alumnus.course_id?.name || "";
    const departmentName = alumnus.department_id?.name || "";
    const searchText =
      `${alumnus.fullName} ${alumnus.email} ${courseName} ${departmentName}`.toLowerCase();
    const matchesSearch = searchText.includes(search.toLowerCase());
    const matchesYear =
      yearFilter === "ALL" || alumnus.graduationYear?.toString() === yearFilter;
    const matchesDepartment =
      departmentFilter === "ALL" ||
      alumnus.department_id?.name === departmentFilter;
    return matchesSearch && matchesYear && matchesDepartment;
  });

  const getUniqueGraduationYears = () => {
    const years = [
      ...new Set(alumni.map((a) => a.graduationYear).filter(Boolean)),
    ];
    return years.sort((a, b) => b - a);
  };

  const handleExportToExcel = () => {
    const tableHTML = `
      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>Course</th>
            <th>Department</th>
            <th>Graduation Year</th>
            <th>Alumni Date</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAlumni
            .map(
              (a) => `
            <tr>
              <td>${a.fullName}</td>
              <td>${a.email}</td>
              <td>${a.mobileNumber || "N/A"}</td>
              <td>${a.course_id?.name || "N/A"}</td>
              <td>${a.department_id?.name || "N/A"}</td>
              <td>${a.graduationYear || "N/A"}</td>
              <td>${a.alumniDate ? new Date(a.alumniDate).toLocaleDateString() : "N/A"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob(["\ufeff", tableHTML], {
      type: "application/vnd.ms-excel",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Alumni_Records_${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateCertificate = (alumnus) => {
    setSelectedAlumnus(alumnus);
    setCertificateModalOpen(true);
  };

  const handleViewDetails = (alumnus) => {
    setSelectedAlumnus(alumnus);
    setDetailsModalOpen(true);
  };

  const handleDownloadPDF = async (alumnusData, collegeData) => {
    try {
      // Show loading state
      setIsDownloadingPDF(true);

      // Load libraries if not already loaded
      if (
        typeof window.html2canvas === "undefined" ||
        typeof window.jspdf === "undefined"
      ) {
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        await Promise.all([
          loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
          ),
          loadScript(
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
          ),
        ]);
      }

      // Get the certificate element - try multiple selectors
      const element =
        document.getElementById("certificate-content") ||
        document.querySelector(".certificate-container");

      if (!element) {
        throw new Error(
          "Certificate element not found. Please make sure the certificate preview is open.",
        );
      }

      // Wait for fonts and images to load
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 500)); // Extra delay for rendering

      // Capture certificate with high quality - A4 landscape ratio
      const canvas = await window.html2canvas(element, {
        scale: 3,
      });

      const imgData = canvas.toDataURL("image/png");

      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Add PDF metadata for professional document
      pdf.setProperties({
        title: `Alumni Certificate - ${alumnusData.fullName}`,
        subject: "Certificate of Achievement",
        author: collegeData?.name || "College Administration",
        creator: "Smart College Alumni System",
        keywords: `certificate, alumni, ${alumnusData.fullName}, ${alumnusData.graduationYear}`,
      });

      // Generate filename
      const safeName = alumnusData.fullName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const filename = `Certificate_${safeName}_${alumnusData.graduationYear}.pdf`;

      // Save PDF
      pdf.save(filename);

      // Show success feedback with toast notification
      showSuccess(`✅ Certificate downloaded! File: ${filename}`, {
        autoClose: 5000,
      });
    } catch (error) {
      showError(
        `❌ PDF generation failed. ${error.message || "Please try the Print option instead."}`,
        {
          autoClose: 6000,
        },
      );
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="page-container alumni-page">
        <div className="page-header-skeleton" />
        <div className="stats-grid-skeleton">
          <div className="stat-card-skeleton" />
          <div className="stat-card-skeleton" />
          <div className="stat-card-skeleton" />
          <div className="stat-card-skeleton" />
        </div>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="page-container alumni-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon-wrapper">
            <FaGraduationCap className="header-icon" />
          </div>
          <div className="header-text">
            <h2 className="page-title">Alumni Records</h2>
            <p className="page-subtitle">
              Manage and generate certificates for alumni members
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          icon={<FaUsers />}
          label="Total Alumni"
          value={alumni.length}
          accent={true}
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Graduation Years"
          value={getUniqueGraduationYears().length}
          accent={true}
        />
        <StatCard
          icon={<FaAward />}
          label="Departments"
          value={getUniqueDepartments().length}
          accent={true}
        />
        <StatCard
          icon={<FaCertificate />}
          label="Certificates Ready"
          value={alumni.length}
          accent={true}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <div className="alert-content">
            <span className="alert-message">{error}</span>
            <button className="btn btn-retry" onClick={fetchAlumni}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="card filters-card">
        <div className="card-body">
          <div className="filters-row">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, course, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-wrapper">
              <FaCalendarAlt className="filter-icon" />
              <select
                className="filter-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="ALL">All Graduation Years</option>
                {getUniqueGraduationYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-wrapper">
              <FaUsers className="filter-icon" />
              <select
                className="filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {getUniqueDepartments().map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(search || yearFilter !== "ALL" || departmentFilter !== "ALL") && (
            <div className="active-filters">
              <span className="filter-tag">
                Showing {filteredAlumni.length} of {alumni.length} alumni
              </span>
              <button
                className="btn-clear-filters"
                onClick={() => {
                  setSearch("");
                  setYearFilter("ALL");
                  setDepartmentFilter("ALL");
                }}
              >
                <FaTimes /> Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alumni Table Card */}
      <div className="card table-card">
        <div className="card-header">
          <div className="card-title-wrapper">
            <FaUsers className="card-icon" />
            <h3 className="card-title">
              Alumni Members ({filteredAlumni.length})
            </h3>
          </div>
        </div>
        <div className="card-body">
          {filteredAlumni.length === 0 ? (
            <div className="empty-state">
              <FaGraduationCap className="empty-icon" />
              <h4 className="empty-title">No alumni found</h4>
              <p className="empty-text">
                {search || yearFilter !== "ALL" || departmentFilter !== "ALL"
                  ? "Try adjusting your search or filters"
                  : "Move students to Alumni to see them here"}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table alumni-table">
                <thead>
                  <tr>
                    <th className="th-student">Student</th>
                    <th className="th-course">Course</th>
                    <th className="th-department">Department</th>
                    <th className="th-year">Graduation Year</th>
                    <th className="th-date">Alumni Since</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumni.map((alumnus) => (
                    <AlumniTableRow
                      key={alumnus._id}
                      alumnus={alumnus}
                      onGenerateCertificate={handleGenerateCertificate}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal
        alumnus={selectedAlumnus}
        college={college}
        isOpen={certificateModalOpen}
        onClose={() => setCertificateModalOpen(false)}
        onDownload={handleDownloadPDF}
        isDownloading={isDownloadingPDF}
      />

      {/* Details Modal */}
      <AlumniDetailsModal
        alumnus={selectedAlumnus}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
      />
    </div>
  );
}
