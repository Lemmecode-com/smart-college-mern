import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import ExportButtons from "../../../components/ExportButtons";
import {
  FaEnvelopeOpenText,
  FaSearch,
  FaTimes,
  FaSyncAlt,
  FaInbox,
  FaCheckCircle,
  FaClock,
  FaPhone,
  FaEnvelope,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaExchangeAlt,
  FaCopy,
  FaCheck,
  FaSortAmountDown,
  FaSortAmountUpAlt,
  FaFilter,
  FaGraduationCap,
  FaArchive,
} from "react-icons/fa";

/* Animated Counter Component with prefers-reduced-motion check */
function AnimatedCounter({ value = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 500;
    const startTime = performance.now();
    let animId;

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(ease * end));
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <span>{displayValue}</span>;
}

/* Helper to compute relative time label */
function getRelativeTime(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return past.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffHour > 0) return `${diffHour} hr${diffHour > 1 ? "s" : ""} ago`;
  if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  return "just now";
}

const pdfColumns = [
  { header: "Ref No.", key: "inquiryNumber", width: 32 },
  { header: "Institution Name", key: "institutionName", width: 50 },
  { header: "Contact Person", key: "contactPerson", width: 35 },
  { header: "Role", key: "role", width: 22 },
  { header: "Email Address", key: "email", width: 52 },
  { header: "Phone", key: "phone", width: 28 },
  { header: "Status", key: "status", width: 25 },
  { header: "Date", key: "createdAt", width: 25 },
];

const excelColumns = [
  { header: "Reference No.", key: "inquiryNumber", width: 20 },
  { header: "Institution Name", key: "institutionName", width: 36 },
  { header: "Contact Person", key: "contactPerson", width: 26 },
  { header: "Role", key: "role", width: 16 },
  { header: "Email", key: "email", width: 34 },
  { header: "Phone", key: "phone", width: 18 },
  { header: "Inquiry Message", key: "message", width: 45 },
  { header: "Status", key: "status", width: 16 },
  { header: "Onboarded College", key: "convertedCollege", width: 36 },
  { header: "Submitted Date", key: "createdAt", width: 20 },
];

export default function SuperAdminInquiries() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters, Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const [summary, setSummary] = useState({
    totalAll: 0,
    new: 0,
    contacted: 0,
    closed: 0,
    converted: 0,
  });

  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Shortcut: Press "/" to focus search box
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ================= FETCH INQUIRIES ================= */
  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await api.get("/inquiries", { params });

      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const pagination = res.data?.pagination || res.pagination || {};

      setInquiries(list);
      setTotalPages(pagination.totalPages || 1);
      setTotalCount(pagination.total || list.length);

      if (pagination.summary) {
        setSummary(pagination.summary);
      }
      setLastUpdated(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load enquiries";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  /* ================= FETCH ALL DATA FOR EXPORT ================= */
  const fetchExportData = useCallback(async () => {
    try {
      const params = {
        limit: 100,
        page: 1,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get("/inquiries", { params });
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const firstPageItems = rawList.length > 0 ? rawList : (inquiries || []);
      const pagination = res.data?.pagination || {};
      const totalPages = pagination.totalPages || 1;

      let allItems = [...firstPageItems];

      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(api.get("/inquiries", { params: { ...params, page: p } }));
        }
        const restResults = await Promise.all(pagePromises);
        restResults.forEach((r) => {
          const pageList = Array.isArray(r.data) ? r.data : (r.data?.data || []);
          if (Array.isArray(pageList) && pageList.length > 0) {
            allItems = allItems.concat(pageList);
          }
        });
      }

      if (allItems.length === 0 && inquiries && inquiries.length > 0) {
        allItems = [...inquiries];
      }

      if (sortOrder === "oldest") {
        allItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else {
        allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      return allItems.map((inq) => ({
        inquiryNumber: inq.inquiryNumber || "-",
        institutionName: inq.institutionName || "-",
        contactPerson: `${inq.firstName || ""} ${inq.lastName || ""}`.trim() || "-",
        role: inq.role ? inq.role.toUpperCase() : "OTHER",
        email: inq.email || "-",
        phone: inq.phone || "-",
        message: inq.message || inq.inquiryMessage || "-",
        status: inq.status === "CONVERTED" ? "ONBOARDED" : inq.status || "NEW",
        convertedCollege: inq.convertedCollegeId?.name
          ? `${inq.convertedCollegeId.name}${inq.convertedCollegeId.code ? ` (${inq.convertedCollegeId.code})` : ""}`
          : "Not Onboarded",
        createdAt: inq.createdAt
          ? new Date(inq.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "-",
      }));
    } catch (err) {
      toast.error("Failed to fetch enquiries for export", {
        position: "top-right",
        autoClose: 3000,
      });
      return [];
    }
  }, [statusFilter, searchTerm, sortOrder]);

  /* ================= UPDATE STATUS HANDLER ================= */
  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      setUpdatingStatusId(inquiryId);
      await api.patch(`/inquiries/${inquiryId}/status`, { status: newStatus });
      toast.success(`Enquiry marked as ${newStatus}`);

      setInquiries((prev) =>
        prev.map((inq) =>
          inq._id === inquiryId ? { ...inq, status: newStatus } : inq
        )
      );

      fetchInquiries();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update enquiry status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /* ================= COPY TO CLIPBOARD ================= */
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  /* Client-side sort on currently loaded page */
  const sortedInquiries = useMemo(() => {
    return [...inquiries].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [inquiries, sortOrder]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "NEW":
        return (
          <span className="sa-badge sa-badge-new">
            <span className="sa-badge-dot sa-badge-dot-new" />
            NEW
          </span>
        );
      case "CONTACTED":
        return (
          <span className="sa-badge sa-badge-contacted">
            <span className="sa-badge-dot sa-badge-dot-contacted" />
            CONTACTED
          </span>
        );
      case "CLOSED":
        return (
          <span className="sa-badge sa-badge-closed">
            <span className="sa-badge-dot sa-badge-dot-closed" />
            ARCHIVED
          </span>
        );
      case "CONVERTED":
        return (
          <span className="sa-badge sa-badge-converted">
            <span className="sa-badge-dot sa-badge-dot-converted" />
            ONBOARDED
          </span>
        );
      default:
        return <span className="sa-badge sa-badge-default">{status}</span>;
    }
  };

  return (
    <div className="sa-enquiries-wrapper">
      {/* SCOPED CSS STYLESHEET */}
      <style>{`
        .sa-enquiries-wrapper {
          --sa-teal-dark: #0c2d3a;
          --sa-teal-base: #0f3a4a;
          --sa-teal-accent: #3db5e6;
          --sa-teal-accent-light: #4fc3f7;
          --sa-teal-text: #e6f2f5;
          --sa-teal-text-muted: rgba(255, 255, 255, 0.75);
          --sa-teal-border: rgba(255, 255, 255, 0.14);
          --sa-teal-hover: rgba(255, 255, 255, 0.08);
          --sa-teal-active: rgba(255, 255, 255, 0.16);

          --sa-bg-body: #f8fafc;
          --sa-card-bg: #ffffff;
          --sa-card-border: #e2e8f0;
          --sa-card-radius: 12px;
          --sa-card-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
          --sa-card-shadow-hover: 0 8px 20px -3px rgba(15, 23, 42, 0.08), 0 3px 6px -2px rgba(15, 23, 42, 0.04);

          background-color: var(--sa-bg-body);
          min-height: 100vh;
          padding-bottom: 3rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
        }

        /* HEADER BAND */
        .sa-header-band {
          background: linear-gradient(135deg, var(--sa-teal-base) 0%, var(--sa-teal-dark) 100%);
          color: var(--sa-teal-text);
          padding: 1.25rem 1.75rem;
          border-radius: var(--sa-card-radius);
          border: 1px solid var(--sa-teal-border);
          box-shadow: 0 4px 16px rgba(12, 45, 58, 0.18);
          margin-bottom: 1.5rem;
        }

        .sa-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .sa-page-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .sa-page-subtitle {
          font-size: 0.875rem;
          color: var(--sa-teal-text-muted);
          margin: 0.25rem 0 0 0;
        }

        .sa-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--sa-teal-hover);
          color: var(--sa-teal-text);
          border: 1px solid var(--sa-teal-border);
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .sa-refresh-btn:hover:not(:disabled) {
          background: var(--sa-teal-active);
          color: #ffffff;
          border-color: var(--sa-teal-accent);
        }

        .sa-refresh-btn:focus-visible {
          outline: 2px solid var(--sa-teal-accent);
          outline-offset: 2px;
        }

        .sa-last-updated {
          font-size: 0.75rem;
          color: var(--sa-teal-text-muted);
          margin-left: 0.5rem;
          border-left: 1px solid var(--sa-teal-border);
          padding-left: 0.5rem;
        }

        /* EXPORT BUTTONS THEMED TO HEADER */
        .sa-enquiries-wrapper .export-buttons {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sa-enquiries-wrapper .btn-export {
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.4rem !important;
          background: var(--sa-teal-hover) !important;
          color: var(--sa-teal-text) !important;
          border: 1px solid var(--sa-teal-border) !important;
          padding: 0.45rem 0.85rem !important;
          border-radius: 8px !important;
          font-size: 0.825rem !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          min-height: 38px;
        }

        .sa-enquiries-wrapper .btn-export:hover:not(:disabled) {
          background: var(--sa-teal-active) !important;
          color: #ffffff !important;
          border-color: var(--sa-teal-accent) !important;
          transform: translateY(-1px);
        }

        .sa-enquiries-wrapper .btn-export-pdf:hover:not(:disabled) {
          border-color: #f87171 !important;
          color: #fca5a5 !important;
        }

        .sa-enquiries-wrapper .btn-export-excel:hover:not(:disabled) {
          border-color: #34d399 !important;
          color: #6ee7b7 !important;
        }

        .sa-enquiries-wrapper .btn-export:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        /* STAT CARDS */
        .sa-stat-card {
          background: var(--sa-card-bg);
          border: 1px solid var(--sa-card-border);
          border-radius: var(--sa-card-radius);
          padding: 1.15rem 1.25rem;
          box-shadow: var(--sa-card-shadow);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          outline: none;
        }

        .sa-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--sa-card-shadow-hover);
          border-color: #cbd5e1;
        }

        .sa-stat-card:focus-visible {
          outline: 2px solid var(--sa-teal-accent);
          outline-offset: 2px;
        }

        .sa-stat-card.active {
          border-color: var(--sa-teal-accent);
          box-shadow: 0 0 0 2px rgba(61, 181, 230, 0.25), var(--sa-card-shadow-hover);
        }

        .sa-stat-card.active::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--sa-teal-base), var(--sa-teal-accent));
        }

        .sa-stat-card-attention {
          border-color: #fde68a;
          background: #fffdf5;
        }

        .sa-stat-card-attention.active {
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25), var(--sa-card-shadow-hover);
        }

        .sa-stat-card-attention.active::before {
          background: #f59e0b;
        }

        .sa-stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .sa-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #f59e0b;
          display: inline-block;
          margin-left: 6px;
          animation: sa-pulse 2s infinite;
        }

        @keyframes sa-pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        /* TOOLBAR */
        .sa-toolbar {
          background: var(--sa-card-bg);
          border: 1px solid var(--sa-card-border);
          border-radius: var(--sa-card-radius);
          padding: 0.85rem 1.15rem;
          box-shadow: var(--sa-card-shadow);
          margin-bottom: 1.5rem;
        }

        .sa-search-wrapper {
          position: relative;
          width: 100%;
        }

        .sa-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 0.85rem;
          pointer-events: none;
        }

        .sa-search-input {
          width: 100%;
          padding: 0.5rem 3.5rem 0.5rem 2.25rem;
          font-size: 0.875rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: #f8fafc;
          transition: all 0.2s ease;
          color: #1e293b;
        }

        .sa-search-input:focus {
          background-color: #ffffff;
          border-color: var(--sa-teal-accent);
          outline: none;
          box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.15);
        }

        .sa-search-clear {
          position: absolute;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .sa-search-clear:hover {
          color: #475569;
        }

        .sa-kbd-hint {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: #e2e8f0;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 0.725rem;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, monospace;
          pointer-events: none;
        }

        .sa-tab-group {
          display: inline-flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
          flex-wrap: wrap;
        }

        .sa-tab-btn {
          border: none;
          background: transparent;
          padding: 0.35rem 0.75rem;
          font-size: 0.825rem;
          font-weight: 500;
          border-radius: 6px;
          color: #64748b;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .sa-tab-btn:hover {
          color: var(--sa-teal-base);
        }

        .sa-tab-btn.active {
          background: var(--sa-teal-base);
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(12, 45, 58, 0.2);
        }

        .sa-tab-badge {
          font-size: 0.725rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.08);
          color: inherit;
        }

        .sa-tab-btn.active .sa-tab-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .sa-sort-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          font-size: 0.825rem;
          font-weight: 500;
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .sa-sort-btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
        }

        /* BADGES */
        .sa-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .sa-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sa-badge-new {
          background: #fef3c7;
          color: #92400e;
        }
        .sa-badge-dot-new { background: #f59e0b; }

        .sa-badge-contacted {
          background: #e0f2fe;
          color: #0369a1;
        }
        .sa-badge-dot-contacted { background: #0284c7; }

        .sa-badge-closed {
          background: #ecfdf5;
          color: #065f46;
        }
        .sa-badge-dot-closed { background: #10b981; }

        .sa-badge-converted {
          background: #ecfdf5;
          color: #047857;
        }
        .sa-badge-dot-converted { background: #10b981; }

        .sa-badge-default {
          background: #f1f5f9;
          color: #475569;
        }

        /* TABLE */
        .sa-table-card {
          background: var(--sa-card-bg);
          border: 1px solid var(--sa-card-border);
          border-radius: var(--sa-card-radius);
          box-shadow: var(--sa-card-shadow);
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .sa-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.875rem;
          margin: 0;
        }

        .sa-table thead th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.9rem 1.15rem;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .sa-table tbody tr {
          transition: background-color 0.15s ease;
        }

        .sa-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .sa-table tbody tr.row-new {
          border-left: 3px solid #f59e0b;
        }

        .sa-table tbody td {
          padding: 0.95rem 1.15rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .sa-ref-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 3px 8px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.775rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .sa-ref-chip:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .sa-institution-name {
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: color 0.15s ease;
          display: inline-block;
          font-size: 0.925rem;
        }

        .sa-institution-name:hover {
          color: var(--sa-teal-accent);
          text-decoration: underline;
        }

        .sa-message-preview {
          color: #64748b;
          font-size: 0.8rem;
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 3px;
          cursor: default;
        }

        .sa-avatar-initials {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f3a4a, #3db5e6);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.775rem;
          flex-shrink: 0;
        }

        .sa-contact-link {
          color: #64748b;
          font-size: 0.8rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s ease;
        }

        .sa-contact-link:hover {
          color: var(--sa-teal-accent);
        }

        .sa-mini-copy-btn {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 0 4px;
          cursor: pointer;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          transition: color 0.15s ease;
        }

        .sa-mini-copy-btn:hover {
          color: var(--sa-teal-accent);
        }

        .sa-role-pill {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .sa-action-btn {
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 0.35rem 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s ease;
        }

        .sa-action-btn-view {
          border: 1px solid #cbd5e1;
          color: #475569;
          background: #ffffff;
        }
        .sa-action-btn-view:hover {
          background: #f1f5f9;
          color: var(--sa-teal-base);
          border-color: #94a3b8;
        }

        /* SKELETON LOADERS */
        .sa-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: sa-shimmer 1.5s infinite;
          border-radius: 4px;
          display: inline-block;
        }

        @keyframes sa-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* PAGINATION */
        .sa-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.25rem;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .spin {
          animation: sa-spin 0.8s linear infinite;
        }
        @keyframes sa-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* RESPONSIVE MOBILE CARDS (< 768px) */
        @media (max-width: 767.98px) {
          .sa-table thead {
            display: none;
          }
          .sa-table,
          .sa-table tbody,
          .sa-table tr,
          .sa-table td {
            display: block;
            width: 100%;
            box-sizing: border-box;
          }
          .sa-table tbody tr {
            margin: 0.85rem 0.75rem;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          }
          .sa-table tbody tr.row-new {
            border-left: 4px solid #f59e0b;
          }
          .sa-table tbody td {
            padding: 0.4rem 0;
            border: none;
          }
          .sa-table tbody td.mobile-header-cell {
            padding-bottom: 0.6rem;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 0.5rem;
          }
          .sa-table tbody td.mobile-actions-cell {
            padding-top: 0.75rem;
            border-top: 1px solid #f1f5f9;
            margin-top: 0.5rem;
          }
          .sa-message-preview {
            max-width: 100%;
            white-space: normal;
          }
          .sa-header-band {
            padding: 1rem 1rem 1.25rem 1rem;
          }
        }
      `}</style>

      <div className="container-fluid px-3 px-md-4 pt-3">
        {/* ================= BREADCRUMB (OUT OF HEADER, AT TOP) ================= */}
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/super-admin/dashboard" },
            { label: "Enquiries & Leads" },
          ]}
        />

        {/* HEADER BAND */}
        <div className="sa-header-band">
          <div className="sa-title-row">
            <div>
              <h1 className="sa-page-title">
                <FaEnvelopeOpenText aria-hidden="true" style={{ color: "var(--sa-teal-accent)" }} />
                <span>College Enquiries & Leads</span>
              </h1>
              <p className="sa-page-subtitle">
                Manage, track and respond to prospective college enquiries submitted from the landing page.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <ExportButtons
                title={`College Enquiries & Leads Report${statusFilter ? ` - ${statusFilter}` : ""}`}
                filename={`enquiries-${statusFilter ? statusFilter.toLowerCase() : "all"}-${new Date().toISOString().slice(0, 10)}`}
                pdfColumns={pdfColumns}
                excelColumns={excelColumns}
                data={fetchExportData}
                showPDF={true}
                showExcel={true}
                userRole="SUPER_ADMIN"
                allowDataExport="allowed"
              />

              <button
                className="sa-refresh-btn"
                onClick={fetchInquiries}
                title="Refresh enquiries list"
                aria-label="Refresh enquiries list"
                disabled={loading}
              >
                <FaSyncAlt className={loading ? "spin" : ""} />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
                <span className="sa-last-updated" title="Last updated time">
                  {lastUpdated}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* STAT CARDS GRID */}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-5 g-3 mb-4">
          {/* Total Enquiries */}
          <div className="col">
            <div
              className={`sa-stat-card h-100 ${statusFilter === "" ? "active" : ""}`}
              tabIndex={0}
              role="button"
              aria-label="Filter by all enquiries"
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("");
                  setPage(1);
                }
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase letter-spacing-1">
                    Total Enquiries
                  </span>
                  <div className="h3 fw-bold text-dark mb-0 mt-1">
                    {loading ? (
                      <span className="sa-skeleton" style={{ width: "48px", height: "30px" }} />
                    ) : (
                      <AnimatedCounter value={summary.totalAll || totalCount} />
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    All submissions
                  </span>
                </div>
                <div
                  className="sa-stat-icon-wrap"
                  style={{ background: "#f0f9ff", color: "#0284c7" }}
                >
                  <FaInbox />
                </div>
              </div>
            </div>
          </div>

          {/* New / Unread */}
          <div className="col">
            <div
              className={`sa-stat-card h-100 ${statusFilter === "NEW" ? "active" : ""} ${
                summary.new > 0 ? "sa-stat-card-attention" : ""
              }`}
              tabIndex={0}
              role="button"
              aria-label="Filter by new enquiries"
              onClick={() => {
                setStatusFilter("NEW");
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("NEW");
                  setPage(1);
                }
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center">
                    <span className="text-muted small fw-semibold text-uppercase letter-spacing-1">
                      New / Unread
                    </span>
                    {summary.new > 0 && <span className="sa-pulse-dot" title="Needs attention" />}
                  </div>
                  <div className="h3 fw-bold mb-0 mt-1" style={{ color: "#b45309" }}>
                    {loading ? (
                      <span className="sa-skeleton" style={{ width: "40px", height: "30px" }} />
                    ) : (
                      <AnimatedCounter value={summary.new || 0} />
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {summary.new > 0 ? "Needs attention" : "Up to date"}
                  </span>
                </div>
                <div
                  className="sa-stat-icon-wrap"
                  style={{ background: "#fef3c7", color: "#d97706" }}
                >
                  <FaClock />
                </div>
              </div>
            </div>
          </div>

          {/* Contacted */}
          <div className="col">
            <div
              className={`sa-stat-card h-100 ${statusFilter === "CONTACTED" ? "active" : ""}`}
              tabIndex={0}
              role="button"
              aria-label="Filter by contacted enquiries"
              onClick={() => {
                setStatusFilter("CONTACTED");
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("CONTACTED");
                  setPage(1);
                }
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase letter-spacing-1">
                    Contacted
                  </span>
                  <div className="h3 fw-bold mb-0 mt-1" style={{ color: "#0369a1" }}>
                    {loading ? (
                      <span className="sa-skeleton" style={{ width: "40px", height: "30px" }} />
                    ) : (
                      <AnimatedCounter value={summary.contacted || 0} />
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    In conversation
                  </span>
                </div>
                <div
                  className="sa-stat-icon-wrap"
                  style={{ background: "#e0f2fe", color: "#0284c7" }}
                >
                  <FaExchangeAlt />
                </div>
              </div>
            </div>
          </div>

          {/* Onboarded */}
          <div className="col">
            <div
              className={`sa-stat-card h-100 ${statusFilter === "CONVERTED" ? "active" : ""}`}
              tabIndex={0}
              role="button"
              aria-label="Filter by onboarded enquiries"
              onClick={() => {
                setStatusFilter("CONVERTED");
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("CONVERTED");
                  setPage(1);
                }
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase letter-spacing-1">
                    Onboarded
                  </span>
                  <div className="h3 fw-bold mb-0 mt-1" style={{ color: "#059669" }}>
                    {loading ? (
                      <span className="sa-skeleton" style={{ width: "40px", height: "30px" }} />
                    ) : (
                      <AnimatedCounter value={summary.converted || 0} />
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Active institutions
                  </span>
                </div>
                <div
                  className="sa-stat-icon-wrap"
                  style={{ background: "#d1fae5", color: "#059669" }}
                >
                  <FaGraduationCap />
                </div>
              </div>
            </div>
          </div>

          {/* Archived */}
          <div className="col">
            <div
              className={`sa-stat-card h-100 ${statusFilter === "CLOSED" ? "active" : ""}`}
              tabIndex={0}
              role="button"
              aria-label="Filter by archived enquiries"
              onClick={() => {
                setStatusFilter("CLOSED");
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setStatusFilter("CLOSED");
                  setPage(1);
                }
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase letter-spacing-1">
                    Archived
                  </span>
                  <div className="h3 fw-bold mb-0 mt-1" style={{ color: "#64748b" }}>
                    {loading ? (
                      <span className="sa-skeleton" style={{ width: "40px", height: "30px" }} />
                    ) : (
                      <AnimatedCounter value={summary.closed || 0} />
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Archived / resolved
                  </span>
                </div>
                <div
                  className="sa-stat-icon-wrap"
                  style={{ background: "#f1f5f9", color: "#64748b" }}
                >
                  <FaArchive />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, TABS & SORT */}
        <div className="sa-toolbar">
          <div className="row g-3 align-items-center">
            {/* Search Box */}
            <div className="col-12 col-md-5 col-lg-4">
              <div className="sa-search-wrapper">
                <FaSearch className="sa-search-icon" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="sa-search-input"
                  placeholder="Search institution, contact, email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search enquiries"
                />
                {searchInput && (
                  <button
                    className="sa-search-clear"
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchTerm("");
                      setPage(1);
                    }}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
                <span className="sa-kbd-hint" title="Press / to focus search">
                  /
                </span>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="col-12 col-md-7 col-lg-5">
              <div className="sa-tab-group" role="tablist" aria-label="Status filters">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === ""}
                  className={`sa-tab-btn ${statusFilter === "" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("");
                    setPage(1);
                  }}
                >
                  <span>All</span>
                  <span className="sa-tab-badge">
                    {summary.totalAll || totalCount}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "NEW"}
                  className={`sa-tab-btn ${statusFilter === "NEW" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("NEW");
                    setPage(1);
                  }}
                >
                  <span>New</span>
                  <span className="sa-tab-badge">{summary.new || 0}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "CONTACTED"}
                  className={`sa-tab-btn ${statusFilter === "CONTACTED" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("CONTACTED");
                    setPage(1);
                  }}
                >
                  <span>Contacted</span>
                  <span className="sa-tab-badge">{summary.contacted || 0}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "CONVERTED"}
                  className={`sa-tab-btn ${statusFilter === "CONVERTED" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("CONVERTED");
                    setPage(1);
                  }}
                >
                  <span>Onboarded</span>
                  <span className="sa-tab-badge">{summary.converted || 0}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "CLOSED"}
                  className={`sa-tab-btn ${statusFilter === "CLOSED" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("CLOSED");
                    setPage(1);
                  }}
                >
                  <span>Archived</span>
                  <span className="sa-tab-badge">{summary.closed || 0}</span>
                </button>
              </div>
            </div>

            {/* Sort & Counter */}
            <div className="col-12 col-lg-3 d-flex align-items-center justify-content-lg-end gap-3">
              <button
                type="button"
                className="sa-sort-btn"
                onClick={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
                title={`Sort by received date: currently ${sortOrder === "newest" ? "Newest first" : "Oldest first"}`}
              >
                {sortOrder === "newest" ? <FaSortAmountDown /> : <FaSortAmountUpAlt />}
                <span>{sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
              </button>

              <span className="text-muted small text-nowrap">
                Showing {inquiries.length} of {totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && !loading && (
          <ApiError
            title="Error Loading Enquiries"
            message={error}
            onRetry={fetchInquiries}
          />
        )}

        {/* TABLE CARD */}
        <div className="sa-table-card">
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div className="p-4">
                {/* SKELETON TABLE */}
                <table className="sa-table" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "160px" }}>Ref No.</th>
                      <th>Institution & Message</th>
                      <th>Contact Person</th>
                      <th style={{ width: "100px" }}>Role</th>
                      <th style={{ width: "120px" }}>Status</th>
                      <th style={{ width: "90px" }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td>
                          <span className="sa-skeleton" style={{ width: "120px", height: "24px" }} />
                        </td>
                        <td>
                          <span className="sa-skeleton mb-1" style={{ width: "180px", height: "16px", display: "block" }} />
                          <span className="sa-skeleton" style={{ width: "140px", height: "12px", display: "block" }} />
                        </td>
                        <td>
                          <span className="sa-skeleton mb-1" style={{ width: "110px", height: "14px", display: "block" }} />
                          <span className="sa-skeleton" style={{ width: "150px", height: "12px", display: "block" }} />
                        </td>
                        <td>
                          <span className="sa-skeleton" style={{ width: "70px", height: "20px" }} />
                        </td>
                        <td>
                          <span className="sa-skeleton" style={{ width: "85px", height: "22px" }} />
                        </td>
                        <td className="text-end">
                          <span className="sa-skeleton" style={{ width: "70px", height: "28px" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="py-5 text-center px-3">
                <div
                  className="mb-3 d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    background: searchTerm || statusFilter ? "#f1f5f9" : "#eff6ff",
                    color: searchTerm || statusFilter ? "#64748b" : "#3db5e6",
                    fontSize: "2rem",
                  }}
                  aria-hidden="true"
                >
                  {searchTerm || statusFilter ? <FaSearch /> : <FaInbox />}
                </div>
                <h4 className="fw-bold text-dark h5 mb-2">
                  {searchTerm || statusFilter ? "No enquiries match your search" : "No Enquiries Received Yet"}
                </h4>
                <p className="text-muted small mb-3" style={{ maxWidth: "420px", margin: "0 auto" }}>
                  {searchTerm || statusFilter
                    ? "Try adjusting your search keywords, clear the search box, or reset the status filters."
                    : "New enquiries submitted from the landing page contact form will automatically appear here."}
                </p>
                {(searchTerm || statusFilter) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="sa-action-btn"
                    onClick={() => {
                      setSearchInput("");
                      setSearchTerm("");
                      setStatusFilter("");
                      setPage(1);
                    }}
                  >
                    <FaTimes />
                    <span>Clear all filters</span>
                  </Button>
                )}
              </div>
            ) : (
              <table className="sa-table" style={{ minWidth: "700px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Ref No.</th>
                    <th>Institution & Message</th>
                    <th>Contact Person</th>
                    <th style={{ width: "100px" }}>Role</th>
                    <th style={{ width: "120px" }}>Status</th>
                    <th style={{ width: "90px" }} className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInquiries.map((inq) => (
                    <tr
                      key={inq._id || inq.inquiryNumber}
                      className={inq.status === "NEW" ? "row-new" : ""}
                    >
                      {/* Ref No with Copy */}
                      <td className="mobile-header-cell">
                        <div className="d-flex align-items-center justify-content-between d-md-block">
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id={`tip-ref-${inq._id}`}>
                                {copiedKey === `ref-${inq._id}` ? "Copied!" : "Click to copy"}
                              </Tooltip>
                            }
                          >
                            <button
                              type="button"
                              className="sa-ref-chip"
                              onClick={() => handleCopy(inq.inquiryNumber, `ref-${inq._id}`)}
                              aria-label={`Copy reference number ${inq.inquiryNumber}`}
                            >
                              <span>{inq.inquiryNumber}</span>
                              {copiedKey === `ref-${inq._id}` ? (
                                <FaCheck style={{ color: "#10b981", fontSize: "0.75rem" }} />
                              ) : (
                                <FaCopy style={{ opacity: 0.6, fontSize: "0.7rem" }} />
                              )}
                            </button>
                          </OverlayTrigger>

                          {/* Mobile-only status badge in header */}
                          <div className="d-md-none">
                            {getStatusBadge(inq.status)}
                          </div>
                        </div>
                      </td>

                      {/* Institution & Truncated Message */}
                      <td>
                        <div
                          className="sa-institution-name"
                          onClick={() => navigate(`/super-admin/enquiry/${inq._id}`)}
                          title="Click to view full enquiry details"
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") navigate(`/super-admin/enquiry/${inq._id}`);
                          }}
                        >
                          {inq.institutionName}
                        </div>
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id={`tip-msg-${inq._id}`} style={{ maxWidth: "340px" }}>
                              {inq.inquiryMessage || inq.message}
                            </Tooltip>
                          }
                        >
                          <div className="sa-message-preview">
                            {inq.inquiryMessage || inq.message}
                          </div>
                        </OverlayTrigger>
                      </td>

                      {/* Contact Person */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="sa-avatar-initials" aria-hidden="true">
                            {inq.firstName?.[0] || ""}
                            {inq.lastName?.[0] || ""}
                          </div>
                          <div>
                            <div className="fw-semibold text-dark" style={{ fontSize: "0.85rem" }}>
                              {inq.firstName} {inq.lastName}
                            </div>
                            <div className="d-flex flex-column gap-0">
                              <div className="d-flex align-items-center">
                                <a
                                  href={`mailto:${inq.email}`}
                                  className="sa-contact-link"
                                  title={`Email ${inq.email}`}
                                >
                                  <FaEnvelope style={{ fontSize: "0.7rem" }} />
                                  <span>{inq.email}</span>
                                </a>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tip-em-${inq._id}`}>
                                      {copiedKey === `email-${inq._id}` ? "Copied!" : "Copy email"}
                                    </Tooltip>
                                  }
                                >
                                  <button
                                    type="button"
                                    className="sa-mini-copy-btn"
                                    onClick={() => handleCopy(inq.email, `email-${inq._id}`)}
                                    aria-label="Copy email address"
                                  >
                                    {copiedKey === `email-${inq._id}` ? (
                                      <FaCheck style={{ color: "#10b981" }} />
                                    ) : (
                                      <FaCopy />
                                    )}
                                  </button>
                                </OverlayTrigger>
                              </div>

                              {inq.phone && (
                                <div className="d-flex align-items-center">
                                  <a
                                    href={`tel:${inq.phone}`}
                                    className="sa-contact-link"
                                    title={`Call ${inq.phone}`}
                                  >
                                    <FaPhone style={{ fontSize: "0.7rem" }} />
                                    <span>{inq.phone}</span>
                                  </a>
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <Tooltip id={`tip-ph-${inq._id}`}>
                                        {copiedKey === `phone-${inq._id}` ? "Copied!" : "Copy phone"}
                                      </Tooltip>
                                    }
                                  >
                                    <button
                                      type="button"
                                      className="sa-mini-copy-btn"
                                      onClick={() => handleCopy(inq.phone, `phone-${inq._id}`)}
                                      aria-label="Copy phone number"
                                    >
                                      {copiedKey === `phone-${inq._id}` ? (
                                        <FaCheck style={{ color: "#10b981" }} />
                                      ) : (
                                        <FaCopy />
                                      )}
                                    </button>
                                  </OverlayTrigger>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <span className="sa-role-pill">{inq.role || "Other"}</span>
                      </td>

                      {/* Status (desktop) */}
                      <td className="d-none d-md-table-cell">{getStatusBadge(inq.status)}</td>

                      {/* Actions */}
                      <td className="text-end mobile-actions-cell">
                        <Button
                          variant="light"
                          size="sm"
                          className="sa-action-btn sa-action-btn-view"
                          title="View Enquiry Details"
                          aria-label={`View details for ${inq.institutionName}`}
                          onClick={() => navigate(`/super-admin/enquiry/${inq._id}`)}
                        >
                          <FaEye className="me-1" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION FOOTER */}
          {!loading && totalPages > 1 && (
            <div className="sa-pagination-bar">
              <span>
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="d-inline-flex align-items-center gap-1"
                >
                  <FaChevronLeft /> Prev
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="d-inline-flex align-items-center gap-1"
                >
                  Next <FaChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
