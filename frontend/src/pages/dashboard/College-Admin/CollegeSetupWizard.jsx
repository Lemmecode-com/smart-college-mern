import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import ApiError from "../../../components/ApiError";
import "./Wizard.css";
import {
  FaEnvelope,
  FaUsers,
  FaBook,
  FaFileInvoiceDollar,
  FaUserPlus,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";

const STEPS = [
  {
    id: "email",
    title: "Configure Email (SMTP)",
    description: "Set up your college email service so system notifications reach students and staff.",
    icon: FaEnvelope,
    path: "/system-settings/email-configuration",
    actionLabel: "Go to Email Settings",
  },
  {
    id: "departments",
    title: "Add Departments",
    description: "Create the academic departments for your college.",
    icon: FaUsers,
    path: "/departments/add",
    actionLabel: "Add Department",
  },
  {
    id: "courses",
    title: "Add Courses",
    description: "Create courses and link them to departments.",
    icon: FaBook,
    path: "/courses/add",
    actionLabel: "Add Course",
  },
  {
    id: "fees",
    title: "Set Up Fee Structures",
    description: "Define fee structures for each course so students can make payments.",
    icon: FaFileInvoiceDollar,
    path: "/fee-structure/create",
    actionLabel: "Create Fee Structure",
  },
  {
    id: "staff",
    title: "Add Staff Members",
    description: "Create accounts for teachers and other staff.",
    icon: FaUserPlus,
    path: "/college/staff/create",
    actionLabel: "Create Staff",
  },
];

export default function CollegeSetupWizard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [setupStatus, setSetupStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

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

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "COLLEGE_ADMIN") {
      navigate("/dashboard");
      return;
    }
  }, [user, navigate]);

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await api.get("/college/setup-status");
      setSetupStatus(res.data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Error loading setup status:", statusCode, errorCode);
      setPageError({ statusCode, errorCode });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [navigate]);

  const isStepComplete = (stepId) => {
    if (!setupStatus) return false;
    if (stepId === "email") return setupStatus.emailConfigured === true;
    return setupStatus.steps?.[stepId] === true;
  };

  const allStepsComplete = () => {
    if (!setupStatus) return false;
    return (
      setupStatus.emailConfigured === true &&
      STEPS.every(
        (step) => step.id === "email" || setupStatus.steps?.[step.id] === true,
      )
    );
  };

  const goToStep = (stepPath) => {
    navigate(stepPath);
  };

  const markComplete = async () => {
    setLoading(true);
    try {
      await api.post("/college/setup-complete", {});
      navigate("/dashboard");
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Failed to mark setup complete:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(
        err.response?.data?.message ||
          "Setup incomplete. Please complete all required steps first.",
        { position: "top-right" },
      );
    } finally {
      setLoading(false);
    }
  };

  const skipWizard = () => {
    navigate("/dashboard");
  };

  if (!user || user.role !== "COLLEGE_ADMIN") return null;

  if (pageError) {
    return (
      <ApiError
        statusCode={pageError.statusCode}
        errorCode={pageError.errorCode}
        onRetry={fetchStatus}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="setup-wizard-container">
      <div className="setup-wizard-card">
        <div className="setup-wizard-header">
          <h2>Welcome to Smart College!</h2>
          <p>Let's get your college fully set up. Complete the following steps to go live.</p>
          <button className="setup-wizard-close" onClick={skipWizard} title="Skip for now">
            <FaTimes />
          </button>
        </div>

        <div className="setup-wizard-steps">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isPast = index < currentStep;
            const complete = isStepComplete(step.id);
            return (
              <div
                key={step.id}
                className={`setup-step ${isActive ? "active" : ""} ${isPast ? "past" : ""} ${complete ? "complete" : ""}`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="setup-step-icon">
                  {complete ? <FaCheckCircle /> : isPast ? <FaCheckCircle /> : <Icon />}
                </div>
                <div className="setup-step-content">
                  <span className="setup-step-title">{step.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="setup-wizard-body">
          <div className="setup-step-detail">
            {STEPS[currentStep] && (
              <>
                <h3>{STEPS[currentStep].title}</h3>
                <p>{STEPS[currentStep].description}</p>
                <div className="setup-step-actions">
                  <button
                    className="erp-btn erp-btn-primary"
                    onClick={() => goToStep(STEPS[currentStep].path)}
                  >
                    {STEPS[currentStep].actionLabel}
                    <FaArrowRight className="erp-btn-icon" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="setup-wizard-footer">
          <button
            className="erp-btn erp-btn-secondary"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            <FaArrowLeft className="erp-btn-icon" />
            Previous
          </button>

          <button className="erp-btn erp-btn-outline" onClick={skipWizard}>
            Skip for Now
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              className="erp-btn erp-btn-primary"
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={statusLoading}
            >
              Next
              <FaArrowRight className="erp-btn-icon" />
            </button>
          ) : (
            <button
              className="erp-btn erp-btn-success"
              onClick={markComplete}
              disabled={loading || statusLoading || !allStepsComplete()}
            >
              <FaCheckCircle className="erp-btn-icon" />
              {loading ? "Saving..." : statusLoading ? "Checking..." : !allStepsComplete() ? "Complete all steps first" : "Finish Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
