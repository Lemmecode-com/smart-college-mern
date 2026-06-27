import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useContext, useState, useEffect, Suspense, lazy } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Suppress specific React Router development warnings and excessive console logs for cleaner output
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Suppress specific warnings
  console.warn = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (
      message.includes("No routes matched") ||
      message.includes("react-i18next")
    ) {
      return;
    }
    originalWarn(...args);
  };

  // Reduce excessive logging from React Strict Mode and development tools
  console.log = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    // Filter out common development noise
    if (
      message.includes("Download the React DevTools") ||
      message.includes("react-i18next") ||
      message.includes("$ReactRefresh")
    ) {
      return;
    }
    originalLog(...args);
  };
}

import { AuthContext } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import Loading from "./components/Loading";

/* ================= LANDING PAGE ================= */
import LandingPage from "./pages/LandingPage";

/* ================= AUTH ================= */
import Login from "./pages/auth/Login";
import StudentRegister from "./pages/auth/StudentRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ChangePassword from "./pages/auth/ChangePassword";

/* ================= SHARED CROSS-ROLE COMPONENTS (EAGER) ================= */
import NotificationForm from "./components/NotificationForm";
import NotificationListPage from "./components/NotificationListPage";
import NotificationDetails from "./components/NotificationDetails";
import ViewStudent from "./pages/dashboard/College-Admin/ViewStudent";
import ApproveStudents from "./pages/dashboard/College-Admin/ApproveStudents";
import DeactivatedStudents from "./pages/dashboard/College-Admin/DeactivatedStudents";
import PendingApprovals from "./pages/dashboard/College-Admin/PendingApprovals";
import ViewApproveStudent from "./pages/dashboard/College-Admin/ViewApproveStudent";
import AuditLogs from "./pages/dashboard/College-Admin/AuditLogs";
import ViewStaffProfile from "./pages/dashboard/College-Admin/ViewStaffProfile";
import EditStaffProfile from "./pages/dashboard/College-Admin/EditStaffProfile";

/* ================= SUPER ADMIN (LAZY) ================= */
const SuperAdminDashboard = lazy(() => import("./pages/dashboard/Super-Admin/SuperAdminDashboard"));
const CreateNewCollege = lazy(() => import("./pages/dashboard/Super-Admin/CreateNewCollege"));
const CollegeList = lazy(() => import("./pages/dashboard/Super-Admin/CollegeList"));
const ViewCollegeDetails = lazy(() => import("./pages/dashboard/Super-Admin/ViewCollegeDetails"));
const EditCollege = lazy(() => import("./pages/dashboard/Super-Admin/EditCollege"));
const SuperAdminReports = lazy(() => import("./pages/dashboard/Super-Admin/SuperAdminReports"));
const SecurityAudit = lazy(() => import("./pages/dashboard/Super-Admin/SecurityAudit"));
const PlatformSupportConfig = lazy(() => import("./pages/dashboard/Super-Admin/PlatformSupportConfig"));
const GeneralSuperSett = lazy(() => import("./pages/dashboard/Super-Admin/System-Settings/GeneralSuperSett"));
const UserManagementSett = lazy(() => import("./pages/dashboard/Super-Admin/System-Settings/UserManagementSett"));

/* ================= COLLEGE ADMIN (LAZY) ================= */
const CollegeAdminDashboard = lazy(() => import("./pages/dashboard/College-Admin/CollegeAdminDashboard"));
const CollegeProfile = lazy(() => import("./pages/dashboard/College-Admin/CollegeProfile"));
const EditCollegeProfile = lazy(() => import("./pages/dashboard/College-Admin/EditCollegeProfile"));
const CollegeSetupWizard = lazy(() => import("./pages/dashboard/College-Admin/CollegeSetupWizard"));
const DocumentSettings = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/DocumentSettings"));
const CreateFeeStructure = lazy(() => import("./pages/dashboard/College-Admin/CreateFeeStructure"));
const ViewFeeStructure = lazy(() => import("./pages/dashboard/College-Admin/ViewFeeStructure"));
const FeeStructureList = lazy(() => import("./pages/dashboard/College-Admin/FeeStructureList"));
const EditFeeStructure = lazy(() => import("./pages/dashboard/College-Admin/EditFeeStructure"));
const ReportDashboard = lazy(() => import("./pages/dashboard/College-Admin/Reports/ReportDashboard"));
const AdminReports = lazy(() => import("./pages/dashboard/College-Admin/Reports/AdminReports"));
const AttendanceSummary = lazy(() => import("./pages/dashboard/College-Admin/Reports/AttendanceSummary"));
const PaymentReports = lazy(() => import("./pages/dashboard/College-Admin/Reports/PaymentReports"));
const PaymentHistory = lazy(() => import("./pages/dashboard/College-Admin/PaymentHistory"));
const StudentPaymentReport = lazy(() => import("./pages/dashboard/College-Admin/StudentPaymentReport"));
const StudentReports = lazy(() => import("./pages/dashboard/College-Admin/StudentReports"));
const PaymentTrends = lazy(() => import("./pages/dashboard/College-Admin/PaymentTrends"));
const DepartmentList = lazy(() => import("./pages/dashboard/College-Admin/DepartmentList"));
const AddDepartment = lazy(() => import("./pages/dashboard/College-Admin/AddDepartment"));
const EditDepartment = lazy(() => import("./pages/dashboard/College-Admin/EditDepartment"));
const AssignHod = lazy(() => import("./pages/dashboard/College-Admin/AssignHod"));
const ViewDepartment = lazy(() => import("./pages/dashboard/College-Admin/ViewDepartment"));
const CourseList = lazy(() => import("./pages/dashboard/College-Admin/CourseList"));
const AddCourse = lazy(() => import("./pages/dashboard/College-Admin/AddCourse"));
const EditCourse = lazy(() => import("./pages/dashboard/College-Admin/EditCourse"));
const ViewCourse = lazy(() => import("./pages/dashboard/College-Admin/ViewCourse"));
const SubjectList = lazy(() => import("./pages/dashboard/College-Admin/SubjectList"));
const AddSubject = lazy(() => import("./pages/dashboard/College-Admin/AddSubject"));
const ViewSubject = lazy(() => import("./pages/dashboard/College-Admin/ViewSubject"));
const EditSubject = lazy(() => import("./pages/dashboard/College-Admin/EditSubject"));
const TeachersList = lazy(() => import("./pages/dashboard/College-Admin/TeachersList"));
const ViewTeacher = lazy(() => import("./pages/dashboard/College-Admin/ViewTeacher"));
const AddTeacher = lazy(() => import("./pages/dashboard/College-Admin/AddTeacher"));
const EditTeacher = lazy(() => import("./pages/dashboard/College-Admin/EditTeacher"));
const AssignTeacherSubjects = lazy(() => import("./pages/dashboard/College-Admin/AssignTeacherSubjects"));
const CreateStaff = lazy(() => import("./pages/dashboard/College-Admin/CreateStaff"));
const StaffList = lazy(() => import("./pages/dashboard/College-Admin/StaffList"));
const FeeSetting = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/FeeSetting"));
const GeneralSetting = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/GeneralSetting"));
const AcademicSetting = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/AcademicSetting"));
const NotificationSetting = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/NotificationSetting"));
const PromotionSetting = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/PromotionSetting"));
const EmailConfigurations = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/EmailConfigurations"));
const StripeConfiguration = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/StripeConfiguration"));
const RazorpayConfiguration = lazy(() => import("./pages/dashboard/College-Admin/SystemSetting/RazorpayConfiguration"));
const StudentPromotion = lazy(() => import("./pages/dashboard/College-Admin/StudentPromotion"));
const AlumniList = lazy(() => import("./pages/dashboard/College-Admin/AlumniList"));

/* ================= ACCOUNTANT (LAZY) ================= */
const AccountantDashboard = lazy(() => import("./pages/dashboard/Accountant/AccountantDashboard"));
const RecordOfflinePayment = lazy(() => import("./pages/dashboard/Accountant/RecordOfflinePayment"));
const DefaulterList = lazy(() => import("./pages/dashboard/Accountant/DefaulterList"));

/* ================= ADMISSION OFFICER (LAZY) ================= */
const AdmissionDashboard = lazy(() => import("./pages/dashboard/Admission/AdmissionDashboard"));

/* ================= PARENT / GUARDIAN (LAZY) ================= */
const ParentDashboard = lazy(() => import("./pages/dashboard/Parent/ParentDashboard"));
const ChildrenList = lazy(() => import("./pages/dashboard/Parent/ChildrenList"));
const ChildDetail = lazy(() => import("./pages/dashboard/Parent/ChildDetail"));
const ChildProfile = lazy(() => import("./pages/dashboard/Parent/ChildProfile"));
const ChildAttendance = lazy(() => import("./pages/dashboard/Parent/ChildAttendance"));
const ChildFees = lazy(() => import("./pages/dashboard/Parent/ChildFees"));

/* ================= PRINCIPAL (LAZY) ================= */
const PrincipalDashboard = lazy(() => import("./pages/dashboard/Principal/PrincipalDashboard"));

/* ================= PLATFORM SUPPORT (LAZY) ================= */
const PlatformSupportDashboard = lazy(() => import("./pages/dashboard/PlatformSupport/PlatformSupportDashboard"));
const SystemHealth = lazy(() => import("./pages/dashboard/PlatformSupport/SystemHealth"));
const AuditLogsViewer = lazy(() => import("./pages/dashboard/PlatformSupport/AuditLogsViewer"));
const SystemLogs = lazy(() => import("./pages/dashboard/PlatformSupport/SystemLogs"));
const IntegrationMonitoring = lazy(() => import("./pages/dashboard/PlatformSupport/IntegrationMonitoring"));
const SupportTickets = lazy(() => import("./pages/dashboard/PlatformSupport/SupportTickets"));
const ErrorAnalytics = lazy(() => import("./pages/dashboard/PlatformSupport/ErrorAnalytics"));
const CollegeHealthOverview = lazy(() => import("./pages/dashboard/PlatformSupport/CollegeHealthOverview"));
const DatabaseDiagnostics = lazy(() => import("./pages/dashboard/PlatformSupport/DatabaseDiagnostics"));
const ConfigurationViewer = lazy(() => import("./pages/dashboard/PlatformSupport/ConfigurationViewer"));

/* ================= EXAM COORDINATOR (LAZY) ================= */
const ExamDashboard = lazy(() => import("./pages/dashboard/ExamCoordinator/ExamDashboard"));

/* ================= HOD (LAZY) ================= */
const HodDashboard = lazy(() => import("./pages/dashboard/HOD/HodDashboard"));
const HodTeachers = lazy(() => import("./pages/dashboard/HOD/HodTeachers"));
const HodDepartment = lazy(() => import("./pages/dashboard/HOD/HodDepartment"));
const HodProfile = lazy(() => import("./pages/dashboard/HOD/HodProfile"));
const HodExceptionApprovals = lazy(() => import("./pages/dashboard/HOD/HodExceptionApprovals"));
const HodReports = lazy(() => import("./pages/dashboard/HOD/HodReports"));

/* ================= TEACHER (LAZY) ================= */
const TeacherDashboard = lazy(() => import("./pages/dashboard/Teacher/TeacherDashboard"));
const AttendanceSessionsList = lazy(() => import("./pages/dashboard/Teacher/AttendanceSessionsList"));
const SessionDetails = lazy(() => import("./pages/dashboard/Teacher/SessionDetails"));
const MarkAttendanceModal = lazy(() => import("./pages/dashboard/Teacher/MarkAttendanceModal"));
const EditAttendanceModal = lazy(() => import("./pages/dashboard/Teacher/EditAttendanceModal"));
const AttendanceReport = lazy(() => import("./pages/dashboard/Teacher/Attendance/AttendanceReport"));
const MySessions = lazy(() => import("./pages/dashboard/Teacher/Attendance/MySessions"));
const MyProfile = lazy(() => import("./pages/dashboard/Teacher/MyProfile"));
const EditTeacherProfile = lazy(() => import("./pages/dashboard/Teacher/EditTeacherProfile"));
const TimetableList = lazy(() => import("./pages/dashboard/Teacher/Timetable/TimetableList"));
const AddTimetableSlot = lazy(() => import("./pages/dashboard/Teacher/Timetable/AddTimetableSlot"));
const MySchedule = lazy(() => import("./pages/dashboard/Teacher/Timetable/MySchedule"));
const WeeklyTimetable = lazy(() => import("./pages/dashboard/Teacher/Timetable/WeeklyTimetable"));
const MyTimetable = lazy(() => import("./pages/dashboard/Teacher/Timetable/MyTimetable"));
const CreateException = lazy(() => import("./pages/dashboard/Teacher/Timetable/CreateException"));
const ExceptionManagement = lazy(() => import("./pages/dashboard/Teacher/Timetable/ExceptionManagement"));
const CreateTimetable = lazy(() => import("./pages/dashboard/Teacher/Timetable/CreateTimetable"));

/* ================= STUDENT (LAZY) ================= */
const StudentDashboard = lazy(() => import("./pages/dashboard/Student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/dashboard/Student/StudentProfile"));
const EditStudentProfile = lazy(() => import("./pages/dashboard/Student/EditStudentProfile"));
const StudentTimetable = lazy(() => import("./pages/dashboard/Student/StudentTimetable"));
const StudentFees = lazy(() => import("./pages/dashboard/Student/StudentFees"));
const MakePayments = lazy(() => import("./pages/dashboard/Student/MakePayments"));
const FeeReceipt = lazy(() => import("./pages/dashboard/Student/FeeReceipt"));
const PaymentSuccess = lazy(() => import("./pages/dashboard/Student/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/dashboard/Student/PaymentCancel"));
const MyAttendance = lazy(() => import("./pages/dashboard/Student/MyAttendance"));

export default function App() {
  const { user } = useContext(AuthContext);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // Handle window resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileDevice(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call once to set initial state

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <BrowserRouter>
      <AppContent
        user={user}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isMobileDevice={isMobileDevice}
        toggleSidebar={toggleSidebar}
      />
    </BrowserRouter>
  );
}

function AppContent({
  user,
  isMobileOpen,
  setIsMobileOpen,
  isMobileDevice,
  toggleSidebar,
}) {
  const location = useLocation();

  // Hide layout on public/auth routes
  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/verify-otp" ||
    location.pathname.startsWith("/register/");

  // Check if user is authenticated
  const isAuthenticated = !!user;

  return (
    <ErrorBoundary>
      <div className="app-wrapper">
        {/* ================= ROUTES (ALWAYS RENDERED) ================= */}
        <Routes>
          {/* ================= LANDING PAGE (ROOT) ================= */}
          <Route path="/" element={<LandingPage />} />

          {/* ================= ROOT DECIDER (Redirect after login) ================= */}
          <Route
            path="/home"
            element={
              !user ? (
                <Navigate to="/login" />
               ) : user.role === "SUPER_ADMIN" ? (
                 <Navigate to="/super-admin/dashboard" />
               ) : user.role === "COLLEGE_ADMIN" ? (
                 <Navigate to="/dashboard" />
                ) : user.role === "PRINCIPAL" ? (
                  <Navigate to="/dashboard/principal" />
                ) : user.role === "HOD" ? (
                  <Navigate to="/hod/dashboard" />
                ) : user.role === "ACCOUNTANT" ? (
                 <Navigate to="/dashboard/accountant" />
               ) : user.role === "ADMISSION_OFFICER" ? (
                 <Navigate to="/dashboard/admission" />
               ) : user.role === "EXAM_COORDINATOR" ? (
                 <Navigate to="/dashboard/exam" />
               ) : user.role === "PARENT_GUARDIAN" ? (
                 <Navigate to="/dashboard/parent" />
               ) : user.role === "PLATFORM_SUPPORT" ? (
                 <Navigate to="/dashboard/support" />
               ) : user.role === "TEACHER" ? (
                 <Navigate to="/teacher/dashboard" />
               ) : user.role === "STUDENT" ? (
                 <Navigate to="/student/dashboard" />
               ) : (
                 <Navigate to="/login" />
               )
            }
          />

          {/* ================= PUBLIC ROUTES (ALWAYS ACCESSIBLE) ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/register/:collegeCode" element={<StudentRegister />} />

          {/* ================= PROTECTED ROUTES (WITH LAYOUT) ================= */}
          <Route
            element={
              isAuthenticated && !hideLayout ? (
                <Layout
                  isMobileOpen={isMobileOpen}
                  setIsMobileOpen={setIsMobileOpen}
                />
              ) : null
            }
          >
            {/* ================= SUPER ADMIN ================= */}
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/create-college"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <CreateNewCollege />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/colleges-list"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <CollegeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/college/:id"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <ViewCollegeDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/college/:id/edit"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <EditCollege />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/reports"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <SuperAdminReports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/platform-support-config"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <PlatformSupportConfig />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/security-audit"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <SecurityAudit />
                </ProtectedRoute>
              }
            />
            {/* System-Settings */}
            <Route
              path="/super-admin/system-settings/general"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <GeneralSuperSett />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/system-settings/user-management"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                  <UserManagementSett />
                </ProtectedRoute>
              }
            />

            {/* ================= COLLEGE ADMIN ================= */}
            <Route
              path="/college/setup-wizard"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <CollegeSetupWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <CollegeAdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college/profile"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <CollegeProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college/edit-profile"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditCollegeProfile />
                </ProtectedRoute>
              }
            />

             <Route
               path="/college/view-student/:studentId"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL"]}>
                   <ViewStudent />
                 </ProtectedRoute>
               }
             />

            <Route
              path="/students/approve"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ApproveStudents />
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/deactivated"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <DeactivatedStudents />
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/pending-approvals"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <PendingApprovals />
                </ProtectedRoute>
              }
            />

             <Route
               path="/college/view-approved-student/:id"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL", "ACCOUNTANT"]}>
                   <ViewApproveStudent />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/fees/create"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "ACCOUNTANT"]}>
                   <CreateFeeStructure />
                 </ProtectedRoute>
               }
             />

             <Route
               path="/fees/view/:id"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                   <ViewFeeStructure />
                 </ProtectedRoute>
               }
             />

             <Route
               path="/fees/list"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                   <FeeStructureList />
                 </ProtectedRoute>
               }
             />

             <Route
               path="/fees/edit/:id"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "ACCOUNTANT"]}>
                   <EditFeeStructure />
                 </ProtectedRoute>
               }
             />

            {/* ================= COLLEGE ADMIN NOTIFICATIONS ================= */}
            <Route
              path="/notification/create"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <NotificationForm role="college-admin" mode="create" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notification/list"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <NotificationListPage role="college-admin" />
                </ProtectedRoute>
              }
            />
           <Route
             path="/notification/view/:id"
             element={
               <ProtectedRoute
                 allowedRoles={[
                   "COLLEGE_ADMIN",
                   "TEACHER",
                   "STUDENT",
                   "SUPER_ADMIN",
                   "PRINCIPAL",
                   "HOD",
                 ]}
               >
                 <NotificationDetails />
               </ProtectedRoute>
             }
           />
            <Route
              path="/notification/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <NotificationForm role="college-admin" mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification/student"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <NotificationListPage role="student" />
                </ProtectedRoute>
              }
            />

              <Route
                path="/college-admin/reports-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                    <ReportDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/college-admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                    <AdminReports />
                  </ProtectedRoute>
                }
              />

            <Route
              path="/college-admin/reports/attendance"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <AttendanceSummary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college-admin/reports/payment-summary"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                  <PaymentReports />
                </ProtectedRoute>
              }
            />

              <Route
                path="/college-admin/payment-history"
                element={
                  <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                    <PaymentHistory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/college-admin/student-reports"
                element={
                  <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                    <StudentReports />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/college-admin/student-payment-report/:studentId"
                element={
                  <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                    <StudentPaymentReport />
                  </ProtectedRoute>
                }
              />

             <Route
               path="/college-admin/reports/payment-trends"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL", "ACCOUNTANT"]}>
                   <PaymentTrends />
                 </ProtectedRoute>
               }
             />

             {/* ================= PRINCIPAL STUDENTS ================= */}
             <Route
               path="/principal/students"
               element={
                 <ProtectedRoute allowedRoles={["PRINCIPAL"]}>
                   <ApproveStudents principalMode={true} />
                 </ProtectedRoute>
               }
             />

             {/* Audit Logs */}
            <Route
              path="/college-admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />

{/* ACCOUNTANT ROUTES */}
              <Route
                path="/dashboard/accountant"
                element={
                  <ProtectedRoute allowedRoles={["ACCOUNTANT"]}>
                    <AccountantDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/accountant/record-offline-payment"
                element={
                  <ProtectedRoute allowedRoles={["ACCOUNTANT", "COLLEGE_ADMIN"]}>
                    <RecordOfflinePayment />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/accountant/defaulters"
                element={
                  <ProtectedRoute allowedRoles={["ACCOUNTANT", "COLLEGE_ADMIN", "PRINCIPAL"]}>
                    <DefaulterList />
                  </ProtectedRoute>
                }
              />

              {/* ================= ADMISSION OFFICER ================= */}
             <Route
               path="/dashboard/admission"
               element={
                 <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                   <AdmissionDashboard />
                 </ProtectedRoute>
               }
             />
              <Route
                path="/admission/applications"
                element={
                  <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                    <PendingApprovals admissionOfficerMode={true} />
                  </ProtectedRoute>
                }
              />

             {/* NEW: Approved Students list for Admission Officer */}
             <Route
               path="/admission/approved"
               element={
                 <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                   <ApproveStudents admissionOfficerMode={true} />
                 </ProtectedRoute>
               }
              />
              {/* NEW: Promotion page for Admission Officer */}
              <Route
                path="/admission/promotion"
                element={
                  <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                    <StudentPromotion admissionOfficerMode={true} />
                  </ProtectedRoute>
                }
              />
              {/* NEW: Alumni list for Admission Officer */}
              <Route
                path="/admission/alumni"
                element={
                  <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                    <AlumniList admissionOfficerMode={true} />
                  </ProtectedRoute>
                }
              />
             {/* NEW: Deactivated students list for Admission Officer */}
             <Route
               path="/admission/deactivated"
               element={
                 <ProtectedRoute allowedRoles={["ADMISSION_OFFICER"]}>
                   <DeactivatedStudents admissionOfficerMode={true} />
                 </ProtectedRoute>
               }
             />

              {/* ================= PARENT GUARDIAN ================= */}
            <Route
              path="/dashboard/parent"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/parent/children"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildrenList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/parent/child/:childId"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/parent/child/:childId/attendance"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/parent/child/:childId/fees"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildFees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/student/:studentId/profile"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/student/:studentId/attendance"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/student/:studentId/fees"
              element={
                <ProtectedRoute allowedRoles={["PARENT_GUARDIAN"]}>
                  <ChildFees />
                </ProtectedRoute>
              }
            />

            {/* ================= PRINCIPAL ================= */}
            <Route
              path="/dashboard/principal"
              element={
                <ProtectedRoute allowedRoles={["PRINCIPAL"]}>
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            />

            {/* ================= PLATFORM SUPPORT ================= */}
            <Route
              path="/dashboard/support"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <PlatformSupportDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/health"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <SystemHealth />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <AuditLogsViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/system-logs"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <SystemLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/integrations"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <IntegrationMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/tickets"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <SupportTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/errors"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <ErrorAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/colleges"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <CollegeHealthOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/colleges/:id/diagnostics"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <CollegeHealthOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/database"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <DatabaseDiagnostics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-support/config"
              element={
                <ProtectedRoute allowedRoles={["PLATFORM_SUPPORT"]}>
                  <ConfigurationViewer />
                </ProtectedRoute>
              }
            />

            {/* ================= EXAM COORDINATOR ================= */}
            <Route
              path="/dashboard/exam"
              element={
                <ProtectedRoute allowedRoles={["EXAM_COORDINATOR"]}>
                  <ExamDashboard />
                </ProtectedRoute>
              }
            />

            {/* ================= HOD ================= */}
            <Route
              path="/hod/dashboard"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <HodDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hod/profile"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <HodProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hod/department"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <HodDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hod/teachers"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <HodTeachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hod/exception-approvals"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <HodExceptionApprovals />
                </ProtectedRoute>
              }
            />
           <Route
             path="/hod/reports"
             element={
               <ProtectedRoute allowedRoles={["HOD"]}>
                 <HodReports />
               </ProtectedRoute>
             }
           />
            {/* ================= HOD NOTIFICATIONS ================= */}
            <Route
              path="/hod/notifications/list"
              element={
                <ProtectedRoute allowedRoles={["HOD"]}>
                  <NotificationListPage role="hod" />
                </ProtectedRoute>
              }
            />
            {/* ================= TEACHER ================= */}
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            {/* ================= TEACHER NOTIFICATIONS ================= */}
            <Route
              path="/teacher/notifications/create"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <NotificationForm role="teacher" mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/notifications/list"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <NotificationListPage role="teacher" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/notifications/view/:id"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "TEACHER",
                    "COLLEGE_ADMIN",
                    "STUDENT",
                    "SUPER_ADMIN",
                  ]}
                >
                  <NotificationDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["TEACHER", "COLLEGE_ADMIN"]}>
                  <NotificationForm role="teacher" mode="edit" />
                </ProtectedRoute>
              }
            />

            {/* ================= STUDENT ================= */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/edit-profile"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <EditStudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/timetable"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <StudentTimetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/fees"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <StudentFees />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/make-payment"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <MakePayments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/fee-receipt/:paymentId"
              element={
                <ProtectedRoute allowedRoles={["STUDENT", "COLLEGE_ADMIN", "ACCOUNTANT"]}>
                  <FeeReceipt />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/payment-success"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/payment-cancel"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <PaymentCancel />
                </ProtectedRoute>
              }
            />

            {/* ================= DEPARTMENTS ================= */}
            <Route
              path="/departments"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <DepartmentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/add"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AddDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <ViewDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditDepartment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/assign-hod/:departmentId"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AssignHod />
                </ProtectedRoute>
              }
            />

            {/* ================= COURSES ================= */}
            <Route
              path="/courses"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <CourseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/add"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AddCourse />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditCourse />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <ViewCourse />
                </ProtectedRoute>
              }
            />

             {/* ================= STUDENTS ================= */}
             <Route
               path="/students/pending-approvals"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                   <PendingApprovals />
                 </ProtectedRoute>
               }
             />

            <Route
              path="/students/approve"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ApproveStudents />
                </ProtectedRoute>
              }
            />

            <Route
              path="/students/promotion"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <StudentPromotion />
                </ProtectedRoute>
              }
            />

             <Route
               path="/students/alumni"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                   <AlumniList />
                 </ProtectedRoute>
               }
             />

            {/* ================= ATTENDANCE ================= */}
<Route
               path="/attendance/my-sessions-list"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <AttendanceSessionsList />
                 </ProtectedRoute>
               }
             />

            <Route
              path="/attendance/session/:sessionId"
              element={
                <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                  <SessionDetails />
                </ProtectedRoute>
              }
            />

<Route
               path="/attendance/session/:sessionId/mark"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <MarkAttendanceModal />
                 </ProtectedRoute>
               }
             />

<Route
               path="/attendance/session/:sessionId/edit"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <EditAttendanceModal />
                 </ProtectedRoute>
               }
             />

            <Route
              path="/attendance/report"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "TEACHER", "PRINCIPAL"]}>
                  <AttendanceReport />
                </ProtectedRoute>
              }
            />

            {/* ================= MY ATTENDANCE ================= */}
            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <MyAttendance />
                </ProtectedRoute>
              }
            />

            {/* ================= SUBJECTS ================= */}
            <Route
              path="/subjects"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <SubjectList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/course/:courseId"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <SubjectList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/add"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AddSubject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <ViewSubject />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditSubject />
                </ProtectedRoute>
              }
            />

            {/* ================= System settings ================= */}
            <Route
              path="/system-settings/fees"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <FeeSetting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-settings/general"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <GeneralSetting />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-settings/academic"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AcademicSetting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-settings/promotion"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <PromotionSetting />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-settings/notifications"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <NotificationSetting />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college/document-settings"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <DocumentSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-settings/stripe-configuration"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <StripeConfiguration />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-settings/razorpay-configuration"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <RazorpayConfiguration />
                </ProtectedRoute>
              }
            />

            <Route
              path="/system-settings/email-configuration"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EmailConfigurations />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <TeachersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "PRINCIPAL"]}>
                  <ViewTeacher />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/add-teacher"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AddTeacher />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditTeacher />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teachers/assign-subjects"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AssignTeacherSubjects />
                </ProtectedRoute>
              }
            />

            {/* ================= STAFF MANAGEMENT ================= */}
             <Route
               path="/college/staff/create"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                   <CreateStaff />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/college/staff"
               element={
                 <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                   <StaffList />
                 </ProtectedRoute>
               }
             />

             {/* ================= STAFF PROFILES ================= */}
             <Route
               path="/staff/profile/:userId"
               element={
                 <ProtectedRoute
                   allowedRoles={[
                     "COLLEGE_ADMIN",
                     "ACCOUNTANT",
                     "PRINCIPAL",
                     "HOD",
                     "ADMISSION_OFFICER",
                     "EXAM_COORDINATOR",
                     "PARENT_GUARDIAN",
                     "PLATFORM_SUPPORT",
                   ]}
                 >
                   <ViewStaffProfile />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/staff/profile/edit/:userId"
               element={
                 <ProtectedRoute
                   allowedRoles={[
                     "COLLEGE_ADMIN",
                     "ACCOUNTANT",
                     "PRINCIPAL",
                     "HOD",
                     "ADMISSION_OFFICER",
                     "EXAM_COORDINATOR",
                     "PARENT_GUARDIAN",
                     "PLATFORM_SUPPORT",
                   ]}
                 >
                   <EditStaffProfile />
                 </ProtectedRoute>
               }
             />

              {/* TIMETABLE */}

              <Route
                path="/timetable/list"
                element={
                  <ProtectedRoute allowedRoles={["TEACHER", "PRINCIPAL", "HOD"]}>
                    <TimetableList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/timetable/add-slot"
                element={
                  <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                    <AddTimetableSlot />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable/weekly-timetable"
                element={
                  <ProtectedRoute allowedRoles={["TEACHER", "PRINCIPAL", "HOD"]}>
                    <MySchedule />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/timetable/:timetableId/weekly"
                element={
                  <ProtectedRoute allowedRoles={["TEACHER", "PRINCIPAL", "HOD"]}>
                    <WeeklyTimetable />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/timetable/my-timetable"
                element={
                  <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                    <MyTimetable />
                  </ProtectedRoute>
                }
              />
             <Route
               path="/timetable/create/exceptions"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <CreateException/>
                 </ProtectedRoute>
               }
             />
             <Route
               path="/timetable/exceptions"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <ExceptionManagement />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/sessions/my-sessions"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <MySessions />
                 </ProtectedRoute>
               }
             />
             <Route
               path="profile/my-profile"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <MyProfile />
                 </ProtectedRoute>
               }
             />
             <Route
               path="/profile/edit-profile"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <EditTeacherProfile />
                 </ProtectedRoute>
               }
             />

             {/* Sessions */}

             {/* New Timetable created by teacher(hod) */}
             <Route
               path="/timetable/create-timetable"
               element={
                 <ProtectedRoute allowedRoles={["TEACHER", "HOD"]}>
                   <CreateTimetable />
                 </ProtectedRoute>
               }
             />

            {/* ================= FALLBACK ================= */}
            <Route path="*" element={<Navigate to="/home" />} />
          </Route>
        </Routes>
      </div>

      {/* ================= GLOBAL TOAST CONTAINER ================= */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ErrorBoundary>
  );
}
