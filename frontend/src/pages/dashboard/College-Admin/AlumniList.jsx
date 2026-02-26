import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getAlumni } from "../../../api/alumni";

import {
  FaGraduationCap,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaEnvelope,
  FaPhone,
  FaDownload,
  FaTimes,
  FaAward,
  FaUniversity,
  FaSpinner,
  FaPrint,
} from "react-icons/fa";

export default function AlumniList() {
  const { user } = useContext(AuthContext);

  const [alumni, setAlumni] = useState([]);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAlumni();
      console.log("Alumni response:", res);
      console.log("Alumni data:", res.alumni);
      setAlumni(res.alumni || []);
    } catch (err) {
      console.error("Error fetching alumni:", err);
      setError(err.response?.data?.message || "Failed to load alumni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  const filteredAlumni = alumni.filter((alumnus) => {
    const courseName = alumnus.course_id?.name || "";
    const matchesSearch =
      `${alumnus.fullName} ${alumnus.email} ${courseName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesYear =
      yearFilter === "ALL" || alumnus.graduationYear?.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

  const getUniqueGraduationYears = () => {
    const years = [...new Set(alumni.map((a) => a.graduationYear).filter(Boolean))];
    return years.sort((a, b) => b - a);
  };

  const handleExportToExcel = () => {
    // Simple Excel export using HTML table
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
          ${filteredAlumni.map(a => `
            <tr>
              <td>${a.fullName}</td>
              <td>${a.email}</td>
              <td>${a.course_id?.name || ''}</td>
              <td>${a.department_id?.name || ''}</td>
              <td>${a.graduationYear || ''}</td>
              <td>${new Date(a.alumniDate).toLocaleDateString() || ''}</td>
              <td>${a.mobileNumber || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob(['\ufeff', tableHTML], {
      type: 'application/vnd.ms-excel'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Alumni_Records_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateCertificate = (alumnus) => {
    setSelectedAlumnus(alumnus);
    setShowCertificateModal(true);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      
      // Load libraries dynamically if not available
      if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };

        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }

      const element = document.getElementById('certificate-content');
      
      if (!element) {
        throw new Error('Certificate element not found');
      }

      // Wait for fonts to load
      await document.fonts.ready;

      // Capture certificate with high quality
      const canvas = await window.html2canvas(element, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 900,
        windowHeight: 900,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 0,
        removeContainer: true,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Create PDF (A4 size, landscape)
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add image to PDF with proper sizing
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      // Save with proper filename
      const filename = `Alumni_Certificate_${selectedAlumnus.fullName.replace(/\s+/g, '_')}_${selectedAlumnus.graduationYear}.pdf`;
      pdf.save(filename);
      
      setIsDownloadingPDF(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please use Print option instead.');
      setIsDownloadingPDF(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">
          <FaGraduationCap /> Alumni Records
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportToExcel} className="btn btn-outline-success">
            <FaFileExcel /> Export to Excel
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <p>{error}</p>
          <button onClick={fetchAlumni} className="btn btn-sm btn-outline-danger">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="filter-row">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="filter-select"
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

      {/* Alumni List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Alumni ({filteredAlumni.length})
          </h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading alumni records...</p>
            </div>
          ) : filteredAlumni.length === 0 ? (
            <div className="empty-state">
              <FaGraduationCap className="empty-icon" />
              <p className="empty-title">No alumni found</p>
              <p className="empty-text">
                {search || yearFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Move students to Alumni to see them here"}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%', minWidth: '200px' }}>Student</th>
                    <th style={{ width: '20%', minWidth: '180px' }}>Course</th>
                    <th style={{ width: '15%', minWidth: '150px' }}>Department</th>
                    <th style={{ width: '12%', minWidth: '100px' }}>Graduation Year</th>
                    <th style={{ width: '13%', minWidth: '120px' }}>Alumni Since</th>
                    <th style={{ width: '15%', minWidth: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumni.map((alumnus) => {
                    console.log("Rendering alumni:", alumnus.fullName, {
                      course_id: alumnus.course_id,
                      course_name: alumnus.course_id?.name,
                      graduationYear: alumnus.graduationYear,
                    });
                    return (
                      <tr key={alumnus._id}>
                        <td style={{ verticalAlign: 'top' }}>
                          <div className="student-name" style={{ fontWeight: '600', marginBottom: '4px' }}>{alumnus.fullName}</div>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className="badge badge-info" style={{ backgroundColor: '#17a2b8', color: 'white', display: 'inline-block' }}>
                            {alumnus.course_id?.name || "N/A"}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'top', color: '#333', fontWeight: '500' }}>{alumnus.department_id?.name || "N/A"}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className="badge badge-warning" style={{ backgroundColor: '#ffc107', color: '#333', display: 'inline-block' }}>
                            {alumnus.graduationYear || "N/A"}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'top', color: '#666' }}>
                          {alumnus.alumniDate
                            ? new Date(alumnus.alumniDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            <button
                              onClick={() => handleGenerateCertificate(alumnus)}
                              className="btn btn-sm btn-primary"
                              title="Generate Certificate"
                            >
                              <FaPrint /> Generate Certificate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && selectedAlumnus && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          overflow: 'auto',
          padding: '20px',
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <div className="modal-header" style={{
              padding: '20px',
              borderBottom: '2px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h4 className="modal-title" style={{
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
              }}>
                <FaGraduationCap style={{ color: '#4a6cf7' }} /> Alumni Certificate
              </h4>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="modal-close"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px',
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body" style={{
              padding: '20px',
              overflow: 'auto',
              flex: 1,
            }}>
              {/* Certificate Content */}
              <div id="certificate-content" className="certificate-content" style={{
                border: 'none',
                padding: '0',
                textAlign: 'center',
                background: '#ffffff',
                position: 'relative',
                width: '900px',
                height: '900px',
                minHeight: '900px',
                margin: '0 auto',
                transform: 'scale(1)',
                transformOrigin: 'top center',
                overflow: 'hidden',
              }}>
                {/* Decorative Border */}
                <div style={{
                  border: '20px solid #1a1a2e',
                  height: '100%',
                  padding: '40px',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}>
                  {/* Inner Border */}
                  <div style={{
                    border: '3px solid #4a6cf7',
                    height: '100%',
                    padding: '35px',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}>
                    {/* Corner Decorations */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      fontSize: '40px',
                      color: '#4a6cf7',
                    }}>
                      <FaAward />
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      fontSize: '40px',
                      color: '#4a6cf7',
                    }}>
                      <FaAward />
                    </div>

                    {/* Header */}
                    <div style={{
                      marginBottom: '20px',
                    }}>
                      <FaUniversity style={{
                        fontSize: '40px',
                        color: '#1a1a2e',
                        marginBottom: '8px',
                      }} />
                      <h1 style={{
                        fontSize: '32px',
                        color: '#1a1a2e',
                        margin: '8px 0',
                        fontFamily: "'Times New Roman', Georgia, serif",
                        fontWeight: 'bold',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        lineHeight: '1.2',
                      }}>
                        Certificate of Achievement
                      </h1>
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        fontStyle: 'italic',
                        marginTop: '8px',
                      }}>
                        This is to certify that
                      </div>
                    </div>

                    {/* Student Name */}
                    <div style={{
                      margin: '20px 0',
                      padding: '15px',
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
                      borderRadius: '8px',
                    }}>
                      <h2 style={{
                        fontSize: '40px',
                        color: '#1a1a2e',
                        margin: '0',
                        fontFamily: "'Great Vibes', cursive, 'Georgia', serif",
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        lineHeight: '1.2',
                      }}>
                        {selectedAlumnus.fullName}
                      </h2>
                    </div>

                    {/* Achievement Text */}
                    <div style={{
                      fontSize: '16px',
                      color: '#333',
                      lineHeight: '1.6',
                      marginBottom: '20px',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      <p style={{ margin: '8px 0' }}>
                        has successfully completed the program of study in
                      </p>
                      <h3 style={{
                        fontSize: '26px',
                        color: '#4a6cf7',
                        margin: '15px 0',
                        fontFamily: "'Times New Roman', Georgia, serif",
                        fontWeight: 'bold',
                        lineHeight: '1.3',
                      }}>
                        {selectedAlumnus.course_id?.name || 'Course'}
                      </h3>
                      <p style={{ margin: '8px 0' }}>
                        from the <strong>{selectedAlumnus.department_id?.name || 'Department'}</strong>
                      </p>
                    </div>

                    {/* Details Section */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '40px',
                      marginTop: '30px',
                      paddingTop: '20px',
                      borderTop: '3px double #ccc',
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '20px 40px',
                        borderRadius: '10px',
                       
                      }}>
                        <div style={{
                          fontSize: '14px',
                          opacity: '0.9',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}>
                          Graduation Year
                        </div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}>
                          {selectedAlumnus.graduationYear || 'N/A'}
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '20px 40px',
                        borderRadius: '10px',
                        
                      }}>
                        <div style={{
                          fontSize: '14px',
                          opacity: '0.9',
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}>
                          Alumni Since
                        </div>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                        }}>
                          {selectedAlumnus.alumniDate
                            ? new Date(selectedAlumnus.alumniDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                      marginTop: '40px',
                      paddingTop: '25px',
                      borderTop: '2px solid #ccc',
                      fontSize: '13px',
                      color: '#999',
                      fontStyle: 'italic',
                      lineHeight: '1.5',
                    }}>
                      This certificate is issued by the College Administration as official recognition of alumni status
                    </div>

                    {/* Signature Line */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '50px',
                      paddingTop: '15px',
                    }}>
                      <div style={{
                        textAlign: 'center',
                        flex: '1',
                      }}>
                        <div style={{
                          borderTop: '2px solid #333',
                          width: '200px',
                          margin: '0 auto 8px',
                        }}></div>
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          fontWeight: 'bold',
                        }}>
                          College Administrator
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        flex: '1',
                      }}>
                        <div style={{
                          borderTop: '2px solid #333',
                          width: '200px',
                          margin: '0 auto 8px',
                        }}></div>
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          fontWeight: 'bold',
                        }}>
                          Date Issued
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#999',
                          marginTop: '4px',
                        }}>
                          {new Date().toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{
              padding: '20px',
              borderTop: '2px solid #e0e0e0',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloadingPDF}
                className="btn btn-success"
                style={{
                  marginRight: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                }}
              >
                {isDownloadingPDF ? (
                  <>
                    <FaSpinner className="spinner-icon" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <FaFilePdf /> Download PDF
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="btn btn-secondary"
                style={{
                  padding: '10px 20px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .page-container {
          padding: 24px;
          background: #f5f7fa;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 300px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .search-input:focus {
          border-color: #4a6cf7;
        }

        .filter-select {
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          min-width: 200px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e0e0e0;
          border-top-color: #4a6cf7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 64px;
          color: #ccc;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
        }

        .empty-text {
          color: #999;
          font-size: 14px;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .contact-icon {
          color: #4a6cf7;
        }

        /* Certificate Content Styles */
        .certificate-content {
          page-break-inside: avoid;
          page-break-before: always;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          
          body * {
            visibility: hidden;
          }
          
          .certificate-content, 
          .certificate-content * {
            visibility: visible;
          }
          
          .certificate-content {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            overflow: visible;
            z-index: 9999;
          }
          
          /* Hide modal elements */
          .modal-overlay, 
          .modal-header, 
          .modal-footer,
          .modal-close,
          .modal-body {
            display: none !important;
          }
          
          /* Ensure borders and backgrounds print */
          .certificate-content [style*="border"] {
            border: inherit !important;
          }
          
          .certificate-content [style*="background"] {
            background: inherit !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .certificate-content [style*="gradient"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force landscape orientation */
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}
