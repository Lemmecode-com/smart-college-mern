const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");

const Timetable = require("../../src/models/timetable.model");
const Department = require("../../src/models/department.model");
const Teacher = require("../../src/models/teacher.model");
const User = require("../../src/models/user.model");
const Notification = require("../../src/models/notification.model");
const Student = require("../../src/models/student.model");
const Course = require("../../src/models/course.model");

const {
  createCollege,
  createDepartment,
  createCourse,
  createTeacher,
} = require("../helpers/factories");

const {
  checkTimetableAvailabilityAfterPromotion,
  checkTimetableAvailabilityForBulkPromotion,
  resolveHodUserIdForDepartment,
} = require("../../src/services/promotionTimetable.service");

describe("Issue #533: Next-Semester Timetable Availability After Student Promotion", () => {
  let college;
  let department;
  let course;
  let hodUser;
  let hodTeacher;
  let student;
  let adminUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // 1. Create College
    college = await createCollege();

    // 2. Create Admin User
    adminUser = await User.create({
      name: "College Admin",
      email: `admin-${Date.now()}@example.com`,
      password: "Password@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    // 3. Create HOD User & Teacher record
    hodUser = await User.create({
      name: "Dr. HOD",
      email: `hod-${Date.now()}@example.com`,
      password: "Password@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    // 4. Create Department
    department = await Department.create({
      name: "Computer Science",
      code: "CS",
      type: "ACADEMIC",
      college_id: college._id,
      createdBy: adminUser._id,
      programsOffered: ["UG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
    });

    // 5. Create Teacher assigned as HOD
    hodTeacher = await createTeacher({
      college_id: college._id,
      user_id: hodUser._id,
      department_id: department._id,
      name: "Dr. HOD",
      email: hodUser.email,
      createdBy: adminUser._id,
    });

    department.hod_id = hodTeacher._id;
    await department.save();

    // 6. Create Course
    course = await createCourse({
      name: "B.Tech Computer Science",
      code: "BTCS",
      college_id: college._id,
      department_id: department._id,
      createdBy: adminUser._id,
      durationYears: 4,
      durationSemesters: 8,
    });

    // 7. Create Student
    student = {
      _id: new mongoose.Types.ObjectId(),
      fullName: "John Doe",
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 4,
      currentAcademicYear: "2026-2027",
      division: "A",
    };
  });

  describe("resolveHodUserIdForDepartment", () => {
    it("should resolve HOD's user_id through Department.hod_id -> Teacher.user_id", async () => {
      const resolvedUserId = await resolveHodUserIdForDepartment(
        department._id,
        college._id,
      );
      expect(resolvedUserId).toBeDefined();
      expect(resolvedUserId.toString()).toBe(hodUser._id.toString());
    });

    it("should return null if department does not exist or has no HOD", async () => {
      const emptyDept = await Department.create({
        name: "Mechanical",
        code: "MECH",
        type: "ACADEMIC",
        college_id: college._id,
        createdBy: adminUser._id,
        programsOffered: ["UG"],
        startYear: 2020,
        sanctionedFacultyCount: 5,
        sanctionedStudentIntake: 60,
      });

      const resolved = await resolveHodUserIdForDepartment(
        emptyDept._id,
        college._id,
      );
      expect(resolved).toBeNull();
    });
  });

  describe("checkTimetableAvailabilityAfterPromotion", () => {
    it("should recognize when a PUBLISHED timetable exists and NOT send notification", async () => {
      // Create a PUBLISHED timetable for Semester 4, 2026-2027
      await Timetable.create({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        semester: 4,
        academicYear: "2026-2027",
        division: "A",
        name: "Sem 4 Timetable",
        status: "PUBLISHED",
        createdBy: hodUser._id,
      });

      const result = await checkTimetableAvailabilityAfterPromotion({
        student,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });

      expect(result.timetableAvailable).toBe(true);
      expect(result.notificationSent).toBe(false);

      // Verify no notification was created
      const count = await Notification.countDocuments({
        college_id: college._id,
        target_users: hodUser._id,
      });
      expect(count).toBe(0);
    });

    it("should NOT treat DRAFT timetable as available and SHOULD notify HOD", async () => {
      // Create only a DRAFT timetable
      await Timetable.create({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        semester: 4,
        academicYear: "2026-2027",
        division: "A",
        name: "Sem 4 Draft Timetable",
        status: "DRAFT",
        createdBy: hodUser._id,
      });

      const result = await checkTimetableAvailabilityAfterPromotion({
        student,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });

      expect(result.timetableAvailable).toBe(false);
      expect(result.notificationSent).toBe(true);

      // Verify HOD notification was created
      const notification = await Notification.findOne({
        college_id: college._id,
        target_users: hodUser._id,
      });

      expect(notification).not.toBeNull();
      expect(notification.target).toBe("INDIVIDUAL");
      expect(notification.target_semester).toBe(4);
      expect(notification.type).toBe("ACADEMIC");
      expect(notification.priority).toBe("HIGH");
      expect(notification.actionUrl).toBe("/hod/timetable");
      expect(notification.title).toContain("Semester 4");
    });

    it("should NOT treat ARCHIVED timetable as available and SHOULD notify HOD", async () => {
      // Create only an ARCHIVED timetable
      await Timetable.create({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        semester: 4,
        academicYear: "2026-2027",
        division: "A",
        name: "Sem 4 Archived Timetable",
        status: "ARCHIVED",
        createdBy: hodUser._id,
      });

      const result = await checkTimetableAvailabilityAfterPromotion({
        student,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });

      expect(result.timetableAvailable).toBe(false);
      expect(result.notificationSent).toBe(true);
    });

    it("should deduplicate notifications when checked multiple times for same semester", async () => {
      // First promotion check — creates notification
      const result1 = await checkTimetableAvailabilityAfterPromotion({
        student,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });
      expect(result1.notificationSent).toBe(true);

      // Second promotion check (another student promoted into same semester)
      const anotherStudent = {
        ...student,
        _id: new mongoose.Types.ObjectId(),
        fullName: "Jane Smith",
      };

      const result2 = await checkTimetableAvailabilityAfterPromotion({
        student: anotherStudent,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });

      // Second call finds existing notification and does not duplicate
      const notifications = await Notification.find({
        college_id: college._id,
        target_users: hodUser._id,
        target_semester: 4,
      });

      expect(notifications.length).toBe(1);
    });

    it("should gracefully handle missing HOD without throwing errors", async () => {
      // Create a department with no HOD and no teachers
      const deptWithoutHod = await Department.create({
        name: "Civil Engineering",
        code: "CIVIL",
        type: "ACADEMIC",
        college_id: college._id,
        createdBy: adminUser._id,
        programsOffered: ["UG"],
        startYear: 2020,
        sanctionedFacultyCount: 5,
        sanctionedStudentIntake: 60,
        hod_id: null,
      });

      const studentInDeptWithoutHod = {
        ...student,
        _id: new mongoose.Types.ObjectId(),
        department_id: deptWithoutHod._id,
      };

      const result = await checkTimetableAvailabilityAfterPromotion({
        student: studentInDeptWithoutHod,
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
        toSemester: 4,
        newAcademicYear: "2026-2027",
      });

      expect(result.timetableAvailable).toBe(false);
      expect(result.notificationSent).toBe(false);
      expect(result.reason).toBe("HOD_NOT_RESOLVED");
    });
  });

  describe("checkTimetableAvailabilityForBulkPromotion", () => {
    it("should de-duplicate multiple students in the same semester and send only ONE notification", async () => {
      const student1 = { ...student, _id: new mongoose.Types.ObjectId() };
      const student2 = { ...student, _id: new mongoose.Types.ObjectId() };
      const student3 = { ...student, _id: new mongoose.Types.ObjectId() };

      await checkTimetableAvailabilityForBulkPromotion({
        promotedStudents: [
          { student: student1, toSemester: 4, newAcademicYear: "2026-2027" },
          { student: student2, toSemester: 4, newAcademicYear: "2026-2027" },
          { student: student3, toSemester: 4, newAcademicYear: "2026-2027" },
        ],
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
      });

      const notifications = await Notification.find({
        college_id: college._id,
        target_users: hodUser._id,
        target_semester: 4,
      });

      expect(notifications.length).toBe(1);
    });

    it("should send separate notifications for different target semesters", async () => {
      const studentSem4 = { ...student, _id: new mongoose.Types.ObjectId() };
      const studentSem6 = {
        ...student,
        _id: new mongoose.Types.ObjectId(),
        currentSemester: 6,
      };

      await checkTimetableAvailabilityForBulkPromotion({
        promotedStudents: [
          { student: studentSem4, toSemester: 4, newAcademicYear: "2026-2027" },
          { student: studentSem6, toSemester: 6, newAcademicYear: "2026-2027" },
        ],
        actorId: adminUser._id,
        actorRole: "COLLEGE_ADMIN",
        collegeId: college._id,
      });

      const sem4Notifs = await Notification.find({
        college_id: college._id,
        target_users: hodUser._id,
        target_semester: 4,
      });
      const sem6Notifs = await Notification.find({
        college_id: college._id,
        target_users: hodUser._id,
        target_semester: 6,
      });

      expect(sem4Notifs.length).toBe(1);
      expect(sem6Notifs.length).toBe(1);
    });
  });
});
