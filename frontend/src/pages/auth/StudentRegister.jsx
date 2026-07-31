import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "../../components/ConfirmModal";
import {
  validateFileObject,
  getAcceptAttribute,
} from "../../utils/fileValidation";
import {
  FaUniversity,
  FaUserGraduate,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaUpload,
  FaFilePdf,
  FaBook,
  FaInfoCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTimes,
  FaExclamationCircle,
  FaHome,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

/* ── Public Axios ── */
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

/* ── API Cache ── */
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;
const cachedGet = async (url, cacheKey) => {
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION)
    return cached.data;
  const res = await publicApi.get(url);
  apiCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
  return res.data;
};

export default function StudentRegister() {
  const { collegeCode } = useParams();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [documentConfig, setDocumentConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    gender: "",
    dateOfBirth: "",
    category: "GEN",
    bloodGroup: "",
    religion: "",
    nationality: "Indian",
    hasDisability: "no",
    disabilityType: "",
    pwdDisability: "",
    fatherName: "",
    fatherMobile: "",
    fatherEmail: "",
    motherName: "",
    motherMobile: "",
    motherEmail: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    sscSchoolName: "",
    sscBoard: "",
    sscPassingYear: "",
    sscPercentage: "",
    sscRollNumber: "",
    hscSchoolName: "",
    hscBoard: "",
    hscStream: "",
    hscPassingYear: "",
    hscPercentage: "",
    hscRollNumber: "",
    department_id: "",
    course_id: "",
    admissionYear: new Date().getFullYear(),
  });

  /* ── Data Fetching ── */
  useEffect(() => {
    if (!collegeCode) return;
    cachedGet(`/public/departments/${collegeCode}`, `college-${collegeCode}`)
      .then((res) => {
        if (res?.collegeName) setCollegeName(res.collegeName);
      })
      .catch(() => {});
  }, [collegeCode]);

  useEffect(() => {
    if (!collegeCode) return;
    setConfigLoading(true);
    cachedGet(`/document-config/${collegeCode}`, `doc-config-${collegeCode}`)
      .then((res) => {
        if (res?.documents) setDocumentConfig(res.documents);
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, [collegeCode]);

  useEffect(() => {
    if (!collegeCode) return;
    cachedGet(
      `/public/departments/${collegeCode}`,
      `departments-${collegeCode}`,
    )
      .then((res) => setDepartments(res.departments || res || []))
      .catch(() => setError("Failed to load departments"));
  }, [collegeCode]);

  useEffect(() => {
    if (!form.department_id || !collegeCode) return;
    publicApi
      .get(`/public/courses/${collegeCode}/department/${form.department_id}`)
      .then((res) => setCourses(res.data || []))
      .catch(() => setError("Failed to load courses"));
  }, [form.department_id, collegeCode]);

  /* ── Handlers ── */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (success) setSuccess("");
    if (error) setError("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next[e.target.name];
      return next;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const fieldName = e.target.name;
    if (!file) return;

    const docConfig = documentConfig?.find((doc) => doc.type === fieldName);

    if (!docConfig && fieldName === "category_certificate") {
      if (form.category === "GEN") {
        alert(`Category certificate is not required for GEN category`);
        e.target.value = "";
        return;
      }
      setForm((p) => ({ ...p, [fieldName]: file }));
      return;
    }
    if (!docConfig) {
      if (!documentConfig || documentConfig.length === 0) {
        setForm((p) => ({ ...p, [fieldName]: file }));
        return;
      }
      alert(`${fieldName} is not configured for this college.`);
      e.target.value = "";
      return;
    }

    const allowedFormats = docConfig.allowedFormats || [
      "pdf",
      "jpg",
      "jpeg",
      "png",
    ];
    const validation = validateFileObject(file, allowedFormats);
    if (!validation.valid) {
      alert(
        `${docConfig.label} accepts only: ${validation.error}`,
      );
      e.target.value = "";
      return;
    }

    const maxSize = (docConfig.maxFileSize || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      alert(
        `${docConfig.label} file size should be less than ${docConfig.maxFileSize || 5}MB`,
      );
      e.target.value = "";
      return;
    }

    setForm((p) => ({ ...p, [fieldName]: file }));
  };

  const isDocEnabled = (type) =>
    documentConfig.some((doc) => doc.type === type && doc.enabled);

  /* ── Dynamic Steps ── */
  const getStepNumbers = () => {
    const has10th = isDocEnabled("10th_marksheet");
    const has12th = isDocEnabled("12th_marksheet");
    let step = 3;
    const result = {
      personal: 1,
      parent: 2,
      address: 3,
      ssc: null,
      hsc: null,
      course: null,
      documents: null,
    };
    if (has10th) {
      step++;
      result.ssc = step;
    }
    if (has12th) {
      step++;
      result.hsc = step;
    }
    step++;
    result.course = step;
    step++;
    result.documents = step;
    result.total = step;
    return result;
  };

  const isWhitespaceOnly = (value) => {
    return typeof value === "string" && value.trim().length === 0 && value.length > 0;
  };

  const validateField = (name, value, rules = {}) => {
    const { required, minLength, maxLength, pattern, patternMsg, min, max, minMsg, maxMsg, custom } = rules;
    if (required) {
      if (!value || value.toString().trim() === "") {
        return `${name} is required`;
      }
      if (isWhitespaceOnly(value)) {
        return `${name} cannot be empty or contain only spaces`;
      }
    }
    if (minLength && value && value.length < minLength) {
      return `${name} must be at least ${minLength} characters`;
    }
    if (maxLength && value && value.length > maxLength) {
      return `${name} must be at most ${maxLength} characters`;
    }
    if (pattern && value && !pattern.test(value)) {
      return patternMsg || `${name} is invalid`;
    }
    if (min !== undefined && value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < min) {
        return minMsg || `${name} must be at least ${min}`;
      }
    }
    if (max !== undefined && value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num > max) {
        return maxMsg || `${name} must be at most ${max}`;
      }
    }
    if (custom && value) {
      const customResult = custom(value);
      if (customResult) return customResult;
    }
    return null;
  };

  const validateStep = (step) => {
    const steps = getStepNumbers();
    const stepErrors = {};

    const addError = (field, message) => {
      stepErrors[field] = message;
    };

    if (step === steps.personal) {
      addError("fullName", validateField("Full Name", form.fullName, { required: true, minLength: 3, maxLength: 100 }));
      addError("email", validateField("Email", form.email, { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Please enter a valid email address" }));
      const passwordError = validateField("Password", form.password, { required: true, minLength: 8 });
      if (passwordError) {
        addError("password", passwordError);
      } else if (form.password) {
        if (!/[A-Z]/.test(form.password)) addError("password", "Password must include at least one uppercase letter (A-Z)");
        else if (!/[a-z]/.test(form.password)) addError("password", "Password must include at least one lowercase letter (a-z)");
        else if (!/[0-9]/.test(form.password)) addError("password", "Password must include at least one number (0-9)");
        else if (!/[^A-Za-z0-9]/.test(form.password)) addError("password", "Password must include at least one special character (!@#$%^&* etc.)");
      }
      addError("mobileNumber", validateField("Mobile Number", form.mobileNumber, { required: true, pattern: /^[6-9]\d{9}$/, patternMsg: "Please provide a valid 10-digit Indian mobile number (must start with 6-9)" }));
      addError("gender", validateField("Gender", form.gender, { required: true }));
      addError("dateOfBirth", validateField("Date of Birth", form.dateOfBirth, { required: true, custom: (val) => {
        const today = new Date();
        const birthDate = new Date(val);
        if (isNaN(birthDate.getTime())) return "Please enter a valid date";
        const birthOnly = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (birthOnly > todayOnly) return "Date of Birth cannot be in the future";
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age < 14 || age > 100) return "Age must be between 14 and 100 years";
        return null;
      }}));
      addError("category", validateField("Category", form.category, { required: true }));
      addError("bloodGroup", validateField("Blood Group", form.bloodGroup, { pattern: /^(A|B|AB|O)[+-]$/, patternMsg: "Please select a valid blood group" }));
      addError("religion", validateField("Religion", form.religion, { minLength: 2, maxLength: 50 }));
      addError("nationality", validateField("Nationality", form.nationality, { minLength: 2, maxLength: 50 }));
      if (form.hasDisability === "yes") {
        addError("disabilityType", validateField("Disability Type", form.disabilityType, { required: true }));
        if (form.pwdDisability) {
          const pwdNum = parseFloat(form.pwdDisability);
          if (isNaN(pwdNum) || pwdNum < 1 || pwdNum > 100) {
            addError("pwdDisability", "Disability Percentage must be between 1 and 100");
          }
        }
      }
    }

    if (step === steps.parent) {
      addError("fatherName", validateField("Father Name", form.fatherName, { required: true, minLength: 3, maxLength: 100 }));
      addError("fatherMobile", validateField("Father Mobile", form.fatherMobile, { required: true, pattern: /^[6-9]\d{9}$/, patternMsg: "Please provide a valid 10-digit Indian mobile number (must start with 6-9)" }));
      addError("fatherEmail", validateField("Father Email", form.fatherEmail, { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Please enter a valid father's email address" }));
      addError("motherName", validateField("Mother Name", form.motherName, { required: true, minLength: 3, maxLength: 100 }));
      addError("motherMobile", validateField("Mother Mobile", form.motherMobile, { required: true, pattern: /^[6-9]\d{9}$/, patternMsg: "Please provide a valid 10-digit Indian mobile number (must start with 6-9)" }));
      addError("motherEmail", validateField("Mother Email", form.motherEmail, { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: "Please enter a valid mother's email address" }));
    }

    if (step === steps.address) {
      addError("addressLine", validateField("Address Line", form.addressLine, { required: true, minLength: 10, maxLength: 500 }));
      addError("city", validateField("City", form.city, { required: true, minLength: 2, maxLength: 100 }));
      addError("state", validateField("State", form.state, { required: true, minLength: 2, maxLength: 100 }));
      addError("pincode", validateField("Pincode", form.pincode, { required: true, pattern: /^\d{6}$/, patternMsg: "Please provide a valid 6-digit Indian pincode" }));
    }

    if (step === steps.ssc) {
      addError("sscSchoolName", validateField("School Name", form.sscSchoolName, { required: true, minLength: 2, maxLength: 100 }));
      addError("sscBoard", validateField("Board", form.sscBoard, { required: true, minLength: 2, maxLength: 50 }));
      addError("sscPassingYear", validateField("Passing Year", form.sscPassingYear, { required: true, custom: (val) => {
        const year = parseInt(val);
        if (isNaN(year) || year < 1950) return "Passing Year must be 1950 or later";
        const currentYear = new Date().getFullYear();
        if (year > currentYear) return "Passing Year cannot be in the future";
        return null;
      }}));
      addError("sscPercentage", validateField("Percentage", form.sscPercentage, { required: true, min: 0, max: 100, minMsg: "Percentage must be between 0 and 100", maxMsg: "Percentage must be between 0 and 100" }));
      addError("sscRollNumber", validateField("Roll Number", form.sscRollNumber, { required: true, minLength: 1, maxLength: 30 }));
    }

    if (step === steps.hsc) {
      addError("hscSchoolName", validateField("School Name", form.hscSchoolName, { required: true, minLength: 2, maxLength: 100 }));
      addError("hscBoard", validateField("Board", form.hscBoard, { required: true, minLength: 2, maxLength: 50 }));
      addError("hscStream", validateField("Stream", form.hscStream, { required: true }));
      addError("hscPassingYear", validateField("Passing Year", form.hscPassingYear, { required: true, custom: (val) => {
        const year = parseInt(val);
        if (isNaN(year) || year < 1950) return "Passing Year must be 1950 or later";
        const currentYear = new Date().getFullYear();
        if (year > currentYear) return "Passing Year cannot be in the future";
        return null;
      }}));
      addError("hscPercentage", validateField("Percentage", form.hscPercentage, { required: true, min: 0, max: 100, minMsg: "Percentage must be between 0 and 100", maxMsg: "Percentage must be between 0 and 100" }));
      addError("hscRollNumber", validateField("Roll Number", form.hscRollNumber, { required: true, minLength: 1, maxLength: 30 }));
    }

    if (step === steps.course) {
      addError("department_id", validateField("Department", form.department_id, { required: true }));
      addError("course_id", validateField("Course", form.course_id, { required: true }));
      addError("admissionYear", validateField("Admission Year", form.admissionYear, { required: true, custom: (val) => {
        const year = parseInt(val);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < currentYear - 5 || year > currentYear + 1) {
          return `Admission year must be between ${currentYear - 5} and ${currentYear + 1}`;
        }
        return null;
      }}));
    }

    const filteredErrors = Object.fromEntries(
      Object.entries(stepErrors).filter(([, msg]) => msg !== null)
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  const focusFirstError = () => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const el = document.querySelector(`[name="${firstErrorField}"]`);
      if (el) el.focus();
    }
  };

  /* ── Document Validation (submission only) ── */
  const validateDocumentUpload = () => {
    if (!documentConfig || documentConfig.length === 0) return true;
    for (const doc of documentConfig) {
      if (doc.type === "category_certificate" && form.category === "GEN")
        continue;
      if (doc.enabled && doc.mandatory && !form[doc.type]) {
        alert("Please upload the mandatory documents before submitting your registration.");
        return false;
      }
    }
    return true;
  };

  /* ── Navigation ── */
  const handleNext = () => {
    const steps = getStepNumbers();
    const allStepNums = [
      steps.personal,
      steps.parent,
      steps.address,
      steps.ssc,
      steps.hsc,
      steps.course,
    ].filter(Boolean);
    if (allStepNums.includes(currentStep)) {
      const isValid = validateStep(currentStep);
      if (!isValid) {
        focusFirstError();
        return;
      }
    }
    setErrors({});
    if (currentStep >= steps.total) return;
    setCurrentStep((p) => p + 1);
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((p) => p - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleRegisterClick = () => {
    const steps = getStepNumbers();
    const allStepNums = [
      steps.personal,
      steps.parent,
      steps.address,
      steps.ssc,
      steps.hsc,
      steps.course,
    ].filter(Boolean);
    let hasErrors = false;
    for (const stepNum of allStepNums) {
      const isValid = validateStep(stepNum);
      if (!isValid) hasErrors = true;
    }
    if (hasErrors) {
      focusFirstError();
      return;
    }
    if (!validateDocumentUpload()) return;
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    await executeRegistration();
  };

  const executeRegistration = async () => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("fullName", form.fullName);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("mobileNumber", form.mobileNumber);
      formData.append("gender", form.gender);
      formData.append("dateOfBirth", form.dateOfBirth);
      formData.append("category", form.category);
      formData.append("bloodGroup", form.bloodGroup);
      formData.append("religion", form.religion);
      formData.append("nationality", form.nationality || "Indian");
      formData.append("hasDisability", form.hasDisability === "yes" ? "true" : "false");
      if (form.hasDisability === "yes") {
        formData.append("disabilityType", form.disabilityType);
        if (form.pwdDisability) formData.append("pwdDisability", form.pwdDisability);
        if (form.disabilityCertificate) formData.append("physicallyChallengedCertificate", form.disabilityCertificate);
      }
      formData.append("addressLine", form.addressLine);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("pincode", form.pincode);
      formData.append("fatherName", form.fatherName);
      formData.append("fatherMobile", form.fatherMobile);
      formData.append("fatherEmail", form.fatherEmail);
      formData.append("motherName", form.motherName);
      formData.append("motherMobile", form.motherMobile);
      formData.append("motherEmail", form.motherEmail);

      if (steps.ssc) {
        formData.append("sscSchoolName", form.sscSchoolName);
        formData.append("sscBoard", form.sscBoard);
        formData.append("sscPassingYear", form.sscPassingYear);
        formData.append("sscPercentage", form.sscPercentage);
        formData.append("sscRollNumber", form.sscRollNumber);
      }
      if (steps.hsc) {
        formData.append("hscSchoolName", form.hscSchoolName);
        formData.append("hscBoard", form.hscBoard);
        formData.append("hscStream", form.hscStream);
        formData.append("hscPassingYear", form.hscPassingYear);
        formData.append("hscPercentage", form.hscPercentage);
        formData.append("hscRollNumber", form.hscRollNumber);
      }

      formData.append("department_id", form.department_id);
      formData.append("course_id", form.course_id);
      formData.append("admissionYear", form.admissionYear);
      formData.append("currentSemester", "1");

      const fieldMap = {
        "10th_marksheet": "sscMarksheet",
        "12th_marksheet": "hscMarksheet",
        passport_photo: "passportPhoto",
        category_certificate: "categoryCertificate",
        income_certificate: "incomeCertificate",
        character_certificate: "characterCertificate",
        transfer_certificate: "transferCertificate",
        aadhar_card: "aadharCard",
        entrance_exam_score: "entranceExamScore",
        migration_certificate: "migrationCertificate",
        domicile_certificate: "domicileCertificate",
        caste_certificate: "casteCertificate",
        non_creamy_layer_certificate: "nonCreamyLayerCertificate",
        physically_challenged_certificate: "physicallyChallengedCertificate",
        sports_quota_certificate: "sportsQuotaCertificate",
        nri_sponsor_certificate: "nriSponsorCertificate",
        gap_certificate: "gapCertificate",
        affidavit: "affidavit",
      };
      documentConfig.forEach((doc) => {
        if (form[doc.type])
          formData.append(fieldMap[doc.type] || doc.type, form[doc.type]);
      });

      const response = await publicApi.post(
        `/students/register/${collegeCode}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setSuccess(
        response.data.message ||
          "🎉 Registration successful! Wait for college approval.",
      );
      setError("");

      setTimeout(() => {
        setForm({
          fullName: "",
          email: "",
          password: "",
          mobileNumber: "",
          gender: "",
          dateOfBirth: "",
          category: "GEN",
          bloodGroup: "",
          religion: "",
          nationality: "Indian",
          hasDisability: "no",
          disabilityType: "",
          pwdDisability: "",
          fatherName: "",
          fatherMobile: "",
          fatherEmail: "",
          motherName: "",
          motherMobile: "",
          motherEmail: "",
          addressLine: "",
          city: "",
          state: "",
          pincode: "",
          sscSchoolName: "",
          sscBoard: "",
          sscPassingYear: "",
          sscPercentage: "",
          sscRollNumber: "",
          hscSchoolName: "",
          hscBoard: "",
          hscStream: "",
          hscPassingYear: "",
          hscPercentage: "",
          hscRollNumber: "",
          department_id: "",
          course_id: "",
          admissionYear: new Date().getFullYear(),
        });
        setCurrentStep(1);
        window.scrollTo(0, 0);
      }, 100);
    } catch (err) {
      let errorMessage = "Registration failed";
      if (
        err.response?.data?.errors &&
        Array.isArray(err.response.data.errors)
      ) {
        const v = err.response.data.errors[0];
        errorMessage = `${v.field}: ${v.message}`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      alert("❌ Registration Failed:\n\n" + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step labels ── */
  const getStepItems = () => {
    const steps = getStepNumbers();
    const items = [
      { num: 1, title: "Personal", icon: "👤" },
      { num: 2, title: "Parents", icon: "👨‍👩‍👦" },
      { num: 3, title: "Address", icon: "📍" },
    ];
    if (steps.ssc) items.push({ num: steps.ssc, title: "10th", icon: "📋" });
    if (steps.hsc) items.push({ num: steps.hsc, title: "12th", icon: "📋" });
    items.push({ num: steps.course, title: "Course", icon: "🎓" });
    items.push({ num: steps.documents, title: "Docs", icon: "📁" });
    return items;
  };

  /* ══════════════════════════════════════
     STEP RENDERS
  ══════════════════════════════════════ */

  const renderPersonalInfo = () => (
    <div className="sr-step-body">
      <div className="sr-section-head">
        <div className="sr-section-icon">👤</div>
        <div>
          <h3 className="sr-section-title">Personal Information</h3>
          <p className="sr-section-sub">Fill in your basic personal details</p>
        </div>
      </div>
      <div className="sr-grid sr-grid--2">
        <div className="sr-field">
          <label className="sr-label">
            Full Name <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.fullName ? "sr-input--error" : ""}`}
            name="fullName"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          {errors.fullName && <div className="sr-field-error">{errors.fullName}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Email Address <span className="sr-req">*</span>
          </label>
          <input
            type="email"
            className={`sr-input ${errors.email ? "sr-input--error" : ""}`}
            name="email"
            placeholder="your.email@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          {errors.email && <div className="sr-field-error">{errors.email}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Password <span className="sr-req">*</span>
          </label>
          <div className="sr-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              className={`sr-input sr-input--password ${errors.password ? "sr-input--error" : ""}`}
              name="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="sr-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <div className="sr-field-error">{errors.password}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mobile Number <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.mobileNumber ? "sr-input--error" : ""}`}
            name="mobileNumber"
            placeholder="10-digit mobile number"
            value={form.mobileNumber}
            onChange={handleChange}
            maxLength="10"
            required
          />
          {errors.mobileNumber && <div className="sr-field-error">{errors.mobileNumber}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Gender <span className="sr-req">*</span>
          </label>
          <select
            className={`sr-select ${errors.gender ? "sr-select--error" : ""}`}
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <div className="sr-field-error">{errors.gender}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Date of Birth <span className="sr-req">*</span>
          </label>
          <input
            type="date"
            className={`sr-input ${errors.dateOfBirth ? "sr-input--error" : ""}`}
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={handleChange}
            required
          />
          {errors.dateOfBirth && <div className="sr-field-error">{errors.dateOfBirth}</div>}
        </div>
        <div className="sr-field sr-field--full">
          <label className="sr-label">
            Category <span className="sr-req">*</span>
          </label>
          <select
            className={`sr-select ${errors.category ? "sr-select--error" : ""}`}
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            <option value="GEN">General (GEN)</option>
            <option value="OBC">Other Backward Classes (OBC)</option>
            <option value="SC">Scheduled Caste (SC)</option>
            <option value="ST">Scheduled Tribe (ST)</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.category && <div className="sr-field-error">{errors.category}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">Blood Group</label>
          <select
            className={`sr-select ${errors.bloodGroup ? "sr-select--error" : ""}`}
            name="bloodGroup"
            value={form.bloodGroup}
            onChange={handleChange}
          >
            <option value="">Select Blood Group</option>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          {errors.bloodGroup && <div className="sr-field-error">{errors.bloodGroup}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">Religion</label>
          <input
            className={`sr-input ${errors.religion ? "sr-input--error" : ""}`}
            name="religion"
            placeholder="e.g. Hindu, Muslim, Christian"
            value={form.religion}
            onChange={handleChange}
          />
          {errors.religion && <div className="sr-field-error">{errors.religion}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">Nationality</label>
          <input
            className={`sr-input ${errors.nationality ? "sr-input--error" : ""}`}
            name="nationality"
            placeholder="e.g. Indian"
            value={form.nationality || "Indian"}
            onChange={handleChange}
          />
          {errors.nationality && <div className="sr-field-error">{errors.nationality}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">Disability</label>
          <select
            className="sr-select"
            name="hasDisability"
            value={form.hasDisability}
            onChange={handleChange}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        {form.hasDisability === "yes" && (
          <>
            <div className="sr-field">
              <label className="sr-label">Disability Type <span className="sr-req">*</span></label>
              <select
                className={`sr-select ${errors.disabilityType ? "sr-select--error" : ""}`}
                name="disabilityType"
                value={form.disabilityType}
                onChange={handleChange}
                required
              >
                <option value="">— Select Type —</option>
                <option value="Visual">Visual Impairment</option>
                <option value="Hearing">Hearing Impairment</option>
                <option value="Locomotor">Locomotor Disability</option>
                <option value="Intellectual">Intellectual Disability</option>
                <option value="Mental">Mental Illness</option>
                <option value="Multiple">Multiple Disabilities</option>
                <option value="Other">Other</option>
              </select>
              {errors.disabilityType && <div className="sr-field-error">{errors.disabilityType}</div>}
            </div>
            <div className="sr-field">
              <label className="sr-label">Disability Percentage (%)</label>
              <input
                className={`sr-input ${errors.pwdDisability ? "sr-input--error" : ""}`}
                name="pwdDisability"
                placeholder="e.g. 40"
                value={form.pwdDisability}
                onChange={handleChange}
                type="number"
                min="1"
                max="100"
              />
              {errors.pwdDisability && <div className="sr-field-error">{errors.pwdDisability}</div>}
            </div>
            <div className="sr-field sr-field--full">
              <label className="sr-label">Disability Certificate <span className="sr-req">*</span></label>
              <div className={`sr-upload-box ${form.disabilityCertificate ? "sr-upload-box--filled" : ""}`}>
                <input
                  type="file"
                  name="disabilityCertificate"
                  accept={getAcceptAttribute(
                    documentConfig?.find((doc) => doc.type === "physically_challenged_certificate")?.allowedFormats || ["pdf", "jpg", "jpeg", "png"]
                  )}
                  className="sr-upload-input"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const disabilityDocConfig = documentConfig?.find(
                      (doc) => doc.type === "physically_challenged_certificate"
                    );
                    const allowedFormats = disabilityDocConfig?.allowedFormats || ["pdf", "jpg", "jpeg", "png"];
                    const fileValidation = validateFileObject(file, allowedFormats);
                    if (!fileValidation.valid) {
                      alert(`Disability certificate: ${fileValidation.error}`);
                      e.target.value = "";
                      return;
                    }
                    const maxSize = ((disabilityDocConfig?.maxFileSize || 5)) * 1024 * 1024;
                    if (file.size > maxSize) {
                      alert(`Disability certificate must be less than ${disabilityDocConfig?.maxFileSize || 5}MB`);
                      e.target.value = "";
                      return;
                    }
                    setForm((p) => ({ ...p, disabilityCertificate: file }));
                  }}
                  required
                />
                <div className="sr-upload-overlay">
                  <FaUpload className="sr-upload-icon" />
                  <span className="sr-upload-hint">
                    {getAcceptAttribute(
                      documentConfig?.find((doc) => doc.type === "physically_challenged_certificate")?.allowedFormats || ["pdf", "jpg", "jpeg", "png"]
                    ).replace(/\./g, "").toUpperCase().replace(/,/g, ", ")} — max 5MB
                  </span>
                </div>
                {form.disabilityCertificate && (
                  <div className="sr-upload-preview">
                    <FaCheckCircle />
                    <span>{form.disabilityCertificate.name}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderParentDetails = () => (
    <div className="sr-step-body">
      <div className="sr-section-head">
        <div className="sr-section-icon">👨‍👩‍👦</div>
        <div>
          <h3 className="sr-section-title">Parent / Guardian Information</h3>
          <p className="sr-section-sub">
            Provide your parent or guardian contact details
          </p>
        </div>
      </div>
      <div className="sr-grid sr-grid--2">
        <div className="sr-field">
          <label className="sr-label">
            Father's Name <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.fatherName ? "sr-input--error" : ""}`}
            name="fatherName"
            placeholder="Enter father's full name"
            value={form.fatherName}
            onChange={handleChange}
            required
          />
          {errors.fatherName && <div className="sr-field-error">{errors.fatherName}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Father's Mobile <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.fatherMobile ? "sr-input--error" : ""}`}
            name="fatherMobile"
            placeholder="10-digit mobile number"
            value={form.fatherMobile}
            onChange={handleChange}
            maxLength="10"
            required
          />
          {errors.fatherMobile && <div className="sr-field-error">{errors.fatherMobile}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Father's Email
          </label>
          <input
            type="email"
            className={`sr-input ${errors.fatherEmail ? "sr-input--error" : ""}`}
            name="fatherEmail"
            placeholder="father.email@example.com"
            value={form.fatherEmail}
            onChange={handleChange}
          />
          {errors.fatherEmail && <div className="sr-field-error">{errors.fatherEmail}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mother's Name <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.motherName ? "sr-input--error" : ""}`}
            name="motherName"
            placeholder="Enter mother's full name"
            value={form.motherName}
            onChange={handleChange}
            required
          />
          {errors.motherName && <div className="sr-field-error">{errors.motherName}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mother's Mobile <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.motherMobile ? "sr-input--error" : ""}`}
            name="motherMobile"
            placeholder="10-digit mobile number"
            value={form.motherMobile}
            onChange={handleChange}
            maxLength="10"
            required
          />
          {errors.motherMobile && <div className="sr-field-error">{errors.motherMobile}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mother's Email
          </label>
          <input
            type="email"
            className={`sr-input ${errors.motherEmail ? "sr-input--error" : ""}`}
            name="motherEmail"
            placeholder="mother.email@example.com"
            value={form.motherEmail}
            onChange={handleChange}
          />
          {errors.motherEmail && <div className="sr-field-error">{errors.motherEmail}</div>}
        </div>
      </div>
    </div>
  );

  const renderAddressDetails = () => (
    <div className="sr-step-body">
      <div className="sr-section-head">
        <div className="sr-section-icon">📍</div>
        <div>
          <h3 className="sr-section-title">Address Details</h3>
          <p className="sr-section-sub">
            This address will be used for official correspondence
          </p>
        </div>
      </div>
      <div className="sr-grid sr-grid--2">
        <div className="sr-field sr-field--full">
          <label className="sr-label">
            Address Line <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.addressLine ? "sr-input--error" : ""}`}
            name="addressLine"
            placeholder="House/Flat No., Building, Street, Landmark"
            value={form.addressLine}
            onChange={handleChange}
            required
          />
          {errors.addressLine && <div className="sr-field-error">{errors.addressLine}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            City <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.city ? "sr-input--error" : ""}`}
            name="city"
            placeholder="Enter your city"
            value={form.city}
            onChange={handleChange}
            required
          />
          {errors.city && <div className="sr-field-error">{errors.city}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            State <span className="sr-req">*</span>
          </label>
          <input
            className={`sr-input ${errors.state ? "sr-input--error" : ""}`}
            name="state"
            placeholder="Enter your state"
            value={form.state}
            onChange={handleChange}
            required
          />
          {errors.state && <div className="sr-field-error">{errors.state}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Pincode <span className="sr-req">*</span>
          </label>
          <input
            type="text"
            className={`sr-input ${errors.pincode ? "sr-input--error" : ""}`}
            name="pincode"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={handleChange}
            maxLength="6"
            pattern="\d{6}"
            required
          />
          {errors.pincode && <div className="sr-field-error">{errors.pincode}</div>}
        </div>
      </div>
    </div>
  );

  const render10thDetails = () => {
    if (!isDocEnabled("10th_marksheet"))
      return (
        <div className="sr-step-body">
          <div className="sr-info-banner">
            <FaInfoCircle />
            <span>
              10th academic details are not required for this college.
            </span>
          </div>
        </div>
      );
    return (
      <div className="sr-step-body">
        <div className="sr-section-head">
          <div className="sr-section-icon">📋</div>
          <div>
            <h3 className="sr-section-title">10th (SSC) Academic Details</h3>
            <p className="sr-section-sub">
              Your Secondary School Certificate information
            </p>
          </div>
        </div>
        <div className="sr-grid sr-grid--2">
          <div className="sr-field">
            <label className="sr-label">
              School Name <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.sscSchoolName ? "sr-input--error" : ""}`}
              name="sscSchoolName"
              placeholder="Enter your 10th school name"
              value={form.sscSchoolName}
              onChange={handleChange}
              required
            />
            {errors.sscSchoolName && <div className="sr-field-error">{errors.sscSchoolName}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Board <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.sscBoard ? "sr-input--error" : ""}`}
              name="sscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.sscBoard}
              onChange={handleChange}
              required
            />
            {errors.sscBoard && <div className="sr-field-error">{errors.sscBoard}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Passing Year <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              className={`sr-input ${errors.sscPassingYear ? "sr-input--error" : ""}`}
              name="sscPassingYear"
              placeholder="YYYY"
              value={form.sscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
            {errors.sscPassingYear && <div className="sr-field-error">{errors.sscPassingYear}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Percentage / CGPA <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className={`sr-input ${errors.sscPercentage ? "sr-input--error" : ""}`}
              name="sscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.sscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
            {errors.sscPercentage && <div className="sr-field-error">{errors.sscPercentage}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Roll Number <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.sscRollNumber ? "sr-input--error" : ""}`}
              name="sscRollNumber"
              placeholder="Enter your 10th roll number"
              value={form.sscRollNumber}
              onChange={handleChange}
              required
            />
            {errors.sscRollNumber && <div className="sr-field-error">{errors.sscRollNumber}</div>}
          </div>
        </div>
      </div>
    );
  };

  const render12thDetails = () => {
    if (!isDocEnabled("12th_marksheet"))
      return (
        <div className="sr-step-body">
          <div className="sr-info-banner">
            <FaInfoCircle />
            <span>
              12th academic details are not required for this college.
            </span>
          </div>
        </div>
      );
    return (
      <div className="sr-step-body">
        <div className="sr-section-head">
          <div className="sr-section-icon">📋</div>
          <div>
            <h3 className="sr-section-title">12th (HSC) Academic Details</h3>
            <p className="sr-section-sub">
              Your Higher Secondary Certificate information
            </p>
          </div>
        </div>
        <div className="sr-grid sr-grid--2">
          <div className="sr-field">
            <label className="sr-label">
              School / College Name <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.hscSchoolName ? "sr-input--error" : ""}`}
              name="hscSchoolName"
              placeholder="Enter your 12th school/college name"
              value={form.hscSchoolName}
              onChange={handleChange}
              required
            />
            {errors.hscSchoolName && <div className="sr-field-error">{errors.hscSchoolName}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Board <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.hscBoard ? "sr-input--error" : ""}`}
              name="hscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.hscBoard}
              onChange={handleChange}
              required
            />
            {errors.hscBoard && <div className="sr-field-error">{errors.hscBoard}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Stream <span className="sr-req">*</span>
            </label>
            <select
              className={`sr-select ${errors.hscStream ? "sr-select--error" : ""}`}
              name="hscStream"
              value={form.hscStream}
              onChange={handleChange}
              required
            >
              <option value="">Select Stream</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="Vocational">Vocational</option>
              <option value="Other">Other</option>
            </select>
            {errors.hscStream && <div className="sr-field-error">{errors.hscStream}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Passing Year <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              className={`sr-input ${errors.hscPassingYear ? "sr-input--error" : ""}`}
              name="hscPassingYear"
              placeholder="YYYY"
              value={form.hscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
            {errors.hscPassingYear && <div className="sr-field-error">{errors.hscPassingYear}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Percentage / CGPA <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className={`sr-input ${errors.hscPercentage ? "sr-input--error" : ""}`}
              name="hscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.hscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
            {errors.hscPercentage && <div className="sr-field-error">{errors.hscPercentage}</div>}
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Roll Number <span className="sr-req">*</span>
            </label>
            <input
              className={`sr-input ${errors.hscRollNumber ? "sr-input--error" : ""}`}
              name="hscRollNumber"
              placeholder="Enter your 12th roll number"
              value={form.hscRollNumber}
              onChange={handleChange}
              required
            />
            {errors.hscRollNumber && <div className="sr-field-error">{errors.hscRollNumber}</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderCourseSelection = () => (
    <div className="sr-step-body">
      <div className="sr-section-head">
        <div className="sr-section-icon">🎓</div>
        <div>
          <h3 className="sr-section-title">Course & Department</h3>
          <p className="sr-section-sub">
            Select your desired department and course
          </p>
        </div>
      </div>
      <div className="sr-grid sr-grid--2">
        <div className="sr-field">
          <label className="sr-label">
            Department <span className="sr-req">*</span>
          </label>
          <select
            className={`sr-select ${errors.department_id ? "sr-select--error" : ""}`}
            name="department_id"
            value={form.department_id}
            onChange={handleChange}
            required
          >
            <option value="">— Select Department —</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.department_id && <div className="sr-field-error">{errors.department_id}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Course <span className="sr-req">*</span>
          </label>
          <select
            className={`sr-select ${errors.course_id ? "sr-select--error" : ""}`}
            name="course_id"
            value={form.course_id}
            onChange={handleChange}
            required
            disabled={!form.department_id}
          >
            <option value="">
              {!form.department_id
                ? "Select department first"
                : "— Select Course —"}
            </option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.course_id && <div className="sr-field-error">{errors.course_id}</div>}
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Admission Year <span className="sr-req">*</span>
          </label>
          <input
            type="number"
            className={`sr-input ${errors.admissionYear ? "sr-input--error" : ""}`}
            name="admissionYear"
            value={form.admissionYear}
            onChange={handleChange}
            min="1900"
            max="2100"
            required
          />
          {errors.admissionYear && <div className="sr-field-error">{errors.admissionYear}</div>}
        </div>
      </div>
      {form.course_id && (
        <div className="sr-info-banner sr-info-banner--success">
          <FaCheckCircle />
          <span>
            <strong>Selected:</strong>{" "}
            {courses.find((c) => c._id === form.course_id)?.name || ""}
            {departments.find((d) => d._id === form.department_id)?.name &&
              ` — ${departments.find((d) => d._id === form.department_id)?.name}`}
          </span>
        </div>
      )}
    </div>
  );

  const renderDocumentUpload = () => {
    if (configLoading)
      return (
        <div className="sr-step-body sr-step-body--center">
          <div className="sr-loader-wrap">
            <div className="sr-loader" />
            <p>Loading document requirements…</p>
          </div>
        </div>
      );

    if (!documentConfig || documentConfig.length === 0)
      return (
        <div className="sr-step-body">
          <div className="sr-warn-banner">
            <FaExclamationTriangle />
            <div>
              <strong>No Documents Required</strong>
              <p>This college has not configured document requirements yet.</p>
            </div>
          </div>
        </div>
      );

    const filteredDocs = documentConfig.filter((doc) => {
      if (doc.type === "category_certificate")
        return doc.enabled && form.category !== "GEN";
      return doc.enabled;
    });

    return (
      <div className="sr-step-body">
        <div className="sr-section-head">
          <div className="sr-section-icon">📁</div>
          <div>
            <h3 className="sr-section-title">Document Upload</h3>
            <p className="sr-section-sub">
              Upload required documents (max 5MB each unless specified)
            </p>
          </div>
        </div>
        <div className="sr-grid sr-grid--2">
          {filteredDocs.map((doc) => (
            <div className="sr-field" key={doc.type}>
              <label className="sr-label">
                {doc.label}
                {doc.mandatory && <span className="sr-req"> *</span>}
              </label>
              <div
                className={`sr-upload-box ${form[doc.type] ? "sr-upload-box--filled" : ""}`}
              >
                <input
                  type="file"
                  name={doc.type}
                  accept={getAcceptAttribute(doc.allowedFormats)}
                  onChange={handleFileChange}
                  className="sr-upload-input"
                  required={
                    doc.mandatory &&
                    (doc.type !== "category_certificate" ||
                      form.category !== "GEN")
                  }
                />
                <div className="sr-upload-overlay">
                  <FaUpload className="sr-upload-icon" />
                  <span className="sr-upload-hint">
                    {getAcceptAttribute(doc.allowedFormats).replace(/\./g, "").toUpperCase().replace(/,/g, ", ")}
                  </span>
                  {doc.description && (
                    <span className="sr-upload-desc">{doc.description}</span>
                  )}
                </div>
                {form[doc.type] && (
                  <div className="sr-upload-preview">
                    <FaCheckCircle />
                    <span>{form[doc.type].name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {form.category === "GEN" &&
            documentConfig.some(
              (doc) => doc.type === "category_certificate" && doc.enabled,
            ) && (
              <div className="sr-field sr-field--full">
                <div className="sr-info-banner">
                  <FaInfoCircle />
                  <span>
                    Category Certificate not required for General (GEN) category
                    students.
                  </span>
                </div>
              </div>
            )}
        </div>
        <div className="sr-warn-banner sr-warn-banner--soft">
          <FaExclamationTriangle />
          <div>
            <strong>Important:</strong> Admin will verify that marks match
            uploaded marksheets, eligibility criteria, and document validity.
          </div>
        </div>
      </div>
    );
  };

  /* ── Render current step content ── */
  const renderCurrentStep = () => {
    const steps = getStepNumbers();
    if (currentStep === steps.personal) return renderPersonalInfo();
    if (currentStep === steps.parent) return renderParentDetails();
    if (currentStep === steps.address) return renderAddressDetails();
    if (currentStep === steps.ssc) return render10thDetails();
    if (currentStep === steps.hsc) return render12thDetails();
    if (currentStep === steps.course) return renderCourseSelection();
    if (currentStep === steps.documents) return renderDocumentUpload();
    return null;
  };

  if (!collegeCode)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "Sora,sans-serif",
          color: "#1a2e3b",
        }}
      >
        <h3>Invalid Registration Link</h3>
      </div>
    );

  const stepItems = getStepItems();
  const steps = getStepNumbers();
  const progressPct = Math.round((currentStep / steps.total) * 100);

  return (
    <div className="sr-root">
      {/* Background */}
      <div className="sr-bg">
        <div className="sr-bg__mesh" />
        <div className="sr-bg__orb sr-bg__orb--1" />
        <div className="sr-bg__orb sr-bg__orb--2" />
        <div className="sr-bg__grid" />
      </div>

      {/* Particles */}
      <div className="sr-particles">
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className={`sr-particle sr-particle--${i % 4}`}
            style={{
              left: `${i * 12 + 5}%`,
              top: `${(i * 11 + 8) % 88}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${5 + (i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* ── Outer wrapper ── */}
      <div className="sr-wrapper">
        {/* ── Header Card ── */}
        <motion.div
          className="sr-header-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="sr-header-left">
            <div className="sr-header-logo">
              <FaUniversity size={22} />
            </div>
            <div>
              <p className="sr-header-eyebrow">SMART COLLEGE PORTAL</p>
              <h1 className="sr-header-title">{collegeName || "NOVAA"}</h1>
            </div>
          </div>
          <div className="sr-header-right">
            <span className="sr-code-badge">{collegeCode}</span>
            {collegeName && (
              <span className="sr-name-badge">{collegeName}</span>
            )}
          </div>
        </motion.div>

        {/* ── Main Card ── */}
        <motion.div
          className="sr-main-card"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Stepper */}
          <div className="sr-stepper">
            <div className="sr-stepper__track">
              {stepItems.map((item, idx) => (
                <div
                  key={item.num}
                  className={`sr-step-item ${currentStep === item.num ? "sr-step-item--active" : ""} ${currentStep > item.num ? "sr-step-item--done" : ""}`}
                >
                  <div className="sr-step-bubble">
                    {currentStep > item.num ? (
                      <FaCheckCircle size={14} />
                    ) : (
                      <span className="sr-step-num">{item.num}</span>
                    )}
                  </div>
                  <span className="sr-step-label">{item.title}</span>
                  {idx < stepItems.length - 1 && (
                    <div
                      className={`sr-step-connector ${currentStep > item.num ? "sr-step-connector--done" : ""}`}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="sr-progress-bar">
              <div
                className="sr-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="sr-progress-label">
              <span>
                Step {currentStep} of {steps.total}
              </span>
              <span>{progressPct}% complete</span>
            </div>
          </div>

          {/* Divider */}
          <div className="sr-divider">
            <div className="sr-divider__track">
              <div className="sr-divider__fill" />
            </div>
            <div className="sr-divider__badge">
              <FaShieldAlt size={9} />
              <span>SECURE REGISTRATION</span>
            </div>
            <div className="sr-divider__track">
              <div className="sr-divider__fill sr-divider__fill--rev" />
            </div>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="err"
                className="sr-alert sr-alert--error"
                initial={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  maxHeight: 100,
                  marginBottom: "1rem",
                }}
                exit={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden" }}
              >
                <FaExclamationCircle className="sr-alert__icon" />
                <span>{error}</span>
                <button
                  className="sr-alert__close"
                  onClick={() => setError("")}
                >
                  <FaTimes />
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div
                key="ok"
                className="sr-alert sr-alert--success"
                initial={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  maxHeight: 100,
                  marginBottom: "1rem",
                }}
                exit={{ opacity: 0, y: -10, maxHeight: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden" }}
              >
                <FaCheckCircle className="sr-alert__icon" />
                <span>{success}</span>
                <button
                  className="sr-alert__close"
                  onClick={() => setSuccess("")}
                >
                  <FaTimes />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form content */}
          <form onSubmit={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="sr-nav">
              <button
                type="button"
                className="sr-btn-prev"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <FaChevronLeft />
                <span>Previous</span>
              </button>

              {currentStep < steps.total ? (
                <button
                  type="button"
                  className="sr-btn-next"
                  onClick={handleNext}
                >
                  <span>Next</span>
                  <FaChevronRight />
                </button>
              ) : (
                <button
                  type="button"
                  className="sr-btn-submit"
                  onClick={handleRegisterClick}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="sr-spinner" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Submit Registration</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Footer note */}
          <div className="sr-footer-note">
            <span className="sr-security-badge">
              <span className="sr-security-dot" />
              Secured by NOVAA
            </span>
            <span className="sr-footer-text">
              After registration, your application will be reviewed by the
              college admin.
            </span>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        title="Confirm Registration"
        message="Are you sure you want to submit your registration?
        Once submitted, your application will be sent for verification and some information may not be editable."
        type="warning"
        confirmText="Submit Registration"
        cancelText="Cancel"
        isLoading={loading}
      />

      {/* ════════════════════════════════
          STYLES
      ════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ocean-900: #060e17; --ocean-600: #0f3a4a; --ocean-500: #0c2d3a;
          --cyan-500: #1a8ab5; --cyan-400: #3db5e6; --cyan-300: #4fc3f7;
          --cyan-200: #80d8ff; --cyan-glow: rgba(61,181,230,0.35);
          --success: #10b981; --error: #ef4444;
          --font: 'Sora', sans-serif; --mono: 'JetBrains Mono', monospace;
          --rp-bg: #f7fbfd; --rp-text: #1a2e3b; --rp-sub: #5c7a8a;
          --rp-label: #4a6577; --rp-input-bg: #edf6fb;
          --rp-input-border: #cce8f4; --rp-input-focus-bg: #e2f3fb;
          --rp-footer-border: #d6edf8; --rp-muted: #8da8b8;
          --border: rgba(61,181,230,.22);
        }

        .sr-root {
          min-height: 100vh; font-family: var(--font);
          position: relative; overflow-x: hidden;
        }

        /* Background */
        .sr-bg { position: fixed; inset: 0; z-index: 0; background: linear-gradient(145deg, #e8f6fd 0%, #dff1fa 40%, #cce8f6 100%); }
        .sr-bg__mesh { position:absolute; inset:0; background: radial-gradient(ellipse 70% 55% at 15% 15%, rgba(61,181,230,.15) 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 85% 85%, rgba(79,195,247,.12) 0%, transparent 55%); }
        .sr-bg__orb { position:absolute; border-radius:50%; filter:blur(80px); animation: srOrbFloat 24s ease-in-out infinite; }
        .sr-bg__orb--1 { width:600px; height:600px; top:-200px; left:-150px; background:radial-gradient(circle, rgba(61,181,230,.2) 0%, transparent 65%); }
        .sr-bg__orb--2 { width:500px; height:500px; bottom:-150px; right:-100px; background:radial-gradient(circle, rgba(79,195,247,.16) 0%, transparent 65%); animation-delay:10s; }
        @keyframes srOrbFloat { 0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(20px,-15px) scale(1.03);}66%{transform:translate(-15px,18px) scale(.97);} }
        .sr-bg__grid { position:absolute; inset:0; background-image:linear-gradient(rgba(61,181,230,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(61,181,230,.06) 1px, transparent 1px); background-size:48px 48px; mask-image:radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%); }

        .sr-particles { position:fixed; inset:0; z-index:1; pointer-events:none; overflow:hidden; }
        .sr-particle { position:absolute; border-radius:50%; animation:srParticleDrift 5s ease-in-out infinite; opacity:0; }
        .sr-particle--0 { width:3px; height:3px; background:var(--cyan-400); }
        .sr-particle--1 { width:2px; height:2px; background:var(--cyan-300); }
        .sr-particle--2 { width:4px; height:4px; background:rgba(61,181,230,.5); }
        .sr-particle--3 { width:2px; height:2px; background:var(--cyan-200); }
        @keyframes srParticleDrift { 0%,100%{opacity:0;transform:translateY(0) scale(.5);}30%,70%{opacity:.6;}50%{transform:translateY(-32px) scale(1);opacity:.4;} }

        /* Wrapper */
        .sr-wrapper { position:relative; z-index:2; max-width:1000px; margin:0 auto; padding:1.5rem 1.25rem 3rem; }

        /* Header Card */
        .sr-header-card {
          display:flex; align-items:center; justify-content:space-between;
          padding:1rem 1.5rem; border-radius:16px;
          background:linear-gradient(155deg, #0f3a4a 0%, #0a2233 55%, #060e17 100%);
          border:1px solid rgba(61,181,230,.25); margin-bottom:1.25rem;
          box-shadow:0 8px 32px rgba(0,0,0,.2), 0 0 0 1px rgba(255,255,255,.04), inset 0 1px 0 rgba(255,255,255,.06);
          flex-wrap:wrap; gap:.75rem;
        }
        .sr-header-left { display:flex; align-items:center; gap:.85rem; }
        .sr-header-logo { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, rgba(61,181,230,.2) 0%, rgba(12,45,58,.6) 100%); border:1px solid rgba(61,181,230,.35); display:flex; align-items:center; justify-content:center; color:var(--cyan-400); flex-shrink:0; box-shadow:0 4px 16px rgba(0,0,0,.3); }
        .sr-header-eyebrow { font-family:var(--mono); font-size:.58rem; letter-spacing:.18em; color:var(--cyan-400); opacity:.85; }
        .sr-header-title { font-size:1.15rem; font-weight:700; color:#fff; letter-spacing:-.3px; }
        .sr-header-right { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
        .sr-code-badge { font-family:var(--mono); font-size:.68rem; font-weight:600; padding:.3rem .7rem; border-radius:100px; background:rgba(61,181,230,.15); border:1px solid rgba(61,181,230,.3); color:var(--cyan-300); letter-spacing:.06em; }
        .sr-name-badge { font-family:var(--mono); font-size:.68rem; font-weight:600; padding:.3rem .7rem; border-radius:100px; background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.3); color:#34d399; letter-spacing:.04em; }

        /* Main Card */
        .sr-main-card {
          background:var(--rp-bg); border-radius:20px;
          border:1px solid var(--border);
          box-shadow:0 0 0 1px rgba(255,255,255,.7), 0 20px 50px rgba(26,138,181,.12), 0 0 60px rgba(61,181,230,.06), inset 0 1px 0 rgba(255,255,255,.9);
          padding:1.75rem 2rem;
          position:relative; overflow:hidden;
        }
        .sr-main-card::before { content:''; position:absolute; top:-80px; right:-80px; width:250px; height:250px; border-radius:50%; background:radial-gradient(circle, rgba(61,181,230,.07) 0%, transparent 65%); filter:blur(30px); pointer-events:none; }

        /* Stepper */
        .sr-stepper { margin-bottom:1.25rem; }
        .sr-stepper__track { display:flex; align-items:flex-start; gap:0; overflow-x:auto; padding-bottom:.5rem; -webkit-overflow-scrolling:touch; }
        .sr-stepper__track::-webkit-scrollbar { height:3px; }
        .sr-stepper__track::-webkit-scrollbar-track { background:transparent; }
        .sr-stepper__track::-webkit-scrollbar-thumb { background:rgba(61,181,230,.3); border-radius:2px; }

        .sr-step-item { display:flex; flex-direction:column; align-items:center; position:relative; flex-shrink:0; }
        .sr-step-bubble { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.8rem; transition:all .3s ease; background:#e2eef5; color:var(--rp-muted); border:2px solid #d0e8f2; font-weight:600; z-index:1; }
        .sr-step-item--active .sr-step-bubble { background:linear-gradient(135deg, var(--cyan-400), var(--cyan-500)); color:#fff; border-color:var(--cyan-400); box-shadow:0 4px 14px rgba(61,181,230,.4); }
        .sr-step-item--done .sr-step-bubble { background:#10b981; color:#fff; border-color:#10b981; box-shadow:0 3px 10px rgba(16,185,129,.3); }
        .sr-step-num { font-family:var(--mono); font-size:.75rem; font-weight:700; }
        .sr-step-label { font-size:.65rem; font-weight:500; color:var(--rp-muted); margin-top:.35rem; text-align:center; white-space:nowrap; transition:color .3s ease; }
        .sr-step-item--active .sr-step-label { color:var(--cyan-500); font-weight:600; }
        .sr-step-item--done .sr-step-label { color:#059669; }

        .sr-step-connector { position:absolute; top:17px; left:calc(100% - 0px); width:calc(100% + 0px); height:2px; background:#d0e8f2; z-index:0; min-width:24px; }
        .sr-step-connector--done { background:linear-gradient(90deg, #10b981, #34d399); }

        /* Dynamic connector widths per step count */
        .sr-step-item { min-width:52px; }
        .sr-step-connector { width:28px; }

        .sr-progress-bar { height:4px; border-radius:4px; background:#deeef6; margin-top:.75rem; overflow:hidden; }
        .sr-progress-fill { height:100%; border-radius:4px; background:linear-gradient(90deg, var(--cyan-400), var(--cyan-300)); transition:width .5s ease; box-shadow:0 0 8px rgba(61,181,230,.4); }
        .sr-progress-label { display:flex; justify-content:space-between; margin-top:.35rem; font-family:var(--mono); font-size:.62rem; color:var(--rp-muted); }

        /* Divider */
        .sr-divider { display:flex; align-items:center; gap:8px; margin:.9rem 0 1.1rem; }
        .sr-divider__track { flex:1; height:1.5px; background:rgba(61,181,230,.18); border-radius:2px; overflow:hidden; position:relative; }
        .sr-divider__fill { position:absolute; top:0; left:0; height:100%; width:55%; background:linear-gradient(90deg, transparent 0%, var(--cyan-400) 50%, transparent 100%); animation:srDividerShimmer 3.5s ease-in-out infinite; }
        .sr-divider__fill--rev { animation:srDividerShimmerRev 3.5s ease-in-out infinite; }
        @keyframes srDividerShimmer { 0%{transform:translateX(-110%);opacity:0;}20%,80%{opacity:1;}100%{transform:translateX(210%);opacity:0;} }
        @keyframes srDividerShimmerRev { 0%{transform:translateX(210%);opacity:0;}20%,80%{opacity:1;}100%{transform:translateX(-110%);opacity:0;} }
        .sr-divider__badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:100px; background:linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(61,181,230,.04) 100%); border:1px solid rgba(61,181,230,.26); box-shadow:0 2px 8px rgba(61,181,230,.1), inset 0 1px 0 rgba(255,255,255,.8); white-space:nowrap; font-family:var(--mono); font-size:.58rem; font-weight:600; letter-spacing:.14em; color:var(--cyan-500); }

        /* Alerts */
        .sr-alert { display:flex; align-items:flex-start; gap:.65rem; padding:.75rem .9rem; border-radius:10px; font-size:.8rem; font-weight:500; }
        .sr-alert--error { background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.2); color:#dc2626; }
        .sr-alert--success { background:rgba(16,185,129,.07); border:1px solid rgba(16,185,129,.2); color:#059669; }
        .sr-alert__icon { flex-shrink:0; font-size:.95rem; margin-top:1px; }
        .sr-alert__close { margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:.5; transition:opacity .2s; display:flex; align-items:center; padding:2px; flex-shrink:0; }
        .sr-alert__close:hover { opacity:1; }

        /* Step body */
        .sr-step-body { padding:.25rem 0; }
        .sr-step-body--center { display:flex; align-items:center; justify-content:center; min-height:200px; }
        .sr-section-head { display:flex; align-items:center; gap:.85rem; margin-bottom:1.25rem; padding-bottom:.85rem; border-bottom:1px solid rgba(61,181,230,.14); }
        .sr-section-icon { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, rgba(61,181,230,.12) 0%, rgba(61,181,230,.04) 100%); border:1px solid rgba(61,181,230,.22); display:flex; align-items:center; justify-content:center; font-size:1.25rem; flex-shrink:0; box-shadow:0 3px 10px rgba(61,181,230,.1); }
        .sr-section-title { font-size:1rem; font-weight:700; color:var(--rp-text); letter-spacing:-.2px; }
        .sr-section-sub { font-size:.76rem; color:var(--rp-sub); font-weight:300; margin-top:.15rem; }

        /* Grid */
        .sr-grid { display:grid; gap:1rem 1.25rem; }
        .sr-grid--2 { grid-template-columns:1fr 1fr; }
        .sr-field--full { grid-column:1 / -1; }

        /* Fields */
        .sr-field {}
        .sr-label { display:block; font-size:.68rem; font-weight:600; letter-spacing:.08em; color:var(--rp-label); margin-bottom:.4rem; text-transform:uppercase; }
        .sr-req { color:var(--error); }
        .sr-input { width:100%; padding:.7rem 1rem; background:var(--rp-input-bg); border:1.5px solid var(--rp-input-border); border-radius:10px; font-family:var(--font); font-size:.87rem; color:var(--rp-text); outline:none; transition:all .2s ease; }
        .sr-input::placeholder { color:#9abfcf; }
        .sr-input:hover { background:#e4f2fa; border-color:rgba(61,181,230,.42); }
        .sr-input:focus { background:var(--rp-input-focus-bg); border-color:var(--cyan-400); box-shadow:0 0 0 3px rgba(61,181,230,.11); }
        .sr-input--error { border-color:var(--error) !important; background:rgba(239,68,68,.04) !important; }
        .sr-input--error:focus { box-shadow:0 0 0 3px rgba(239,68,68,.12) !important; }
        .sr-select { width:100%; padding:.7rem 1rem; background:var(--rp-input-bg); border:1.5px solid var(--rp-input-border); border-radius:10px; font-family:var(--font); font-size:.87rem; color:var(--rp-text); outline:none; transition:all .2s ease; appearance:none; cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233db5e6' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 1rem center; padding-right:2.5rem; }
        .sr-select:hover { background-color:#e4f2fa; border-color:rgba(61,181,230,.42); }
        .sr-select:focus { background-color:var(--rp-input-focus-bg); border-color:var(--cyan-400); box-shadow:0 0 0 3px rgba(61,181,230,.11); }
        .sr-select--error { border-color:var(--error) !important; background:rgba(239,68,68,.04) !important; }
        .sr-select--error:focus { box-shadow:0 0 0 3px rgba(239,68,68,.12) !important; }
        .sr-field-error { font-size:.72rem; color:var(--error); margin-top:.3rem; font-weight:500; line-height:1.3; }

        /* Upload */
        .sr-upload-box { position:relative; border:2px dashed var(--rp-input-border); border-radius:10px; background:var(--rp-input-bg); transition:all .2s ease; overflow:hidden; }
        .sr-upload-box:hover { border-color:rgba(61,181,230,.5); background:#e4f2fa; }
        .sr-upload-box--filled { border-color:rgba(16,185,129,.45); border-style:solid; background:rgba(16,185,129,.04); }
        .sr-upload-input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; z-index:2; }
        .sr-upload-overlay { display:flex; flex-direction:column; align-items:center; gap:.35rem; padding:.9rem; text-align:center; }
        .sr-upload-icon { font-size:1.3rem; color:var(--cyan-400); opacity:.65; }
        .sr-upload-hint { font-size:.68rem; font-family:var(--mono); color:var(--rp-muted); letter-spacing:.06em; }
        .sr-upload-desc { font-size:.7rem; color:var(--rp-sub); }
        .sr-upload-preview { display:flex; align-items:center; gap:.4rem; padding:.5rem .75rem; background:rgba(16,185,129,.08); border-top:1px solid rgba(16,185,129,.2); font-size:.74rem; font-weight:600; color:#059669; position:relative; z-index:1; }
        .sr-upload-preview svg { font-size:.85rem; }

        /* Banners */
        .sr-info-banner { display:flex; align-items:flex-start; gap:.65rem; padding:.75rem .9rem; border-radius:10px; background:rgba(61,181,230,.07); border:1px solid rgba(61,181,230,.2); color:var(--cyan-500); font-size:.8rem; margin-bottom:.5rem; margin-top: 16px; }
        .sr-info-banner--success { background:rgba(16,185,129,.07); border-color:rgba(16,185,129,.2); color:#059669; }
        .sr-warn-banner { display:flex; align-items:flex-start; gap:.65rem; padding:.85rem 1rem; border-radius:10px; background:rgba(245,158,11,.07); border:1px solid rgba(245,158,11,.22); color:#b45309; font-size:.8rem; margin-top:1rem; }
        .sr-warn-banner--soft { background:rgba(61,181,230,.05); border-color:rgba(61,181,230,.15); color:var(--rp-sub); }

        /* Loader */
        .sr-loader-wrap { text-align:center; color:var(--rp-sub); font-size:.85rem; display:flex; flex-direction:column; align-items:center; gap:.75rem; }
        .sr-loader { width:32px; height:32px; border:3px solid rgba(61,181,230,.2); border-top-color:var(--cyan-400); border-radius:50%; animation:srSpin .8s linear infinite; }
        @keyframes srSpin { to{transform:rotate(360deg);} }

        /* Navigation */
        .sr-nav { display:flex; align-items:center; justify-content:space-between; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid rgba(61,181,230,.14); gap:1rem; }
        .sr-btn-prev { display:inline-flex; align-items:center; gap:.5rem; padding:.7rem 1.4rem; border-radius:10px; border:1.5px solid var(--rp-input-border); background:transparent; font-family:var(--font); font-size:.85rem; font-weight:600; color:var(--rp-sub); cursor:pointer; transition:all .2s ease; }
        .sr-btn-prev:hover:not(:disabled) { border-color:rgba(61,181,230,.4); color:var(--cyan-500); background:rgba(61,181,230,.06); }
        .sr-btn-prev:disabled { opacity:.4; cursor:not-allowed; }
        .sr-btn-next { display:inline-flex; align-items:center; gap:.5rem; padding:.7rem 1.6rem; border-radius:10px; border:none; background:linear-gradient(135deg, #3db5e6 0%, #1a8ab5 50%, #0d6a8e 100%); font-family:var(--font); font-size:.85rem; font-weight:700; color:#fff; cursor:pointer; transition:all .2s ease; box-shadow:0 4px 16px rgba(61,181,230,.3); letter-spacing:.03em; }
        .sr-btn-next:hover { transform:translateY(-2px); box-shadow:0 7px 22px rgba(61,181,230,.42); }
        .sr-btn-next:active { transform:translateY(0); }
        .sr-btn-submit { display:inline-flex; align-items:center; gap:.5rem; padding:.7rem 1.6rem; border-radius:10px; border:none; background:linear-gradient(135deg, #10b981 0%, #059669 100%); font-family:var(--font); font-size:.85rem; font-weight:700; color:#fff; cursor:pointer; transition:all .2s ease; box-shadow:0 4px 16px rgba(16,185,129,.3); letter-spacing:.03em; }
        .sr-btn-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 7px 22px rgba(16,185,129,.42); }
        .sr-btn-submit:active:not(:disabled) { transform:translateY(0); }
        .sr-btn-submit:disabled { opacity:.55; cursor:not-allowed; }
        .sr-spinner { width:15px; height:15px; border:2px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:srSpin .7s linear infinite; }

        /* Footer note */
        .sr-footer-note { display:flex; align-items:center; justify-content:space-between; margin-top:1.25rem; padding-top:.9rem; border-top:1px solid var(--rp-footer-border); flex-wrap:wrap; gap:.5rem; }
        .sr-security-badge { display:inline-flex; align-items:center; gap:.4rem; font-family:var(--mono); font-size:.62rem; letter-spacing:.07em; color:var(--rp-muted); }
        .sr-security-dot { width:5px; height:5px; border-radius:50%; background:var(--success); box-shadow:0 0 5px rgba(16,185,129,.5); animation:srPulse 2s ease-in-out infinite; flex-shrink:0; }
        @keyframes srPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.6;transform:scale(.85);} }
        .sr-footer-text { font-size:.73rem; color:var(--rp-muted); text-align:right; }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 768px) {
          .sr-wrapper { padding:1rem .85rem 2.5rem; }
          .sr-header-card { padding:.85rem 1.1rem; }
          .sr-header-title { font-size:1rem; }
          .sr-main-card { padding:1.35rem 1.25rem; border-radius:16px; }
          .sr-grid--2 { grid-template-columns:1fr; }
          .sr-field--full { grid-column:1; }
          .sr-step-item { min-width:46px; }
          .sr-step-bubble { width:32px; height:32px; font-size:.72rem; }
          .sr-step-connector { width:20px; }
          .sr-progress-label { font-size:.58rem; }
        }
        @media (max-width: 480px) {
          .sr-wrapper { padding:.75rem .65rem 2rem; }
          .sr-header-card { padding:.7rem .9rem; }
          .sr-header-logo { display:none; }
          .sr-header-right { display:none; }
          .sr-main-card { padding:1.1rem 1rem; border-radius:14px; }
          .sr-stepper__track { gap:0; }
          .sr-step-item { min-width:40px; }
          .sr-step-bubble { width:28px; height:28px; font-size:.65rem; }
          .sr-step-label { font-size:.58rem; }
          .sr-step-connector { width:14px; }
          .sr-section-head { gap:.65rem; margin-bottom:1rem; }
          .sr-section-icon { width:38px; height:38px; font-size:1.1rem; }
          .sr-section-title { font-size:.92rem; }
          .sr-nav { flex-direction:row; gap:.75rem; }
          .sr-btn-prev, .sr-btn-next, .sr-btn-submit { padding:.65rem 1rem; font-size:.8rem; }
          .sr-footer-note { flex-direction:column; align-items:center; text-align:center; }
          .sr-footer-text { text-align:center; }
        }
        @media (max-width: 360px) {
          .sr-btn-prev span:not(.sr-spinner), .sr-btn-next span:not(.sr-spinner), .sr-btn-submit span:not(.sr-spinner) { display:none; }
          .sr-btn-prev, .sr-btn-next, .sr-btn-submit { padding:.65rem .85rem; }
        }
        @media (min-width: 1200px) {
          .sr-wrapper { padding:2rem 1.5rem 3rem; }
          .sr-main-card { padding:2rem 2.5rem; }
          .sr-grid--2 { gap:1.1rem 1.5rem; }
        }

        /* Password visibility toggle */
        .sr-password-wrap { position:relative; }
        .sr-input--password { padding-right: 2.6rem; }
        .sr-password-toggle { position:absolute; right:.55rem; top:50%; transform:translateY(-50%); background:transparent; border:none; cursor:pointer; color:var(--rp-muted); padding:.25rem; display:inline-flex; align-items:center; justify-content:center; line-height:0; }
        .sr-password-toggle:hover { color:var(--cyan-600); }
      `}</style>
    </div>
  );
}
