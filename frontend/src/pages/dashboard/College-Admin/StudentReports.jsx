import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaSearch,
  FaUser,
  FaArrowLeft,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaCalendarAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function StudentReports() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Security check
  if (!user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "COLLEGE_ADMIN" && user.role !== "ACCOUNTANT" && user.role !== "PRINCIPAL") {
    navigate("/dashboard");
    return null;
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.warning("Please enter a search term");
      return;
    }

    performSearch(searchTerm.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Clear any pending search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Use the current input value directly to avoid state update timing issues
      const currentValue = e.target.value.trim();
      if (currentValue) {
        performSearch(currentValue);
      } else {
        toast.warning("Please enter a search term");
      }
    }
  };

  // Automatic search with debounce
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if search term is too short
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm.trim());
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (searchValue) => {
    try {
      setLoading(true);
      setError(null);

      // Search for students by name or email
      const response = await api.get(`/students/search?q=${encodeURIComponent(searchValue)}`);
      setSearchResults(response.data.students || []);

      if (response.data.students?.length === 0) {
        toast.info("No students found matching your search");
      }
    } catch (err) {
      console.error("Student search error:", err);
      const errorMsg = err.response?.data?.message || "Failed to search students";
      setError({ message: errorMsg, statusCode: err.response?.status });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const viewStudentReport = (studentId) => {
    navigate(`/college-admin/student-payment-report/${studentId}`);
  };

  return (
    <div className="student-reports-page">
      <style>{`
        .student-reports-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .reports-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          color: white;
          text-align: center;
        }

        .reports-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .reports-header p {
          margin: 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .search-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .search-form {
          margin-bottom: 1rem;
        }

        .search-input-wrapper {
          position: relative;
          width: 100%;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .search-input:focus {
          border-color: #1a4b6d;
          outline: none;
        }

        .search-loading {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
        }

        .search-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e9ecef;
          border-top: 2px solid #1a4b6d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .search-indicator {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #1a4b6d;
        }

        .search-icon-small {
          font-size: 1rem;
          opacity: 0.6;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .search-hint {
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0;
        }

        .results-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .results-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
        }

        .results-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .student-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f1f3f4;
          transition: background-color 0.3s ease;
        }

        .student-card:hover {
          background-color: #f8f9fa;
        }

        .student-card:last-child {
          border-bottom: none;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .student-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .student-details h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a4b6d;
        }

        .student-details p {
          margin: 0;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .student-meta {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .student-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #6c757d;
        }

        .view-report-btn {
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
        }

        .view-report-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);
        }

        .no-results {
          text-align: center;
          padding: 3rem 2rem;
          color: #6c757d;
        }

        .no-results-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
          align-self: flex-start;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .student-reports-page {
            padding: 1rem;
          }

          .reports-header {
            padding: 1.5rem;
          }

          .reports-header h1 {
            font-size: 1.5rem;
          }

          .student-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .student-info {
            width: 100%;
          }

          .view-report-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Dashboard", path: user?.role === "ACCOUNTANT" ? "/dashboard/accountant" : "/dashboard" },
          { label: "Student Reports" },
        ]}
      />

      {/* HEADER */}
      <div className="reports-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft />
          Back
        </button>
        <h1>Student Payment Reports</h1>
        <p>Search and access detailed payment reports for individual students</p>
      </div>

      {/* SEARCH SECTION */}
      <div className="search-section">
        <div className="search-form">
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search by student name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {loading && (
              <div className="search-loading">
                <div className="search-spinner"></div>
              </div>
            )}
            {searchTerm.length >= 2 && !loading && (
              <div className="search-indicator">
                <FaSearch className="search-icon-small" />
              </div>
            )}
          </div>
        </div>
        <p className="search-hint">
          Start typing to automatically search for students (minimum 2 characters)
        </p>
        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <p className="search-tip" style={{ color: '#6c757d', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Type at least 2 characters to start searching...
          </p>
        )}
      </div>

      {/* RESULTS SECTION */}
      {searchResults.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2 className="results-title">
              <FaFileInvoiceDollar />
              Search Results ({searchResults.length})
            </h2>
          </div>

          {searchResults.map((student) => (
            <div key={student._id} className="student-card">
              <div className="student-info">
                <div className="student-avatar">
                  <FaUser />
                </div>
                <div className="student-details">
                  <h3>{student.fullName}</h3>
                  <p>{student.email}</p>
                  <div className="student-meta">
                    <div className="student-meta-item">
                      <FaFileInvoiceDollar />
                      {student.course_id?.name || 'N/A'}
                    </div>
                    <div className="student-meta-item">
                      <FaCalendarAlt />
                      Year: {student.admissionYear || 'N/A'}
                    </div>
                    <div className="student-meta-item">
                      <FaMoneyBillWave />
                      Status: {student.status || 'Active'}
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="view-report-btn"
                onClick={() => viewStudentReport(student._id)}
              >
                <FaFileInvoiceDollar />
                View Payment Report
              </button>
            </div>
          ))}
        </div>
      )}

      {/* NO RESULTS */}
      {searchTerm && !loading && searchResults.length === 0 && searchTerm.length >= 2 && (
        <div className="results-section">
          <div className="no-results">
            <FaUser className="no-results-icon" />
            <h3>No Students Found</h3>
            <p>Try searching with a different name or email address.</p>
          </div>
        </div>
      )}

      {/* INITIAL STATE */}
      {!searchTerm && (
        <div className="results-section">
          <div className="no-results">
            <FaSearch className="no-results-icon" style={{ opacity: 0.5 }} />
            <h3>Start Searching</h3>
            <p>Type a student's name or email above to find their payment report.</p>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && <Loading fullScreen size="lg" text="Searching students..." />}

      {/* ERROR */}
      {error && !loading && (
        <ApiError
          title="Search Error"
          message={error.message}
          statusCode={error.statusCode}
          onRetry={handleSearch}
          onGoBack={() => navigate(-1)}
        />
      )}
    </div>
  );
}