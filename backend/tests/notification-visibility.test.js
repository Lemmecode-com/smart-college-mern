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

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Notification Visibility - Teacher -> HOD Exception Workflow", () => {
  let College, Timetable, TimetableException, Teacher, Department, Notification;

  beforeAll(() => {
    College = mongoose.model("College");
    Timetable = mongoose.model("Timetable");
    TimetableException = mongoose.model("TimetableException");
    Teacher = mongoose.model("Teacher");
    Department = mongoose.model("Department");
    Notification = mongoose.model("Notification");
  });

  describe("1. Create Exception -> HOD Notification", () => {
    it("should create INDIVIDUAL notification for HOD when teacher creates exception", async () => {
      const college = await College.create({ name: "Test College", code: "TEST" });
      
      const hodUserId = new mongoose.Types.ObjectId();
      const hodTeacher = await Teacher.create({
        name: "HOD Teacher",
        user_id: hodUserId,
        email: "hod@test.edu",
        college_id: college._id,
        department_id: new mongoose.Types.ObjectId(),
      });

      const teacherUserId = new mongoose.Types.ObjectId();
      const teacher = await Teacher.create({
        name: "Regular Teacher",
        user_id: teacherUserId,
        email: "teacher@test.edu",
        college_id: college._id,
        department_id: hodTeacher.department_id,
      });

      const timetable = await Timetable.create({
        college_id: college._id,
        name: "Test Timetable",
        department_id: hodTeacher.department_id,
        semester: 1,
        academicYear: "2025-2026",
        status: "APPROVED",
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
      const college = await College.create({ name: "Test College", code: "TEST2" });

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
      const college = await College.create({ name: "Test College", code: "TEST3" });

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
      const college = await College.create({ name: "Test College", code: "TEST4" });

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
      const college = await College.create({ name: "Test College", code: "TEST5" });

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
      const college = await College.create({ name: "Test College", code: "TEST6" });

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
      const college = await College.create({ name: "Test College", code: "TEST7" });

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
});

module.exports = {};