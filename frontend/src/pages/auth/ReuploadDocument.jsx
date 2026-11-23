import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import {
  FaUniversity,
  FaFileAlt,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaClock,
  FaTrashAlt,
  FaCloudUploadAlt,
  FaInfoCircle,
  FaSpinner,
  FaArrowLeft,
} from "react-icons/fa";

export default function ReuploadDocument() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docInfo, setDocInfo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch document re-upload info on mount
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      if (!token) {
        setError("Invalid re-upload link.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/public/documents/reupload/${token}`);
        if (isMounted) {
          setDocInfo(res.data?.data || res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "This re-upload link is invalid or has expired. Please contact the college admission office."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInfo();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const maxSize = docInfo?.maxSizeBytes || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size exceeds maximum limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = docInfo?.allowedFormats?.map((f) => f.toLowerCase().replace(".", "")) || [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "doc",
      "docx",
    ];

    if (!allowed.includes(ext)) {
      toast.error(`Invalid file format (.${ext}). Allowed formats: ${allowed.join(", ").toUpperCase()}`);
      return;
    }

    setSelectedFile(file);

    // Create image preview if image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit file upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning("Please choose a file to upload");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await api.post(`/public/documents/reupload/${token}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });

      toast.success(res.data?.message || "Document re-uploaded successfully!");
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatExpiryDate = (dateStr) => {
    if (!dateStr) return "72 hours";
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="reupload-page-container">
      <div className="reupload-card">
        {/* HEADER */}
        <div className="reupload-card-header">
          <div className="college-header-icon">
            <FaUniversity />
          </div>
          <h2 className="college-title">{docInfo?.collegeName || "College Admission Portal"}</h2>
          <p className="college-subtitle">Admission Document Re-submission</p>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="reupload-state-container">
            <FaSpinner className="spinner-icon" />
            <p>Loading document details...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="reupload-state-container">
            <div className="state-icon-wrapper state-icon-error">
              <FaTimesCircle />
            </div>
            <h3 className="state-title">Link Expired or Invalid</h3>
            <p className="state-description">{error}</p>
            <div className="state-help-box">
              <FaInfoCircle className="help-icon" />
              <span>
                If your document was rejected, please reach out to the college admission office or submit the document in person.
              </span>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {!loading && !error && success && (
          <div className="reupload-state-container">
            <div className="state-icon-wrapper state-icon-success">
              <FaCheckCircle />
            </div>
            <h3 className="state-title">Document Submitted Successfully!</h3>
            <p className="state-description">
              Thank you, <strong>{docInfo?.studentName}</strong>. Your replacement{" "}
              <strong>{docInfo?.documentLabel}</strong> has been submitted to the admission committee.
            </p>
            <div className="state-success-box">
              <div className="success-badge-row">
                <span className="badge-chip">Status: Under Verification</span>
                <span className="badge-chip">File: {selectedFile?.name}</span>
              </div>
              <p className="success-note">
                The college administration will review your updated document shortly. You will receive an email once your admission is processed.
              </p>
            </div>
          </div>
        )}

        {/* ACTIVE FORM STATE */}
        {!loading && !error && !success && docInfo && (
          <form className="reupload-form" onSubmit={handleSubmit}>
            {/* STUDENT & DOCUMENT INFO */}
            <div className="applicant-info-card">
              <div className="applicant-row">
                <span className="info-label">Applicant Name</span>
                <span className="info-value">{docInfo.studentName}</span>
              </div>
              <div className="applicant-row">
                <span className="info-label">Target Document</span>
                <span className="info-value document-badge-pill">
                  <FaFileAlt className="me-1" />
                  {docInfo.documentLabel}
                </span>
              </div>
            </div>

            {/* REJECTION REASON CALLOUT */}
            <div className="rejection-callout">
              <div className="callout-header">
                <FaExclamationTriangle className="callout-icon" />
                <span>Reason for Rejection by Admission Committee:</span>
              </div>
              <p className="callout-text">{docInfo.rejectionReason || "A fresh and valid copy is required."}</p>
            </div>

            {/* FILE UPLOAD DROPZONE */}
            <div className="upload-section">
              <label className="section-label">Upload Replacement File</label>

              {!selectedFile ? (
                <div
                  className={`dropzone ${isDragging ? "dropzone-dragging" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept={docInfo.allowedFormats?.map((f) => `.${f}`).join(",") || ".pdf,.jpg,.jpeg,.png,.doc,.docx"}
                    style={{ display: "none" }}
                  />
                  <div className="dropzone-content">
                    <div className="dropzone-icon">
                      <FaCloudUploadAlt />
                    </div>
                    <p className="dropzone-primary-text">Click to browse or drag and drop your file here</p>
                    <p className="dropzone-secondary-text">
                      Formats: {docInfo.allowedFormats?.join(", ").toUpperCase() || "PDF, JPG, PNG"} • Max Size:{" "}
                      {((docInfo.maxSizeBytes || 10485760) / (1024 * 1024)).toFixed(0)}MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="selected-file-card">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="file-thumbnail" />
                  ) : (
                    <div className="file-icon-placeholder">
                      <FaFileAlt />
                    </div>
                  )}
                  <div className="file-details">
                    <span className="file-name" title={selectedFile.name}>
                      {selectedFile.name}
                    </span>
                    <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    onClick={handleRemoveFile}
                    title="Remove and select another file"
                    aria-label="Remove file"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              )}
            </div>

            {/* PROGRESS BAR */}
            {uploading && (
              <div className="upload-progress-container">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="progress-text">Uploading: {uploadProgress}%</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="btn-submit-reupload"
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="spinner-icon me-2" />
                  Uploading Document...
                </>
              ) : (
                <>
                  <FaUpload className="me-2" />
                  Submit Replacement Document
                </>
              )}
            </button>

            {/* LINK EXPIRY FOOTER */}
            {docInfo.reuploadTokenExpires && (
              <div className="reupload-footer-notice">
                <FaClock className="notice-icon" />
                <span>Link expires on: {formatExpiryDate(docInfo.reuploadTokenExpires)}</span>
              </div>
            )}
          </form>
        )}
      </div>

      <style jsx>{`
        .reupload-page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .reupload-card {
          width: 100%;
          max-width: 580px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .reupload-card-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff;
          padding: 1.75rem 1.5rem;
          text-align: center;
        }

        .college-header-icon {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem;
          font-size: 1.5rem;
        }

        .college-title {
          font-size: 1.35rem;
          font-weight: 700;
          margin: 0 0 0.35rem;
          letter-spacing: -0.01em;
        }

        .college-subtitle {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
        }

        .reupload-form {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .applicant-info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .applicant-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .info-label {
          color: #64748b;
          font-weight: 500;
        }

        .info-value {
          color: #0f172a;
          font-weight: 600;
        }

        .document-badge-pill {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          display: inline-flex;
          align-items: center;
          font-size: 0.82rem;
        }

        .rejection-callout {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-left: 4px solid #e11d48;
          border-radius: 10px;
          padding: 1rem 1.15rem;
        }

        .callout-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: #9f1239;
          font-weight: 700;
          font-size: 0.84rem;
          margin-bottom: 0.35rem;
        }

        .callout-icon {
          color: #e11d48;
        }

        .callout-text {
          margin: 0;
          color: #be123c;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.45;
        }

        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
        }

        .dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8fafc;
        }

        .dropzone:hover,
        .dropzone-dragging {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .dropzone-icon {
          font-size: 2.5rem;
          color: #3b82f6;
          margin-bottom: 0.65rem;
        }

        .dropzone-primary-text {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.35rem;
        }

        .dropzone-secondary-text {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0;
        }

        .selected-file-card {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }

        .file-thumbnail {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .file-icon-placeholder {
          width: 48px;
          height: 48px;
          background: #e2e8f0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          font-size: 1.4rem;
        }

        .file-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .file-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 0.75rem;
          color: #64748b;
        }

        .btn-remove-file {
          background: transparent;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 6px;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .btn-remove-file:hover {
          background: #fee2e2;
        }

        .upload-progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .progress-bar-track {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.2s ease;
        }

        .progress-text {
          font-size: 0.78rem;
          color: #64748b;
          text-align: right;
        }

        .btn-submit-reupload {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff;
          border: none;
          padding: 0.9rem 1.5rem;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
        }

        .btn-submit-reupload:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.4);
        }

        .btn-submit-reupload:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .reupload-footer-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: #64748b;
          font-size: 0.8rem;
        }

        .notice-icon {
          color: #94a3b8;
        }

        /* REUPLOAD STATE VIEWS (Loading, Error, Success) */
        .reupload-state-container {
          padding: 2.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .state-icon-wrapper {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.4rem;
          margin-bottom: 1.25rem;
        }

        .state-icon-success {
          background: #ecfdf5;
          color: #059669;
        }

        .state-icon-error {
          background: #fef2f2;
          color: #dc2626;
        }

        .state-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
        }

        .state-description {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 1.5rem;
          max-width: 440px;
        }

        .state-help-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          font-size: 0.82rem;
          color: #64748b;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          text-align: left;
        }

        .help-icon {
          margin-top: 0.15rem;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .state-success-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 1.25rem;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .success-badge-row {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge-chip {
          background: #dcfce7;
          color: #166534;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
        }

        .success-note {
          font-size: 0.85rem;
          color: #15803d;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
