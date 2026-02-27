import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthContext } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";

/* ================= AUTH ================= */
import Login from "./pages/auth/Login";
import StudentRegister from "./pages/auth/StudentRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";

/* ================= DASHBOARDS ================= */
import SuperAdminDashboard from "./pages/dashboard/Super-Admin/SuperAdminDashboard";
import CreateNewCollege from "./pages/dashboard/Super-Admin/CreateNewCollege";
import CollegeAdminDashboard from "./pages/dashboard/College-Admin/CollegeAdminDashboard";
import TeacherDashboard from "./pages/dashboard/Teacher/TeacherDashboard";
import StudentDashboard from "./pages/dashboard/Student/StudentDashboard";
import DocumentSettings from "./pages/dashboard/College-Admin/SystemSetting/DocumentSettings";

/* ================= DEPARTMENTS ================= */
import DepartmentList from "./pages/dashboard/College-Admin/DepartmentList";
import AddDepartment from "./pages/dashboard/College-Admin/AddDepartment";
/* ================= COURSES ================= */
import CourseList from "./pages/dashboard/College-Admin/CourseList";
import AddCourse from "./pages/dashboard/College-Admin/AddCourse";
import ViewCourse from "./pages/dashboard/College-Admin/ViewCourse";
/* ================= STUDENTS ================= */
import StudentList from "./pages/dashboard/College-Admin/StudentList";
import StudentPromotion from "./pages/dashboard/College-Admin/StudentPromotion";

/* ================= ATTENDANCE ================= */
import MarkAttendance from "./pages/dashboard/Teacher/Attendance/MarkAttendance";
import EditAttendance from "./pages/dashboard/Teacher/Attendance/EditAttendance";
import AttendanceReport from "./pages/dashboard/Teacher/Attendance/AttendanceReport";
import MySessions from "./pages/dashboard/Teacher/Attendance/MySessions";
import CloseSession from "./pages/dashboard/Teacher/Attendance/CloseSession";

/* ================= MY ATTENDANCE ================= */
import MyAttendance from "./pages/dashboard/Student/MyAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";

// Notifications
import CreateNotifications from "./pages/dashboard/Teacher/Notifications/CreateNotifications";
import Notifications from "./pages/dashboard/Teacher/Notifications/Notifications";
import EditNotifications from "./pages/dashboard/Teacher/Notifications/EditNotifications";
import CreateNotification from "./pages/dashboard/College-Admin/Notification/CreateNotification";
import NotificationList from "./pages/dashboard/College-Admin/Notification/NotificationList";
import UpdateNotifications from "./pages/dashboard/College-Admin/Notification/UpdateNotifications";
import StudentNotificationList from "./pages/dashboard/Student/StudentNotificationList";

/* ================= REPORTS ================= */
import AdminReports from "./pages/dashboard/College-Admin/Reports/AdminReports";
import PaymentReports from "./pages/dashboard/College-Admin/Reports/PaymentReports";
import AttendanceSummary from "./pages/dashboard/College-Admin/Reports/AttendanceSummary";
import SuperAdminReports from "./pages/dashboard/Super-Admin/SuperAdminReports";

/* ================= TIMETABLE ================= */
import CreateTimetable from "./pages/dashboard/Teacher/Timetable/CreateTimetable";
import AddTimetableSlot from "./pages/dashboard/Teacher/Timetable/AddTimetableSlot";
import TimetableList from "./pages/dashboard/Teacher/Timetable/TimetableList";
import WeeklyTimetable from "./pages/dashboard/Teacher/Timetable/WeeklyTimetable";
import MySchedule from "./pages/dashboard/Teacher/Timetable/MySchedule";
import StudentTimetable from "./pages/dashboard/Student/StudentTimetable";

/* ================= PROFILES ================= */
import MyProfile from "./pages/dashboard/Teacher/MyProfile";
import EditTeacherProfile from "./pages/dashboard/Teacher/EditTeacherProfile";
import StudentProfile from "./pages/dashboard/Student/StudentProfile";
import EditStudentProfile from "./pages/dashboard/Student/EditStudentProfile";

/* ================= FEES ================= */
import StudentFees from "./pages/dashboard/Student/StudentFees";
import MakePayments from "./pages/dashboard/Student/MakePayments";
import FeeReceipt from "./pages/dashboard/Student/FeeReceipt";
import PaymentSuccess from "./pages/dashboard/Student/PaymentSuccess";
import PaymentCancel from "./pages/dashboard/Student/PaymentCancel";

/* ================= COLLEGE ADMIN ================= */
import ViewStudent from "./pages/dashboard/College-Admin/ViewStudent";
import ApproveStudents from "./pages/dashboard/College-Admin/ApproveStudents";
import ViewApproveStudent from "./pages/dashboard/College-Admin/ViewApproveStudent";
import ViewTeacher from "./pages/dashboard/College-Admin/ViewTeacher";
import CreateFeeStructure from "./pages/dashboard/College-Admin/CreateFeeStructure";
import ViewFeeStructure from "./pages/dashboard/College-Admin/ViewFeeStructure";
import FeeStructureList from "./pages/dashboard/College-Admin/FeeStructureList";
import EditFeeStructure from "./pages/dashboard/College-Admin/EditFeeStructure";
import EditCollegeProfile from "./pages/dashboard/College-Admin/EditCollegeProfile";
import FeeSetting from "./pages/dashboard/College-Admin/SystemSetting/FeeSetting";
import GeneralSetting from "./pages/dashboard/College-Admin/SystemSetting/GeneralSetting";
import AcademicSetting from "./pages/dashboard/College-Admin/SystemSetting/AcademicSetting";
import NotificationSetting from "./pages/dashboard/College-Admin/SystemSetting/NotificationSetting";
import AttendanceSessionsList from "./pages/dashboard/Teacher/AttendanceSessionsList";
import SessionDetails from "./pages/dashboard/Teacher/SessionDetails";
import MarkAttendanceModal from "./pages/dashboard/Teacher/MarkAttendanceModal";
import EditAttendanceModal from "./pages/dashboard/Teacher/EditAttendanceModal";
import CreateSessionModal from "./pages/dashboard/Teacher/CreateSessionModal";

/* ================= SUPER ADMIN ================= */
import CollegeList from "./pages/dashboard/Super-Admin/CollegeList";
import ViewCollegeDetails from "./pages/dashboard/Super-Admin/ViewCollegeDetails";
import EditCollege from "./pages/dashboard/Super-Admin/EditCollege";
import ViewSubject from "./pages/dashboard/College-Admin/ViewSubject";
import UpdateSubject from "./pages/dashboard/College-Admin/EditSubject";
import EditSubject from "./pages/dashboard/College-Admin/EditSubject";

/* ================= SUBJECTS / TEACHERS ================= */
import SubjectList from "./pages/dashboard/College-Admin/SubjectList";
import AddSubject from "./pages/dashboard/College-Admin/AddSubject";
import CollegeProfile from "./pages/dashboard/College-Admin/CollegeProfile";
import EditCourse from "./pages/dashboard/College-Admin/EditCourse";
import AddTeacher from "./pages/dashboard/College-Admin/AddTeacher";
import TeachersList from "./pages/dashboard/College-Admin/TeachersList";
import EditTeacher from "./pages/dashboard/College-Admin/EditTeacher";
import AssignHod from "./pages/dashboard/College-Admin/AssignHod";
import EditDepartment from "./pages/dashboard/College-Admin/EditDepartment";
import ViewTimetable from "./pages/dashboard/College-Admin/ViewTimetable";
import AssignTeacherSubjects from "./pages/dashboard/College-Admin/AssignTeacherSubjects";

/* ================= TEACHER ================= */
import CreateSession from "./pages/dashboard/Teacher/Attendance/CreateSession";
import MyTimetable from "./pages/dashboard/Teacher/Timetable/MyTimetable";
import ReportDashboard from "./pages/dashboard/College-Admin/Reports/ReportDashboard";

export default function App() {
  const { user } = useContext(AuthContext);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
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

function AppContent({ user, isMobileOpen, setIsMobileOpen, isMobileDevice, toggleSidebar }) {
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
        {/* ================= LAYOUT WRAPPER ================= */}
        {isAuthenticated && !hideLayout ? (
          <Layout
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          >
            <Routes>
            {/* ================= ROOT DECIDER ================= */}
            <Route
              path="/"
              element={
                !user ? (
                  <Navigate to="/login" />
                ) : user.role === "SUPER_ADMIN" ? (
                  <Navigate to="/super-admin/dashboard" />
                ) : user.role === "COLLEGE_ADMIN" ? (
                  <Navigate to="/dashboard" />
                ) : user.role === "TEACHER" ? (
                  <Navigate to="/teacher/dashboard" />
                ) : user.role === "STUDENT" ? (
                  <Navigate to="/student/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* ================= PUBLIC ================= */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route
              path="/register/:collegeCode"
              element={<StudentRegister />}
            />

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

            {/* ================= COLLEGE ADMIN ================= */}
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
              path="/college/view-approved-student/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ViewApproveStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fees/create"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <CreateFeeStructure />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fees/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ViewFeeStructure />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fees/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <EditFeeStructure />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fees/list"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <FeeStructureList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notification/create"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <CreateNotification />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notification/list"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <NotificationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <UpdateNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification/student"
              element={
                <ProtectedRoute allowedRoles={["STUDENT"]}>
                  <StudentNotificationList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college-admin/reports-dashboard"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ReportDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college-admin/reports"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college-admin/reports/attendance"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <AttendanceSummary />
                </ProtectedRoute>
              }
            />

            <Route
              path="/college-admin/reports/payment-summary"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <PaymentReports />
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
            <Route
              path="/teacher/notifications/create"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <CreateNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/notifications/list"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["TEACHER", "COLLEGE_ADMIN"]}>
                  <EditNotifications />
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
                <ProtectedRoute allowedRoles={["STUDENT"]}>
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ViewCourse />
                </ProtectedRoute>
              }
            />

            {/* ================= STUDENTS ================= */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <StudentList />
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

            {/* ================= ATTENDANCE ================= */}
            <Route
              path="/attendance/create-session"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <CreateSessionModal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/my-sessions-list"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <AttendanceSessionsList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/session/:sessionId"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <SessionDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/session/:sessionId/mark"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <MarkAttendanceModal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/session/:sessionId/edit"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <EditAttendanceModal />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/report"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "TEACHER"]}>
                  <AttendanceReport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/list"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "TEACHER"]}>
                  <AttendanceList />
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
              path="/subjects/course/:courseId"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <TeachersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/view/:id"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
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

            {/* ================= TEACHERS ================= */}
            {/* TIMETABLE */}
            <Route
              path="/timetable/create-timetable"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <CreateTimetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable/list"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <TimetableList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/timetable/add-slot"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <AddTimetableSlot />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable/weekly-timetable"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <MySchedule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/timetable/:timetableId/weekly"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <WeeklyTimetable />
                </ProtectedRoute>
              }
            />

            <Route
              path="/timetable/view"
              element={
                <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                  <ViewTimetable />
                </ProtectedRoute>
              }
            />

            <Route
              path="/timetable/my-timetable"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <MyTimetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/my-sessions"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <MySessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/my-profile"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <MyProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit-profile"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <EditTeacherProfile />
                </ProtectedRoute>
              }
            />

            {/* Sessions */}
            <Route
              path="/sessions/create"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <CreateSession />
                </ProtectedRoute>
              }
            />

            {/* New Timetable created by teacher(hod) */}
            <Route
              path="/timetable/create-timetable"
              element={
                <ProtectedRoute allowedRoles={["TEACHER"]}>
                  <CreateTimetable />
                </ProtectedRoute>
              }
            />

            {/* ================= FALLBACK ================= */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Layout>
        ) : (
          <Routes>
            {/* Public routes without layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/register/:collegeCode" element={<StudentRegister />} />
          </Routes>
        )}
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