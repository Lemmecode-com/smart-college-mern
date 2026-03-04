import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getAlumni } from "../../../api/alumni";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";
import { TableSkeleton } from "../../../components/Skeleton";
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
} from "react-icons/fa";

/* ================= CERTIFICATE COMPONENT ================= */
function Certificate({ alumnus, college }) {
  if (!alumnus || !college) return null;

  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const alumniDate = alumnus.alumniDate
    ? new Date(alumnus.alumniDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  // Generate unique certificate number
  const certificateNumber = `CERT-${alumnus.graduationYear || "2026"}-${String(alumnus._id).slice(-6).toUpperCase()}`;

  return (
    <div className="certificate-container" id="certificate-content">
      {/* Outer Decorative Border */}
      <div className="certificate-outer-border">
        {/* Inner Border */}
        <div className="certificate-inner-border">
          {/* Corner Ornaments */}
          <div className="corner-ornament top-left">
            <FaAward />
          </div>
          <div className="corner-ornament top-right">
            <FaAward />
          </div>
          <div className="corner-ornament bottom-left">
            <FaAward />
          </div>
          <div className="corner-ornament bottom-right">
            <FaAward />
          </div>

          {/* Certificate Header - College Information */}
          <div className="certificate-header">
            <div className="college-header-section">
              <div className="logo-section">
                {college.logo ? (
                  <img src={college.logo} alt="College Logo" className="college-logo" />
                ) : (
                  <div className="logo-placeholder">
                    <FaUniversity />
                  </div>
                )}
              </div>
              <div className="college-info">
                <h1 className="college-name">{college.name || "College"}</h1>
                <p className="established-text">
                  Established {college.establishedYear || "2020"}
                </p>
                <p className="college-code">
                  Code: {college.code || "COLLEGE"}
                </p>
              </div>
            </div>
            <FaStar className="star-divider" />
            <h2 className="certificate-title">Certificate of Achievement</h2>
            <p className="certificate-subtitle">This is to certify that</p>
          </div>

          {/* Student Name */}
          <div className="student-name-section">
            <h2 className="student-name">{alumnus.fullName}</h2>
            {alumnus.user_id && (
              <p className="student-id">Student ID: {alumnus.user_id}</p>
            )}
          </div>

          {/* Achievement Text */}
          <div className="achievement-text">
            <p className="achievement-intro">
              has successfully completed the program of study in
            </p>
            <h3 className="course-name">
              {alumnus.course_id?.name || "Course"}
            </h3>
            <p className="department-text">
              from the <strong>{alumnus.department_id?.name || "Department"}</strong>
            </p>
          </div>

          {/* Details Grid */}
          <div className="details-grid">
            <div className="detail-item">
              <FaCalendarAlt className="detail-icon" />
              <span className="detail-label">Graduation Year</span>
              <span className="detail-value">{alumnus.graduationYear || "N/A"}</span>
            </div>
            <div className="detail-item">
              <FaGraduationCap className="detail-icon" />
              <span className="detail-label">Alumni Since</span>
              <span className="detail-value">{alumniDate}</span>
            </div>
            <div className="detail-item">
              <FaCertificate className="detail-icon" />
              <span className="detail-label">Certificate No.</span>
              <span className="detail-value cert-number">{certificateNumber}</span>
            </div>
          </div>

          {/* Certificate Footer */}
          <div className="certificate-footer">
            <p className="footer-text">
              This certificate is issued by the College Administration as official
              recognition of alumni status.
            </p>
            <p className="verification-text">
              <FaQrcode className="qr-icon" />
              Verify Certificate No: <strong>{certificateNumber}</strong>
            </p>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-block">
              <div className="signature-line"></div>
              <span className="signature-label">Principal / Director</span>
              <span className="signature-sublabel">{college.name}</span>
            </div>
            <div className="signature-block">
              <div className="signature-line"></div>
              <span className="signature-label">Head of Department</span>
              <span className="signature-sublabel">{alumnus.department_id?.name || "Department"}</span>
            </div>
            <div className="signature-block">
              <div className="signature-line"></div>
              <span className="signature-label">Date Issued</span>
              <span className="signature-date">{issueDate}</span>
            </div>
          </div>

          {/* Certificate Footer */}
          <div className="certificate-footer-final">
            <p className="footer-disclaimer">
              <FaInfoCircle className="info-icon" />
              This is a digitally generated certificate. Any tampering or alteration will render this certificate invalid.
            </p>
            <p className="footer-note">
              © {new Date().getFullYear()} {college.name}. All rights reserved.
            </p>
          </div>

          {/* Watermark */}
          <div className="certificate-watermark">
            <FaUniversity />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= CERTIFICATE MODAL ================= */
function CertificateModal({ alumnus, college, isOpen, onClose, onDownload }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    await onDownload();
    setIsDownloading(false);
  };

  if (!isOpen || !alumnus || !college) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FaGraduationCap className="title-icon" />
            <span>Alumni Certificate</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <Certificate alumnus={alumnus} college={college} />
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-download-pdf"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <FaSpinner className="spinner" /> Generating PDF...
              </>
            ) : (
              <>
                <FaDownload /> Download PDF
              </>
            )}
          </button>
          <button
            className="btn btn-print"
            onClick={() => window.print()}
          >
            <FaPrint /> Print
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
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
        year: "numeric"
      })
    : "N/A";

  return (
    <tr className="alumni-row">
      <td className="cell-student">
        <div className="student-info">
          <span className="student-name-cell">{alumnus.fullName}</span>
          {alumnus.user_id && (
            <span className="student-id-badge">ID: {alumnus.user_id.slice(-8)}</span>
          )}
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
        <span className="badge badge-year">
          {alumnus.graduationYear || "N/A"}
        </span>
      </td>
      <td className="cell-date">
        <span className="alumni-date">{formattedDate}</span>
      </td>
      <td className="cell-actions">
        <div className="action-buttons">
          <button
            className="btn btn-view"
            onClick={() => onViewDetails(alumnus)}
            title="View Details"
          >
            <FaEye />
          </button>
          <button
            className="btn btn-generate"
            onClick={() => onGenerateCertificate(alumnus)}
            title="Generate Certificate"
          >
            <FaCertificate /> Certificate
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
      <div className="modal-container details-modal" onClick={(e) => e.stopPropagation()}>
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
                {alumnus.user_id && (
                  <div className="detail-row">
                    <span className="detail-label">User ID:</span>
                    <span className="detail-value-text">{alumnus.user_id}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value-text">{alumnus.email}</span>
                </div>
                {alumnus.mobileNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value-text">{alumnus.mobileNumber}</span>
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
                  <span className="detail-value-text">{alumnus.course_id?.name || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value-text">{alumnus.department_id?.name || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Graduation Year:</span>
                  <span className="detail-value-text">{alumnus.graduationYear || "N/A"}</span>
                </div>
                {alumnus.admissionYear && (
                  <div className="detail-row">
                    <span className="detail-label">Admission Year:</span>
                    <span className="detail-value-text">{alumnus.admissionYear}</span>
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
                    {alumnus.alumniDate ? new Date(alumnus.alumniDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    }) : "N/A"}
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
function StatCard({ icon, label, value, color, gradient }) {
  return (
    <div className="stat-card" style={{ background: gradient }}>
      <div className="stat-icon">{icon}</div>
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

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAlumni();
      setAlumni(res.alumni || []);
    } catch (err) {
      console.error("Error fetching alumni:", err);
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
      console.error("Error fetching college:", err);
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
    const searchText = `${alumnus.fullName} ${alumnus.email} ${courseName} ${departmentName}`.toLowerCase();
    const matchesSearch = searchText.includes(search.toLowerCase());
    const matchesYear =
      yearFilter === "ALL" || alumnus.graduationYear?.toString() === yearFilter;
    const matchesDepartment =
      departmentFilter === "ALL" || alumnus.department_id?.name === departmentFilter;
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
          `
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

  const handleDownloadPDF = async () => {
    try {
      if (
        typeof window.html2canvas === "undefined" ||
        typeof window.jspdf === "undefined"
      ) {
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };

        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        );
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        );
      }

      const element = document.getElementById("certificate-content");
      if (!element) throw new Error("Certificate element not found");

      await document.fonts.ready;

      const canvas = await window.html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 900,
        windowHeight: 900,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const filename = `Alumni_Certificate_${selectedAlumnus.fullName.replace(
        /\s+/g,
        "_"
      )}_${selectedAlumnus.graduationYear}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Please use Print option instead.");
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
        <div className="header-actions">
          <button className="btn btn-export" onClick={handleExportToExcel}>
            <FaFileExcel /> Export to Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard
          icon={<FaUsers />}
          label="Total Alumni"
          value={alumni.length}
          color="primary"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          label="Graduation Years"
          value={getUniqueGraduationYears().length}
          color="success"
          gradient="linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)"
        />
        <StatCard
          icon={<FaAward />}
          label="Departments"
          value={getUniqueDepartments().length}
          color="info"
          gradient="linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)"
        />
        <StatCard
          icon={<FaCertificate />}
          label="Certificates Ready"
          value={alumni.length}
          color="warning"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
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
