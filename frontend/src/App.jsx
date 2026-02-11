import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

/* ================= AUTH ================= */
import Login from "./pages/auth/Login";
import StudentRegister from "./pages/auth/StudentRegister";

/* ================= DASHBOARDS ================= */
import SuperAdminDashboard from "./pages/dashboard/Super-Admin/SuperAdminDashboard";
import CreateNewCollege from "./pages/dashboard/Super-Admin/CreateNewCollege";
import CollegeAdminDashboard from "./pages/dashboard/College-Admin/CollegeAdminDashboard";

import StudentDashboard from "./pages/dashboard/Student/StudentDashboard";

/* ================= DEPARTMENTS ================= */
import DepartmentList from "./pages/dashboard/College-Admin/DepartmentList";
import AddDepartment from "./pages/dashboard/College-Admin/AddDepartment";
/* ================= COURSES ================= */
import CourseList from "./pages/dashboard/College-Admin/CourseList";
import AddCourse from "./pages/dashboard/College-Admin/AddCourse";
/* ================= STUDENTS ================= */
import StudentList from "./pages/dashboard/College-Admin/StudentList";

/* ================= ATTENDANCE ================= */
import MarkAttendance from "./pages/dashboard/Teacher/MarkAttendance";
import MyAttendance from "./pages/dashboard/Student/MyAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";

/* ================= SUBJECTS / TEACHERS ================= */
import SubjectList from "./pages/dashboard/College-Admin/SubjectList";
import AddSubject from "./pages/dashboard/College-Admin/AddSubject";
import AssignTeacherSubjects from "./pages/Teachers/AssignTeacherSubjects";
import CollegeList from "./pages/dashboard/Super-Admin/CollegeList";
import CollegeProfile from "./pages/dashboard/College-Admin/CollegeProfile";
import EditCourse from "./pages/dashboard/College-Admin/EditCourse";
import AddTeacher from "./pages/dashboard/College-Admin/AddTeacher";
import TeachersList from "./pages/dashboard/College-Admin/TeachersList";
import EditTeacher from "./pages/dashboard/College-Admin/EditTeacher";
import AssignHod from "./pages/dashboard/College-Admin/AssignHod";
import EditDepartment from "./pages/dashboard/College-Admin/EditDepartment";
// import CreateTimetable from "./pages/dashboard/College-Admin/CreateTimetable";
// import ViewTimetable from "./pages/dashboard/College-Admin/ViewTimetable";
import CreateSession from "./pages/dashboard/Teacher/CreateSession";
// import EditTimetable from "./pages/dashboard/College-Admin/EditTimetable";
import EditAttendance from "./pages/dashboard/Teacher/EditAttendance";
import AttendanceReport from "./pages/dashboard/Teacher/AttendanceReport";
import CloseSession from "./pages/dashboard/Teacher/CloseSession";
import MyTimetable from "./pages/dashboard/Teacher/MyTimetable";
import MySessions from "./pages/dashboard/Teacher/MySessions";
import MyStudents from "./pages/dashboard/Teacher/MyStudents";
import MyProfile from "./pages/dashboard/Teacher/MyProfile";
import StudentProfile from "./pages/dashboard/Student/StudentProfile";
import StudentTimetable from "./pages/dashboard/Student/StudentTimetable";
import StudentFees from "./pages/dashboard/Student/StudentFees";
import EditStudentProfile from "./pages/dashboard/Student/EditStudentProfile";
import FeeReceipt from "./pages/dashboard/Student/FeeReceipt";
import ViewStudent from "./pages/dashboard/College-Admin/ViewStudent";
import ApproveStudents from "./pages/dashboard/College-Admin/ApproveStudents";
import ViewApproveStudent from "./pages/dashboard/College-Admin/ViewApproveStudent";
import ViewTeacher from "./pages/dashboard/College-Admin/ViewTeacher";
import CreateFeeStructure from "./pages/dashboard/College-Admin/CreateFeeStructure";
import ViewFeeStructure from "./pages/dashboard/College-Admin/ViewFeeStructure";
import FeeStructureList from "./pages/dashboard/College-Admin/FeeStructureList";
import EditFeeStructure from "./pages/dashboard/College-Admin/EditFeeStructure";
import TeacherDashboard from "./pages/dashboard/Teacher/TeacherDashboard";
import MakePayments from "./pages/dashboard/Student/MakePayments";
import CreateNotification from "./pages/dashboard/College-Admin/CreateNotification";
import NotificationList from "./pages/dashboard/College-Admin/NotificationList";
import UpdateNotifications from "./pages/dashboard/College-Admin/UpdateNotifications";
import StudentNotificationList from "./pages/dashboard/Student/StudentNotificationList";
import CreateNotifications from "./pages/dashboard/Teacher/CreateNotifications";
import Notifications from "./pages/dashboard/Teacher/Notifications";
import EditNotifications from "./pages/dashboard/Teacher/EditNotifications";
import PaymentSuccess from "./pages/dashboard/Student/PaymentSuccess";
import PaymentCancel from "./pages/dashboard/Student/PaymentCancel";
import EditCollegeProfile from "./pages/dashboard/College-Admin/EditCollegeProfile";
import EditSlotModal from "./pages/dashboard/Teacher/Timetable/EditSlotModal";
import CreateTimetable from "./pages/dashboard/Teacher/Timetable/CreateTimetable";
import TimetableDetails from "./pages/dashboard/Teacher/Timetable/TimetableDetails";
import WeeklyTimetableGrid from "./pages/dashboard/Teacher/Timetable/WeeklyTimetableGrid";
import FeeSetting from "./pages/dashboard/College-Admin/SystemSetting/FeeSetting";
import GeneralSetting from "./pages/dashboard/College-Admin/SystemSetting/GeneralSetting";
import AcademicSetting from "./pages/dashboard/College-Admin/SystemSetting/AcademicSetting";
import NotificationSetting from "./pages/dashboard/College-Admin/SystemSetting/NotificationSetting";
import SuperAdminReports from "./pages/dashboard/Super-Admin/SuperAdminReports";
import AdminReports from "./pages/dashboard/College-Admin/Reports/AdminReports";
import CourseReport from "./pages/dashboard/College-Admin/Reports/CourseReport";
import PaymentReports from "./pages/dashboard/College-Admin/Reports/PaymentReports";
import AttendanceSummary from "./pages/dashboard/College-Admin/Reports/AttendanceSummary";
import ViewCollegeDetails from "./pages/dashboard/Super-Admin/ViewCollegeDetails";
import EditCollege from "./pages/dashboard/Super-Admin/EditCollege";

export default function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <div className="container-fluid">
        <div className="row">
          {/* ================= SIDEBAR ================= */}
          {user && <Sidebar />}

          <main
            className="col p-0"
            style={{ marginLeft: user ? "260px" : "0" }}
          >
            {user && <Navbar />}

            <div className="p-4">
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
                      <EditCollege/>
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
                  path="/college-admin/reports"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AdminReports />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/college-admin/reports/course-wise"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <CourseReport />
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
                      {/* EditStudentProfile Component to be created */}
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

                {/* ================= STUDENTS ================= */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />

                {/* ================= ATTENDANCE ================= */}
                <Route
                  path="/attendance/mark"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <MarkAttendance />
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
                  path="/session/close/:sessionId"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <CloseSession />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/sessions/:sessionId/edit"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <EditAttendance />
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
                {/* ================= System settings ================= */}
                <Route path="/system-settings/fees" element={<FeeSetting />} />
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

                {/* <Route
                  path="/system-settings/fees"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <FeeSetting />
                    </ProtectedRoute>
                  }
                /> */}

                <Route
                  path="/system-settings/notifications"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <NotificationSetting />
                    </ProtectedRoute>
                  }
                />

                {/* ================= TEACHERS ================= */}
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
                  path="/students/my-students"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <MyStudents />
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
                  path="/teachers/assign-subjects"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AssignTeacherSubjects />
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

                {/* TIMETABLE
                <Route
                  path="/timetable/create"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <CreateTimetable />
                    </ProtectedRoute>
                  }
                /> */}

                {/* <Route
                  path="/timetable/view"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <ViewTimetable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timetable/edit/:id"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <EditTimetable />
                    </ProtectedRoute>
                  }
                /> */}

                {/* New Timetable created by teacher(hod) */}

                <Route
                  path="/timetable/create-timetable"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <CreateTimetable />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/timetable/edit-slot/:id"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <EditSlotModal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/timetable/details/:id"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <TimetableDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/timetable/weekly-grid/:id"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <WeeklyTimetableGrid />
                    </ProtectedRoute>
                  }
                />

                {/* ================= FALLBACK ================= */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
