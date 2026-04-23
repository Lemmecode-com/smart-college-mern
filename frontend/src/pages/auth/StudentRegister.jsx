// import { useParams, useNavigate } from "react-router-dom";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   FaUniversity,
//   FaUserGraduate,
//   FaSpinner,
//   FaChevronLeft,
//   FaChevronRight,
//   FaCheckCircle,
//   FaUpload,
//   FaFilePdf,
//   FaBook,
//   FaInfoCircle,
//   FaExclamationTriangle,
//   FaMapMarkerAlt,
// } from "react-icons/fa";

// /* ================= PUBLIC AXIOS (NO TOKEN) ================= */
// const publicApi = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL,
// });

// /* ================= API CACHING ================= */
// // Simple cache to prevent duplicate API calls
// const apiCache = new Map();
// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// const cachedGet = async (url, cacheKey) => {
//   // Check cache first
//   const cached = apiCache.get(cacheKey);
//   if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
//     return cached.data;
//   }

//   // Make API call
//   const res = await publicApi.get(url);

//   // Cache the response
//   apiCache.set(cacheKey, {
//     data: res.data,
//     timestamp: Date.now(),
//   });

//   return res.data;
// };

// export default function StudentRegister() {
//   const { collegeCode } = useParams();
//   const navigate = useNavigate();

//   const [departments, setDepartments] = useState([]);
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [collegeName, setCollegeName] = useState("");
//   const [currentStep, setCurrentStep] = useState(1);
//   const [documentConfig, setDocumentConfig] = useState([]);
//   const [configLoading, setConfigLoading] = useState(true);

//   const [form, setForm] = useState({
//     // STEP 1 - Personal Information
//     fullName: "",
//     email: "",
//     password: "",
//     mobileNumber: "",
//     gender: "",
//     dateOfBirth: "",
//     category: "GEN",

//     // STEP 2 - Parent/Guardian Details
//     fatherName: "",
//     fatherMobile: "",
//     motherName: "",
//     motherMobile: "",

//     // STEP 3 - Address Details
//     addressLine: "",
//     city: "",
//     state: "",
//     pincode: "",

//     // STEP 4 - 10th Academic Details
//     sscSchoolName: "",
//     sscBoard: "",
//     sscPassingYear: "",
//     sscPercentage: "",
//     sscRollNumber: "",

//     // STEP 5 - 12th Academic Details
//     hscSchoolName: "",
//     hscBoard: "",
//     hscStream: "", // ✅ Empty by default - only filled if 12th is required
//     hscPassingYear: "",
//     hscPercentage: "",
//     hscRollNumber: "",

//     // STEP 6 - Course Selection
//     department_id: "",
//     course_id: "",
//     admissionYear: new Date().getFullYear(),

//     // STEP 7 - Document Uploads (Dynamic based on college config)
//     // Documents will be added dynamically based on config
//   });

//   const [success, setSuccess] = useState("");

//   /* ================= LOAD COLLEGE NAME ================= */
//   useEffect(() => {
//     const fetchCollege = async () => {
//       try {
//         const res = await cachedGet(
//           `/public/departments/${collegeCode}`,
//           `college-${collegeCode}`,
//         );
//         if (res && res.collegeName) {
//           setCollegeName(res.collegeName);
//         }
//       } catch (err) {
//         // Error handled silently
//       }
//     };

//     if (collegeCode) {
//       fetchCollege();
//     }
//   }, [collegeCode]);

//   /* ================= LOAD DOCUMENT CONFIG ================= */
//   useEffect(() => {
//     const loadDocumentConfig = async () => {
//       try {
//         setConfigLoading(true);
//         const res = await cachedGet(
//           `/document-config/${collegeCode}`,
//           `doc-config-${collegeCode}`,
//         );

//         if (res && res.documents) {
//           setDocumentConfig(res.documents);
//         }
//       } catch (err) {
//         // Use default config if failed
//       } finally {
//         setConfigLoading(false);
//       }
//     };

//     if (collegeCode) {
//       loadDocumentConfig();
//     }
//   }, [collegeCode]);

//   /* ================= LOAD DEPARTMENTS ================= */
//   useEffect(() => {
//     const fetchDepartments = async () => {
//       try {
//         const res = await cachedGet(
//           `/public/departments/${collegeCode}`,
//           `departments-${collegeCode}`,
//         );
//         setDepartments(res.departments || res || []);
//       } catch (err) {
//         setError("Failed to load departments");
//       }
//     };

//     fetchDepartments();
//   }, [collegeCode]);

//   /* ================= LOAD COURSES ================= */
//   useEffect(() => {
//     if (!form.department_id || !collegeCode) return;

//     const fetchCourses = async () => {
//       try {
//         const res = await publicApi.get(
//           `/public/courses/${collegeCode}/department/${form.department_id}`,
//         );
//         setCourses(res.data || []);
//       } catch (err) {
//         setError("Failed to load courses");
//       }
//     };

//     fetchCourses();
//   }, [form.department_id, collegeCode]);

//   /* ================= HANDLE CHANGE ================= */
//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//     // Clear success/error messages when user starts typing
//     if (success) setSuccess("");
//     if (error) setError("");
//   };

//   /* ================= HANDLE FILE CHANGE ================= */
//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     const fieldName = e.target.name;

//     if (file) {
//       // Validate: Only accept documents that are enabled in config
//       const docConfig = documentConfig
//         ? documentConfig.find((doc) => doc.type === fieldName)
//         : undefined;

//       // Special handling for category certificate
//       if (!docConfig && fieldName === "category_certificate") {
//         // Allow upload if category is not GEN
//         if (form.category === "GEN") {
//           alert(`Category certificate is not required for GEN category`);
//           e.target.value = ""; // Clear file input
//           return;
//         }
//         // If config doesn't exist but category is not GEN, allow it
//         setForm((prevForm) => ({
//           ...prevForm,
//           [fieldName]: file,
//         }));
//         return;
//       }

//       if (!docConfig) {
//         // Fallback: Allow upload if documentConfig is empty but field exists in form
//         // This handles edge cases where config might not be fully loaded
//         if (!documentConfig || documentConfig.length === 0) {
//           setForm((prevForm) => ({
//             ...prevForm,
//             [fieldName]: file,
//           }));
//           return;
//         }
//         alert(
//           `${fieldName} is not configured for this college. Please contact admin.`,
//         );
//         e.target.value = ""; // Clear file input
//         return;
//       }

//       // Validate file format
//       const fileExt = file.name.split(".").pop().toLowerCase();
//       const allowedFormats = docConfig.allowedFormats || [
//         "pdf",
//         "jpg",
//         "jpeg",
//         "png",
//       ];

//       if (!allowedFormats.includes(fileExt)) {
//         alert(
//           `${docConfig.label} accepts only: ${allowedFormats.join(", ").toUpperCase()}`,
//         );
//         e.target.value = ""; // Clear file input
//         return;
//       }

//       // Validate file size (use config max size or default 5MB)
//       const maxSize = (docConfig.maxFileSize || 5) * 1024 * 1024;
//       if (file.size > maxSize) {
//         alert(
//           `${docConfig.label} file size should be less than ${docConfig.maxFileSize || 5}MB`,
//         );
//         e.target.value = ""; // Clear file input
//         return;
//       }

//       setForm((prevForm) => ({
//         ...prevForm,
//         [fieldName]: file,
//       }));
//     }
//   };

//   /* ================= CHECK IF DOCUMENT TYPE IS ENABLED ================= */
//   const isDocEnabled = (type) => {
//     return documentConfig.some((doc) => doc.type === type && doc.enabled);
//   };

//   /* ================= GET DYNAMIC STEP NUMBERS ================= */
//   const getStepNumbers = () => {
//     const has10th = isDocEnabled("10th_marksheet");
//     const has12th = isDocEnabled("12th_marksheet");

//     let step = 3; // After personal, parent, address

//     const result = {
//       personal: 1,
//       parent: 2,
//       address: 3,
//       ssc: null,
//       hsc: null,
//       course: null,
//       documents: null,
//     };

//     if (has10th) {
//       step++;
//       result.ssc = step;
//     }
//     if (has12th) {
//       step++;
//       result.hsc = step;
//     }
//     step++;
//     result.course = step;
//     step++;
//     result.documents = step;

//     result.total = step;

//     return result;
//   };

//   /* ================= VALIDATE STEP ================= */
//   const validateStep = (step) => {
//     const steps = getStepNumbers();

//     // Validate Personal Info
//     if (step === steps.personal) {
//       if (
//         !form.fullName ||
//         !form.email ||
//         !form.password ||
//         !form.mobileNumber ||
//         !form.dateOfBirth
//       ) {
//         alert("Please fill all required fields in Personal Information");
//         return false;
//       }
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(form.email)) {
//         alert("Please enter a valid email address");
//         return false;
//       }
//       if (!/^\d{10}$/.test(form.mobileNumber)) {
//         alert("Please enter a valid 10-digit mobile number");
//         return false;
//       }
//       return true;
//     }

//     // Validate Parent Details
//     if (step === steps.parent) {
//       if (
//         !form.fatherName ||
//         !form.fatherMobile ||
//         !form.motherName ||
//         !form.motherMobile
//       ) {
//         alert("Please fill all parent details");
//         return false;
//       }
//       if (!/^\d{10}$/.test(form.fatherMobile)) {
//         alert("Please enter a valid 10-digit father's mobile number");
//         return false;
//       }
//       if (!/^\d{10}$/.test(form.motherMobile)) {
//         alert("Please enter a valid 10-digit mother's mobile number");
//         return false;
//       }
//       return true;
//     }

//     // Validate Address
//     if (step === steps.address) {
//       if (!form.addressLine || !form.city || !form.state || !form.pincode) {
//         alert("Please fill all address details");
//         return false;
//       }
//       if (!/^\d{6}$/.test(form.pincode)) {
//         alert("Please enter a valid 6-digit pincode");
//         return false;
//       }
//       return true;
//     }

//     // Validate 10th Details (only if enabled)
//     if (step === steps.ssc) {
//       if (
//         !form.sscSchoolName ||
//         !form.sscBoard ||
//         !form.sscPassingYear ||
//         !form.sscPercentage ||
//         !form.sscRollNumber
//       ) {
//         alert("Please fill all 10th academic details");
//         return false;
//       }
//       if (
//         parseFloat(form.sscPercentage) > 100 ||
//         parseFloat(form.sscPercentage) < 0
//       ) {
//         alert("Please enter a valid percentage (0-100)");
//         return false;
//       }
//       return true;
//     }

//     // Validate 12th Details (only if enabled)
//     if (step === steps.hsc) {
//       if (
//         !form.hscSchoolName ||
//         !form.hscBoard ||
//         !form.hscPassingYear ||
//         !form.hscPercentage ||
//         !form.hscRollNumber
//       ) {
//         alert("Please fill all 12th academic details");
//         return false;
//       }
//       if (
//         parseFloat(form.hscPercentage) > 100 ||
//         parseFloat(form.hscPercentage) < 0
//       ) {
//         alert("Please enter a valid percentage (0-100)");
//         return false;
//       }
//       return true;
//     }

//     // Validate Course Selection
//     if (step === steps.course) {
//       if (!form.department_id || !form.course_id || !form.admissionYear) {
//         alert("Please select department, course and admission year");
//         return false;
//       }
//       return true;
//     }

//     // Validate Document Upload
//     if (step === steps.documents) {
//       // If no documents configured, allow submission
//       if (!documentConfig || documentConfig.length === 0) {
//         return true;
//       }

//       for (const doc of documentConfig) {
//         // Skip category certificate if category is GEN
//         if (doc.type === "category_certificate" && form.category === "GEN") {
//           continue;
//         }

//         if (doc.enabled && doc.mandatory && !form[doc.type]) {
//           alert(`Please upload ${doc.label} (Mandatory)`);
//           return false;
//         }
//       }
//       return true;
//     }

//     return true;
//   };

//   /* ================= NAVIGATION ================= */
//   const handleNext = () => {
//     const steps = getStepNumbers();

//     // Validate current step before moving to next
//     if (currentStep === steps.ssc && !validateStep(steps.ssc)) return;
//     if (currentStep === steps.hsc && !validateStep(steps.hsc)) return;
//     if (currentStep === steps.course && !validateStep(steps.course)) return;
//     if (currentStep === steps.documents && !validateStep(steps.documents))
//       return;
//     if (currentStep === steps.personal && !validateStep(steps.personal)) return;
//     if (currentStep === steps.parent && !validateStep(steps.parent)) return;
//     if (currentStep === steps.address && !validateStep(steps.address)) return;

//     // Don't go beyond the last step
//     if (currentStep >= steps.total) return;

//     setCurrentStep((prev) => prev + 1);
//     window.scrollTo(0, 0);
//   };

//   const handlePrevious = () => {
//     if (currentStep > 1) {
//       setCurrentStep((prev) => prev - 1);
//       window.scrollTo(0, 0);
//     }
//   };

//   /* ================= SUBMIT ================= */
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const steps = getStepNumbers();
//     if (!validateStep(steps.documents)) return;

//     setLoading(true);
//     setError("");

//     try {
//       // Create FormData for file upload
//       const formData = new FormData();

//       // Append all form fields
//       formData.append("fullName", form.fullName);
//       formData.append("email", form.email);
//       formData.append("password", form.password);
//       formData.append("mobileNumber", form.mobileNumber);
//       formData.append("gender", form.gender);
//       formData.append("dateOfBirth", form.dateOfBirth);
//       formData.append("category", form.category);
//       formData.append("addressLine", form.addressLine);
//       formData.append("city", form.city);
//       formData.append("state", form.state);
//       formData.append("pincode", form.pincode);

//       // Parent/Guardian Details
//       formData.append("fatherName", form.fatherName);
//       formData.append("fatherMobile", form.fatherMobile);
//       formData.append("motherName", form.motherName);
//       formData.append("motherMobile", form.motherMobile);

//       // 10th (SSC) Academic Details - ONLY if enabled
//       if (steps.ssc) {
//         formData.append("sscSchoolName", form.sscSchoolName);
//         formData.append("sscBoard", form.sscBoard);
//         formData.append("sscPassingYear", form.sscPassingYear);
//         formData.append("sscPercentage", form.sscPercentage);
//         formData.append("sscRollNumber", form.sscRollNumber);
//       }

//       // 12th (HSC) Academic Details - ONLY if enabled
//       if (steps.hsc) {
//         formData.append("hscSchoolName", form.hscSchoolName);
//         formData.append("hscBoard", form.hscBoard);
//         formData.append("hscStream", form.hscStream);
//         formData.append("hscPassingYear", form.hscPassingYear);
//         formData.append("hscPercentage", form.hscPercentage);
//         formData.append("hscRollNumber", form.hscRollNumber);
//       }

//       // Course & Department
//       formData.append("department_id", form.department_id);
//       formData.append("course_id", form.course_id);
//       formData.append("admissionYear", form.admissionYear);
//       formData.append("currentSemester", "1");

//       // Append files - Map frontend field names to backend expected field names
//       // Backend expects: sscMarksheet, hscMarksheet, passportPhoto, categoryCertificate, etc.
//       documentConfig.forEach((doc) => {
//         if (form[doc.type]) {
//           // Map field names to match backend upload middleware
//           let backendFieldName = doc.type;
//           if (doc.type === "10th_marksheet") {
//             backendFieldName = "sscMarksheet";
//           } else if (doc.type === "12th_marksheet") {
//             backendFieldName = "hscMarksheet";
//           } else if (doc.type === "passport_photo") {
//             backendFieldName = "passportPhoto";
//           } else if (doc.type === "category_certificate") {
//             backendFieldName = "categoryCertificate";
//           } else if (doc.type === "income_certificate") {
//             backendFieldName = "incomeCertificate";
//           } else if (doc.type === "character_certificate") {
//             backendFieldName = "characterCertificate";
//           } else if (doc.type === "transfer_certificate") {
//             backendFieldName = "transferCertificate";
//           } else if (doc.type === "aadhar_card") {
//             backendFieldName = "aadharCard";
//           } else if (doc.type === "entrance_exam_score") {
//             backendFieldName = "entranceExamScore";
//           } else if (doc.type === "migration_certificate") {
//             backendFieldName = "migrationCertificate";
//           } else if (doc.type === "domicile_certificate") {
//             backendFieldName = "domicileCertificate";
//           } else if (doc.type === "caste_certificate") {
//             backendFieldName = "casteCertificate";
//           } else if (doc.type === "non_creamy_layer_certificate") {
//             backendFieldName = "nonCreamyLayerCertificate";
//           } else if (doc.type === "physically_challenged_certificate") {
//             backendFieldName = "physicallyChallengedCertificate";
//           } else if (doc.type === "sports_quota_certificate") {
//             backendFieldName = "sportsQuotaCertificate";
//           } else if (doc.type === "nri_sponsor_certificate") {
//             backendFieldName = "nriSponsorCertificate";
//           } else if (doc.type === "gap_certificate") {
//             backendFieldName = "gapCertificate";
//           } else if (doc.type === "affidavit") {
//             backendFieldName = "affidavit";
//           }

//           formData.append(backendFieldName, form[doc.type]);
//         }
//       });

//       // Special handling: Append category certificate if category is not GEN
//       if (form.category !== "GEN" && form.category_certificate) {
//         formData.append("categoryCertificate", form.category_certificate);
//       }

//       // Submit with FormData (includes files)
//       const response = await publicApi.post(
//         `/students/register/${collegeCode}`,
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         },
//       );

//       // Show success message and stay on the registration page
//       setSuccess(
//         response.data.message ||
//           "🎉 Registration successful! Wait for college approval.",
//       );
//       setError("");

//       // Reset form and go to first step
//       setTimeout(() => {
//         setForm({
//           fullName: "",
//           email: "",
//           password: "",
//           mobileNumber: "",
//           gender: "",
//           dateOfBirth: "",
//           category: "GEN",
//           fatherName: "",
//           fatherMobile: "",
//           motherName: "",
//           motherMobile: "",
//           addressLine: "",
//           city: "",
//           state: "",
//           pincode: "",
//           sscSchoolName: "",
//           sscBoard: "",
//           sscPassingYear: "",
//           sscPercentage: "",
//           sscRollNumber: "",
//           hscSchoolName: "",
//           hscBoard: "",
//           hscStream: "",
//           hscPassingYear: "",
//           hscPercentage: "",
//           hscRollNumber: "",
//           department_id: "",
//           course_id: "",
//           admissionYear: new Date().getFullYear(),
//         });
//         setCurrentStep(1);
//         window.scrollTo(0, 0);
//       }, 100);
//     } catch (err) {
//       // 🔧 IMPROVED: Extract and show actual validation error
//       let errorMessage = "Registration failed";

//       if (
//         err.response?.data?.errors &&
//         Array.isArray(err.response.data.errors)
//       ) {
//         // Validation errors - show the first error message
//         const validationError = err.response.data.errors[0];
//         errorMessage = `${validationError.field}: ${validationError.message}`;
//       } else if (err.response?.data?.message) {
//         // Other error messages
//         errorMessage = err.response.data.message;
//       }

//       setError(errorMessage);
//       alert("❌ Registration Failed:\n\n" + errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ================= RENDER STEP INDICATOR ================= */
//   const renderStepIndicator = () => {
//     const steps = getStepNumbers();

//     // Build dynamic steps array based on config
//     const dynamicSteps = [
//       { num: 1, title: "Personal Info" },
//       { num: 2, title: "Parent Details" },
//       { num: 3, title: "Address" },
//     ];

//     if (steps.ssc) {
//       dynamicSteps.push({ num: steps.ssc, title: "10th Details" });
//     }
//     if (steps.hsc) {
//       dynamicSteps.push({ num: steps.hsc, title: "12th Details" });
//     }
//     dynamicSteps.push({ num: steps.course, title: "Course" });
//     dynamicSteps.push({ num: steps.documents, title: "Documents" });

//     return (
//       <div className="step-indicator mb-4">
//         {dynamicSteps.map((step) => (
//           <div
//             key={step.num}
//             className={`step-item ${currentStep === step.num ? "active" : ""} ${currentStep > step.num ? "completed" : ""}`}
//           >
//             <div className="step-number">
//               {currentStep > step.num ? <FaCheckCircle /> : step.num}
//             </div>
//             <div className="step-title">{step.title}</div>
//           </div>
//         ))}
//         <style>{`
//           .step-indicator {
//             display: flex;
//             justify-content: space-between;
//             align-items: center;
//             flex-wrap: wrap;
//             gap: 10px;
//             padding: 20px 0;
//             border-bottom: 2px solid #e0e0e0;
//           }
//           .step-item {
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             flex: 1;
//             min-width: 80px;
//             position: relative;
//           }
//           .step-number {
//             width: 40px;
//             height: 40px;
//             border-radius: 50%;
//             background: #e0e0e0;
//             color: #666;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             font-weight: bold;
//             margin-bottom: 8px;
//             transition: all 0.3s ease;
//           }
//           .step-item.active .step-number {
//             background: linear-gradient(45deg, #286079, #5798b7);
//             color: white;
//             box-shadow: 0 4px 15px rgba(40, 96, 121, 0.4);
//           }
//           .step-item.completed .step-number {
//             background: #28a745;
//             color: white;
//           }
//           .step-title {
//             font-size: 12px;
//             color: #666;
//             text-align: center;
//             font-weight: 500;
//           }
//           .step-item.active .step-title {
//             color: #286079;
//             font-weight: 600;
//           }
//           @media (max-width: 768px) {
//             .step-indicator {
//               flex-wrap: nowrap;
//               overflow-x: auto;
//               justify-content: flex-start;
//             }
//             .step-item {
//               min-width: 70px;
//             }
//             .step-title {
//               font-size: 10px;
//             }
//           }
//         `}</style>
//       </div>
//     );
//   };

//   /* ================= RENDER STEP 1 - PERSONAL INFORMATION ================= */
//   const renderPersonalInfo = () => (
//     <div className="animate-fade">
//       <h5 className="fw-bold mb-3 text-primary">
//         <FaUserGraduate className="me-2" />
//         Personal Information
//       </h5>
//       <div className="row g-3">
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Full Name <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="fullName"
//             placeholder="Enter your full name"
//             value={form.fullName}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Email <span className="text-danger">*</span>
//           </label>
//           <input
//             type="email"
//             className="form-control"
//             name="email"
//             placeholder="your.email@example.com"
//             value={form.email}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Password <span className="text-danger">*</span>
//           </label>
//           <input
//             type="password"
//             className="form-control"
//             name="password"
//             placeholder="Create a strong password"
//             value={form.password}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Mobile Number <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="mobileNumber"
//             placeholder="10-digit mobile number"
//             value={form.mobileNumber}
//             onChange={handleChange}
//             maxLength="10"
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Gender <span className="text-danger">*</span>
//           </label>
//           <select
//             className="form-select"
//             name="gender"
//             value={form.gender}
//             onChange={handleChange}
//             required
//           >
//             <option value="">Select gender</option>
//             <option value="Female">Female</option>
//             <option value="Male">Male</option>
//             <option value="Other">Other</option>
//           </select>
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Date of Birth <span className="text-danger">*</span>
//           </label>
//           <input
//             type="date"
//             className="form-control"
//             name="dateOfBirth"
//             value={form.dateOfBirth}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Category <span className="text-danger">*</span>
//           </label>
//           <select
//             className="form-select"
//             name="category"
//             value={form.category}
//             onChange={handleChange}
//             required
//           >
//             <option value="GEN">General (GEN)</option>
//             <option value="OBC">Other Backward Classes (OBC)</option>
//             <option value="SC">Scheduled Caste (SC)</option>
//             <option value="ST">Scheduled Tribe (ST)</option>
//             <option value="OTHER">Other</option>
//           </select>
//         </div>
//       </div>
//     </div>
//   );

//   /* ================= RENDER STEP 2 - PARENT DETAILS ================= */
//   const renderParentDetails = () => (
//     <div className="animate-fade">
//       <h5 className="fw-bold mb-3 text-primary">
//         <FaUniversity className="me-2" />
//         Parent / Guardian Information
//       </h5>
//       <div className="row g-3">
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Father's Name <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="fatherName"
//             placeholder="Enter father's full name"
//             value={form.fatherName}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Father's Mobile Number <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="fatherMobile"
//             placeholder="10-digit mobile number"
//             value={form.fatherMobile}
//             onChange={handleChange}
//             maxLength="10"
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Mother's Name <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="motherName"
//             placeholder="Enter mother's full name"
//             value={form.motherName}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Mother's Mobile Number <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="motherMobile"
//             placeholder="10-digit mobile number"
//             value={form.motherMobile}
//             onChange={handleChange}
//             maxLength="10"
//             required
//           />
//         </div>
//       </div>
//     </div>
//   );

//   /* ================= RENDER STEP 3 - ADDRESS DETAILS ================= */
//   const renderAddressDetails = () => (
//     <div className="animate-fade">
//       <h5 className="fw-bold mb-3 text-primary">
//         <FaMapMarkerAlt className="me-2" />
//         Address / Communication Details
//       </h5>
//       <p className="text-muted mb-3">
//         <FaInfoCircle className="me-2" />
//         This address will be used for all official communication and
//         correspondence.
//       </p>
//       <div className="row g-3">
//         <div className="col-md-12">
//           <label className="form-label fw-semibold">
//             Address Line <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="addressLine"
//             placeholder="House/Flat No., Building Name, Street, Landmark"
//             value={form.addressLine}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             City <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="city"
//             placeholder="Enter your city"
//             value={form.city}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             State <span className="text-danger">*</span>
//           </label>
//           <input
//             className="form-control"
//             name="state"
//             placeholder="Enter your state"
//             value={form.state}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Pincode <span className="text-danger">*</span>
//           </label>
//           <input
//             type="text"
//             className="form-control"
//             name="pincode"
//             placeholder="6-digit pincode"
//             value={form.pincode}
//             onChange={handleChange}
//             maxLength="6"
//             pattern="\d{6}"
//             required
//           />
//           <small className="text-muted">Enter 6-digit pincode</small>
//         </div>
//       </div>
//     </div>
//   );

//   /* ================= RENDER STEP 4 - 10TH ACADEMIC DETAILS ================= */
//   const render10thDetails = () => {
//     // Don't render if 10th marksheet is not enabled
//     if (!isDocEnabled("10th_marksheet")) {
//       return (
//         <div className="text-center py-5">
//           <div className="alert alert-info">
//             <FaInfoCircle className="me-2" />
//             10th academic details are not required for this college.
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="animate-fade">
//         <h5 className="fw-bold mb-3 text-primary">
//           <FaFilePdf className="me-2" />
//           10th (SSC) Academic Details
//         </h5>
//         <div className="row g-3">
//           <div className="col-md-6">
//             <label className="form-label fw-semibold">
//               School Name <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="sscSchoolName"
//               placeholder="Enter your 10th school name"
//               value={form.sscSchoolName}
//               onChange={handleChange}
//               required
//             />
//           </div>
//           <div className="col-md-6">
//             <label className="form-label fw-semibold">
//               Board <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="sscBoard"
//               placeholder="e.g., State Board, CBSE, ICSE"
//               value={form.sscBoard}
//               onChange={handleChange}
//               required
//             />
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Passing Year <span className="text-danger">*</span>
//             </label>
//             <input
//               type="number"
//               className="form-control"
//               name="sscPassingYear"
//               placeholder="YYYY"
//               value={form.sscPassingYear}
//               onChange={handleChange}
//               min="1950"
//               max={new Date().getFullYear()}
//               required
//             />
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Percentage / CGPA <span className="text-danger">*</span>
//             </label>
//             <input
//               type="number"
//               step="0.01"
//               className="form-control"
//               name="sscPercentage"
//               placeholder="e.g., 75.50 or 8.5"
//               value={form.sscPercentage}
//               onChange={handleChange}
//               min="0"
//               max="100"
//               required
//             />
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Roll Number <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="sscRollNumber"
//               placeholder="Enter your 10th roll number"
//               value={form.sscRollNumber}
//               onChange={handleChange}
//               required
//             />
//           </div>
//         </div>
//       </div>
//     );
//   };

//   /* ================= RENDER STEP 5 - 12TH ACADEMIC DETAILS ================= */
//   const render12thDetails = () => {
//     // Don't render if 12th marksheet is not enabled
//     if (!isDocEnabled("12th_marksheet")) {
//       return (
//         <div className="text-center py-5">
//           <div className="alert alert-info">
//             <FaInfoCircle className="me-2" />
//             12th academic details are not required for this college.
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="animate-fade">
//         <h5 className="fw-bold mb-3 text-primary">
//           <FaFilePdf className="me-2" />
//           12th (HSC) Academic Details
//         </h5>
//         <div className="row g-3">
//           <div className="col-md-6">
//             <label className="form-label fw-semibold">
//               School / College Name <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="hscSchoolName"
//               placeholder="Enter your 12th school/college name"
//               value={form.hscSchoolName}
//               onChange={handleChange}
//               required
//             />
//           </div>
//           <div className="col-md-6">
//             <label className="form-label fw-semibold">
//               Board <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="hscBoard"
//               placeholder="e.g., State Board, CBSE, ICSE"
//               value={form.hscBoard}
//               onChange={handleChange}
//               required
//             />
//           </div>
//           <div className="col-md-6">
//             <label className="form-label fw-semibold">
//               Stream <span className="text-danger">*</span>
//             </label>
//             <select
//               className="form-select"
//               name="hscStream"
//               value={form.hscStream}
//               onChange={handleChange}
//               required
//             >
//               <option value="Science">Science</option>
//               <option value="Commerce">Commerce</option>
//               <option value="Arts">Arts</option>
//               <option value="Vocational">Vocational</option>
//               <option value="Other">Other</option>
//             </select>
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Passing Year <span className="text-danger">*</span>
//             </label>
//             <input
//               type="number"
//               className="form-control"
//               name="hscPassingYear"
//               placeholder="YYYY"
//               value={form.hscPassingYear}
//               onChange={handleChange}
//               min="1950"
//               max={new Date().getFullYear()}
//               required
//             />
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Percentage / CGPA <span className="text-danger">*</span>
//             </label>
//             <input
//               type="number"
//               step="0.01"
//               className="form-control"
//               name="hscPercentage"
//               placeholder="e.g., 75.50 or 8.5"
//               value={form.hscPercentage}
//               onChange={handleChange}
//               min="0"
//               max="100"
//               required
//             />
//           </div>
//           <div className="col-md-4">
//             <label className="form-label fw-semibold">
//               Roll Number <span className="text-danger">*</span>
//             </label>
//             <input
//               className="form-control"
//               name="hscRollNumber"
//               placeholder="Enter your 12th roll number"
//               value={form.hscRollNumber}
//               onChange={handleChange}
//               required
//             />
//           </div>
//         </div>
//       </div>
//     );
//   };

//   /* ================= RENDER STEP 5 - COURSE SELECTION ================= */
//   const renderCourseSelection = () => (
//     <div className="animate-fade">
//       <h5 className="fw-bold mb-3 text-primary">
//         <FaBook className="me-2" />
//         Course & Department Selection
//       </h5>
//       <div className="row g-3">
//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Select Department <span className="text-danger">*</span>
//           </label>
//           <select
//             className="form-select"
//             name="department_id"
//             value={form.department_id}
//             onChange={handleChange}
//             required
//           >
//             <option value="">-- Select Department --</option>
//             {departments.map((d) => (
//               <option key={d._id} value={d._id}>
//                 {d.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Select Course <span className="text-danger">*</span>
//           </label>
//           <select
//             className="form-select"
//             name="course_id"
//             value={form.course_id}
//             onChange={handleChange}
//             required
//             disabled={!form.department_id}
//           >
//             <option value="">
//               {!form.department_id
//                 ? "Select department first"
//                 : "-- Select Course --"}
//             </option>
//             {courses.map((c) => (
//               <option key={c._id} value={c._id}>
//                 {c.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="col-md-6">
//           <label className="form-label fw-semibold">
//             Admission Year <span className="text-danger">*</span>
//           </label>
//           <input
//             type="number"
//             className="form-control"
//             name="admissionYear"
//             value={form.admissionYear}
//             onChange={handleChange}
//             min="1900"
//             max="2100"
//             required
//           />
//         </div>
//       </div>

//       {form.course_id && (
//         <div className="alert alert-info mt-3">
//           <FaInfoCircle className="me-2" />
//           <strong>Selected:</strong>{" "}
//           {courses.find((c) => c._id === form.course_id)?.name || ""}
//           {departments.find((d) => d._id === form.department_id)?.name &&
//             ` in ${departments.find((d) => d._id === form.department_id)?.name}`}
//         </div>
//       )}
//     </div>
//   );

//   /* ================= RENDER STEP 7 - DOCUMENT UPLOAD ================= */
//   const renderDocumentUpload = () => {
//     if (configLoading) {
//       return (
//         <div className="text-center py-5">
//           <div className="spinner-border text-primary" role="status">
//             <span className="visually-hidden">Loading...</span>
//           </div>
//           <p className="mt-2 text-muted">Loading document requirements...</p>
//         </div>
//       );
//     }

//     // Check if no documents are configured
//     if (!documentConfig || documentConfig.length === 0) {
//       return (
//         <div className="text-center py-5">
//           <div className="alert alert-warning">
//             <FaExclamationTriangle className="me-2" size={24} />
//             <h5 className="fw-bold mt-3">No Documents Required</h5>
//             <p className="text-muted">
//               This college has not configured any document requirements yet.
//               Please contact the college administration for more information.
//             </p>
//           </div>
//         </div>
//       );
//     }

//     return (
//       <div className="animate-fade">
//         <h5 className="fw-bold mb-3 text-primary">
//           <FaUpload className="me-2" />
//           Document Upload
//         </h5>
//         <p className="text-muted mb-4">
//           <FaInfoCircle className="me-2" />
//           <strong>Note:</strong> Upload the required documents as per your
//           college guidelines. Maximum file size: 5MB per file (unless
//           specified).
//         </p>

//         <div className="row g-3">
//           {(() => {
//             const filteredDocs = documentConfig.filter((doc) => {
//               // Conditional rendering for category certificate
//               if (doc.type === "category_certificate") {
//                 // Show category certificate only if category is not GEN
//                 return doc.enabled && form.category !== "GEN";
//               }
//               return doc.enabled;
//             });

//             return filteredDocs.map((doc) => (
//               <div className="col-md-6" key={doc.type}>
//                 <label className="form-label fw-semibold">
//                   {doc.label}
//                   {doc.mandatory && <span className="text-danger"> *</span>}
//                 </label>
//                 <div className="upload-box">
//                   <input
//                     type="file"
//                     name={doc.type}
//                     accept={doc.allowedFormats.map((f) => `.${f}`).join(",")}
//                     onChange={handleFileChange}
//                     className="form-control"
//                     required={
//                       doc.mandatory &&
//                       (doc.type !== "category_certificate" ||
//                         form.category !== "GEN")
//                     }
//                   />
//                   <small className="text-muted">
//                     {doc.allowedFormats.join(", ").toUpperCase()} only
//                     {doc.description && (
//                       <div className="mt-1">{doc.description}</div>
//                     )}
//                   </small>
//                   {form[doc.type] && (
//                     <div className="file-preview mt-2 text-success">
//                       <FaCheckCircle className="me-1" />
//                       {form[doc.type].name}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ));
//           })()}

//           {/* Show info message for GEN category */}
//           {form.category === "GEN" &&
//             documentConfig.some(
//               (doc) => doc.type === "category_certificate" && doc.enabled,
//             ) && (
//               <div className="col-md-12">
//                 <div className="alert alert-info mb-0">
//                   <FaInfoCircle className="me-2" />
//                   <strong>Category Certificate:</strong> Not required for
//                   General (GEN) category students.
//                 </div>
//               </div>
//             )}
//         </div>

//         <div className="alert alert-warning mt-4">
//           <FaExclamationTriangle className="me-2" />
//           <strong>Important:</strong> The admin will verify:
//           <ul className="mb-0 mt-2">
//             <li>Marks entered match uploaded marksheet</li>
//             <li>Student meets course eligibility criteria</li>
//             <li>Documents are clear and valid</li>
//           </ul>
//         </div>

//         <style>{`
//           .upload-box {
//             border: 2px dashed #dee2e6;
//             border-radius: 8px;
//             padding: 15px;
//             background: #f8f9fa;
//             transition: all 0.3s ease;
//           }
//           .upload-box:hover {
//             border-color: #286079;
//             background: #e9ecef;
//           }
//           .file-preview {
//             font-size: 13px;
//             font-weight: 500;
//           }
//           .animate-fade {
//             animation: fadeIn 0.3s ease-in-out;
//           }
//           @keyframes fadeIn {
//             from { opacity: 0; transform: translateY(10px); }
//             to { opacity: 1; transform: translateY(0); }
//           }
//         `}</style>
//       </div>
//     );
//   };

//   /* ================= MAIN RENDER ================= */
//   if (!collegeCode) {
//     return (
//       <div className="container mt-5 text-center">
//         <h3>Invalid Registration Link</h3>
//       </div>
//     );
//   }

//   return (
//     <div className="m-0">
//       <div
//         className="d-flex align-items-center justify-content-center"
//         style={{
//           minHeight: "100vh",
//           padding: "20px",
//           background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
//         }}
//       >
//         <div
//           className="card p-4"
//           style={{
//             width: "100%",
//             maxWidth: "1100px",
//             borderRadius: "16px",
//             boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
//           }}
//         >
//           {/* Header */}
//           <div className="text-center mb-4">
//             <FaUniversity
//               size={48}
//               className="mb-2"
//               style={{ color: "#286079" }}
//             />
//             <h3 className="fw-bold">{collegeName || "NOVAA"}</h3>
//             <p className="text-muted mb-1">Student Self Registration</p>
//             <div className="d-flex gap-2 justify-content-center">
//               <span className="badge bg-dark">{collegeCode}</span>
//               {collegeName && (
//                 <span className="badge bg-success">{collegeName}</span>
//               )}
//             </div>
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div className="alert alert-danger text-center">{error}</div>
//           )}

//           {/* Success Message */}
//           {success && (
//             <div className="alert alert-success text-center">
//               <FaCheckCircle className="me-2" />
//               {success}
//             </div>
//           )}

//           {/* Step Indicator */}
//           {renderStepIndicator()}

//           {/* Form */}
//           <form onSubmit={handleSubmit}>
//             {/* Render Current Step based on dynamic step numbers */}
//             {(() => {
//               const steps = getStepNumbers();

//               if (currentStep === steps.personal) return renderPersonalInfo();
//               if (currentStep === steps.parent) return renderParentDetails();
//               if (currentStep === steps.address) return renderAddressDetails();
//               if (currentStep === steps.ssc) return render10thDetails();
//               if (currentStep === steps.hsc) return render12thDetails();
//               if (currentStep === steps.course) return renderCourseSelection();
//               if (currentStep === steps.documents)
//                 return renderDocumentUpload();

//               return null;
//             })()}

//             {/* Navigation Buttons */}
//             <div className="d-flex justify-content-between mt-4 pt-3 border-top">
//               <button
//                 type="button"
//                 className="btn btn-outline-secondary px-4"
//                 onClick={handlePrevious}
//                 disabled={currentStep === 1}
//               >
//                 <FaChevronLeft className="me-2" />
//                 Previous
//               </button>

//               {(() => {
//                 const steps = getStepNumbers();

//                 if (currentStep < steps.total) {
//                   return (
//                     <button
//                       type="button"
//                       className="btn px-4 text-light fw-semibold"
//                       style={{
//                         background: "linear-gradient(45deg, #286079, #5798b7)",
//                       }}
//                       onClick={handleNext}
//                     >
//                       Next
//                       <FaChevronRight className="ms-2" />
//                     </button>
//                   );
//                 } else {
//                   return (
//                     <button
//                       type="submit"
//                       className="btn px-4 text-light fw-semibold"
//                       style={{
//                         background: "linear-gradient(45deg, #28a745, #20c997)",
//                       }}
//                       disabled={loading}
//                     >
//                       {loading ? (
//                         <>
//                           <FaSpinner className="spin me-2" />
//                           Submitting...
//                         </>
//                       ) : (
//                         <>
//                           <FaCheckCircle className="me-2" />
//                           Submit Registration
//                         </>
//                       )}
//                     </button>
//                   );
//                 }
//               })()}
//             </div>
//           </form>

//           <div className="text-center mt-3 text-muted">
//             <small>
//               After registration, your application will be reviewed by the
//               college admin. You will be notified once approved.
//             </small>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         .spin {
//           animation: spin 1s linear infinite;
//         }
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//       `}</style>
//     </div>
//   );
// }

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
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

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    gender: "",
    dateOfBirth: "",
    category: "GEN",
    fatherName: "",
    fatherMobile: "",
    motherName: "",
    motherMobile: "",
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

    const fileExt = file.name.split(".").pop().toLowerCase();
    const allowedFormats = docConfig.allowedFormats || [
      "pdf",
      "jpg",
      "jpeg",
      "png",
    ];
    if (!allowedFormats.includes(fileExt)) {
      alert(
        `${docConfig.label} accepts only: ${allowedFormats.join(", ").toUpperCase()}`,
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

  /* ── Validation ── */
  const validateStep = (step) => {
    const steps = getStepNumbers();
    if (step === steps.personal) {
      if (
        !form.fullName ||
        !form.email ||
        !form.password ||
        !form.mobileNumber ||
        !form.dateOfBirth
      ) {
        alert("Please fill all required fields in Personal Information");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        alert("Please enter a valid email address");
        return false;
      }
      if (!/^\d{10}$/.test(form.mobileNumber)) {
        alert("Please enter a valid 10-digit mobile number");
        return false;
      }
      return true;
    }
    if (step === steps.parent) {
      if (
        !form.fatherName ||
        !form.fatherMobile ||
        !form.motherName ||
        !form.motherMobile
      ) {
        alert("Please fill all parent details");
        return false;
      }
      if (!/^\d{10}$/.test(form.fatherMobile)) {
        alert("Please enter a valid 10-digit father's mobile number");
        return false;
      }
      if (!/^\d{10}$/.test(form.motherMobile)) {
        alert("Please enter a valid 10-digit mother's mobile number");
        return false;
      }
      return true;
    }
    if (step === steps.address) {
      if (!form.addressLine || !form.city || !form.state || !form.pincode) {
        alert("Please fill all address details");
        return false;
      }
      if (!/^\d{6}$/.test(form.pincode)) {
        alert("Please enter a valid 6-digit pincode");
        return false;
      }
      return true;
    }
    if (step === steps.ssc) {
      if (
        !form.sscSchoolName ||
        !form.sscBoard ||
        !form.sscPassingYear ||
        !form.sscPercentage ||
        !form.sscRollNumber
      ) {
        alert("Please fill all 10th academic details");
        return false;
      }
      if (
        parseFloat(form.sscPercentage) > 100 ||
        parseFloat(form.sscPercentage) < 0
      ) {
        alert("Please enter a valid percentage (0-100)");
        return false;
      }
      return true;
    }
    if (step === steps.hsc) {
      if (
        !form.hscSchoolName ||
        !form.hscBoard ||
        !form.hscPassingYear ||
        !form.hscPercentage ||
        !form.hscRollNumber
      ) {
        alert("Please fill all 12th academic details");
        return false;
      }
      if (
        parseFloat(form.hscPercentage) > 100 ||
        parseFloat(form.hscPercentage) < 0
      ) {
        alert("Please enter a valid percentage (0-100)");
        return false;
      }
      return true;
    }
    if (step === steps.course) {
      if (!form.department_id || !form.course_id || !form.admissionYear) {
        alert("Please select department, course and admission year");
        return false;
      }
      return true;
    }
    if (step === steps.documents) {
      if (!documentConfig || documentConfig.length === 0) return true;
      for (const doc of documentConfig) {
        if (doc.type === "category_certificate" && form.category === "GEN")
          continue;
        if (doc.enabled && doc.mandatory && !form[doc.type]) {
          alert(`Please upload ${doc.label} (Mandatory)`);
          return false;
        }
      }
      return true;
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
      steps.documents,
    ].filter(Boolean);
    if (allStepNums.includes(currentStep) && !validateStep(currentStep)) return;
    if (currentStep >= steps.total) return;
    setCurrentStep((p) => p + 1);
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((p) => p - 1);
      window.scrollTo(0, 0);
    }
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const steps = getStepNumbers();
    if (!validateStep(steps.documents)) return;
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
      formData.append("addressLine", form.addressLine);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("pincode", form.pincode);
      formData.append("fatherName", form.fatherName);
      formData.append("fatherMobile", form.fatherMobile);
      formData.append("motherName", form.motherName);
      formData.append("motherMobile", form.motherMobile);

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
      if (form.category !== "GEN" && form.category_certificate)
        formData.append("categoryCertificate", form.category_certificate);

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
          fatherName: "",
          fatherMobile: "",
          motherName: "",
          motherMobile: "",
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
            className="sr-input"
            name="fullName"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Email Address <span className="sr-req">*</span>
          </label>
          <input
            type="email"
            className="sr-input"
            name="email"
            placeholder="your.email@example.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Password <span className="sr-req">*</span>
          </label>
          <input
            type="password"
            className="sr-input"
            name="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mobile Number <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="mobileNumber"
            placeholder="10-digit mobile number"
            value={form.mobileNumber}
            onChange={handleChange}
            maxLength="10"
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Gender <span className="sr-req">*</span>
          </label>
          <select
            className="sr-select"
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
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Date of Birth <span className="sr-req">*</span>
          </label>
          <input
            type="date"
            className="sr-input"
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field sr-field--full">
          <label className="sr-label">
            Category <span className="sr-req">*</span>
          </label>
          <select
            className="sr-select"
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
        </div>
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
            className="sr-input"
            name="fatherName"
            placeholder="Enter father's full name"
            value={form.fatherName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Father's Mobile <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="fatherMobile"
            placeholder="10-digit mobile number"
            value={form.fatherMobile}
            onChange={handleChange}
            maxLength="10"
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mother's Name <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="motherName"
            placeholder="Enter mother's full name"
            value={form.motherName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Mother's Mobile <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="motherMobile"
            placeholder="10-digit mobile number"
            value={form.motherMobile}
            onChange={handleChange}
            maxLength="10"
            required
          />
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
            className="sr-input"
            name="addressLine"
            placeholder="House/Flat No., Building, Street, Landmark"
            value={form.addressLine}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            City <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="city"
            placeholder="Enter your city"
            value={form.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            State <span className="sr-req">*</span>
          </label>
          <input
            className="sr-input"
            name="state"
            placeholder="Enter your state"
            value={form.state}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Pincode <span className="sr-req">*</span>
          </label>
          <input
            type="text"
            className="sr-input"
            name="pincode"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={handleChange}
            maxLength="6"
            pattern="\d{6}"
            required
          />
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
              className="sr-input"
              name="sscSchoolName"
              placeholder="Enter your 10th school name"
              value={form.sscSchoolName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Board <span className="sr-req">*</span>
            </label>
            <input
              className="sr-input"
              name="sscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.sscBoard}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Passing Year <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              className="sr-input"
              name="sscPassingYear"
              placeholder="YYYY"
              value={form.sscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Percentage / CGPA <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="sr-input"
              name="sscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.sscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Roll Number <span className="sr-req">*</span>
            </label>
            <input
              className="sr-input"
              name="sscRollNumber"
              placeholder="Enter your 10th roll number"
              value={form.sscRollNumber}
              onChange={handleChange}
              required
            />
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
              className="sr-input"
              name="hscSchoolName"
              placeholder="Enter your 12th school/college name"
              value={form.hscSchoolName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Board <span className="sr-req">*</span>
            </label>
            <input
              className="sr-input"
              name="hscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.hscBoard}
              onChange={handleChange}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Stream <span className="sr-req">*</span>
            </label>
            <select
              className="sr-select"
              name="hscStream"
              value={form.hscStream}
              onChange={handleChange}
              required
            >
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="Vocational">Vocational</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Passing Year <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              className="sr-input"
              name="hscPassingYear"
              placeholder="YYYY"
              value={form.hscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Percentage / CGPA <span className="sr-req">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              className="sr-input"
              name="hscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.hscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="sr-field">
            <label className="sr-label">
              Roll Number <span className="sr-req">*</span>
            </label>
            <input
              className="sr-input"
              name="hscRollNumber"
              placeholder="Enter your 12th roll number"
              value={form.hscRollNumber}
              onChange={handleChange}
              required
            />
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
            className="sr-select"
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
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Course <span className="sr-req">*</span>
          </label>
          <select
            className="sr-select"
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
        </div>
        <div className="sr-field">
          <label className="sr-label">
            Admission Year <span className="sr-req">*</span>
          </label>
          <input
            type="number"
            className="sr-input"
            name="admissionYear"
            value={form.admissionYear}
            onChange={handleChange}
            min="1900"
            max="2100"
            required
          />
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
                  accept={doc.allowedFormats.map((f) => `.${f}`).join(",")}
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
                    {doc.allowedFormats.join(", ").toUpperCase()}
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
          <form onSubmit={handleSubmit}>
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
                  type="submit"
                  className="sr-btn-submit"
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
        .sr-select { width:100%; padding:.7rem 1rem; background:var(--rp-input-bg); border:1.5px solid var(--rp-input-border); border-radius:10px; font-family:var(--font); font-size:.87rem; color:var(--rp-text); outline:none; transition:all .2s ease; appearance:none; cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233db5e6' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 1rem center; padding-right:2.5rem; }
        .sr-select:hover { background-color:#e4f2fa; border-color:rgba(61,181,230,.42); }
        .sr-select:focus { background-color:var(--rp-input-focus-bg); border-color:var(--cyan-400); box-shadow:0 0 0 3px rgba(61,181,230,.11); }

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
      `}</style>
    </div>
  );
}
