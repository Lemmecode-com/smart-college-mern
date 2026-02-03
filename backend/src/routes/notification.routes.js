const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const {
  createAdminNotification,
  createTeacherNotification,
  getStudentNotifications,
  getTeacherNotifications,
  getAdminNotifications,
  updateNotification,
  deleteNotification,
  getAdminNotificationCount,
  getTeacherNotificationCount,
  getStudentNotificationCount,
  markAsRead,
  getUnreadForBell,
} = require("../controllers/notification.controller");

router.post(
  "/admin/create",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  createAdminNotification,
);

router.post(
  "/teacher/create",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createTeacherNotification,
);

router.get(
  "/admin/read",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAdminNotifications,
);

router.get(
  "/teacher/read",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getTeacherNotifications,
);

router.get(
  "/student/read",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  getStudentNotifications,
);

// Admin
router.get(
  "/count/admin",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAdminNotificationCount,
);

// Teacher
router.get(
  "/count/teacher",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getTeacherNotificationCount,
);

// Student
router.get(
  "/count/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  getStudentNotificationCount,
);

router.get("/unread/bell", auth, collegeMiddleware, getUnreadForBell);

router.post("/:notificationId/read", auth, markAsRead);

router.put("/edit-note/:id", auth, collegeMiddleware, updateNotification);
router.delete("/delete-note/:id", auth, collegeMiddleware, deleteNotification);

module.exports = router;
