import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
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
  FaUpload
} from "react-icons/fa";

export default function DocumentSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Default document types available
  const defaultDocumentTypes = [
    { type: "10th_marksheet", label: "10th Marksheet", defaultFormats: ["pdf", "jpg", "png"] },
    { type: "12th_marksheet", label: "12th Marksheet", defaultFormats: ["pdf", "jpg", "png"] },
    { type: "passport_photo", label: "Passport Size Photo", defaultFormats: ["jpg", "jpeg", "png"] },
    { type: "category_certificate", label: "Category Certificate", defaultFormats: ["pdf", "jpg", "png"] },
    { type: "income_certificate", label: "Income Certificate", defaultFormats: ["pdf"] },
    { type: "character_certificate", label: "Character Certificate", defaultFormats: ["pdf"] },
    { type: "transfer_certificate", label: "Transfer Certificate", defaultFormats: ["pdf"] },
    { type: "aadhar_card", label: "Aadhar Card", defaultFormats: ["pdf", "jpg", "png"] },
    { type: "entrance_exam_score", label: "Entrance Exam Score Card", defaultFormats: ["pdf"] },
    { type: "custom_document", label: "Custom Document", defaultFormats: ["pdf", "jpg", "png"] }
  ];

  const [availableFormats] = useState(["pdf", "jpg", "jpeg", "png", "doc", "docx"]);

  // Load document configuration
  useEffect(() => {
    loadDocumentConfig();
  }, []);

  const loadDocumentConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("/document-config/admin/college");

      if (res.data.config && res.data.config.documents) {
        setDocuments(res.data.config.documents);
        console.log("✅ Loaded existing document config:", res.data.config.documents.length, "documents");
      } else {
        // Initialize with EMPTY configuration - admin must explicitly enable documents
        // This ensures registration form only shows documents that admin actually selects
        const emptyDocs = defaultDocumentTypes.map((doc, index) => ({
          type: doc.type,
          label: doc.label,
          enabled: false, // ALL disabled by default - admin must enable
          mandatory: false,
          allowedFormats: doc.defaultFormats,
          maxFileSize: 5,
          description: "",
          order: index
        }));
        setDocuments(emptyDocs);
        console.log("📭 No config found - initialized with empty (all disabled) config");
      }
    } catch (error) {
      console.error("Error loading document config:", error);
      setMessage({ type: "error", text: "Failed to load document configuration" });
    } finally {
      setLoading(false);
    }
  };

  // Toggle document enabled status
  const toggleEnabled = (index) => {
    const updated = [...documents];
    updated[index].enabled = !updated[index].enabled;
    if (!updated[index].enabled) {
      updated[index].mandatory = false;
    }
    setDocuments(updated);
  };

  // Toggle document mandatory status
  const toggleMandatory = (index) => {
    const updated = [...documents];
    updated[index].mandatory = !updated[index].mandatory;
    setDocuments(updated);
  };

  // Update document field
  const updateDocument = (index, field, value) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  // Toggle format selection
  const toggleFormat = (docIndex, format) => {
    const updated = [...documents];
    const formats = updated[docIndex].allowedFormats;
    
    if (formats.includes(format)) {
      // Don't remove if it's the last format
      if (formats.length > 1) {
        updated[docIndex].allowedFormats = formats.filter(f => f !== format);
      }
    } else {
      updated[docIndex].allowedFormats = [...formats, format];
    }
    setDocuments(updated);
  };

  // Add custom document
  const addCustomDocument = () => {
    const newDoc = {
      type: `custom_${Date.now()}`,
      label: "New Custom Document",
      enabled: true,
      mandatory: false,
      allowedFormats: ["pdf", "jpg", "png"],
      maxFileSize: 5,
      description: "",
      order: documents.length
    };
    setDocuments([...documents, newDoc]);
  };

  // Remove document
  const removeDocument = (index) => {
    if (documents[index].type.includes("custom_")) {
      const updated = documents.filter((_, i) => i !== index);
      setDocuments(updated);
    } else {
      // For default documents, just disable instead of removing
      const updated = [...documents];
      updated[index].enabled = false;
      updated[index].mandatory = false;
      setDocuments(updated);
    }
  };

  // Save configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      // ✅ NO validation for minimum documents - allows ZERO documents for coaching classes
      // College admin can enable/disable documents as per their requirements

      // Validate: Mandatory documents must be enabled
      for (const doc of documents) {
        if (doc.mandatory && !doc.enabled) {
          setMessage({ type: "error", text: `${doc.label} is marked as mandatory but not enabled` });
          setSaving(false);
          return;
        }
      }

      // Update order
      const documentsWithOrder = documents.map((doc, index) => ({
        ...doc,
        order: index
      }));

      const enabledCount = documents.filter(doc => doc.enabled).length;
      console.log("💾 Saving document config:", {
        documentsCount: documentsWithOrder.length,
        enabledCount: enabledCount,
        message: enabledCount === 0 ? "⚠️ NO documents enabled - students will NOT need to upload any files" : ""
      });

      await api.put("/document-config/admin/college", {
        documents: documentsWithOrder
      });

      console.log("✅ Config saved successfully");
      setMessage({ 
        type: "success", 
        text: enabledCount === 0 
          ? "Document configuration saved! No documents required for registration." 
          : "Document configuration saved successfully!" 
      });
    } catch (error) {
      console.error("❌ Error saving config:", error);
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to save configuration" });
    } finally {
      setSaving(false);
    }
  };

  // Reset to empty (remove all document requirements)
  const handleReset = async () => {
    if (!window.confirm("⚠️ Are you sure you want to remove ALL document requirements?\n\nThis will:\n- Remove all document upload requirements\n- Students will NOT need to upload any files\n- You can reconfigure documents later")) {
      return;
    }

    try {
      setSaving(true);
      await api.post("/document-config/admin/college/reset");
      setMessage({ type: "success", text: "Configuration reset! No documents are now required for registration." });
      loadDocumentConfig();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to reset configuration" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading Document Settings...</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <FaFileAlt className="me-2 text-primary" />
            Document Settings
          </h4>
          <p className="text-muted mb-0">
            Configure which documents students need to upload during registration
            <br />
            <small className="text-info">
              💡 Tip: For coaching classes with no document requirements, disable all documents or use "Reset to Empty"
            </small>
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-danger d-flex align-items-center gap-2"
            onClick={handleReset}
            disabled={saving}
          >
            <FaUndo /> Reset to Empty
          </button>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <FaSave /> {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
          {message.type === 'success' ? <FaCheckCircle className="me-2" /> : <FaExclamationCircle className="me-2" />}
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: "", text: "" })}></button>
        </div>
      )}

      {/* Info Card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body bg-light">
          <div className="d-flex align-items-start gap-3">
            <FaExclamationCircle className="text-info fs-4 mt-1" />
            <div>
              <h6 className="fw-bold mb-2">How to Configure Documents</h6>
              <ul className="mb-0 small text-muted">
                <li>Toggle <strong>Enable</strong> to show/hide a document during student registration</li>
                <li>Mark documents as <strong>Mandatory</strong> if students must upload them</li>
                <li>Select allowed file formats (PDF, JPG, PNG, etc.)</li>
                <li>Set maximum file size limit (1-20 MB)</li>
                <li>Add custom documents specific to your college</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="card border-0 shadow-lg rounded-4">
        <div className="card-header bg-primary text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Document Configuration</h5>
            <button
              className="btn btn-light btn-sm d-flex align-items-center gap-2"
              onClick={addCustomDocument}
            >
              <FaPlus /> Add Custom Document
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4" style={{ width: "80px" }}>Enable</th>
                  <th style={{ width: "200px" }}>Document Type</th>
                  <th>Label</th>
                  <th className="text-center" style={{ width: "100px" }}>Mandatory</th>
                  <th style={{ width: "200px" }}>Allowed Formats</th>
                  <th className="text-center" style={{ width: "120px" }}>Max Size (MB)</th>
                  <th className="text-center" style={{ width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.type} className={!doc.enabled ? "table-secondary" : ""}>
                    <td className="ps-4">
                      <button
                        className="btn btn-link p-0 border-0"
                        onClick={() => toggleEnabled(index)}
                        title={doc.enabled ? "Disable" : "Enable"}
                      >
                        {doc.enabled ? (
                          <FaToggleOn className="text-success" size={28} />
                        ) : (
                          <FaToggleOff className="text-secondary" size={28} />
                        )}
                      </button>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{doc.type}</span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={doc.label}
                        onChange={(e) => updateDocument(index, "label", e.target.value)}
                        placeholder="Document label"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={doc.mandatory}
                        onChange={() => toggleMandatory(index)}
                        disabled={!doc.enabled}
                      />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {availableFormats.map(format => (
                          <button
                            key={format}
                            className={`btn btn-sm ${
                              doc.allowedFormats.includes(format)
                                ? "btn-primary"
                                : "btn-outline-secondary"
                            }`}
                            onClick={() => toggleFormat(index, format)}
                            style={{ fontSize: "11px", padding: "2px 6px" }}
                          >
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        className="form-control form-control-sm text-center"
                        value={doc.maxFileSize}
                        onChange={(e) => updateDocument(index, "maxFileSize", parseInt(e.target.value) || 5)}
                        min="1"
                        max="20"
                        style={{ width: "70px" }}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-danger"
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
      </div>

      {/* Description Field */}
      <div className="card border-0 shadow-lg rounded-4 mt-4">
        <div className="card-header bg-light py-3">
          <h5 className="mb-0 fw-bold">Document Descriptions (Optional)</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {documents.filter(doc => doc.enabled).map((doc, index) => (
              <div className="col-md-6" key={doc.type}>
                <label className="form-label fw-semibold small">{doc.label}</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={doc.description || ""}
                  onChange={(e) => {
                    const originalIndex = documents.findIndex(d => d.type === doc.type);
                    updateDocument(originalIndex, "description", e.target.value);
                  }}
                  placeholder="Help text for students..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
