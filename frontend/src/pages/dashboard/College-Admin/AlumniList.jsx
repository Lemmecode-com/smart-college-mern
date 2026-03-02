import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getAlumni } from "../../../api/alumni";
import "./AlumniList.css";

import {
  FaGraduationCap,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaTimes,
  FaDownload,
  FaAward,
  FaUniversity,
  FaSpinner,
  FaPrint,
  FaUsers,
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";

/* ================= CERTIFICATE COMPONENT ================= */
function Certificate({ alumnus }) {
  if (!alumnus) return null;

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

  return (
    <div className="certificate-container">
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

          {/* Certificate Header */}
          <div className="certificate-header">
            <FaUniversity className="university-icon" />
            <h1 className="certificate-title">Certificate of Achievement</h1>
            <p className="certificate-subtitle">This is to certify that</p>
          </div>

          {/* Student Name */}
          <div className="student-name-section">
            <h2 className="student-name">{alumnus.fullName}</h2>
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
          </div>

          {/* Certificate Footer */}
          <div className="certificate-footer">
            <p className="footer-text">
              This certificate is issued by the College Administration as official
              recognition of alumni status.
            </p>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-block">
              <div className="signature-line"></div>
              <span className="signature-label">College Administrator</span>
            </div>
            <div className="signature-block">
              <div className="signature-line"></div>
              <span className="signature-label">Date Issued</span>
              <span className="signature-date">{issueDate}</span>
            </div>
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
function CertificateModal({ alumnus, isOpen, onClose, onDownload }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    await onDownload();
    setIsDownloading(false);
  };

  if (!isOpen || !alumnus) return null;

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
          <Certificate alumnus={alumnus} />
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
                <FaFilePdf /> Download PDF
              </>
            )}
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
function AlumniTableRow({ alumnus, onGenerateCertificate }) {
  const formattedDate = alumnus.alumniDate
    ? new Date(alumnus.alumniDate).toLocaleDateString()
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
        <span className="badge badge-year">
          {alumnus.graduationYear || "N/A"}
        </span>
      </td>
      <td className="cell-date">
        <span className="alumni-date">{formattedDate}</span>
      </td>
      <td className="cell-actions">
        <button
          className="btn btn-generate"
          onClick={() => onGenerateCertificate(alumnus)}
          title="Generate Certificate"
        >
          <FaPrint /> Generate Certificate
        </button>
      </td>
    </tr>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function AlumniList() {
  const { user } = useContext(AuthContext);

  const [alumni, setAlumni] = useState([]);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
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

  useEffect(() => {
    fetchAlumni();
  }, []);

  const filteredAlumni = alumni.filter((alumnus) => {
    const courseName = alumnus.course_id?.name || "";
    const searchText = `${alumnus.fullName} ${alumnus.email} ${courseName}`.toLowerCase();
    const matchesSearch = searchText.includes(search.toLowerCase());
    const matchesYear =
      yearFilter === "ALL" || alumnus.graduationYear?.toString() === yearFilter;
    return matchesSearch && matchesYear;
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
            <th>Course</th>
            <th>Department</th>
            <th>Graduation Year</th>
            <th>Alumni Date</th>
            <th>Mobile</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAlumni
            .map(
              (a) => `
            <tr>
              <td>${a.fullName}</td>
              <td>${a.email}</td>
              <td>${a.course_id?.name || ""}</td>
              <td>${a.department_id?.name || ""}</td>
              <td>${a.graduationYear || ""}</td>
              <td>${new Date(a.alumniDate).toLocaleDateString() || ""}</td>
              <td>${a.mobileNumber || ""}</td>
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
    setModalOpen(true);
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
                placeholder="Search by name, email, or course..."
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
          </div>
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
          {loading ? (
            <div className="loading-state">
              <FaSpinner className="spinner-large" />
              <p>Loading alumni records...</p>
            </div>
          ) : filteredAlumni.length === 0 ? (
            <div className="empty-state">
              <FaGraduationCap className="empty-icon" />
              <h4 className="empty-title">No alumni found</h4>
              <p className="empty-text">
                {search || yearFilter !== "ALL"
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDownload={handleDownloadPDF}
      />
    </div>
  );
}
