import { useContext, useEffect, useState, useRef, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { getDocumentViewUrl } from "../../../utils/documentUrl";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { ToastContainer, toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import "react-toastify/dist/ReactToastify.css";

// REPLACE THIS (INVALID):
// import { ..., FaFileCertificate, ... } from "react-icons/fa";

// WITH THIS (VALID ICONS):
import {
  FaUserGraduate,
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaCalendarAlt,
  FaBook,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaEdit,
  FaArrowLeft,
  FaInfoCircle,
  FaSync,
  FaTimesCircle,
  FaSpinner,
  FaHome,
  FaIdCard,
  FaVial,
  FaUserFriends,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaGlobe,
  FaHeartbeat,
  FaDownload,
  FaPrint,
  FaExclamationTriangle,
  FaFileAlt, // VALID: Generic file
  FaFilePdf, // VALID: PDF document (REPLACES FaFileCertificate)
  FaFileInvoice, // VALID
  FaFileMedical, // VALID
  FaFileSignature, // VALID
  FaCertificate, // VALID: Standalone certificate icon
  FaWheelchair,
} from "react-icons/fa";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

export default function StudentProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const loadTimeoutRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState("personal"); // 'personal', 'academic', 'contact', 'address', 'education', 'college'
  const [documentConfig, setDocumentConfig] = useState([]);

  /* ================= DATA VALIDATION HELPER ================= */
  const validateProfileData = (data) => {
    const errors = [];

    if (!data) {
      errors.push("Profile data is missing");
    } else {
      if (!data.student) {
        errors.push("Student information is missing");
      } else {
      if (!data.student.fullName) errors.push("Student name is missing");
      if (!data.student.email) errors.push("Student email is missing");
      if (!data.student.mobileNumber)
        errors.push("Student mobile number is missing");
    }

    if (!data.department && data.department !== null)
      errors.push("Department information is missing");
    if (!data.course && data.course !== null)
      errors.push("Course information is missing");
  }

  return errors;
};

  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      logger.warn("Student profile request timed out", {
        page: "StudentProfile",
        role: user?.role,
      });
      setError({
        message:
          "Request timed out. Please check your connection and try again.",
        statusCode: 408,
        errorCode: undefined,
      });
      setLoading(false);
      toast.error("Request timed out. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    }, 30000);

    try {
      const res = await api.get("/students/my-profile");

      if (!res.data || !res.data.student) {
        throw new Error("Invalid profile response structure");
      }

      const validation = validateProfileData(res.data);
      if (validation.length > 0) {
        throw new Error(`Invalid profile data: ${validation.join(", ")}`);
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      setProfile(res.data);

      if (res.data.documentConfig && Array.isArray(res.data.documentConfig)) {
        setDocumentConfig(res.data.documentConfig);
      } else {
        setDocumentConfig([]);
      }
    } catch (err) {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage =
        err.message ||
        err?.response?.data?.message ||
        "Failed to load student profile";

      logger.error("Student profile load error:", {
        message: errorMessage,
        statusCode,
        errorCode,
        backendMessage,
        page: "StudentProfile",
        role: user?.role,
      });

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error("Failed to load student profile. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const mergedDocuments = useMemo(() => {
    const enabledConfigDocs = documentConfig.filter(doc => doc.enabled);
    const docs = [];
    const seenTypes = new Set();

    const studentDocuments = profile?.student?.documents || {};

    enabledConfigDocs.forEach(doc => {
      seenTypes.add(doc.type);
      const uploadedDoc = studentDocuments[doc.type];
      docs.push({
        type: doc.type,
        label: doc.label,
        description: doc.description || doc.label,
        mandatory: doc.mandatory,
        uploadedDoc,
      });
    });

    Object.keys(studentDocuments).forEach(type => {
      if (!seenTypes.has(type)) {
        const uploadedDoc = studentDocuments[type];
        docs.push({
          type,
          label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: "",
          mandatory: false,
          uploadedDoc,
        });
      }
    });

    return docs;
  }, [documentConfig, profile]);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

  /* ================= RETRY HANDLER ================= */
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await fetchProfile();
    setIsRetrying(false);
  };



  // Handle go back action
  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

// Loading State
if (loading) {
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading Student Profile..."
        />
      </div>
    </div>
  );
}

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ApiError
        title="Profile Loading Error"
        message={
          error.message || "Failed to load student profile. Please try again."
        }
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  if (!profile) {
    return (
      <div className="erp-page erp-viewport-min-100 py-5" role="main">
        <ToastContainer position="top-right" />
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body text-center p-5">
                <FaUserGraduate
                  className="text-muted mb-3"
                  size={64}
                  aria-hidden="true"
                />
                <h4 className="fw-bold mb-2">No Profile Data Found</h4>
                <p className="text-muted mb-4">
                  Your profile information could not be retrieved. Please
                  contact your college administrator.
                </p>
                <button
                  onClick={() => navigate("/student/dashboard")}
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2 mx-auto"
                  aria-label="Go back to student dashboard"
                >
                  <FaArrowLeft aria-hidden="true" /> Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { student, college, department, course } = profile;

  return (
    <div className="student-profile-page erp-page erp-viewport-min-100 py-3 py-md-4 animate-fade-in" role="main">
      <ToastContainer position="top-right" />

      {/* ================= BREADCRUMB ================= */}
             <div
              style={{
                width: "100%",
                margin: "0 auto",
                paddingTop: 0,
              }}
            >
              <div style={{ width: "100%" }}>
                <Breadcrumb
                  items={[
                    { label: "Dashboard", path: "/student/dashboard" },
                    { label: "My Profile" },
                  ]}
                />
              </div>
            </div>



      {/* Skip Link for Screen Readers */}
      <a href="#profile-content" className="sr-only sr-only-focusable">
        Skip to profile content
      </a>

      {/* ================= PROFILE HEADER CARD ================= */}
      <div
        className="sph-header animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="sph-upper">
          <div className="sph-upper-main">
            <div className="sph-identity">
              <div className="sph-avatar-wrap">
                <div className="sph-avatar">
                  <span className="sph-avatar-fallback" aria-hidden="true">
                    <FaUserGraduate />
                  </span>
                </div>
                <div className="sph-avatar-status" aria-hidden="true">
                  <span
                    className={`sph-avatar-status-dot ${
                      student?.status === "APPROVED"
                        ? "is-approved"
                        : student?.status === "REJECTED"
                          ? "is-rejected"
                          : "is-pending"
                    }`}
                  ></span>
                </div>
              </div>

              <div className="sph-identity-text">
                <h2 className="sph-name">{student?.fullName || "N/A"}</h2>
                <div className="sph-subline">
                  <span className="sph-subline-item">
                    <FaGraduationCap aria-hidden="true" />
                    <span>{course?.name || "N/A"}</span>
                  </span>
                  <span className="sph-subline-item">
                    <FaLayerGroup aria-hidden="true" />
                    <span>{department?.name || "N/A"}</span>
                  </span>
                </div>
                <div className="sph-chips">
                  <span
                    className={`sph-chip ${
                      student?.status === "APPROVED"
                        ? "sph-chip--approved"
                        : student?.status === "REJECTED"
                          ? "sph-chip--rejected"
                          : "sph-chip--pending"
                    }`}
                  >
                    <FaCheckCircle aria-hidden="true" />
                    <span>{student?.status || "PENDING"}</span>
                  </span>
                  {student?.currentSemester && (
                    <span className="sph-chip" title="Current Semester">
                      <FaGraduationCap aria-hidden="true" />
                      <span>Semester {student.currentSemester}</span>
                    </span>
                  )}
                  {student?.currentSemester && (
                    <span className="sph-chip" title="Academic Year">
                      <FaClock aria-hidden="true" />
                      <span>Year {Math.ceil((student.currentSemester || 0) / 2)}</span>
                    </span>
                  )}
                  {!student?.currentSemester && student?.currentYear && (
                    <span className="sph-chip" title="Academic Year">
                      <FaClock aria-hidden="true" />
                      <span>Year {student.currentYear}</span>
                    </span>
                  )}
                  <span className="sph-chip">
                    <FaCalendarAlt aria-hidden="true" />
                    <span>Admitted: {student?.admissionYear || "N/A"}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="sph-edit-btn"
              onClick={() => navigate("/student/edit-profile")}
              aria-label="Edit your profile"
            >
              <FaEdit size={16} aria-hidden="true" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="sph-lower">
          <div className="sph-contact-strip">
            <div className="sph-contact-group">
              <div className="sph-contact-label">Email Address</div>
              <div className="sph-contact-value-row">
                <span className="sph-contact-icon sph-contact-icon--email" aria-hidden="true">
                  <FaEnvelope />
                </span>
                <span className="sph-contact-value">{student?.email || "N/A"}</span>
              </div>
            </div>

            <div className="sph-contact-sep" aria-hidden="true"></div>

            <div className="sph-contact-group">
              <div className="sph-contact-label">Phone Number</div>
              <div className="sph-contact-value-row">
                <span className="sph-contact-icon sph-contact-icon--phone" aria-hidden="true">
                  <FaPhoneAlt />
                </span>
                <span className="sph-contact-value">{student?.mobileNumber || "N/A"}</span>
              </div>
            </div>

            <div className="sph-contact-sep" aria-hidden="true"></div>

            <div className="sph-contact-group">
              <div className="sph-contact-label">Nationality</div>
              <div className="sph-contact-value-row">
                <span className="sph-contact-icon sph-contact-icon--nationality" aria-hidden="true">
                  <FaGlobe />
                </span>
                <span className="sph-contact-value">{student?.nationality || "N/A"}</span>
              </div>
            </div>

            <div className="sph-contact-sep" aria-hidden="true"></div>

            <div className="sph-contact-group">
              <div className="sph-contact-label">Last Updated</div>
              <div className="sph-contact-value-row">
                <span className="sph-contact-icon sph-contact-icon--updated" aria-hidden="true">
                  <FaSync />
                </span>
                <span className="sph-contact-value">
                  {student?.updatedAt ? new Date(student.updatedAt).toLocaleString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TAB NAVIGATION ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-4 animate-fade-in-up">
        <div className="card-body p-0">
          <div className="d-flex flex-column flex-lg-row">
            {/* Tab Navigation - Vertical on desktop, horizontal on mobile */}
            <div
              className="tabs-navigation bg-light border-end border-bottom border-lg-end-0 border-lg-bottom-0"
              role="tablist"
              aria-label="Profile sections"
            >
              <TabItem
                icon={<FaUserGraduate />}
                label="Personal Information"
                active={activeTab === "personal"}
                onClick={() => setActiveTab("personal")}
                id="personal"
              />
              <TabItem
                icon={<FaUserFriends />}
                label="Parent Details"
                active={activeTab === "parent"}
                onClick={() => setActiveTab("parent")}
                id="parent"
              />
              <TabItem
                icon={<FaBook />}
                label="Academic Information"
                active={activeTab === "academic"}
                onClick={() => setActiveTab("academic")}
                id="academic"
              />
              <TabItem
                icon={<FaPhoneAlt />}
                label="Contact Information"
                active={activeTab === "contact"}
                onClick={() => setActiveTab("contact")}
                id="contact"
              />
              <TabItem
                icon={<FaHome />}
                label="Address Information"
                active={activeTab === "address"}
                onClick={() => setActiveTab("address")}
                id="address"
              />
              <TabItem
                icon={<FaGraduationCap />}
                label="10th Details"
                active={activeTab === "ssc"}
                onClick={() => setActiveTab("ssc")}
                hidden={!documentConfig.some(doc => doc.type === "10th_marksheet" && doc.enabled)}
              />
              <TabItem
                icon={<FaGraduationCap />}
                label="12th Details"
                active={activeTab === "hsc"}
                onClick={() => setActiveTab("hsc")}
                hidden={!documentConfig.some(doc => doc.type === "12th_marksheet" && doc.enabled)}
              />
              <TabItem
                icon={<FaFileAlt />}
                label="Uploaded Documents"
                active={activeTab === "documents"}
                onClick={() => setActiveTab("documents")}
                id="documents"
              />
              <TabItem
                icon={<FaUniversity />}
                label="College Information"
                active={activeTab === "college"}
                onClick={() => setActiveTab("college")}
                id="college"
              />
            </div>

            {/* Tab Content */}
            <div
              className="tabs-content flex-grow-1"
              role="tabpanel"
              aria-label="Profile information"
            >
              {activeTab === "personal" && (
                <SectionContent
                  title="Personal Information"
                  icon={<FaUserGraduate />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="Full Name"
                      value={student?.fullName || "N/A"}
                      icon={<FaUserGraduate />}
                      col={12}
                    />
                    <InfoItem
                      label="Gender"
                      value={student?.gender || "N/A"}
                      icon={<FaVial />}
                    />
                    <InfoItem
                      label="Date of Birth"
                      value={
                        student?.dateOfBirth
                          ? new Date(student.dateOfBirth).toLocaleDateString("en-IN")
                          : "N/A"
                      }
                      icon={<FaCalendarAlt />}
                    />
                    <InfoItem
                      label="Nationality"
                      value={student?.nationality || "N/A"}
                      icon={<FaGlobe />}
                    />
                    <InfoItem
                      label="Religion"
                      value={student?.religion || "N/A"}
                      icon={<FaHeartbeat />}
                    />
                    <InfoItem
                      label="Category"
                      value={student?.category || "N/A"}
                      icon={<FaUserFriends />}
                    />
                    <InfoItem
                      label="Blood Group"
                      value={student?.bloodGroup || "N/A"}
                      icon={<FaHeartbeat />}
                    />
                    <InfoItem
                      label="Disability"
                      value={
                        student?.hasDisability ? "Yes" : "No"
                      }
                      icon={<FaWheelchair />}
                    />
                    {student?.hasDisability && (
                      <>
                        <InfoItem
                          label="Disability Type"
                          value={student?.disabilityType || "N/A"}
                          icon={<FaWheelchair />}
                        />
                        <InfoItem
                          label="Disability Percentage"
                          value={
                            student?.pwdDisability
                              ? `${student.pwdDisability}%`
                              : "N/A"
                          }
                          icon={<FaWheelchair />}
                        />
                      </>
                    )}
                  </div>
                </SectionContent>
              )}

              {activeTab === "parent" && (
                <SectionContent
                  title="Parent / Guardian Information"
                  icon={<FaUserFriends />}
                  action={
                    <button
                      type="button"
                      className="section-edit-btn"
                      onClick={() => navigate("/student/edit-profile")}
                      aria-label="Edit parent details"
                    >
                      <FaEdit size={13} aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                  }
                >
                  <div className="info-group-grid">
                    <div className="info-group">
                      <div className="info-group-title">Father&apos;s Details</div>
                      <div className="row info-grid">
                        <InfoItem
                          label="Father's Name"
                          value={student?.fatherName || "N/A"}
                          icon={<FaUserGraduate />}
                          col={12}
                        />
                        <InfoItem
                          label="Father's Mobile"
                          value={student?.fatherMobile || "N/A"}
                          icon={<FaPhoneAlt />}
                          col={12}
                        />
                      </div>
                    </div>
                    <div className="info-group">
                      <div className="info-group-title">Mother&apos;s Details</div>
                      <div className="row info-grid">
                        <InfoItem
                          label="Mother's Name"
                          value={student?.motherName || "N/A"}
                          icon={<FaUserGraduate />}
                          col={12}
                        />
                        <InfoItem
                          label="Mother's Mobile"
                          value={student?.motherMobile || "N/A"}
                          icon={<FaPhoneAlt />}
                          col={12}
                        />
                      </div>
                    </div>
                  </div>
                </SectionContent>
              )}

              {activeTab === "academic" && (
                <SectionContent
                  title="Academic Information"
                  icon={<FaBook />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="Department"
                      value={department?.name || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <InfoItem
                      label="Course"
                      value={course?.name || "N/A"}
                      icon={<FaGraduationCap />}
                    />
                    <InfoItem
                      label="Course Code"
                      value={course?.code || "N/A"}
                      icon={<FaLayerGroup />}
                    />
                    <InfoItem
                      label="Current Semester"
                      value={
                        student?.currentSemester
                          ? `Semester ${student.currentSemester}`
                          : "N/A"
                      }
                      icon={<FaGraduationCap />}
                    />
                    <InfoItem
                      label="Admission Year"
                      value={student?.admissionYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <InfoItem
                      label="Academic Status"
                      value={student?.status || "N/A"}
                      icon={<FaCheckCircle />}
                    />
                  </div>
                </SectionContent>
              )}

              {activeTab === "contact" && (
                <SectionContent
                  title="Contact Information"
                  icon={<FaPhoneAlt />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="Personal Email"
                      value={student?.email || "N/A"}
                      icon={<FaEnvelope />}
                      col={6}
                    />
                    <InfoItem
                      label="Mobile Number"
                      value={student?.mobileNumber || "N/A"}
                      icon={<FaPhoneAlt />}
                      col={6}
                    />
                  </div>
                </SectionContent>
              )}

              {activeTab === "address" && (
                <SectionContent
                  title="Address Information"
                  icon={<FaHome />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="Address Line 1"
                      value={student?.addressLine || "N/A"}
                      icon={<FaMapMarkerAlt />}
                      col={12}
                    />
                    <InfoItem
                      label="City"
                      value={student?.city || "N/A"}
                      icon={<FaMapMarkerAlt />}
                    />
                    <InfoItem
                      label="State"
                      value={student?.state || "N/A"}
                      icon={<FaMapMarkerAlt />}
                    />
                    <InfoItem
                      label="Pincode"
                      value={student?.pincode || "N/A"}
                      icon={<FaMapMarkerAlt />}
                    />
                    <InfoItem
                      label="Country"
                      value={student?.country || "N/A"}
                      icon={<FaGlobe />}
                    />
                  </div>
                </SectionContent>
              )}

              {activeTab === "ssc" && documentConfig.some(doc => doc.type === "10th_marksheet" && doc.enabled) && (
                <SectionContent
                  title="10th (SSC) Academic Details"
                  icon={<FaGraduationCap />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="School Name"
                      value={student?.sscSchoolName || "N/A"}
                      icon={<FaUniversity />}
                      col={12}
                    />
                    <InfoItem
                      label="Board"
                      value={student?.sscBoard || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <InfoItem
                      label="Passing Year"
                      value={student?.sscPassingYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <InfoItem
                      label="Percentage / CGPA"
                      value={
                        student?.sscPercentage
                          ? `${student.sscPercentage}%`
                          : "N/A"
                      }
                      icon={<FaCheckCircle />}
                    />
                    <InfoItem
                      label="Roll Number"
                      value={student?.sscRollNumber || "N/A"}
                      icon={<FaIdCard />}
                    />
                  </div>
                </SectionContent>
              )}

              {activeTab === "hsc" && documentConfig.some(doc => doc.type === "12th_marksheet" && doc.enabled) && (
                <SectionContent
                  title="12th (HSC) Academic Details"
                  icon={<FaGraduationCap />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="School / College Name"
                      value={student?.hscSchoolName || "N/A"}
                      icon={<FaUniversity />}
                      col={12}
                    />
                    <InfoItem
                      label="Board"
                      value={student?.hscBoard || "N/A"}
                      icon={<FaUniversity />}
                    />
                    <InfoItem
                      label="Stream"
                      value={student?.hscStream || "N/A"}
                      icon={<FaBook />}
                    />
                    <InfoItem
                      label="Passing Year"
                      value={student?.hscPassingYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <InfoItem
                      label="Percentage / CGPA"
                      value={
                        student?.hscPercentage
                          ? `${student.hscPercentage}%`
                          : "N/A"
                      }
                      icon={<FaCheckCircle />}
                    />
                    <InfoItem
                      label="Roll Number"
                      value={student?.hscRollNumber || "N/A"}
                      icon={<FaIdCard />}
                    />
                  </div>
                </SectionContent>
              )}

              {activeTab === "documents" && (
                <SectionContent
                  title="Uploaded Documents"
                  icon={<FaFileAlt />}
                >
                  <p className="section-description">
                    These are the documents you uploaded during registration.
                    They are verified by the college admin.
                  </p>

                  <div className="doc-profile-grid">
                    {mergedDocuments.length === 0 ? (
                      <div className="doc-profile-empty">
                        <div className="alert alert-warning d-flex align-items-center mb-0">
                          <FaExclamationTriangle className="me-2" size={20} />
                          <div>
                            <strong>No Documents Required:</strong> Your
                            college has not configured any document
                            requirements for your batch.
                          </div>
                        </div>
                      </div>
                    ) : (
                      mergedDocuments.map((doc) => {
                        const uploadedDoc = doc.uploadedDoc;
                        return (
                          <DocumentCard
                            key={doc.type}
                            icon={<FaFileAlt />}
                            type={doc.label}
                            name={doc.description || doc.label}
                            file={uploadedDoc?.originalFileName || "Not uploaded"}
                            filePath={uploadedDoc?.downloadUrl}
                            documentId={uploadedDoc?.documentId}
                            mandatory={doc.mandatory}
                          />
                        );
                      })
                    )}
                  </div>

                  <div className="doc-guidelines">
                    <h6 className="doc-guidelines-title">
                      <FaInfoCircle className="me-2" aria-hidden="true" />
                      Document Guidelines
                    </h6>
                    <ul className="doc-guidelines-list">
                      <li>All documents must be in PDF format</li>
                      <li>Maximum file size: 5MB per document</li>
                      <li>Ensure documents are clear and legible</li>
                      <li>Contact administration for document verification</li>
                    </ul>
                  </div>
                </SectionContent>
              )}

              {activeTab === "college" && (
                <SectionContent
                  title="College Information"
                  icon={<FaUniversity />}
                >
                  <div className="row info-grid">
                    <InfoItem
                      label="College Name"
                      value={college?.name || "N/A"}
                      icon={<FaGraduationCap />}
                      col={12}
                    />
                    <InfoItem
                      label="Email"
                      value={college?.email || "N/A"}
                      icon={<FaEnvelope />}
                    />
                    <InfoItem
                      label="Contact Number"
                      value={college?.contactNumber || "N/A"}
                      icon={<FaPhoneAlt />}
                    />
                    <InfoItem
                      label="Established Year"
                      value={college?.establishedYear || "N/A"}
                      icon={<FaCalendarAlt />}
                    />
                    <InfoItem
                      label="Address"
                      value={college?.address || "N/A"}
                      icon={<FaMapMarkerAlt />}
                      col={12}
                    />
                  </div>
                </SectionContent>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden mt-3 mt-md-4 animate-fade-in-up">
        <div className="card-body p-3 p-md-4 bg-light">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="text-center text-md-start">
              <p className="mb-1">
                <small className="text-muted">
                  <FaUserGraduate className="me-1" aria-hidden="true" />
                  Student Profile | Smart College ERP System
                </small>
              </p>
              <p className="mb-0">
                <small className="text-muted">
                  <FaSync className="spin-icon me-1" aria-hidden="true" />
                   Profile last updated:{" "}
                   <strong>
                     {profile?.student?.updatedAt
                       ? new Date(profile.student.updatedAt).toLocaleString()
                       : "N/A"}
                   </strong>
                </small>
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => navigate("/student/dashboard")}
                aria-label="Go back to student dashboard"
              >
                <FaArrowLeft size={12} aria-hidden="true" /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(26, 75, 109, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes lift {
          to { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        .animate-fade-in-up { animation: slideUp 0.6s ease-out forwards; }
        .pulse-icon { animation: pulse 2s infinite; }
        .blink { animation: blink 1.5s infinite; }
        .hover-lift:hover { animation: lift 0.3s ease forwards; }
        .spin-icon { animation: spin 1s linear infinite; }
        .float-badge { animation: float 3s ease-in-out infinite; }
        .pulse-button { position: relative; overflow: hidden; }
        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255,255,255,0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        .pulse-button:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        @keyframes ripple {
          0% { transform: scale(0, 0); opacity: 0.5; }
          100% { transform: scale(100, 100); opacity: 0; }
        }

        .bg-gradient-primary {
          background: linear-gradient(135deg, #0b2f3c 0%, #0f3a4a 50%, #1b6b87 100%);
          // background-size: 200% 200%;
          // animation: gradientShift 8s ease infinite;
        }

        .profile-logo-container {
          width: 70px;
          height: 70px;
          box-shadow: 0 8px 25px rgba(26, 75, 109, 0.4);
        }

        .profile-avatar-container {
          position: relative;
          width: 100px;
          height: 100px;
        }

         .profile-avatar {
           width: 100px;
           height: 100px;
           border-radius: 50%;
           box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
           font-size: 2.5rem;
         }

         .profile-header-btn {
         margin-top: 2rem;
         margin-right: 2rem;
           minHeight: 48px;
                    padding: 0 20px;
                    border: 1px solid rgba(255, 255, 255, 0.35);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.88);
                    color: #0E3746;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;  

         }
          .profile-header-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(20, 27, 41, 0.18);
          }

         @media (max-width: 991.98px) {
           .profile-header-btn {
             position: static;
             margin-top: 1rem;
           }
         }

        .profile-status-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #f8f9fa;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        /* ================= STUDENT PROFILE HEADER (NOVAA) ================= */
        .student-profile-page .sph-header {
          background: linear-gradient(135deg, #0E3746 0%, #164E63 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 28px rgba(14, 55, 70, 0.18);
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .student-profile-page .sph-header { margin-bottom: 1.5rem; }
        }
        .student-profile-page .sph-upper {
          background: transparent;
          color: #ffffff;
          padding: 1.25rem 24px;
        }
        .student-profile-page .sph-upper-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
        }
        .student-profile-page .sph-identity {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          min-width: 0;
          flex: 1 1 auto;
        }
        .student-profile-page .sph-avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }
        .student-profile-page .sph-avatar {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: #ffffff;
          color: #0e7490;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
          overflow: hidden;
        }
        .student-profile-page .sph-avatar-fallback {
          font-size: 2.3rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .student-profile-page .sph-avatar-status {
          position: absolute;
          right: 2px;
          bottom: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .student-profile-page .sph-avatar-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: block;
        }
        .student-profile-page .sph-avatar-status-dot.is-approved { background: #22c55e; }
        .student-profile-page .sph-avatar-status-dot.is-rejected { background: #ef4444; }
        .student-profile-page .sph-avatar-status-dot.is-pending { background: #f59e0b; }
        .student-profile-page .sph-identity-text {
          min-width: 0;
          flex: 1 1 auto;
        }
        .student-profile-page .sph-name {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .student-profile-page .sph-subline {
          margin-top: 0.3rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.35rem 1rem;
          color: rgba(236, 254, 255, 0.94);
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .student-profile-page .sph-subline-item {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-width: 0;
        }
        .student-profile-page .sph-subline-item svg {
          color: #67e8f9;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .student-profile-page .sph-chips {
          margin-top: 0.65rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }
        .student-profile-page .sph-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          min-height: 30px;
          padding: 0.3rem 0.65rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1;
          color: #f0fdff;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          white-space: nowrap;
        }
        .student-profile-page .sph-chip svg {
          font-size: 0.72rem;
          flex-shrink: 0;
        }
        .student-profile-page .sph-chip--approved {
          color: #dcfce7;
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(134, 239, 172, 0.38);
        }
        .student-profile-page .sph-chip--approved svg { color: #86efac; }
        .student-profile-page .sph-chip--rejected {
          color: #fee2e2;
          background: rgba(239, 68, 68, 0.16);
          border-color: rgba(252, 165, 165, 0.32);
        }
        .student-profile-page .sph-chip--pending {
          color: #fef3c7;
          background: rgba(245, 158, 11, 0.16);
          border-color: rgba(253, 230, 138, 0.32);
        }
        .student-profile-page .sph-edit-btn {
          flex: 0 0 auto;
          align-self: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 40px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: transparent;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          transition: background-color 0.18s ease, border-color 0.18s ease;
          white-space: nowrap;
        }
        .student-profile-page .sph-edit-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.65);
        }
        .student-profile-page .sph-lower {
          background: transparent;
          color: #ffffff;
          padding: 0.85rem 24px 1rem;
          border-top: 1px solid rgba(184, 209, 217, 0.18);
        }
        .student-profile-page .sph-contact-strip {
          display: flex;
          align-items: stretch;
          width: 100%;
          min-width: 0;
        }
        .student-profile-page .sph-contact-group {
          flex: 1 1 0;
          min-width: 0;
          padding: 0.1rem 1rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .student-profile-page .sph-contact-group:first-child { padding-left: 0; }
        .student-profile-page .sph-contact-group:last-child { padding-right: 0; }
        .student-profile-page .sph-contact-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #B8D1D9;
          margin-bottom: 0.3rem;
          line-height: 1.2;
        }
        .student-profile-page .sph-contact-value-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .student-profile-page .sph-contact-icon {
          font-size: 0.9rem;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .student-profile-page .sph-contact-icon--email { color: #67e8f9; }
        .student-profile-page .sph-contact-icon--phone { color: #86efac; }
        .student-profile-page .sph-contact-icon--nationality { color: #67e8f9; }
        .student-profile-page .sph-contact-icon--updated { color: #dbeafe; }
        .student-profile-page .sph-contact-value {
          color: #FFFFFF;
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.35;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .student-profile-page .sph-contact-sep {
          flex: 0 0 1px;
          width: 1px;
          height: 38px;
          background: rgba(184, 209, 217, 0.3);
          align-self: center;
        }
        @media (max-width: 991.98px) {
          .student-profile-page .sph-upper { padding: 1.15rem 20px; }
          .student-profile-page .sph-lower { padding: 0.8rem 20px 0.95rem; }
          .student-profile-page .sph-upper-main { flex-wrap: wrap; align-items: flex-start; }
          .student-profile-page .sph-edit-btn { margin-left: auto; }
          .student-profile-page .sph-contact-strip { flex-wrap: wrap; row-gap: 0.85rem; }
          .student-profile-page .sph-contact-group { flex: 1 1 calc(50% - 0.5px); padding: 0.1rem 0.75rem; }
          .student-profile-page .sph-contact-group:first-child,
          .student-profile-page .sph-contact-group:last-child { padding-left: 0.75rem; padding-right: 0.75rem; }
          .student-profile-page .sph-contact-sep { display: none; }
        }
        @media (max-width: 767.98px) {
          .student-profile-page .sph-upper,
          .student-profile-page .sph-lower { padding: 1rem 16px; }
          .student-profile-page .sph-upper-main { flex-direction: column; align-items: stretch; gap: 1rem; }
          .student-profile-page .sph-identity { align-items: flex-start; }
          .student-profile-page .sph-avatar { width: 80px; height: 80px; }
          .student-profile-page .sph-avatar-fallback { font-size: 2.1rem; }
          .student-profile-page .sph-name { font-size: 24px; }
          .student-profile-page .sph-edit-btn { width: 100%; margin-left: 0; }
          .student-profile-page .sph-contact-strip {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.85rem 0.75rem;
          }
          .student-profile-page .sph-contact-group { padding: 0; }
          .student-profile-page .sph-contact-sep { display: none; }
        }
        @media (max-width: 479.98px) {
          .student-profile-page .sph-identity { flex-direction: column; gap: 0.8rem; }
          .student-profile-page .sph-contact-strip { grid-template-columns: 1fr; }
        }

        /* ================= CONTENT AREA (NAV + SECTIONS) ================= */
        .student-profile-page .tabs-navigation {
          min-width: 250px;
          max-width: 260px;
          border-right: 1px solid #E2E8F0;
          background: #f8fafc;
          padding: 0.5rem 0;
          align-self: stretch;
        }
        .student-profile-page .tab-item {
          min-height: 52px;
          padding: 0.85rem 1rem;
          margin: 0.15rem 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: background-color 0.18s ease, color 0.18s ease;
          border-left: 3px solid transparent;
          border-radius: 10px;
          position: relative;
          color: #334155;
        }
        .student-profile-page .tab-item:hover {
          background: rgba(22, 113, 245, 0.06);
          color: #0f172a;
        }
        .student-profile-page .tab-item.active {
          background: #ffffff;
          border-left-color: #1671F5;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          font-weight: 600;
          color: #1671F5;
        }
        .student-profile-page .tab-item.active::before { display: none; }
        .student-profile-page .tab-item-icon {
          font-size: 1.05rem;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .student-profile-page .tab-item.active .tab-item-icon { color: #1671F5; }
        .student-profile-page .tab-item-text { flex: 1 1 auto; min-width: 0; }
        .student-profile-page .tab-item-label {
          font-size: 0.92rem;
          font-weight: 500;
          line-height: 1.35;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .student-profile-page .tab-badge {
          background: #1671F5;
          color: #ffffff;
          font-size: 0.72rem;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
          min-width: 22px;
          text-align: center;
        }
        .student-profile-page .tabs-content {
          min-width: 0;
          padding: 20px 24px;
          background: #ffffff;
        }
        .student-profile-page .section-content {
          border-radius: 14px;
          padding: 24px;
          background: #ffffff;
          border: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .student-profile-page .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding-bottom: 0.85rem;
          margin-bottom: 1.1rem;
          border-bottom: 1px solid #E2E8F0;
          flex-wrap: wrap;
        }
        .student-profile-page .section-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1671F5;
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          line-height: 1.25;
        }
        .student-profile-page .section-title-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
        }
        .student-profile-page .section-header-action { margin-left: auto; }
        .student-profile-page .section-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          min-height: 34px;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1671F5;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .student-profile-page .section-edit-btn:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
        .student-profile-page .section-body { min-width: 0; }
        .student-profile-page .info-grid {
          --bs-gutter-x: 1.5rem;
          --bs-gutter-y: 0;
          margin: 0;
        }
        .student-profile-page .info-item {
          padding: 0.85rem 0.25rem;
          border-bottom: 1px solid #f1f5f9;
          border-left: 0;
          transition: none;
          min-width: 0;
        }
        .student-profile-page .info-item:hover {
          border-left-color: transparent;
          background-color: transparent;
          transform: none;
        }
        .student-profile-page .info-label {
          font-weight: 500;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.3rem;
          font-size: 14px;
          line-height: 1.35;
        }
        .student-profile-page .info-label-icon {
          font-size: 0.85rem;
          color: #94a3b8;
          display: inline-flex;
        }
        .student-profile-page .info-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 15.5px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .student-profile-page .info-group-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem 1.5rem;
        }
        .student-profile-page .info-group {
          min-width: 0;
        }
        .student-profile-page .info-group-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #475569;
          margin-bottom: 0.15rem;
          padding-bottom: 0.35rem;
          border-bottom: 1px dashed #E2E8F0;
        }
        .student-profile-page .section-description {
          margin: 0 0 1rem;
          font-size: 0.92rem;
          color: #64748b;
          line-height: 1.5;
        }

        /* Documents */
        .student-profile-page .doc-profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1rem;
        }
        .student-profile-page .doc-profile-empty { grid-column: 1 / -1; }
        .student-profile-page .doc-profile-card {
          background: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          min-width: 0;
        }
        .student-profile-page .doc-profile-card.is-unavailable {
          background: #f8fafc;
        }
        .student-profile-page .doc-profile-card-top {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          min-width: 0;
        }
        .student-profile-page .doc-profile-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #eff6ff;
          color: #1671F5;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1.05rem;
          flex-shrink: 0;
          border: 1px solid #dbeafe;
        }
        .student-profile-page .doc-profile-card.is-unavailable .doc-profile-icon {
          background: #f1f5f9;
          color: #64748b;
          border-color: #e2e8f0;
        }
        .student-profile-page .doc-profile-meta { min-width: 0; flex: 1 1 auto; }
        .student-profile-page .doc-profile-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.15rem;
        }
        .student-profile-page .doc-profile-type {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
        }
        .student-profile-page .doc-profile-name {
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.4;
          overflow-wrap: anywhere;
          margin-bottom: 0.3rem;
        }
        .student-profile-page .doc-profile-file {
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .student-profile-page .doc-profile-file-label { font-weight: 600; margin-right: 0.25rem; }
        .student-profile-page .doc-profile-file-value { color: #334155; }
        .student-profile-page .doc-badge-profile {
          display: inline-flex;
          align-items: center;
          font-size: 0.66rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          flex-shrink: 0;
        }
        .student-profile-page .doc-badge-profile-required {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.18);
        }
        .student-profile-page .doc-badge-profile-optional {
          background: rgba(100, 116, 139, 0.1);
          color: #475569;
          border: 1px solid rgba(100, 116, 139, 0.18);
        }
        .student-profile-page .doc-profile-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: auto;
        }
        .student-profile-page .doc-profile-btn {
          flex: 1 1 0;
          min-height: 36px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .student-profile-page .doc-profile-btn--view {
          background: #1671F5;
          color: #ffffff;
          border-color: #1671F5;
        }
        .student-profile-page .doc-profile-btn--view:hover:not(:disabled) {
          background: #0f5fd1;
          border-color: #0f5fd1;
        }
        .student-profile-page .doc-profile-btn--download {
          background: #ffffff;
          color: #1671F5;
          border-color: #bfdbfe;
        }
        .student-profile-page .doc-profile-btn--download:hover:not(:disabled) {
          background: #eff6ff;
        }
        .student-profile-page .doc-profile-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
        .student-profile-page .doc-guidelines {
          margin-top: 1rem;
          padding: 0.9rem 1rem;
          background: #f8fafc;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
        }
        .student-profile-page .doc-guidelines-title {
          margin: 0 0 0.4rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: #334155;
          display: inline-flex;
          align-items: center;
        }
        .student-profile-page .doc-guidelines-title svg { color: #1671F5; }
        .student-profile-page .doc-guidelines-list {
          margin: 0;
          padding-left: 1.15rem;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .student-profile-page .doc-guidelines-list li { margin-bottom: 0.15rem; }
        
        @media (max-width: 991.98px) {
          .student-profile-page .tabs-navigation {
            min-width: 100%;
            max-width: none;
            width: 100%;
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            border-right: 0;
            border-bottom: 1px solid #E2E8F0;
            padding: 0.5rem;
            gap: 0.25rem;
            scrollbar-width: thin;
          }
          .student-profile-page .tab-item {
            flex: 0 0 auto;
            min-width: 150px;
            min-height: 48px;
            margin: 0;
            padding: 0.65rem 0.75rem;
            border-left: 0;
            border-bottom: 3px solid transparent;
            justify-content: center;
            text-align: center;
            flex-direction: column;
            gap: 0.35rem;
          }
          .student-profile-page .tab-item.active {
            border-left-color: transparent;
            border-bottom-color: #1671F5;
          }
          .student-profile-page .tabs-content {
            width: 100%;
            padding: 16px;
          }
          .student-profile-page .section-content {
            padding: 20px;
          }
          .student-profile-page .info-group-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767.98px) {
          .student-profile-page .tabs-content {
            padding: 12px;
          }
          .student-profile-page .section-content {
            padding: 16px;
            border-radius: 12px;
          }
          .student-profile-page .section-title {
            font-size: 20px;
          }
          .student-profile-page .doc-profile-grid {
            grid-template-columns: 1fr;
          }
          .student-profile-page .doc-profile-actions {
            flex-direction: column;
          }
        }

        @media (max-width: 575.98px) {
          .student-profile-page .tab-item {
            min-width: 132px;
            padding: 0.55rem 0.5rem;
          }
          .student-profile-page .tab-item-label {
            font-size: 0.84rem;
          }
          .student-profile-page .section-header-row {
            align-items: flex-start;
          }
          .student-profile-page .info-item {
            padding: 0.75rem 0.1rem;
          }
        }

        /* ================= SCREEN READER ONLY ================= */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-only-focusable:focus {
          position: static;
          width: auto;
          height: auto;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }
      `}</style>
    </div>
  );
}

/* ================= TAB ITEM COMPONENT ================= */
function TabItem({ icon, label, active, onClick, badge, hidden }) {
  if (hidden) return null;

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`tab-item ${active ? "active" : ""}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
    >
      <span className="tab-item-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="tab-item-text">
        <div className="tab-item-label">{label}</div>
      </div>
      {badge && (
        <span className="tab-badge" aria-label={`${badge} items`}>
          {badge}
        </span>
      )}
    </div>
  );
}

/* ================= SECTION CONTENT COMPONENT ================= */
function SectionContent({ title, icon, children, action }) {
  return (
    <div className="section-content" role="tabpanel">
      <div className="section-header-row">
        <h2 className="section-title">
          <span className="section-title-icon" aria-hidden="true">{icon}</span>
          <span>{title}</span>
        </h2>
        {action ? <div className="section-header-action">{action}</div> : null}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

/* ================= INFO ITEM COMPONENT ================= */
function InfoItem({ label, value, icon, col = 6 }) {
  return (
    <div className={`col-md-${col} info-item`}>
      <div className="info-label">
        <span className="info-label-icon" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="info-value">{value}</div>
    </div>
  );
}

/* ================= DOCUMENT CARD COMPONENT ================= */
function DocumentCard({
  icon,
  type,
  name,
  file,
  filePath,
  documentId,
  mandatory,
}) {
  const source = filePath || null;

  const documentUrl = (() => {
    if (!source) return null;
    if (source.startsWith("http")) return source;
    if (source.startsWith("/api/")) {
      return `${window.location.origin}${source}`;
    }
    const fileName = source.split(/[\\/]/).pop();
    return `${api.defaults.baseURL}/students/documents/${fileName}`;
  })();

  const hasFile =
    (source &&
      String(source).trim() !== "" &&
      source !== "null" &&
      source !== "undefined") ||
    false;

  const handleView = () => {
    let viewUrl = null;
    if (documentId) {
      viewUrl = getDocumentViewUrl(documentId);
    } else if (source) {
      viewUrl = source;
    }
    if (viewUrl) {
      window.open(viewUrl, "_blank");
    } else {
      toast.error("Document not available for viewing", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />,
      });
    }
  };

  const handleDownload = async () => {
    try {
      if (documentUrl && hasFile) {
        const response = await fetch(documentUrl, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to fetch document");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", file || "document");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast.success("Document downloaded successfully!", {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />,
        });
      }
    } catch {
      toast.error("Failed to download document. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaTimesCircle />,
      });
    }
  };

  return (
    <div className={`doc-profile-card ${hasFile ? "is-available" : "is-unavailable"}`}>
      <div className="doc-profile-card-top">
        <div className="doc-profile-icon" aria-label={`${type} document icon`}>
          {icon || <FaFileAlt />}
        </div>
        <div className="doc-profile-meta">
          <div className="doc-profile-title-row">
            <div className="doc-profile-type">{type}</div>
            <span
              className={`doc-badge-profile ${
                mandatory ? "doc-badge-profile-required" : "doc-badge-profile-optional"
              }`}
            >
              {mandatory ? "Required" : "Optional"}
            </span>
          </div>
          <div className="doc-profile-name" title={name || type}>
            {name || type}
          </div>
          <div className="doc-profile-file">
            <span className="doc-profile-file-label">File:</span>
            <span className="doc-profile-file-value">{file || "Not uploaded"}</span>
          </div>
        </div>
      </div>
      <div className="doc-profile-actions">
        <button
          type="button"
          className="doc-profile-btn doc-profile-btn--view"
          onClick={handleView}
          disabled={!hasFile}
          aria-label={`View ${type}`}
        >
          <FaFilePdf size={14} aria-hidden="true" />
          <span>View</span>
        </button>
        <button
          type="button"
          className="doc-profile-btn doc-profile-btn--download"
          onClick={handleDownload}
          disabled={!hasFile}
          aria-label={`Download ${type}`}
        >
          <FaDownload size={14} aria-hidden="true" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
