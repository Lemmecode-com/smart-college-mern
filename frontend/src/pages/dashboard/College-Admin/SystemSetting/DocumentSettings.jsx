import { useState, useEffect } from "react";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import {
  FaFileAlt,
  FaSave,
  FaUndo,
  FaToggleOn,
  FaToggleOff,
  FaExclamationCircle,
  FaCheckCircle,
  FaTrash,
  FaPlus,
  FaInfoCircle,
  FaImages,
  FaFilePdf,
  FaFileWord,
} from "react-icons/fa";

export default function DocumentSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isModified, setIsModified] = useState(false);

  const defaultDocumentTypes = [
    {
      type: "10th_marksheet",
      label: "10th Marksheet",
      defaultFormats: ["pdf", "jpg", "png"],
    },
    {
      type: "12th_marksheet",
      label: "12th Marksheet",
      defaultFormats: ["pdf", "jpg", "png"],
    },
    {
      type: "passport_photo",
      label: "Passport Size Photo",
      defaultFormats: ["jpg", "jpeg", "png"],
    },
    {
      type: "category_certificate",
      label: "Category Certificate",
      defaultFormats: ["pdf", "jpg", "png"],
    },
    {
      type: "income_certificate",
      label: "Income Certificate",
      defaultFormats: ["pdf"],
    },
    {
      type: "character_certificate",
      label: "Character Certificate",
      defaultFormats: ["pdf"],
    },
    {
      type: "transfer_certificate",
      label: "Transfer Certificate",
      defaultFormats: ["pdf"],
    },
    {
      type: "aadhar_card",
      label: "Aadhar Card",
      defaultFormats: ["pdf", "jpg", "png"],
    },
    {
      type: "entrance_exam_score",
      label: "Entrance Exam Score Card",
      defaultFormats: ["pdf"],
    },
    {
      type: "custom_document",
      label: "Custom Document",
      defaultFormats: ["pdf", "jpg", "png"],
    },
  ];

  const availableFormats = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];

  useEffect(() => {
    loadDocumentConfig();
  }, []);

  const loadDocumentConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("/document-config/admin/college");

      if (res.data.config && res.data.config.documents) {
        setDocuments(res.data.config.documents);
      } else {
        const emptyDocs = defaultDocumentTypes.map((doc, index) => ({
          type: doc.type,
          label: doc.label,
          enabled: false,
          mandatory: false,
          allowedFormats: doc.defaultFormats,
          maxFileSize: 5,
          description: "",
          order: index,
        }));
        setDocuments(emptyDocs);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to load document configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = (index) => {
    const updated = [...documents];
    updated[index].enabled = !updated[index].enabled;
    if (!updated[index].enabled) {
      updated[index].mandatory = false;
    }
    setDocuments(updated);
    setIsModified(true);
  };

  const toggleMandatory = (index) => {
    const updated = [...documents];
    updated[index].mandatory = !updated[index].mandatory;
    setDocuments(updated);
    setIsModified(true);
  };

  const updateDocument = (index, field, value) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
    setIsModified(true);
  };

  const toggleFormat = (docIndex, format) => {
    const updated = [...documents];
    const formats = updated[docIndex].allowedFormats;

    if (formats.includes(format)) {
      if (formats.length > 1) {
        updated[docIndex].allowedFormats = formats.filter((f) => f !== format);
      }
    } else {
      updated[docIndex].allowedFormats = [...formats, format];
    }
    setDocuments(updated);
    setIsModified(true);
  };

  const addCustomDocument = () => {
    const newDoc = {
      type: `custom_${Date.now()}`,
      label: "New Custom Document",
      enabled: true,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      description: "",
      order: documents.length,
    };
    setDocuments([...documents, newDoc]);
    setIsModified(true);
  };

  const removeDocument = (index) => {
    if (documents[index].type.startsWith("custom_") && documents[index].type !== "custom_document") {
      const updated = documents.filter((_, i) => i !== index);
      setDocuments(updated);
      setIsModified(true);
    } else {
      const updated = [...documents];
      updated[index].enabled = false;
      updated[index].mandatory = false;
      setDocuments(updated);
      setIsModified(true);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      for (const doc of documents) {
        if (doc.mandatory && !doc.enabled) {
          setMessage({
            type: "error",
            text: `${doc.label} is marked as mandatory but not enabled`,
          });
          setSaving(false);
          return;
        }
      }

      const documentsWithOrder = documents.map((doc, index) => ({
        ...doc,
        order: index,
      }));

      const enabledCount = documents.filter((doc) => doc.enabled).length;

      await api.put("/document-config/admin/college", {
        documents: documentsWithOrder,
      });

      setMessage({
        type: "success",
        text:
          enabledCount === 0
            ? "Document configuration saved! No documents required for registration."
            : "Document configuration saved successfully!",
      });
      setIsModified(false);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to remove ALL document requirements?\n\nThis will:\n- Remove all document upload requirements\n- Students will NOT need to upload any files\n- You can reconfigure documents later",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await api.post("/document-config/admin/college/reset");
      setMessage({
        type: "success",
        text: "Configuration reset! No documents are now required for registration.",
      });
      loadDocumentConfig();
      setIsModified(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to reset configuration" });
    } finally {
      setSaving(false);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case "pdf":
        return <FaFilePdf />;
      case "doc":
      case "docx":
        return <FaFileWord />;
      case "jpg":
      case "jpeg":
      case "png":
        return <FaImages />;
      default:
        return <FaFileAlt />;
    }
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Document Settings..." />;
  }

  const enabledCount = documents.filter((doc) => doc.enabled).length;
  const mandatoryCount = documents.filter((doc) => doc.mandatory).length;

  return (
    <>
      <style>{`
        /* Document Settings - Enterprise SaaS Professional UI */
        :root {
          --ds-teal-dark: #0f3a4a;
          --ds-teal-medium: #0c2d3a;
          --ds-cyan-primary: #3db5e6;
          --ds-cyan-light: #4fc3f7;
          --ds-cyan-glow: rgba(61, 181, 230, 0.15);
          --ds-bg-primary: #f5f7fb;
          --ds-bg-card: #ffffff;
          --ds-bg-hover: #f8fafc;
          --ds-text-primary: #1a202c;
          --ds-text-secondary: #4a5568;
          --ds-text-muted: #718096;
          --ds-success: #38a169;
          --ds-warning: #ed8936;
          --ds-danger: #e53e3e;
          --ds-radius-md: 0.5rem;
          --ds-radius-lg: 0.75rem;
          --ds-radius-xl: 1rem;
          --ds-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --ds-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --ds-transition-base: 0.25s ease;
          --ds-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .document-settings-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--ds-teal-dark) 0%, var(--ds-teal-medium) 100%);
          border-radius: var(--ds-radius-xl);
          box-shadow: var(--ds-shadow-lg);
          position: relative;
          overflow: hidden;
        }

        .settings-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 400px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.1));
          pointer-events: none;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .header-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: var(--ds-radius-lg);
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
        }

        .header-icon {
          font-size: 1.5rem;
          color: #ffffff;
        }

        .header-text {
          color: #ffffff;
        }

        .settings-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .settings-subtitle {
          font-size: 0.9375rem;
          margin: 0.25rem 0 0 0;
          opacity: 0.85;
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .btn-reset,
        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--ds-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ds-transition-base);
          border: none;
          outline: none;
        }

        .btn-reset {
          background: rgba(233, 87, 87, 0.9);
          color: #ffffff;
          backdrop-filter: blur(10px);
        }

        .btn-reset:hover:not(:disabled) {
          background: rgba(233, 87, 87, 1);
          transform: translateY(-1px);
        }

        .btn-save {
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
        }

        .btn-save:hover:not(:disabled) {
          box-shadow: 0 6px 25px rgba(61, 181, 230, 0.5);
          transform: translateY(-2px);
        }

        .btn-save-modified {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
          }
          50% {
            box-shadow: 0 4px 25px rgba(61, 181, 230, 0.6);
          }
        }

        .btn-reset:disabled,
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-icon {
          font-size: 1rem;
        }

        .spinner-icon {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Stats Cards */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--ds-bg-card);
          border-radius: var(--ds-radius-lg);
          padding: 1.25rem;
          box-shadow: var(--ds-shadow-md);
          display: flex;
          align-items: center;
          gap: 1rem;
          border-left: 4px solid var(--ds-cyan-primary);
        }

        .stat-card.stat-enabled {
          border-left-color: var(--ds-success);
        }

        .stat-card.stat-mandatory {
          border-left-color: var(--ds-warning);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--ds-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-icon.stat-total {
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          color: #ffffff;
        }

        .stat-icon.stat-enabled {
          background: linear-gradient(135deg, var(--ds-success), #68d391);
          color: #ffffff;
        }

        .stat-icon.stat-mandatory {
          background: linear-gradient(135deg, var(--ds-warning), #f6ad55);
          color: #ffffff;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--ds-text-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--ds-text-muted);
          margin-top: 0.25rem;
          font-weight: 500;
        }

        /* Info Card */
        .info-card {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05), rgba(79, 195, 247, 0.05));
          border: 1px solid rgba(61, 181, 230, 0.2);
          border-radius: var(--ds-radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--ds-radius-md);
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .info-card-content h6 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ds-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .info-card-content ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--ds-text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Documents Card */
        .documents-card {
          background: var(--ds-bg-card);
          border-radius: var(--ds-radius-xl);
          box-shadow: var(--ds-shadow-lg);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .card-header-custom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, var(--ds-teal-dark), var(--ds-teal-medium));
          color: #ffffff;
        }

        .card-header-custom h5 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .btn-add-document {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: var(--ds-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ds-transition-base);
        }

        .btn-add-document:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .documents-table {
          width: 100%;
          border-collapse: collapse;
        }

        .documents-table thead {
          background: var(--ds-bg-hover);
          border-bottom: 2px solid #e2e8f0;
        }

        .documents-table th {
          padding: 1rem 1.25rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--ds-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }

        .documents-table th.text-center {
          text-align: center;
        }

        .documents-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: all var(--ds-transition-base);
        }

        .documents-table tbody tr:hover {
          background: var(--ds-bg-hover);
        }

        .documents-table tbody tr.disabled-row {
          opacity: 0.6;
          background: #fafbfc;
        }

        .documents-table td {
          padding: 1rem 1.25rem;
          vertical-align: middle;
        }

        .documents-table td.text-center {
          text-align: center;
        }

        /* Toggle Button */
        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          transition: transform var(--ds-transition-base);
        }

        .toggle-btn:hover {
          transform: scale(1.15);
        }

        .toggle-enabled {
          color: var(--ds-success);
          font-size: 1.75rem;
        }

        .toggle-disabled {
          color: var(--ds-text-muted);
          font-size: 1.75rem;
        }

        /* Document Type Badge */
        .doc-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
          color: var(--ds-text-primary);
          border-radius: var(--ds-radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Consolas', monospace;
        }

        /* Label Input */
        .label-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--ds-radius-md);
          transition: all var(--ds-transition-base);
          outline: none;
        }

        .label-input:hover {
          border-color: #cbd5e0;
        }

        .label-input:focus {
          border-color: var(--ds-cyan-primary);
          box-shadow: 0 0 0 3px var(--ds-cyan-glow);
        }

        /* Mandatory Checkbox */
        .mandatory-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: var(--ds-warning);
        }

        /* Format Buttons */
        .format-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .format-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.6875rem;
          font-weight: 600;
          border: 1px solid;
          border-radius: var(--ds-radius-sm);
          cursor: pointer;
          transition: all var(--ds-transition-base);
        }

        .format-btn.selected {
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          color: #ffffff;
          border-color: var(--ds-cyan-primary);
        }

        .format-btn:not(.selected) {
          background: #ffffff;
          color: var(--ds-text-secondary);
          border-color: #cbd5e0;
        }

        .format-btn:hover {
          transform: translateY(-1px);
        }

        .format-btn.selected:hover {
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.4);
        }

        /* Size Input */
        .size-input {
          width: 70px;
          padding: 0.5rem;
          text-align: center;
          font-size: 0.875rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--ds-radius-md);
          transition: all var(--ds-transition-base);
          outline: none;
        }

        .size-input:hover {
          border-color: #cbd5e0;
        }

        .size-input:focus {
          border-color: var(--ds-cyan-primary);
          box-shadow: 0 0 0 3px var(--ds-cyan-glow);
        }

        /* Action Button */
        .action-btn {
          padding: 0.5rem;
          background: none;
          border: 1px solid var(--ds-danger);
          color: var(--ds-danger);
          border-radius: var(--ds-radius-md);
          cursor: pointer;
          transition: all var(--ds-transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          background: var(--ds-danger);
          color: #ffffff;
          transform: translateY(-1px);
        }

        /* Description Card */
        .description-card {
          background: var(--ds-bg-card);
          border-radius: var(--ds-radius-xl);
          box-shadow: var(--ds-shadow-lg);
          overflow: hidden;
        }

        .description-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
        }

        .description-header h5 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--ds-text-primary);
        }

        .description-body {
          padding: 1.5rem;
        }

        .description-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .description-group label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--ds-text-secondary);
          margin-bottom: 0.5rem;
        }

        .description-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--ds-radius-md);
          transition: all var(--ds-transition-base);
          outline: none;
        }

        .description-input:hover {
          border-color: #cbd5e0;
        }

        .description-input:focus {
          border-color: var(--ds-cyan-primary);
          box-shadow: 0 0 0 3px var(--ds-cyan-glow);
        }

        /* Message Alert */
        .message-alert {
          padding: 1rem 1.25rem;
          border-radius: var(--ds-radius-lg);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: slideDown 0.3s var(--ds-transition-slow);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-alert.success {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message-alert.error {
          background: linear-gradient(135deg, #f8d7da, #f5c6cb);
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .message-icon {
          font-size: 1.25rem;
        }

        .message-text {
          flex: 1;
          font-weight: 500;
        }

        .message-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.5;
          transition: opacity var(--ds-transition-base);
        }

        .message-close:hover {
          opacity: 1;
        }

        /* Modified Indicator */
        .modified-indicator {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--ds-teal-dark), var(--ds-teal-medium));
          color: #ffffff;
          border-radius: var(--ds-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s var(--ds-transition-slow) forwards;
          z-index: 1000;
        }

        @keyframes slideUp {
          to {
            transform: translateX(-50%) translateY(0);
          }
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .indicator-icon {
          color: var(--ds-cyan-light);
          font-size: 1.125rem;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, var(--ds-cyan-primary), var(--ds-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--ds-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ds-transition-base);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .btn-save-small:hover {
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.5);
          transform: translateY(-1px);
        }

        .btn-icon-small {
          font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .settings-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }
          
          .description-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .document-settings-page {
            padding: 0.75rem;
          }
          
          .settings-title {
            font-size: 1.5rem;
          }
          
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-actions {
            flex-direction: column;
          }
          
          .btn-reset,
          .btn-save {
            width: 100%;
            justify-content: center;
          }
          
          .documents-table {
            font-size: 0.75rem;
          }
          
          .documents-table th,
          .documents-table td {
            padding: 0.75rem 0.5rem;
          }
          
          .modified-indicator {
            left: 0.75rem;
            right: 0.75rem;
            transform: none;
            bottom: 0.75rem;
            flex-direction: column;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

        .label-input:focus,
        .description-input:focus,
        .size-input:focus,
        .btn-reset:focus,
        .btn-save:focus,
        .btn-save-small:focus {
          outline: 2px solid var(--ds-cyan-primary);
          outline-offset: 2px;
        }
      `}</style>

      <div className="document-settings-page">
        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaFileAlt className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="settings-title">Document Settings</h2>
              <p className="settings-subtitle">
                Configure which documents students need to upload during
                registration
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-reset"
              onClick={handleReset}
              disabled={saving}
            >
              <FaUndo className="btn-icon" />
              <span>Reset to Empty</span>
            </button>
            <button
              className={`btn-save ${isModified ? "btn-save-modified" : ""}`}
              onClick={handleSave}
              disabled={saving || !isModified}
            >
              {saving ? (
                <>
                  <span className="spinner-icon" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave className="btn-icon" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= MESSAGE ALERT ================= */}
        {message.text && (
          <div
            className={`message-alert ${message.type === "success" ? "success" : "error"}`}
          >
            <span className="message-icon">
              {message.type === "success" ? (
                <FaCheckCircle />
              ) : (
                <FaExclamationCircle />
              )}
            </span>
            <span className="message-text">{message.text}</span>
            <button
              className="message-close"
              onClick={() => setMessage({ type: "", text: "" })}
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= STATS CARDS ================= */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-total">
              <FaFileAlt />
            </div>
            <div className="stat-content">
              <div className="stat-value">{documents.length}</div>
              <div className="stat-label">Total Documents</div>
            </div>
          </div>
          <div className="stat-card stat-enabled">
            <div className="stat-icon stat-enabled">
              <FaCheckCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{enabledCount}</div>
              <div className="stat-label">Enabled Documents</div>
            </div>
          </div>
          <div className="stat-card stat-mandatory">
            <div className="stat-icon stat-mandatory">
              <FaExclamationCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{mandatoryCount}</div>
              <div className="stat-label">Mandatory Documents</div>
            </div>
          </div>
        </div>

        {/* ================= INFO CARD ================= */}
        <div className="info-card">
          <div className="info-card-icon">
            <FaInfoCircle />
          </div>
          <div className="info-card-content">
            <h6>How to Configure Documents</h6>
            <ul>
              <li>
                Toggle <strong>Enable</strong> to show/hide a document during
                student registration
              </li>
              <li>
                Mark documents as <strong>Mandatory</strong> if students must
                upload them
              </li>
              <li>Select allowed file formats (PDF, JPG, PNG, DOC, DOCX)</li>
              <li>Set maximum file size limit (1-20 MB)</li>
              <li>Add custom documents specific to your college</li>
            </ul>
          </div>
        </div>

        {/* ================= DOCUMENTS TABLE CARD ================= */}
        <div className="documents-card">
          <div className="card-header-custom">
            <h5>Document Configuration</h5>
            <button className="btn-add-document" onClick={addCustomDocument}>
              <FaPlus /> Add Custom Document
            </button>
          </div>
          <div className="table-responsive">
            <table className="documents-table">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: "80px" }}>
                    Enable
                  </th>
                  <th style={{ width: "180px" }}>Document Type</th>
                  <th>Label</th>
                  <th className="text-center" style={{ width: "100px" }}>
                    Mandatory
                  </th>
                  <th style={{ width: "220px" }}>Allowed Formats</th>
                  <th className="text-center" style={{ width: "100px" }}>
                    Max Size
                  </th>
                  <th className="text-center" style={{ width: "70px" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr
                    key={doc.type}
                    className={!doc.enabled ? "disabled-row" : ""}
                  >
                    <td className="text-center">
                      <button
                        className="toggle-btn"
                        onClick={() => toggleEnabled(index)}
                        title={doc.enabled ? "Disable" : "Enable"}
                      >
                        {doc.enabled ? (
                          <FaToggleOn className="toggle-enabled" />
                        ) : (
                          <FaToggleOff className="toggle-disabled" />
                        )}
                      </button>
                    </td>
                    <td>
                      <span className="doc-type-badge">
                        <FaFileAlt />
                        {doc.type}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="label-input"
                        value={doc.label}
                        onChange={(e) =>
                          updateDocument(index, "label", e.target.value)
                        }
                        placeholder="Document label"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="mandatory-checkbox"
                        checked={doc.mandatory}
                        onChange={() => toggleMandatory(index)}
                        disabled={!doc.enabled}
                        title={
                          !doc.enabled
                            ? "Enable document first"
                            : "Mark as mandatory"
                        }
                      />
                    </td>
                    <td>
                      <div className="format-buttons">
                        {availableFormats.map((format) => (
                          <button
                            key={format}
                            className={`format-btn ${doc.allowedFormats.includes(format) ? "selected" : ""}`}
                            onClick={() => toggleFormat(index, format)}
                            title={`${format.toUpperCase()} format`}
                          >
                            {getFormatIcon(format)}
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        className="size-input"
                        value={doc.maxFileSize}
                        onChange={(e) =>
                          updateDocument(
                            index,
                            "maxFileSize",
                            parseInt(e.target.value) || 5,
                          )
                        }
                        min="1"
                        max="20"
                      />
                      <div
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--ds-text-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        MB
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        className="action-btn"
                        onClick={() => removeDocument(index)}
                        title="Remove"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= DESCRIPTION CARD ================= */}
        {enabledCount > 0 && (
          <div className="description-card">
            <div className="description-header">
              <h5>Document Descriptions (Optional)</h5>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  fontSize: "0.875rem",
                  color: "var(--ds-text-muted)",
                }}
              >
                Add helpful descriptions for students about each document
              </p>
            </div>
            <div className="description-body">
              <div className="description-grid">
                {documents
                  .filter((doc) => doc.enabled)
                  .map((doc) => {
                    const originalIndex = documents.findIndex(
                      (d) => d.type === doc.type,
                    );
                    return (
                      <div className="description-group" key={doc.type}>
                        <label>{doc.label}</label>
                        <input
                          type="text"
                          className="description-input"
                          value={doc.description || ""}
                          onChange={(e) =>
                            updateDocument(
                              originalIndex,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Help text for students..."
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODIFIED INDICATOR ================= */}
        {isModified && (
          <div className="modified-indicator">
            <div className="indicator-content">
              <FaInfoCircle className="indicator-icon" />
              <span>You have unsaved changes</span>
            </div>
            <button className="btn-save-small" onClick={handleSave}>
              <FaSave className="btn-icon-small" />
              <span>Save Now</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
