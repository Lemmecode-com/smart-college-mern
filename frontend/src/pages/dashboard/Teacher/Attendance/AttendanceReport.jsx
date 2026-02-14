import React, { useEffect, useState } from "react";
import api from "../../../../api/axios";
import {
  FaChartBar,
  FaFilter,
  FaCalendarAlt,
  FaGraduationCap,
  FaBook,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaPercentage,
  FaSyncAlt,
  FaDownload,
  FaPrint,
  FaInfoCircle,
  FaArrowLeft,
  FaSearch,
  FaEye,
  FaFileExport,
  FaClock,
  FaUniversity,
  FaListUl
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.7, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
  }
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-5, 5, -5],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

export default function AttendanceReport() {
  const [report, setReport] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [generatingCSV, setGeneratingCSV] = useState(false);

  const [filters, setFilters] = useState({
    courseId: "",
    subjectId: "",
    startDate: "",
    endDate: "",
  });

  /* ================= FETCH COURSES ================= */
  const fetchCourses = async () => {
    try {
      const res = await api.get("/attendance/report/courses");
      setCourses(res.data || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Failed to load courses. Please try again.");
    }
  };

  /* ================= FETCH SUBJECTS ================= */
  const fetchSubjects = async (courseId) => {
    if (!courseId) {
      setSubjects([]);
      return;
    }
    
    try {
      const res = await api.get(`/attendance/report/subjects/${courseId}`);
      setSubjects(res.data || []);
    } catch (err) {
      console.error("Failed to load subjects:", err);
      setError("Failed to load subjects. Please try again.");
    }
  };

  /* ================= FETCH REPORT ================= */
  const fetchReport = async () => {
    setFetchingReport(true);
    setError(null);
    
    try {
      const params = {};
      if (filters.courseId) params.courseId = filters.courseId;
      if (filters.subjectId) params.subjectId = filters.subjectId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const res = await api.get("/attendance/report", { params });
      setReport(res.data || { summary: {}, sessions: [] });
    } catch (err) {
      console.error("Failed to load report:", err);
      setError(err.response?.data?.message || "Failed to load attendance report. Please try again.");
      setReport({ summary: {}, sessions: [] });
    } finally {
      setFetchingReport(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchReport();
  }, []);

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setFilters({
      ...filters,
      courseId,
      subjectId: "", // reset subject
    });
    fetchSubjects(courseId);
  };

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  /* ================= EXPORT TO CSV ================= */
  const exportToCSV = () => {
    if (!report?.sessions || report.sessions.length === 0) return;
    
    setGeneratingCSV(true);
    
    try {
      // Create CSV header
      const headers = ['Date', 'Subject', 'Course', 'Lecture Number', 'Total Students', 'Present', 'Absent', 'Attendance %'];
      
      // Create CSV rows
      const rows = report.sessions.map(session => [
        new Date(session.date).toLocaleDateString('en-US'),
        `"${session.subject}"`,
        `"${session.course || 'N/A'}"`,
        session.lectureNumber,
        session.totalStudents || 0,
        session.present || 0,
        session.absent || 0,
        `${(session.percentage ?? 0).toFixed(2)}%`
      ]);
      
      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("Failed to export report. Please try again.");
    } finally {
      setTimeout(() => setGeneratingCSV(false), 300);
    }
  };

  /* ================= PRINT REPORT ================= */
  const printReport = () => {
    if (!report) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 40px; color: #1e293b; }
            h1 { color: #1a4b6d; text-align: center; margin-bottom: 30px; font-size: 2.5rem; }
            .summary { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; gap: 20px; }
            .summary-item { text-align: center; padding: 20px; border-radius: 12px; min-width: 180px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 10px; }
            .summary-item.total { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; }
            .summary-item.present { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 1px solid #86efac; color: #166534; }
            .summary-item.absent { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 1px solid #fca5a5; color: #b91c1c; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; }
            th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; }
            th { background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%); color: white; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.9rem; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tr:hover { background-color: #edf2f7; }
            .footer { margin-top: 50px; text-align: center; font-style: italic; color: #64748b; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .header-info { text-align: center; margin-bottom: 20px; color: #64748b; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
              table { box-shadow: none; border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div style="font-size: 1.2rem; font-weight: 600;">NOVAA Attendance Management System</div>
            <div>Report generated on ${new Date().toLocaleString()}</div>
          </div>
          <h1>Attendance Analytics Report</h1>
          
          <div class="summary">
            <div class="summary-item total">
              <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">TOTAL LECTURES</div>
              <div style="font-size: 2.5rem; font-weight: 800;">${report.summary.totalLectures || 0}</div>
            </div>
            <div class="summary-item total">
              <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">TOTAL STUDENTS</div>
              <div style="font-size: 2.5rem; font-weight: 800;">${report.summary.totalStudents || 0}</div>
            </div>
            <div class="summary-item present">
              <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">TOTAL PRESENT</div>
              <div style="font-size: 2.5rem; font-weight: 800;">${report.summary.totalPresent || 0}</div>
            </div>
            <div class="summary-item absent">
              <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">TOTAL ABSENT</div>
              <div style="font-size: 2.5rem; font-weight: 800;">${report.summary.totalAbsent || 0}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Course</th>
                <th>Lecture No.</th>
                <th>Total Students</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              ${report.sessions.map(s => `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString()}</td>
                  <td>${s.subject}</td>
                  <td>${s.course || 'N/A'}</td>
                  <td>${s.lectureNumber}</td>
                  <td>${s.totalStudents || 0}</td>
                  <td style="color: #166534; font-weight: 600;">${s.present || 0}</td>
                  <td style="color: #b91c1c; font-weight: 600;">${s.absent || 0}</td>
                  <td><strong>${(s.percentage ?? 0).toFixed(2)}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>NOVAA Attendance Management System • Comprehensive attendance analytics for educational institutions</p>
            <p>Report generated on ${new Date().toLocaleString()} • Page <span class="page-number"></span></p>
          </div>
          
          <script>
            // Add page numbers
            const totalPages = Math.ceil(document.body.scrollHeight / 1122); // Approximate page height
            const pageNumberSpans = document.querySelectorAll('.page-number');
            pageNumberSpans.forEach(span => {
              span.textContent = '1 of ' + totalPages;
            });
            
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading && !report) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            variants={spinVariants}
            animate="animate"
            style={{ marginBottom: '1.5rem', color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
          >
            <FaSyncAlt />
          </motion.div>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            color: '#1e293b', 
            fontWeight: 700,
            fontSize: '1.5rem'
          }}>
            Loading Attendance Report...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Preparing your comprehensive attendance analytics
          </p>
        </div>
      </div>
    );
  }

  const { summary = {}, sessions = [] } = report || {};

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '1.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: BRAND_COLORS.primary.main,
                background: 'none',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Attendance Report</span>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: '72px',
                    height: '72px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0,
                    boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <FaChartBar />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Attendance Analytics Report
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    Comprehensive insights into student attendance patterns
                  </p>
                </div>
              </div>
              {/* <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToCSV}
                  disabled={generatingCSV || sessions.length === 0}
                  style={{
                    backgroundColor: (generatingCSV || sessions.length === 0) ? '#cbd5e1' : BRAND_COLORS.success.main,
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: (generatingCSV || sessions.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: (generatingCSV || sessions.length === 0) ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.3)'
                  }}
                >
                  {generatingCSV ? (
                    <>
                      <motion.div variants={spinVariants} animate="animate">
                        <FaSyncAlt size={14} />
                      </motion.div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FaFileExport /> Export to CSV
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={printReport}
                  disabled={sessions.length === 0}
                  style={{
                    backgroundColor: sessions.length === 0 ? '#cbd5e1' : BRAND_COLORS.info.main,
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: sessions.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: sessions.length === 0 ? 'none' : '0 4px 15px rgba(23, 162, 184, 0.3)'
                  }}
                >
                  <FaPrint /> Print Report
                </motion.button>
              </div> */}
            </div>
            
            {/* Info Banner */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#dbeafe',
              borderTop: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <FaInfoCircle style={{ color: BRAND_COLORS.primary.main, fontSize: '1.25rem' }} />
                <span style={{ color: '#1e293b', fontWeight: 500 }}>
                  Use filters to generate custom reports. Data updates in real-time based on your selections.
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchReport}
                disabled={fetchingReport}
                style={{
                  backgroundColor: BRAND_COLORS.primary.main,
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: fetchingReport ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
              >
                {fetchingReport ? (
                  <>
                    <motion.div variants={spinVariants} animate="animate">
                      <FaSyncAlt size={14} />
                    </motion.div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <FaSyncAlt /> Refresh Data
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ================= FILTER SECTION ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: BRAND_COLORS.primary.gradient,
              zIndex: 1
            }} />
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginBottom: '1.25rem',
              flexWrap: 'wrap'
            }}>
              <FaFilter style={{ color: BRAND_COLORS.primary.main, fontSize: '1.25rem' }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.35rem', 
                fontWeight: 700,
                color: '#1e293b'
              }}>
                Filter Report Parameters
              </h3>
              <div style={{ 
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#dbeafe',
                color: BRAND_COLORS.primary.main,
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 500
              }}>
                <FaSearch size={14} />
                Apply filters and click "Generate Report"
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              {/* Course Filter */}
              <FilterField label="Course" icon={<FaGraduationCap />}>
                <select
                  value={filters.courseId}
                  onChange={handleCourseChange}
                  style={filterSelectStyle}
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </FilterField>
              
              {/* Subject Filter */}
              <FilterField label="Subject" icon={<FaBook />} disabled={!filters.courseId}>
                <select
                  name="subjectId"
                  value={filters.subjectId}
                  onChange={handleChange}
                  disabled={!filters.courseId}
                  style={{
                    ...filterSelectStyle,
                    backgroundColor: !filters.courseId ? '#f1f5f9' : 'white',
                    color: !filters.courseId ? '#94a3b8' : '#1e293b'
                  }}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </FilterField>
              
              {/* Start Date */}
              <FilterField label="Start Date" icon={<FaCalendarAlt />}>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleChange}
                  style={filterInputStyle}
                />
              </FilterField>
              
              {/* End Date */}
              <FilterField label="End Date" icon={<FaCalendarAlt />}>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleChange}
                  style={filterInputStyle}
                />
              </FilterField>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchReport}
                disabled={fetchingReport}
                style={{
                  backgroundColor: fetchingReport ? '#94a3b8' : BRAND_COLORS.primary.main,
                  color: 'white',
                  border: 'none',
                  padding: '0.875rem 2rem',
                  borderRadius: '12px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  cursor: fetchingReport ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  boxShadow: fetchingReport ? 'none' : '0 4px 15px rgba(26, 75, 109, 0.3)',
                  minWidth: '180px',
                  justifyContent: 'center'
                }}
              >
                {fetchingReport ? (
                  <>
                    <motion.div variants={spinVariants} animate="animate">
                      <FaSyncAlt />
                    </motion.div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FaSearch /> Generate Report
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* ================= ERROR STATE ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <FaTimesCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= SUMMARY CARDS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: '1.5rem' }}
          >
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              color: '#1e293b',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <FaChartBar style={{ color: BRAND_COLORS.primary.main }} /> Report Summary
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '1.25rem'
            }}>
              <SummaryCard
                title="Total Lectures"
                value={summary.totalLectures || 0}
                icon={<FaUniversity />}
                color={BRAND_COLORS.primary.main}
                subtitle="Sessions conducted"
              />
              <SummaryCard
                title="Total Students"
                value={summary.totalStudents || 0}
                icon={<FaUsers />}
                color={BRAND_COLORS.info.main}
                subtitle="Unique students tracked"
              />
              <SummaryCard
                title="Total Present"
                value={summary.totalPresent || 0}
                icon={<FaCheckCircle />}
                color={BRAND_COLORS.success.main}
                subtitle="Attendance records"
                trend={summary.totalPresent > 0 ? `+${Math.round((summary.totalPresent / (summary.totalPresent + summary.totalAbsent || 1)) * 100)}%` : "0%"}
              />
              <SummaryCard
                title="Total Absent"
                value={summary.totalAbsent || 0}
                icon={<FaTimesCircle />}
                color={BRAND_COLORS.danger.main}
                subtitle="Missed sessions"
                trend={summary.totalAbsent > 0 ? `-${Math.round((summary.totalAbsent / (summary.totalPresent + summary.totalAbsent || 1)) * 100)}%` : "0%"}
              />
            </div>
          </motion.div>

          {/* ================= SESSION TABLE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaListUl style={{ color: BRAND_COLORS.primary.main }} /> Session-wise Attendance Details
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: '#ffedd5',
                color: '#c2410c',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                <FaInfoCircle /> {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '900px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={headerCellStyle}>Date</th>
                    <th style={headerCellStyle}>Subject</th>
                    <th style={headerCellStyle}>Course</th>
                    <th style={headerCellStyle}>Lecture No.</th>
                    <th style={headerCellStyle}>Total Students</th>
                    <th style={headerCellStyle} className="text-success">Present</th>
                    <th style={headerCellStyle} className="text-danger">Absent</th>
                    <th style={headerCellStyle}>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length > 0 ? (
                    sessions.map((session, idx) => (
                      <SessionRow 
                        key={idx} 
                        session={session} 
                        delay={idx * 0.03}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>
                          <FaChartBar />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>
                          No Attendance Data Found
                        </h3>
                        <p style={{ margin: 0, color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
                          Apply filters above and click "Generate Report" to view attendance analytics. 
                          Make sure you have conducted sessions within the selected date range.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            {sessions.length > 0 && (
              <div style={{
                padding: '1.25rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  <strong>{sessions.length}</strong> session{sessions.length !== 1 ? 's' : ''} displayed • Last updated: {new Date().toLocaleTimeString()}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportToCSV}
                    disabled={generatingCSV}
                    style={{
                      backgroundColor: generatingCSV ? '#cbd5e1' : BRAND_COLORS.success.main,
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: generatingCSV ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {generatingCSV ? (
                      <>
                        <motion.div variants={spinVariants} animate="animate">
                          <FaSyncAlt size={12} />
                        </motion.div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FaFileExport size={14} /> Export Data
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={printReport}
                    style={{
                      backgroundColor: BRAND_COLORS.info.main,
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <FaPrint size={14} /> Print Report
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FILTER FIELD COMPONENT ================= */
function FilterField({ label, icon, children, disabled = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '0.95rem'
      }}>
        {icon}
        {label}
        {disabled && (
          <span style={{ 
            marginLeft: '0.5rem',
            color: '#94a3b8',
            fontSize: '0.85rem',
            fontStyle: 'italic'
          }}>
            (Select course first)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/* ================= SUMMARY CARD ================= */
function SummaryCard({ title, value, icon, color, subtitle, trend }) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.12)' }}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        borderLeft: `4px solid ${color}`,
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: `${color}10`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        fontSize: '1.75rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.9rem',
          color: '#64748b',
          fontWeight: 600,
          marginBottom: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          {title}
          <div 
            title={subtitle}
            style={{ 
              width: '16px', 
              height: '16px', 
              borderRadius: '50%', 
              backgroundColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              color: '#4a5568',
              cursor: 'help'
            }}
          >
            ?
          </div>
        </div>
        <div style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: '#1e293b',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {value}
          {trend && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: trend.includes('+') ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main
            }}>
              {trend}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          marginTop: '0.25rem'
        }}>
          {subtitle}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= SESSION ROW ================= */
function SessionRow({ session, delay = 0 }) {
  const attendancePercentage = session.percentage ?? 0;
  const isGoodAttendance = attendancePercentage >= 75;
  
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ backgroundColor: '#f8fafc' }}
      style={{
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.2s ease'
      }}
    >
      <td style={{ ...cellStyle, fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaCalendarAlt size={16} style={{ color: BRAND_COLORS.primary.main }} />
          {new Date(session.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {session.subject}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          {session.subjectCode || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 500, color: '#4a5568' }}>
          {session.course || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaClock size={16} style={{ color: BRAND_COLORS.warning.main }} />
          Lecture {session.lectureNumber}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {session.totalStudents || 0}
        </div>
      </td>
      <td style={{ ...cellStyle, color: BRAND_COLORS.success.main, fontWeight: 600 }}>
        {session.present || 0}
      </td>
      <td style={{ ...cellStyle, color: BRAND_COLORS.danger.main, fontWeight: 600 }}>
        {session.absent || 0}
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.375rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          backgroundColor: isGoodAttendance ? `${BRAND_COLORS.success.main}15` : `${BRAND_COLORS.danger.main}15`,
          color: isGoodAttendance ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main,
          fontSize: '0.85rem',
          fontWeight: 600,
          border: `1px solid ${isGoodAttendance ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main}30`
        }}>
          <FaPercentage size={12} />
          {(attendancePercentage).toFixed(1)}%
        </div>
      </td>
    </motion.tr>
  );
}

/* ================= STYLES ================= */
const filterSelectStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '0.95rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '16px'
};

const filterInputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '0.95rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500
};

const headerCellStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: 700,
  color: '#1e293b',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: '#f1f5f9'
};

const cellStyle = {
  padding: '1rem',
  fontSize: '0.95rem',
  color: '#1e293b',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle'
};