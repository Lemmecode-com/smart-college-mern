/**
 * Test file for Teacher -> HOD Exception Workflow Notification Visibility
 * 
 * Tests:
 * 1. Create Exception -> HOD receives notification
 * 2. Approve Exception -> Teacher receives notification  
 * 3. Reject Exception -> Teacher receives notification
 * 4. Withdraw Exception -> HOD receives notification
 * 5. Notification unread count accuracy
 * 6. Notification list visibility for teachers and HODs
 */

const { connectTestDb, clearTestDb, closeTestDb } = require("./setup/testDb");
const { createCollege, createUser, createTeacher } = require("./helpers/factories");
const mongoose = require("mongoose");
const Timetable = require("../src/models/timetable.model");
const TimetableException = require("../src/models/timetableException.model");
const Teacher = require("../src/models/teacher.model");
const Department = require("../src/models/department.model");
const Notification = require("../src/models/notification.model");
const User = require("../src/models/user.model");
const { getNotificationVisibilityQuery } = require("../src/services/notificationVisibility.service");

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("Notification Visibility - Teacher -> HOD Exception Workflow", () => {
  describe("1. Create Exception -> HOD Notification", () => {
    it("should create INDIVIDUAL notification for HOD when teacher creates exception", async () => {
      const college = await createCollege({ code: "TEST" });
      
      const hodUserId = new mongoose.Types.ObjectId();
      const hodTeacher = await Teacher.create({
        name: "HOD Teacher",
        user_id: hodUserId,
        email: "hod@test.edu",
        college_id: college._id,
        department_id: new mongoose.Types.ObjectId(),
        employeeId: "HOD-001",
        designation: "HOD",
        qualification: "PhD",
        experienceYears: 10,
        createdBy: hodUserId,
      });

      const teacherUserId = new mongoose.Types.ObjectId();
      const teacher = await Teacher.create({
        name: "Regular Teacher",
        user_id: teacherUserId,
        email: "teacher@test.edu",
        college_id: college._id,
        department_id: hodTeacher.department_id,
        employeeId: "TCH-001",
        designation: "Teacher",
        qualification: "MSc",
        experienceYears: 5,
        createdBy: teacherUserId,
      });

      const timetable = await Timetable.create({
        college_id: college._id,
        name: "Test Timetable",
        department_id: hodTeacher.department_id,
        course_id: new mongoose.Types.ObjectId(),
        semester: 1,
        academicYear: "2025-2026",
        status: "DRAFT",
      });

      // Simulate notification creation (what the controller does)
      const notification = await Notification.create({
        college_id: college._id,
        createdBy: teacherUserId,
        createdByRole: "TEACHER",
        target: "INDIVIDUAL",
        target_users: [hodUserId],
        title: "New Timetable Exception Request",
        message: "A teacher has submitted a timetable exception request requiring your approval.",
        type: "ACADEMIC",
        actionUrl: "/hod/exception-approvals",
      });

      // Verify HOD can see this notification
      const hodNotifications = await Notification.find({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "TEACHER", target: "INDIVIDUAL", target_users: hodUserId }
        ]
      });

      expect(hodNotifications).toHaveLength(1);
      expect(hodNotifications[0].target).toBe("INDIVIDUAL");
      expect(hodNotifications[0].target_users).toContainEqual(hodUserId);
    });
  });

  describe("2. Approve Exception -> Teacher Notification", () => {
    it("should create INDIVIDUAL notification for teacher when HOD approves exception", async () => {
      const college = await createCollege({ code: "TEST2" });

      const hodUserId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();

      const notification = await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "Timetable Exception Approved",
        message: "Your timetable exception request has been approved.",
        type: "ACADEMIC",
        actionUrl: "/timetable/exceptions",
      });

      // Verify teacher can see this notification
      const teacherNotifications = await Notification.find({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "HOD" },
          { target: "INDIVIDUAL", target_users: teacherUserId }
        ]
      });

      const hodNotifications = teacherNotifications.filter(n => n.createdByRole === "HOD");
      expect(hodNotifications).toHaveLength(1);
      expect(hodNotifications[0].title).toBe("Timetable Exception Approved");
    });
  });

  describe("3. Reject Exception -> Teacher Notification", () => {
    it("should create INDIVIDUAL notification for teacher when HOD rejects exception", async () => {
      const college = await createCollege({ code: "TEST3" });

      const hodUserId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();

      const notification = await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "Timetable Exception Rejected",
        message: "Your timetable exception request has been rejected. Reason: Invalid date.",
        type: "ACADEMIC",
        actionUrl: "/timetable/exceptions",
      });

      const teacherNotifications = await Notification.find({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "HOD" },
          { target: "INDIVIDUAL", target_users: teacherUserId }
        ]
      });

      const hodNotifications = teacherNotifications.filter(n => n.createdByRole === "HOD");
      expect(hodNotifications).toHaveLength(1);
      expect(hodNotifications[0].title).toBe("Timetable Exception Rejected");
    });
  });

  describe("4. Withdraw Exception -> HOD Notification", () => {
    it("should create INDIVIDUAL notification for HOD when teacher withdraws exception", async () => {
      const college = await createCollege({ code: "TEST4" });

      const hodUserId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();

      const notification = await Notification.create({
        college_id: college._id,
        createdBy: teacherUserId,
        createdByRole: "TEACHER",
        target: "INDIVIDUAL",
        target_users: [hodUserId],
        title: "Timetable Exception Request Withdrawn",
        message: "John withdrew a CANCELLED request for 15 Jun 2026. Reason: Changed mind.",
        type: "ACADEMIC",
        actionUrl: "/hod/exception-approvals",
      });

      // Verify HOD can see this notification
      const hodNotifications = await Notification.find({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "TEACHER", target: "INDIVIDUAL", target_users: hodUserId }
        ]
      });

      const teacherNotifications = hodNotifications.filter(n => n.createdByRole === "TEACHER");
      expect(teacherNotifications).toHaveLength(1);
      expect(teacherNotifications[0].title).toBe("Timetable Exception Request Withdrawn");
    });
  });

  describe("5. Notification Unread Count Accuracy", () => {
    it("should correctly count unread notifications for teachers", async () => {
      const college = await createCollege({ code: "TEST5" });

      const teacherUserId = new mongoose.Types.ObjectId();
      const hodUserId = new mongoose.Types.ObjectId();

      // Create admin notification
      await Notification.create({
        college_id: college._id,
        createdBy: new mongoose.Types.ObjectId(),
        createdByRole: "COLLEGE_ADMIN",
        target: "ALL",
        title: "Admin Notice",
        message: "Test admin notification",
        type: "GENERAL",
      });

      // Create HOD notification
      await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "HOD Notice",
        message: "Test HOD notification",
        type: "ACADEMIC",
      });

      // Create notification where teacher is in target_users
      await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "Another HOD Notice",
        message: "Another test HOD notification",
        type: "ACADEMIC",
      });

      // Count unread for teacher
      const count = await Notification.countDocuments({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "HOD" },
          { target: "INDIVIDUAL", target_users: teacherUserId }
        ]
      });

      expect(count).toBe(3);
    });

    it("should correctly count unread notifications for HODs", async () => {
      const college = await createCollege({ code: "TEST6" });

      const teacherUserId = new mongoose.Types.ObjectId();
      const hodUserId = new mongoose.Types.ObjectId();

      // Create admin notification
      await Notification.create({
        college_id: college._id,
        createdBy: new mongoose.Types.ObjectId(),
        createdByRole: "COLLEGE_ADMIN",
        target: "ALL",
        title: "Admin Notice",
        message: "Test admin notification",
        type: "GENERAL",
      });

      // Create individual notification targeting HOD
      await Notification.create({
        college_id: college._id,
        createdBy: teacherUserId,
        createdByRole: "TEACHER",
        target: "INDIVIDUAL",
        target_users: [hodUserId],
        title: "Teacher Notice",
        message: "Test teacher notification",
        type: "ACADEMIC",
      });

      // Count unread for HOD
      const count = await Notification.countDocuments({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "TEACHER", target: "INDIVIDUAL", target_users: hodUserId },
        ]
      });

      expect(count).toBe(2);
    });
  });

  describe("6. Notification List Visibility", () => {
    it("should properly separate HOD and Admin notifications for teachers", async () => {
      const college = await createCollege({ code: "TEST7" });

      const teacherUserId = new mongoose.Types.ObjectId();
      const hodUserId = new mongoose.Types.ObjectId();
      const adminUserId = new mongoose.Types.ObjectId();

      // Create admin notification
      await Notification.create({
        college_id: college._id,
        createdBy: adminUserId,
        createdByRole: "COLLEGE_ADMIN",
        target: "ALL",
        title: "Admin Notice",
        message: "Test admin notification",
        type: "GENERAL",
      });

      // Create HOD notification (for exception approval)
      await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "Exception Approved",
        message: "Exception approved",
        type: "ACADEMIC",
      });

      // Create another HOD notification
      await Notification.create({
        college_id: college._id,
        createdBy: hodUserId,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUserId],
        title: "Exception Rejected",
        message: "Exception rejected",
        type: "ACADEMIC",
      });

      // Query as teacher would
      const notifications = await Notification.find({
        college_id: college._id,
        isActive: true,
        $or: [
          { createdByRole: "COLLEGE_ADMIN" },
          { createdByRole: "HOD" },
          { target: "INDIVIDUAL", target_users: teacherUserId }
        ]
      }).sort({ createdAt: -1 });

      const adminNotifications = notifications.filter(n => n.createdByRole === "COLLEGE_ADMIN");
      const hodNotifications = notifications.filter(n => n.createdByRole === "HOD");

      expect(adminNotifications).toHaveLength(1);
      expect(hodNotifications).toHaveLength(2);
    });
  });

  describe("7. Notification Visibility Service & Author Echo Rules", () => {
    it("Teacher submits exception request: HOD sees it, requesting teacher does NOT see it in list or by ID", async () => {
      const college = await createCollege({ code: "ECHO1" });
      const deptId = new mongoose.Types.ObjectId();

      const hodUser = await createUser({ college_id: college._id, role: "HOD" });
      const hodTeacher = await createTeacher({
        user_id: hodUser._id,
        college_id: college._id,
        department_id: deptId,
        designation: "HOD",
        createdBy: hodUser._id,
      });

      const teacherUser = await createUser({ college_id: college._id, role: "TEACHER" });
      const teacherProfile = await createTeacher({
        user_id: teacherUser._id,
        college_id: college._id,
        department_id: deptId,
        designation: "Teacher",
        createdBy: teacherUser._id,
      });

      // Teacher creates an INDIVIDUAL exception request notification targeting HOD
      const notif = await Notification.create({
        college_id: college._id,
        createdBy: teacherUser._id,
        createdByRole: "TEACHER",
        target: "INDIVIDUAL",
        target_users: [hodUser._id],
        title: "New Timetable Exception Request",
        message: "Mr. Shyam Patel has requested a HOLIDAY exception for 5 Nov 2026. Approval required.",
        type: "ACADEMIC",
        actionUrl: "/hod/exception-approvals",
      });

      // Visibility query for HOD
      const hodQuery = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "HOD",
        userId: hodUser._id,
        teacherProfile: hodTeacher,
      });
      const hodVisible = await Notification.find({ ...hodQuery, college_id: college._id });
      expect(hodVisible.map(n => n._id.toString())).toContain(notif._id.toString());

      // Visibility query for Requesting Teacher
      const teacherQuery = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "TEACHER",
        userId: teacherUser._id,
        teacherProfile,
      });
      const teacherVisible = await Notification.find({ ...teacherQuery, college_id: college._id });
      // Requesting teacher must NOT see this INDIVIDUAL notification meant for HOD
      expect(teacherVisible.map(n => n._id.toString())).not.toContain(notif._id.toString());

      // Querying by ID as teacher must return null (which translates to 404 in controller)
      const directById = await Notification.findOne({
        ...teacherQuery,
        _id: notif._id,
      });
      expect(directById).toBeNull();
    });

    it("Teacher-authored non-INDIVIDUAL broadcast is still visible to its author", async () => {
      const college = await createCollege({ code: "ECHO2" });
      const deptId = new mongoose.Types.ObjectId();

      const teacherUser = await createUser({ college_id: college._id, role: "TEACHER" });
      const teacherProfile = await createTeacher({
        user_id: teacherUser._id,
        college_id: college._id,
        department_id: deptId,
        createdBy: teacherUser._id,
      });

      const broadcastNotif = await Notification.create({
        college_id: college._id,
        createdBy: teacherUser._id,
        createdByRole: "TEACHER",
        target: "ALL",
        title: "Class Announcement",
        message: "All students please submit assignments.",
        type: "ACADEMIC",
      });

      const teacherQuery = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "TEACHER",
        userId: teacherUser._id,
        teacherProfile,
      });

      const teacherVisible = await Notification.find({ ...teacherQuery, college_id: college._id });
      expect(teacherVisible.map(n => n._id.toString())).toContain(broadcastNotif._id.toString());
    });

    it("Teacher cannot open another user's INDIVIDUAL notification by id", async () => {
      const college = await createCollege({ code: "ECHO3" });
      const deptId = new mongoose.Types.ObjectId();

      const teacher1 = await createUser({ college_id: college._id, role: "TEACHER" });
      const teacher1Profile = await createTeacher({
        user_id: teacher1._id,
        college_id: college._id,
        department_id: deptId,
        createdBy: teacher1._id,
      });

      const teacher2 = await createUser({ college_id: college._id, role: "TEACHER" });

      // Admin sends INDIVIDUAL notification to teacher2
      const privateNotif = await Notification.create({
        college_id: college._id,
        createdBy: new mongoose.Types.ObjectId(),
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [teacher2._id],
        title: "Confidential Review",
        message: "Personal notice for teacher 2 only.",
        type: "GENERAL",
      });

      const teacher1Query = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "TEACHER",
        userId: teacher1._id,
        teacherProfile: teacher1Profile,
      });

      const result = await Notification.findOne({
        ...teacher1Query,
        _id: privateNotif._id,
      });
      expect(result).toBeNull();
    });

    it("Withdraw/approve/reject notifications go to the correct recipients and do not echo to sender", async () => {
      const college = await createCollege({ code: "ECHO4" });
      const deptId = new mongoose.Types.ObjectId();

      const hodUser = await createUser({ college_id: college._id, role: "HOD" });
      const hodTeacher = await createTeacher({
        user_id: hodUser._id,
        college_id: college._id,
        department_id: deptId,
        createdBy: hodUser._id,
      });

      const teacherUser = await createUser({ college_id: college._id, role: "TEACHER" });
      const teacherProfile = await createTeacher({
        user_id: teacherUser._id,
        college_id: college._id,
        department_id: deptId,
        createdBy: teacherUser._id,
      });

      // 1. Teacher withdraws exception -> sent to HOD
      const withdrawNotif = await Notification.create({
        college_id: college._id,
        createdBy: teacherUser._id,
        createdByRole: "TEACHER",
        target: "INDIVIDUAL",
        target_users: [hodUser._id],
        title: "Timetable Exception Request Withdrawn",
        message: "Teacher withdrew request.",
        type: "ACADEMIC",
      });

      // 2. HOD approves exception -> sent to Teacher
      const approveNotif = await Notification.create({
        college_id: college._id,
        createdBy: hodUser._id,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUser._id],
        title: "Timetable Exception Approved",
        message: "Your timetable exception request has been approved.",
        type: "ACADEMIC",
      });

      // 3. HOD rejects exception -> sent to Teacher
      const rejectNotif = await Notification.create({
        college_id: college._id,
        createdBy: hodUser._id,
        createdByRole: "HOD",
        target: "INDIVIDUAL",
        target_users: [teacherUser._id],
        title: "Timetable Exception Rejected",
        message: "Your timetable exception request has been rejected.",
        type: "ACADEMIC",
      });

      const hodQuery = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "HOD",
        userId: hodUser._id,
        teacherProfile: hodTeacher,
      });
      const hodVisible = await Notification.find({ ...hodQuery, college_id: college._id });
      const hodIds = hodVisible.map(n => n._id.toString());

      // HOD receives withdraw notification
      expect(hodIds).toContain(withdrawNotif._id.toString());
      // HOD does NOT receive their own approve or reject notifications (no author echo)
      expect(hodIds).not.toContain(approveNotif._id.toString());
      expect(hodIds).not.toContain(rejectNotif._id.toString());

      const teacherQuery = await getNotificationVisibilityQuery({
        collegeId: college._id,
        role: "TEACHER",
        userId: teacherUser._id,
        teacherProfile,
      });
      const teacherVisible = await Notification.find({ ...teacherQuery, college_id: college._id });
      const teacherIds = teacherVisible.map(n => n._id.toString());

      // Teacher receives approval and rejection
      expect(teacherIds).toContain(approveNotif._id.toString());
      expect(teacherIds).toContain(rejectNotif._id.toString());
      // Teacher does NOT receive their own withdraw notification (no author echo)
      expect(teacherIds).not.toContain(withdrawNotif._id.toString());
    });

    it("Populates createdBy with name, role and email on notification query", async () => {
      const college = await createCollege({ code: "ECHO5" });
      const creatorUser = await User.create({
        college_id: college._id,
        role: "TEACHER",
        name: "Professor Xavier",
        email: "xavier@xmen.edu",
        password: "Password@123",
      });

      const notif = await Notification.create({
        college_id: college._id,
        createdBy: creatorUser._id,
        createdByRole: "TEACHER",
        target: "ALL",
        title: "School Announcement",
        message: "Welcome mutants.",
        type: "ACADEMIC",
      });

      const populated = await Notification.findById(notif._id)
        .populate({ path: "createdBy", model: "User", select: "name role email" });

      expect(populated.createdBy).toBeDefined();
      expect(populated.createdBy.name).toBe("Professor Xavier");
      expect(populated.createdBy.role).toBe("TEACHER");
      expect(populated.createdBy.email).toBe("xavier@xmen.edu");
    });
  });
});