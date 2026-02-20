import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUniversity,
  FaUserGraduate,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaUpload,
  FaFilePdf,
  FaImage,
  FaBook,
  FaInfoCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt
} from "react-icons/fa";

/* ================= PUBLIC AXIOS (NO TOKEN) ================= */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

export default function StudentRegister() {
  const { collegeCode } = useParams();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [documentConfig, setDocumentConfig] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);

  const [form, setForm] = useState({
    // STEP 1 - Personal Information
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    gender: "",
    dateOfBirth: "",
    category: "GEN",

    // STEP 2 - Parent/Guardian Details
    fatherName: "",
    fatherMobile: "",
    motherName: "",
    motherMobile: "",

    // STEP 3 - Address Details
    addressLine: "",
    city: "",
    state: "",
    pincode: "",

    // STEP 4 - 10th Academic Details
    sscSchoolName: "",
    sscBoard: "",
    sscPassingYear: "",
    sscPercentage: "",
    sscRollNumber: "",

    // STEP 5 - 12th Academic Details
    hscSchoolName: "",
    hscBoard: "",
    hscStream: "Science",
    hscPassingYear: "",
    hscPercentage: "",
    hscRollNumber: "",

    // STEP 6 - Course Selection
    department_id: "",
    course_id: "",
    admissionYear: new Date().getFullYear(),

    // STEP 7 - Document Uploads (Dynamic based on college config)
    // Documents will be added dynamically based on config
  });

  /* ================= LOAD COLLEGE NAME ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        const res = await publicApi.get(`/public/departments/${collegeCode}`);
        if (res.data && res.data.collegeName) {
          setCollegeName(res.data.collegeName);
        }
      } catch (err) {
        console.error("Failed to load college info:", err);
      }
    };

    if (collegeCode) {
      fetchCollege();
    }
  }, [collegeCode]);

  /* ================= LOAD DOCUMENT CONFIG ================= */
  useEffect(() => {
    const loadDocumentConfig = async () => {
      try {
        setConfigLoading(true);
        console.log("📥 Loading document config for college:", collegeCode);
        const res = await publicApi.get(`/document-config/${collegeCode}`);
        
        console.log("📄 API Response:", res.data);
        console.log("📋 Documents received:", res.data.documents?.length);
        
        if (res.data && res.data.documents) {
          setDocumentConfig(res.data.documents);
          console.log("✅ Document config loaded successfully");
        }
      } catch (err) {
        console.error("❌ Failed to load document config:", err);
        // Use default config if failed
      } finally {
        setConfigLoading(false);
      }
    };

    if (collegeCode) {
      loadDocumentConfig();
    }
  }, [collegeCode]);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await publicApi.get(`/public/departments/${collegeCode}`);
        setDepartments(res.data.departments || res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load departments");
      }
    };

    fetchDepartments();
  }, [collegeCode]);

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!form.department_id || !collegeCode) return;

    const fetchCourses = async () => {
      try {
        const res = await publicApi.get(
          `/public/courses/${collegeCode}/department/${form.department_id}`
        );
        setCourses(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load courses");
      }
    };

    fetchCourses();
  }, [form.department_id, collegeCode]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= HANDLE FILE CHANGE ================= */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const fieldName = e.target.name;

    if (file) {
      // Validate: Only accept documents that are enabled in config
      const docConfig = documentConfig.find(doc => doc.type === fieldName);
      if (!docConfig) {
        alert(`${fieldName} is not required for this college`);
        return;
      }

      // Validate file format
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!docConfig.allowedFormats.includes(fileExt)) {
        alert(`${docConfig.label} accepts only: ${docConfig.allowedFormats.join(', ').toUpperCase()}`);
        return;
      }

      // Validate file size (use config max size or default 5MB)
      const maxSize = (docConfig.maxFileSize || 5) * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${docConfig.label} file size should be less than ${docConfig.maxFileSize || 5}MB`);
        return;
      }

      setForm({
        ...form,
        [fieldName]: file
      });
    }
  };

  /* ================= CHECK IF DOCUMENT TYPE IS ENABLED ================= */
  const isDocEnabled = (type) => {
    return documentConfig.some(doc => doc.type === type && doc.enabled);
  };

  /* ================= GET DYNAMIC STEP NUMBERS ================= */
  const getStepNumbers = () => {
    const has10th = isDocEnabled("10th_marksheet");
    const has12th = isDocEnabled("12th_marksheet");
    
    let step = 3; // After personal, parent, address
    
    const result = {
      personal: 1,
      parent: 2,
      address: 3,
      ssc: null,
      hsc: null,
      course: null,
      documents: null
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

  /* ================= VALIDATE STEP ================= */
  const validateStep = (step) => {
    const steps = getStepNumbers();
    
    // Validate Personal Info
    if (step === steps.personal) {
      if (!form.fullName || !form.email || !form.password || !form.mobileNumber || !form.dateOfBirth) {
        alert("Please fill all required fields in Personal Information");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        alert("Please enter a valid email address");
        return false;
      }
      if (!/^\d{10}$/.test(form.mobileNumber)) {
        alert("Please enter a valid 10-digit mobile number");
        return false;
      }
      return true;
    }
    
    // Validate Parent Details
    if (step === steps.parent) {
      if (!form.fatherName || !form.fatherMobile || !form.motherName || !form.motherMobile) {
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
    
    // Validate Address
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
    
    // Validate 10th Details (only if enabled)
    if (step === steps.ssc) {
      if (!form.sscSchoolName || !form.sscBoard || !form.sscPassingYear || !form.sscPercentage || !form.sscRollNumber) {
        alert("Please fill all 10th academic details");
        return false;
      }
      if (parseFloat(form.sscPercentage) > 100 || parseFloat(form.sscPercentage) < 0) {
        alert("Please enter a valid percentage (0-100)");
        return false;
      }
      return true;
    }
    
    // Validate 12th Details (only if enabled)
    if (step === steps.hsc) {
      if (!form.hscSchoolName || !form.hscBoard || !form.hscPassingYear || !form.hscPercentage || !form.hscRollNumber) {
        alert("Please fill all 12th academic details");
        return false;
      }
      if (parseFloat(form.hscPercentage) > 100 || parseFloat(form.hscPercentage) < 0) {
        alert("Please enter a valid percentage (0-100)");
        return false;
      }
      return true;
    }
    
    // Validate Course Selection
    if (step === steps.course) {
      if (!form.department_id || !form.course_id || !form.admissionYear) {
        alert("Please select department, course and admission year");
        return false;
      }
      return true;
    }
    
    // Validate Document Upload
    if (step === steps.documents) {
      for (const doc of documentConfig) {
        // Skip category certificate if category is GEN
        if (doc.type === 'category_certificate' && form.category === 'GEN') {
          continue;
        }
        
        if (doc.enabled && doc.mandatory && !form[doc.type]) {
          alert(`Please upload ${doc.label} (Mandatory)`);
          return false;
        }
      }
      return true;
    }
    
    return true;
  };

  /* ================= NAVIGATION ================= */
  const handleNext = () => {
    const steps = getStepNumbers();
    
    // Validate current step before moving to next
    if (currentStep === steps.ssc && !validateStep(steps.ssc)) return;
    if (currentStep === steps.hsc && !validateStep(steps.hsc)) return;
    if (currentStep === steps.course && !validateStep(steps.course)) return;
    if (currentStep === steps.documents && !validateStep(steps.documents)) return;
    if (currentStep === steps.personal && !validateStep(steps.personal)) return;
    if (currentStep === steps.parent && !validateStep(steps.parent)) return;
    if (currentStep === steps.address && !validateStep(steps.address)) return;
    
    // Don't go beyond the last step
    if (currentStep >= steps.total) return;
    
    setCurrentStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const steps = getStepNumbers();
    if (!validateStep(steps.documents)) return;

    setLoading(true);
    setError("");

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Append all form fields
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
      
      // Parent/Guardian Details
      formData.append("fatherName", form.fatherName);
      formData.append("fatherMobile", form.fatherMobile);
      formData.append("motherName", form.motherName);
      formData.append("motherMobile", form.motherMobile);
      
      // 10th (SSC) Academic Details
      formData.append("sscSchoolName", form.sscSchoolName);
      formData.append("sscBoard", form.sscBoard);
      formData.append("sscPassingYear", form.sscPassingYear);
      formData.append("sscPercentage", form.sscPercentage);
      formData.append("sscRollNumber", form.sscRollNumber);
      
      // 12th (HSC) Academic Details
      formData.append("hscSchoolName", form.hscSchoolName);
      formData.append("hscBoard", form.hscBoard);
      formData.append("hscStream", form.hscStream);
      formData.append("hscPassingYear", form.hscPassingYear);
      formData.append("hscPercentage", form.hscPercentage);
      formData.append("hscRollNumber", form.hscRollNumber);
      
      // Course & Department
      formData.append("department_id", form.department_id);
      formData.append("course_id", form.course_id);
      formData.append("admissionYear", form.admissionYear);
      formData.append("currentSemester", "1");

      // Append files dynamically based on document config
      documentConfig.forEach((doc) => {
        if (form[doc.type]) {
          formData.append(doc.type, form[doc.type]);
        }
      });

      // Submit with FormData (includes files)
      const response = await publicApi.post(
        `/students/register/${collegeCode}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      alert(response.data.message || "🎉 Registration successful! Wait for college approval.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER STEP INDICATOR ================= */
  const renderStepIndicator = () => {
    const steps = getStepNumbers();
    
    // Build dynamic steps array based on config
    const dynamicSteps = [
      { num: 1, title: "Personal Info" },
      { num: 2, title: "Parent Details" },
      { num: 3, title: "Address" },
    ];
    
    if (steps.ssc) {
      dynamicSteps.push({ num: steps.ssc, title: "10th Details" });
    }
    if (steps.hsc) {
      dynamicSteps.push({ num: steps.hsc, title: "12th Details" });
    }
    dynamicSteps.push({ num: steps.course, title: "Course" });
    dynamicSteps.push({ num: steps.documents, title: "Documents" });

    return (
      <div className="step-indicator mb-4">
        {dynamicSteps.map((step) => (
          <div 
            key={step.num} 
            className={`step-item ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
          >
            <div className="step-number">
              {currentStep > step.num ? <FaCheckCircle /> : step.num}
            </div>
            <div className="step-title">{step.title}</div>
          </div>
        ))}
        <style>{`
          .step-indicator {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            padding: 20px 0;
            border-bottom: 2px solid #e0e0e0;
          }
          .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 80px;
            position: relative;
          }
          .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e0e0e0;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 8px;
            transition: all 0.3s ease;
          }
          .step-item.active .step-number {
            background: linear-gradient(45deg, #286079, #5798b7);
            color: white;
            box-shadow: 0 4px 15px rgba(40, 96, 121, 0.4);
          }
          .step-item.completed .step-number {
            background: #28a745;
            color: white;
          }
          .step-title {
            font-size: 12px;
            color: #666;
            text-align: center;
            font-weight: 500;
          }
          .step-item.active .step-title {
            color: #286079;
            font-weight: 600;
          }
          @media (max-width: 768px) {
            .step-indicator {
              flex-wrap: nowrap;
              overflow-x: auto;
              justify-content: flex-start;
            }
            .step-item {
              min-width: 70px;
            }
            .step-title {
              font-size: 10px;
            }
          }
        `}</style>
      </div>
    );
  };

  /* ================= RENDER STEP 1 - PERSONAL INFORMATION ================= */
  const renderPersonalInfo = () => (
    <div className="animate-fade">
      <h5 className="fw-bold mb-3 text-primary">
        <FaUserGraduate className="me-2" />
        Personal Information
      </h5>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
            name="fullName" 
            placeholder="Enter your full name" 
            value={form.fullName}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
          <input 
            type="email"
            className="form-control" 
            name="email" 
            placeholder="your.email@example.com" 
            value={form.email}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Password <span className="text-danger">*</span></label>
          <input 
            type="password" 
            className="form-control" 
            name="password" 
            placeholder="Create a strong password" 
            value={form.password}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Mobile Number <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
            name="mobileNumber" 
            placeholder="10-digit mobile number" 
            value={form.mobileNumber}
            onChange={handleChange} 
            maxLength="10"
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
          <select className="form-select" name="gender" value={form.gender} onChange={handleChange}>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
          <input 
            type="date" 
            className="form-control" 
            name="dateOfBirth" 
            value={form.dateOfBirth}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Category <span className="text-danger">*</span></label>
          <select className="form-select" name="category" value={form.category} onChange={handleChange} required>
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

  /* ================= RENDER STEP 2 - PARENT DETAILS ================= */
  const renderParentDetails = () => (
    <div className="animate-fade">
      <h5 className="fw-bold mb-3 text-primary">
        <FaUniversity className="me-2" />
        Parent / Guardian Information
      </h5>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Father's Name <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
            name="fatherName" 
            placeholder="Enter father's full name" 
            value={form.fatherName}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Father's Mobile Number <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
            name="fatherMobile" 
            placeholder="10-digit mobile number" 
            value={form.fatherMobile}
            onChange={handleChange} 
            maxLength="10"
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Mother's Name <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
            name="motherName" 
            placeholder="Enter mother's full name" 
            value={form.motherName}
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Mother's Mobile Number <span className="text-danger">*</span></label>
          <input 
            className="form-control" 
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

  /* ================= RENDER STEP 3 - ADDRESS DETAILS ================= */
  const renderAddressDetails = () => (
    <div className="animate-fade">
      <h5 className="fw-bold mb-3 text-primary">
        <FaMapMarkerAlt className="me-2" />
        Address / Communication Details
      </h5>
      <p className="text-muted mb-3">
        <FaInfoCircle className="me-2" />
        This address will be used for all official communication and correspondence.
      </p>
      <div className="row g-3">
        <div className="col-md-12">
          <label className="form-label fw-semibold">Address Line <span className="text-danger">*</span></label>
          <input
            className="form-control"
            name="addressLine"
            placeholder="House/Flat No., Building Name, Street, Landmark"
            value={form.addressLine}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">City <span className="text-danger">*</span></label>
          <input
            className="form-control"
            name="city"
            placeholder="Enter your city"
            value={form.city}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">State <span className="text-danger">*</span></label>
          <input
            className="form-control"
            name="state"
            placeholder="Enter your state"
            value={form.state}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Pincode <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            name="pincode"
            placeholder="6-digit pincode"
            value={form.pincode}
            onChange={handleChange}
            maxLength="6"
            pattern="\d{6}"
            required
          />
          <small className="text-muted">Enter 6-digit pincode</small>
        </div>
      </div>
    </div>
  );

  /* ================= RENDER STEP 4 - 10TH ACADEMIC DETAILS ================= */
  const render10thDetails = () => {
    // Don't render if 10th marksheet is not enabled
    if (!isDocEnabled("10th_marksheet")) {
      return (
        <div className="text-center py-5">
          <div className="alert alert-info">
            <FaInfoCircle className="me-2" />
            10th academic details are not required for this college.
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade">
        <h5 className="fw-bold mb-3 text-primary">
          <FaFilePdf className="me-2" />
          10th (SSC) Academic Details
        </h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">School Name <span className="text-danger">*</span></label>
            <input
              className="form-control"
              name="sscSchoolName"
              placeholder="Enter your 10th school name"
              value={form.sscSchoolName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Board <span className="text-danger">*</span></label>
            <input
              className="form-control"
              name="sscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.sscBoard}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Passing Year <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              name="sscPassingYear"
              placeholder="YYYY"
              value={form.sscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Percentage / CGPA <span className="text-danger">*</span></label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              name="sscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.sscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Roll Number <span className="text-danger">*</span></label>
            <input
              className="form-control"
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

  /* ================= RENDER STEP 5 - 12TH ACADEMIC DETAILS ================= */
  const render12thDetails = () => {
    // Don't render if 12th marksheet is not enabled
    if (!isDocEnabled("12th_marksheet")) {
      return (
        <div className="text-center py-5">
          <div className="alert alert-info">
            <FaInfoCircle className="me-2" />
            12th academic details are not required for this college.
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade">
        <h5 className="fw-bold mb-3 text-primary">
          <FaFilePdf className="me-2" />
          12th (HSC) Academic Details
        </h5>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">School / College Name <span className="text-danger">*</span></label>
            <input
              className="form-control"
              name="hscSchoolName"
              placeholder="Enter your 12th school/college name"
              value={form.hscSchoolName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Board <span className="text-danger">*</span></label>
            <input
              className="form-control"
              name="hscBoard"
              placeholder="e.g., State Board, CBSE, ICSE"
              value={form.hscBoard}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Stream <span className="text-danger">*</span></label>
            <select className="form-select" name="hscStream" value={form.hscStream} onChange={handleChange} required>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="Vocational">Vocational</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Passing Year <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              name="hscPassingYear"
              placeholder="YYYY"
              value={form.hscPassingYear}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear()}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Percentage / CGPA <span className="text-danger">*</span></label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              name="hscPercentage"
              placeholder="e.g., 75.50 or 8.5"
              value={form.hscPercentage}
              onChange={handleChange}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Roll Number <span className="text-danger">*</span></label>
            <input
              className="form-control"
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

  /* ================= RENDER STEP 5 - COURSE SELECTION ================= */
  const renderCourseSelection = () => (
    <div className="animate-fade">
      <h5 className="fw-bold mb-3 text-primary">
        <FaBook className="me-2" />
        Course & Department Selection
      </h5>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Select Department <span className="text-danger">*</span></label>
          <select 
            className="form-select" 
            name="department_id" 
            value={form.department_id} 
            onChange={handleChange} 
            required 
          >
            <option value="">-- Select Department --</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold">Select Course <span className="text-danger">*</span></label>
          <select 
            className="form-select" 
            name="course_id" 
            value={form.course_id} 
            onChange={handleChange} 
            required 
            disabled={!form.department_id}
          >
            <option value="">
              {!form.department_id ? "Select department first" : "-- Select Course --"}
            </option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold">Admission Year <span className="text-danger">*</span></label>
          <input
            type="number"
            className="form-control"
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
        <div className="alert alert-info mt-3">
          <FaInfoCircle className="me-2" />
          <strong>Selected:</strong> {courses.find(c => c._id === form.course_id)?.name || ''}
          {departments.find(d => d._id === form.department_id)?.name && 
            ` in ${departments.find(d => d._id === form.department_id)?.name}`
          }
        </div>
      )}
    </div>
  );

  /* ================= RENDER STEP 7 - DOCUMENT UPLOAD ================= */
  const renderDocumentUpload = () => {
    if (configLoading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading document requirements...</p>
        </div>
      );
    }

    console.log("📄 Rendering documents - Config length:", documentConfig.length);
    console.log("📄 Enabled documents:", documentConfig.filter(d => d.enabled).length);

    return (
      <div className="animate-fade">
        <h5 className="fw-bold mb-3 text-primary">
          <FaUpload className="me-2" />
          Document Upload
        </h5>
        <p className="text-muted mb-4">
          <FaInfoCircle className="me-2" />
          <strong>Note:</strong> Upload the required documents as per your college guidelines.
          Maximum file size: 5MB per file (unless specified).
        </p>

        <div className="row g-3">
          {documentConfig.filter(doc => {
            // Conditional rendering for category certificate
            if (doc.type === 'category_certificate') {
              // Show category certificate only if category is not GEN
              return doc.enabled && form.category !== 'GEN';
            }
            return doc.enabled;
          }).map((doc) => (
            <div className="col-md-6" key={doc.type}>
              <label className="form-label fw-semibold">
                {doc.label}
                {doc.mandatory && <span className="text-danger"> *</span>}
              </label>
              <div className="upload-box">
                <input
                  type="file"
                  name={doc.type}
                  accept={doc.allowedFormats.map(f => `.${f}`).join(',')}
                  onChange={handleFileChange}
                  className="form-control"
                  required={doc.mandatory && (doc.type !== 'category_certificate' || form.category !== 'GEN')}
                />
                <small className="text-muted">
                  {doc.allowedFormats.join(', ').toUpperCase()} only
                  {doc.description && <div className="mt-1">{doc.description}</div>}
                </small>
                {form[doc.type] && (
                  <div className="file-preview mt-2 text-success">
                    <FaCheckCircle className="me-1" />
                    {form[doc.type].name}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Show info message for GEN category */}
          {form.category === 'GEN' && documentConfig.some(doc => doc.type === 'category_certificate' && doc.enabled) && (
            <div className="col-md-12">
              <div className="alert alert-info mb-0">
                <FaInfoCircle className="me-2" />
                <strong>Category Certificate:</strong> Not required for General (GEN) category students.
              </div>
            </div>
          )}
        </div>

        <div className="alert alert-warning mt-4">
          <FaExclamationTriangle className="me-2" />
          <strong>Important:</strong> The admin will verify:
          <ul className="mb-0 mt-2">
            <li>Marks entered match uploaded marksheet</li>
            <li>Student meets course eligibility criteria</li>
            <li>Documents are clear and valid</li>
          </ul>
        </div>

        <style>{`
          .upload-box {
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 15px;
            background: #f8f9fa;
            transition: all 0.3s ease;
          }
          .upload-box:hover {
            border-color: #286079;
            background: #e9ecef;
          }
          .file-preview {
            font-size: 13px;
            font-weight: 500;
          }
          .animate-fade {
            animation: fadeIn 0.3s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  };

  /* ================= MAIN RENDER ================= */
  if (!collegeCode) {
    return (
      <div className="container mt-5 text-center">
        <h3>Invalid Registration Link</h3>
      </div>
    );
  }

  return (
    <div className="m-0">
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          minHeight: "100vh",
          padding: "20px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <div
          className="card p-4"
          style={{ 
            width: "100%", 
            maxWidth: "1100px", 
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
          }}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <FaUniversity size={48} className="mb-2" style={{ color: "#286079" }} />
            <h3 className="fw-bold">{collegeName || "NOVAA"}</h3>
            <p className="text-muted mb-1">Student Self Registration</p>
            <div className="d-flex gap-2 justify-content-center">
              <span className="badge bg-dark">{collegeCode}</span>
              {collegeName && (
                <span className="badge bg-success">{collegeName}</span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger text-center">
              {error}
            </div>
          )}

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Render Current Step based on dynamic step numbers */}
            {(() => {
              const steps = getStepNumbers();
              
              if (currentStep === steps.personal) return renderPersonalInfo();
              if (currentStep === steps.parent) return renderParentDetails();
              if (currentStep === steps.address) return renderAddressDetails();
              if (currentStep === steps.ssc) return render10thDetails();
              if (currentStep === steps.hsc) return render12thDetails();
              if (currentStep === steps.course) return renderCourseSelection();
              if (currentStep === steps.documents) return renderDocumentUpload();
              
              return null;
            })()}

            {/* Navigation Buttons */}
            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <FaChevronLeft className="me-2" />
                Previous
              </button>

              {(() => {
                const steps = getStepNumbers();
                
                if (currentStep < steps.total) {
                  return (
                    <button
                      type="button"
                      className="btn px-4 text-light fw-semibold"
                      style={{ background: "linear-gradient(45deg, #286079, #5798b7)" }}
                      onClick={handleNext}
                    >
                      Next
                      <FaChevronRight className="ms-2" />
                    </button>
                  );
                } else {
                  return (
                    <button
                      type="submit"
                      className="btn px-4 text-light fw-semibold"
                      style={{ background: "linear-gradient(45deg, #28a745, #20c997)" }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="spin me-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="me-2" />
                          Submit Registration
                        </>
                      )}
                    </button>
                  );
                }
              })()}
            </div>
          </form>

          <div className="text-center mt-3 text-muted">
            <small>
              After registration, your application will be reviewed by the college admin.
              You will be notified once approved.
            </small>
          </div>
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
