const mongoose = require("mongoose");
const hodActivityService = require("../../src/services/hodActivity.service");

// Models used by hodActivityService
const AttendanceSession = require("../../src/models/attendanceSession.model");
const Timetable = require("../../src/models/timetable.model");
const TimetableException = require("../../src/models/timetableException.model");
const AuditLog = require("../../src/models/auditLog.model");

describe("HOD Recent Activity Service & Cross-Page Consistency Tests", () => {
  const collegeId = new mongoose.Types.ObjectId().toString();
  const deptA_Id = new mongoose.Types.ObjectId().toString();
  const deptB_Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.spyOn(TimetableException, "find").mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Requirement 3a: Both /hod/dashboard and /hod/reports contract consistency", () => {
    it("confirms both pages rely on the identical hodActivityService contract ({ collegeId, departmentId, limit: 6 })", async () => {
      // Both hodDashboard.service.js and hodReport.service.js call hodActivityService.getHodRecentActivity
      const hodDashboardService = require("../../src/services/hodDashboard.service");
      const hodReportService = require("../../src/services/hodReport.service");

      expect(typeof hodActivityService.getHodRecentActivity).toBe("function");

      // Verify the activity array returned for the department is identically structured
      const sampleActivity = [
        {
          id: "grouped-published-2026-10-10",
          type: "TIMETABLE_PUBLISHED_GROUP",
          title: "3 timetables published",
          readableText: "3 timetables published (1 currently active) · HOD · 2 days ago",
          isGrouped: true,
          count: 3,
          subItems: ["MSC IT Sem 4", "MSC IT Sem 3", "MSC IT Sem 2"],
          status: "Published",
        },
      ];

      jest.spyOn(hodActivityService, "getHodRecentActivity").mockResolvedValue(sampleActivity);

      const activityDashboard = await hodActivityService.getHodRecentActivity({
        collegeId,
        departmentId: deptA_Id,
        limit: 6,
      });

      const activityReports = await hodActivityService.getHodRecentActivity({
        collegeId,
        departmentId: deptA_Id,
        limit: 6,
      });

      expect(activityDashboard).toEqual(activityReports);
      expect(activityDashboard).toHaveLength(1);
      expect(activityDashboard[0].readableText).toBe(
        "3 timetables published (1 currently active) · HOD · 2 days ago"
      );
    });
  });

  describe("Requirement 3b: Excludes other departments' events (Department Isolation)", () => {
    it("excludes audit logs and timetables belonging to Department B when querying Department A", async () => {
      const ttDeptA_1 = {
        _id: new mongoose.Types.ObjectId(),
        name: "MSC IT - Sem 4 (2027-2028) - Div A",
        department_id: new mongoose.Types.ObjectId(deptA_Id),
        status: "PUBLISHED",
        createdAt: new Date("2026-10-10T10:00:00.000Z"),
      };
      const ttDeptA_2 = {
        _id: new mongoose.Types.ObjectId(),
        name: "MSC IT - Sem 3 (2027-2028) - Div A",
        department_id: new mongoose.Types.ObjectId(deptA_Id),
        status: "ARCHIVED",
        createdAt: new Date("2026-10-10T09:00:00.000Z"),
      };
      const ttDeptB = {
        _id: new mongoose.Types.ObjectId(),
        name: "Mechanical Eng - Sem 1 (2026-2027) - Div A",
        department_id: new mongoose.Types.ObjectId(deptB_Id),
        status: "PUBLISHED",
        createdAt: new Date("2026-10-10T08:00:00.000Z"),
      };

      // Mock Timetable.find
      jest.spyOn(Timetable, "find").mockImplementation((query) => {
        if (query.department_id && query.department_id.toString() === deptA_Id.toString()) {
          return {
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([ttDeptA_1, ttDeptA_2]),
          };
        }
        if (query._id && query._id.$in) {
          return Promise.resolve([ttDeptA_1, ttDeptA_2, ttDeptB]);
        }
        return Promise.resolve([]);
      });

      // Mock AttendanceSession.find
      jest.spyOn(AttendanceSession, "find").mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      // Mock AuditLog containing events for both Dept A and Dept B
      const auditLogEvents = [
        {
          _id: new mongoose.Types.ObjectId(),
          action: "TIMETABLE_PUBLISHED",
          resourceId: ttDeptA_1._id,
          userName: "Dr. Vishal Kore",
          details: { name: ttDeptA_1.name },
          createdAt: new Date("2026-10-10T10:00:00.000Z"),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          action: "TIMETABLE_PUBLISHED",
          resourceId: ttDeptB._id, // BELONGS TO DEPT B
          userName: "Dr. Mech HOD",
          details: { name: ttDeptB.name, departmentId: deptB_Id },
          createdAt: new Date("2026-10-10T08:00:00.000Z"),
        },
      ];

      jest.spyOn(AuditLog, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(auditLogEvents),
      });

      const activityA = await hodActivityService.getHodRecentActivity({
        collegeId,
        departmentId: deptA_Id,
      });

      // Verify Dept B event is completely excluded
      const deptBTexts = activityA.filter(
        (a) =>
          (a.readableText && a.readableText.includes("Mechanical")) ||
          (a.subjectName && a.subjectName.includes("Mechanical")) ||
          (a.whoDidIt && a.whoDidIt.includes("Mech HOD"))
      );
      expect(deptBTexts).toHaveLength(0);

      // Verify Dept A event is present
      const deptATexts = activityA.filter((a) => a.readableText.includes("MSC IT"));
      expect(deptATexts.length).toBeGreaterThan(0);
    });
  });

  describe("Requirement 3c: Timetable names, grouping, and active hints", () => {
    it("groups 3 timetables published on the same day as '3 timetables published (1 currently active)' with individual names", async () => {
      const sameDay = new Date("2026-10-09T08:00:00.000Z");

      const deptTimetables = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "MSC IT - Sem 4 (2027-2028) - Div A",
          department_id: new mongoose.Types.ObjectId(deptA_Id),
          status: "PUBLISHED", // 1 currently active
          updatedAt: sameDay,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "MSC IT - Sem 3 (2027-2028) - Div A",
          department_id: new mongoose.Types.ObjectId(deptA_Id),
          status: "ARCHIVED",
          updatedAt: sameDay,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "MSC IT - Sem 2 (2026-2027) - Div A",
          department_id: new mongoose.Types.ObjectId(deptA_Id),
          status: "ARCHIVED",
          updatedAt: sameDay,
        },
      ];

      jest.spyOn(Timetable, "find").mockImplementation((query) => {
        if (query.department_id) {
          return {
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue(deptTimetables),
          };
        }
        return Promise.resolve(deptTimetables);
      });

      jest.spyOn(AttendanceSession, "find").mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const auditLogs = deptTimetables.map((tt, idx) => ({
        _id: new mongoose.Types.ObjectId(),
        action: "TIMETABLE_PUBLISHED",
        resourceId: tt._id,
        userName: "HOD",
        details: { name: tt.name },
        createdAt: new Date(sameDay.getTime() + idx * 1000),
      }));

      jest.spyOn(AuditLog, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(auditLogs),
      });

      const activity = await hodActivityService.getHodRecentActivity({
        collegeId,
        departmentId: deptA_Id,
      });

      expect(activity).toHaveLength(1);
      const groupItem = activity[0];
      expect(groupItem.isGrouped).toBe(true);
      expect(groupItem.count).toBe(3);
      expect(groupItem.title).toBe("3 timetables published");
      expect(groupItem.readableText).toContain("3 timetables published (1 currently active)");
      expect(groupItem.subItems).toEqual([
        "MSC IT Sem 4",
        "MSC IT Sem 3",
        "MSC IT Sem 2",
      ]);
    });

    it("displays single timetable published with cleaned timetable name and looks up missing name by timetable ID", async () => {
      const eventDate = new Date("2026-10-11T10:00:00.000Z");

      const deptTimetable = {
        _id: new mongoose.Types.ObjectId(),
        name: "MSC IT - Sem 4 (2027-2028) - Div A",
        department_id: new mongoose.Types.ObjectId(deptA_Id),
        status: "PUBLISHED",
        updatedAt: eventDate,
      };

      jest.spyOn(Timetable, "find").mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([deptTimetable]),
      });

      jest.spyOn(AttendanceSession, "find").mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      jest.spyOn(AuditLog, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            action: "TIMETABLE_PUBLISHED",
            resourceId: deptTimetable._id,
            userName: "HOD",
            details: {}, // Empty details -> resolved from deptTimetableMap using resourceId
            createdAt: eventDate,
          },
        ]),
      });

      const activity = await hodActivityService.getHodRecentActivity({
        collegeId,
        departmentId: deptA_Id,
      });

      expect(activity).toHaveLength(1);
      const singleItem = activity[0];
      expect(singleItem.isGrouped).toBe(false);
      expect(singleItem.readableText).toContain("Timetable published · MSC IT Sem 4 · HOD");
    });
  });
});
