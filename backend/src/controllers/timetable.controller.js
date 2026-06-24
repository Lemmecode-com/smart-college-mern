const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AuditLog = require("../models/auditLog.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const {
  getValidDatesForSlot,
  getDayName,
  parseLocalDateSafe,
} = require("../utils/date.utils");
const teacherService = require("../services/teacher.service");
const timetableScheduleService = require("../services/timetableSchedule.service");
const ApiResponse = require("../utils/ApiResponse");
const { assertTimetableMutable } = require("../utils/timetableLifecycle.util");

/* =========================================================
   CREATE TIMETABLE (HOD = Teacher who is department.hod_id)
========================================================= */
exports.createTimetable = async (req, res) => {
   try {
     if (req.user.role !== "TEACHER" && req.user.role !== "HOD") {
       return res
         .status(403)
         .json({ message: "Only teachers and HOD can create timetable" });
     }

     // 🔧 Use teacher service (centralized logic)
     const teacher = await teacherService.getTeacherWithValidation(
       req.user.id,
       req.college_id,
       true, // check active status
     );

      const { department_id, course_id, semester, academicYear, division } = req.body;

      // 🔒 SECURITY: Ensure user can only create timetable for their own department
      let isAuthorized = false;
      
      if (req.user.role === "HOD") {
        // For HODs: check if they are the HOD of the target department
        const hodDepartment = await Department.findOne({
          _id: department_id,
          hod_id: teacher._id,
          college_id: req.college_id,
        });
        isAuthorized = !!hodDepartment;
      } else if (req.user.role === "TEACHER") {
        // For TEACHERs: check if they belong to the target department
        isAuthorized = teacher.department_id.toString() === department_id;
      }
      
      if (!isAuthorized) {
        return res.status(403).json({
          message:
            "Access denied: You can only create timetables for your own department",
        });
      }

      const exists = await Timetable.findOne({
        college_id: req.college_id,
        department_id,
        course_id,
        semester,
        academicYear,
        division: division || null,
      });

      if (exists) {
        return res.status(400).json({ message: "Timetable already exists" });
      }

      const course = await Course.findById(course_id).select("name yearLabels");
      const yearLabel = course?.yearLabels?.length
        ? require("../utils/yearLabels").getYearLabelForSemester(semester, course.yearLabels)
        : null;
      const name = yearLabel
        ? `${course?.name || "Course"} - ${yearLabel} - Sem ${semester} (${academicYear})${division ? ` - Div ${division}` : ""}`
        : `${course?.name || "Course"} - Sem ${semester} (${academicYear})${division ? ` - Div ${division}` : ""}`;

      const timetable = await Timetable.create({
        college_id: req.college_id,
        department_id,
        course_id,
        semester,
        academicYear,
        division: division || null,
        name,
        createdBy: teacher._id,
      });

     ApiResponse.created(
       res,
       {
         timetable,
       },
       "Timetable created successfully",
     );
   } catch (err) {
     console.error(err);
     res.status(500).json({ message: "Failed to create timetable" });
   }
 };

/* =========================================================
     PUBLISH TIMETABLE (HOD/COLLEGE_ADMIN)
  ========================================================= */
exports.publishTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ _id: req.params.id, college_id: req.college_id });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Block publishing archived timetables (terminal state)
    if (timetable.status === "ARCHIVED") {
      return res.status(400).json({
        message: "Cannot publish an archived timetable. Archived timetables are preserved for record-keeping.",
      });
    }

    // Only HOD can publish timetables
    if (!["HOD"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Not authorized to publish timetable",
      });
    }

    // 🔒 SECURITY: Verify HOD department ownership (defense-in-depth)
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );
    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD || timetable.department_id.toString() !== teacher.department_id.toString()) {
      return res.status(403).json({
        message: "Access denied: You can only publish timetables for your own department",
      });
    }

    timetable.status = "PUBLISHED";
    await timetable.save();

    // Fire-and-forget audit log
    AuditLog.create({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "TIMETABLE_PUBLISHED",
      resourceType: "Timetable",
      resourceId: timetable._id,
      ipAddress: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        status: timetable.status,
      },
      newValues: {
        status: "PUBLISHED",
      },
    }).catch((err) =>
      console.error("Audit log failed for timetable publication:", err.message),
    );

    ApiResponse.success(
      res,
      {
        timetable,
      },
      "Timetable published successfully",
    );
  } catch (error) {
    console.error("Publish Timetable Error:", error);
    res.status(500).json({ message: "Failed to publish timetable" });
  }
};

/* =========================================================
    ARCHIVE TIMETABLE (HOD only - terminal lifecycle state)
    — Sets status to ARCHIVED, preserves all data including attendance
    — Audit log: TIMETABLE_ARCHIVED
 ========================================================= */
exports.archiveTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    if (timetable.status === "ARCHIVED") {
      return res.status(400).json({ message: "Timetable is already archived" });
    }

    // 🔒 SECURITY: Verify HOD department ownership (defense-in-depth)
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );
    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
      return res.status(403).json({
        message: "Access denied: Only HOD can archive timetable",
      });
    }

    if (timetable.department_id.toString() !== teacher.department_id.toString()) {
      return res.status(403).json({
        message: "Access denied: You can only archive timetables for your own department",
      });
    }

    const previousStatus = timetable.status;
    timetable.status = "ARCHIVED";
    await timetable.save();

    // Fire-and-forget audit log
    AuditLog.create({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "TIMETABLE_ARCHIVED",
      resourceType: "Timetable",
      resourceId: timetable._id,
      ipAddress: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        status: previousStatus,
      },
      newValues: {
        status: "ARCHIVED",
      },
    }).catch((err) =>
      console.error("Audit log failed for timetable archival:", err.message),
    );

    ApiResponse.success(
      res,
      {
        timetable,
      },
      "Timetable archived successfully",
    );
  } catch (error) {
    console.error("Archive Timetable Error:", error);
    res.status(500).json({ message: "Failed to archive timetable" });
  }
};

/* =========================================================
    GET TIMETABLE BY ID
 ========================================================= */
exports.getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("department_id", "name")
      .populate("course_id", "name yearLabels");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Allow ARCHIVED timetables when explicitly requested via ?includeArchived=true
    const includeArchived = req.query.includeArchived === "true";
    if (timetable.status === "ARCHIVED" && !includeArchived) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 🔒 SECURITY: HOD can only view timetables for their own department
    if (req.user.role === "HOD") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );
      const { isHOD } = await teacherService.getHODStatus(teacher);
      if (isHOD && timetable.department_id.toString() !== teacher.department_id.toString()) {
        return res.status(403).json({
          message: "Access denied: HOD can only view timetables for their own department",
        });
      }
    }

    const yearLabelsUtils = require("../utils/yearLabels");
    const timetableObj = timetable.toObject();
    const course = timetable.course_id;
    if (course?.yearLabels?.length) {
      timetableObj.yearLabel = yearLabelsUtils.getYearLabelForSemester(
        timetableObj.semester,
        course.yearLabels,
      );
    }

    // Get all slots for this timetable
    const slots = await TimetableSlot.find({
      timetable_id: timetable._id,
      college_id: req.college_id,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name email");

    // Add valid dates for each slot
    const slotsWithDates = slots.map((slot) => {
      const validDates = getValidDatesForSlot(
        slot.day,
        timetable.academicYear,
        timetable.semester,
      );

      return {
        ...slot.toObject(),
        validDates: validDates.map((d) => ({
          date: d.toISOString().split("T")[0],
          dayName: getDayName(d),
        })),
      };
    });

    ApiResponse.success(
      res,
      {
        timetable: timetableObj,
        slots: slotsWithDates,
      },
      "Timetable with valid dates retrieved successfully",
    );
  } catch (error) {
console.error("Get Timetable Error:", error);
     res.status(500).json({ message: "Internal server error" });
   }
};

/* =========================================================
    LIST TIMETABLES
  ========================================================= */
exports.getTimetables = async (req, res) => {
  try {
    const filter = { college_id: req.college_id, status: { $ne: "ARCHIVED" } };

    // If teacher or HOD, restrict to their department OR courses they teach
    if (req.user.role === "TEACHER" || req.user.role === "HOD") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );

      // Check if teacher is HOD
      const { isHOD } = await teacherService.getHODStatus(teacher);

      if (isHOD) {
        // HOD can see all timetables in their department
        filter.department_id = teacher.department_id;
      } else {
        // Regular teacher: Get courses they teach
        const teacherCourses = teacher.courses || [];
        if (teacherCourses.length === 0) {
          return ApiResponse.success(
            res,
            {
              timetables: [],
              count: 0,
            },
            "No courses assigned to teacher",
          );
        }
        filter.course_id = { $in: teacherCourses };
      }
    }

    // Allow department filter override for HOD/Admin
    if (req.query.department_id) {
      // Only allow if user is HOD of that department or admin
      if (req.user.role === "TEACHER") {
        const teacher = await teacherService.getTeacherWithValidation(
          req.user.id,
          req.college_id,
        );
        const { isHOD, department: hodDepartment } =
          await teacherService.getHODStatus(teacher);

        if (!isHOD) {
          return res.status(403).json({
            message:
              "Access denied: You can only view timetables for your department",
          });
        }
      }
      filter.department_id = req.query.department_id;
    }

    const timetables = await Timetable.find(filter).sort({ createdAt: -1 });

    const yearLabelsUtils = require("../utils/yearLabels");

    const timetablesWithYearLabel = await Promise.all(
      timetables.map(async (t) => {
        const course = await Course.findById(t.course_id).select("yearLabels").lean();
        const yearLabel = course?.yearLabels?.length
          ? yearLabelsUtils.getYearLabelForSemester(t.semester, course.yearLabels)
          : null;
        const obj = t.toObject();
        obj.yearLabel = yearLabel;
        return obj;
      }),
    );

    ApiResponse.success(
      res,
      {
        timetables: timetablesWithYearLabel,
        count: timetablesWithYearLabel.length,
      },
      "Timetables fetched successfully",
    );
  } catch (error) {
    console.error("Get Timetables Error:", error);
    res.status(500).json({ message: "Failed to fetch timetables" });
  }
};

/* =========================================================
    ARCHIVED TIMETABLES
   ========================================================= */
exports.getArchivedTimetables = async (req, res) => {
  try {
    const filter = { college_id: req.college_id, status: "ARCHIVED" };

    // Apply same role-based scoping as getTimetables
    if (req.user.role === "TEACHER" || req.user.role === "HOD") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );

      const { isHOD } = await teacherService.getHODStatus(teacher);

      if (isHOD) {
        filter.department_id = teacher.department_id;
      } else {
        const teacherCourses = teacher.courses || [];
        if (teacherCourses.length === 0) {
          return ApiResponse.success(
            res,
            {
              timetables: [],
              count: 0,
            },
            "No archived timetables found",
          );
        }
        filter.course_id = { $in: teacherCourses };
      }
    }

    // Allow department filter override for HOD/Admin
    if (req.query.department_id) {
      if (req.user.role === "TEACHER") {
        const teacher = await teacherService.getTeacherWithValidation(
          req.user.id,
          req.college_id,
        );
        const { isHOD } = await teacherService.getHODStatus(teacher);

        if (!isHOD) {
          return res.status(403).json({
            message:
              "Access denied: You can only view timetables for your department",
          });
        }
      }
      filter.department_id = req.query.department_id;
    }

    const timetables = await Timetable.find(filter).sort({ createdAt: -1 });

    const yearLabelsUtils = require("../utils/yearLabels");

    const timetablesWithYearLabel = await Promise.all(
      timetables.map(async (t) => {
        const course = await Course.findById(t.course_id).select("yearLabels").lean();
        const yearLabel = course?.yearLabels?.length
          ? yearLabelsUtils.getYearLabelForSemester(t.semester, course.yearLabels)
          : null;
        const obj = t.toObject();
        obj.yearLabel = yearLabel;
        return obj;
      }),
    );

    ApiResponse.success(
      res,
      {
        timetables: timetablesWithYearLabel,
        count: timetablesWithYearLabel.length,
      },
      "Archived timetables fetched successfully",
    );
  } catch (error) {
    console.error("Get Archived Timetables Error:", error);
    res.status(500).json({ message: "Failed to fetch archived timetables" });
  }
};

/* =========================================================
    TIMETABLE STATISTICS
   ========================================================= */
exports.getTimetableStats = async (req, res) => {
  try {
    // Build base filter with role-based scoping (mirrors getTimetables)
    let baseFilter = { college_id: req.college_id };

    if (req.user.role === "TEACHER" || req.user.role === "HOD") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );

      const { isHOD } = await teacherService.getHODStatus(teacher);

      if (isHOD) {
        baseFilter.department_id = teacher.department_id;
      } else {
        const teacherCourses = teacher.courses || [];
        if (teacherCourses.length === 0) {
          return ApiResponse.success(
            res,
            {
              total: 0,
              published: 0,
              draft: 0,
              archived: 0,
            },
            "Stats fetched successfully",
          );
        }
        baseFilter.course_id = { $in: teacherCourses };
      }
    }

    const [total, published, draft, archived] = await Promise.all([
      Timetable.countDocuments(baseFilter),
      Timetable.countDocuments({ ...baseFilter, status: "PUBLISHED" }),
      Timetable.countDocuments({ ...baseFilter, status: "DRAFT" }),
      Timetable.countDocuments({ ...baseFilter, status: "ARCHIVED" }),
    ]);

    ApiResponse.success(
      res,
      {
        total,
        published,
        draft,
        archived,
      },
      "Timetable statistics fetched successfully",
    );
  } catch (error) {
    console.error("Get Timetable Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch timetable statistics" });
  }
};

/* =========================================================
     WEEKLY TIMETABLE — TEACHER (OWN SCHEDULE) OR HOD (DEPARTMENT)
    ========================================================= */
/**
  * GET /api/timetable/weekly
  * Purpose:
  *  - TEACHER: Show weekly schedule for logged-in teacher
  *  - HOD: Show weekly schedule for entire department
  *  - ONLY slots from PUBLISHED timetables
  *  - Includes exception data for current week (holidays, cancellations, etc.)
  */
exports.getWeeklyTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );

    // Check if teacher is HOD
    const isHod = await Department.findOne({
      _id: teacher.department_id,
      hod_id: teacher._id,
    });

    // Build query based on role - include college_id for tenant isolation
    const slotQuery = isHod
      ? { department_id: teacher.department_id, college_id: req.college_id }
      : { teacher_id: teacher._id, college_id: req.college_id };

    const slots = await TimetableSlot.find({
      ...slotQuery,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate({
        path: "timetable_id",
        select: "name semester academicYear status division course_id",
        match: { status: "PUBLISHED" },
        populate: {
          path: "course_id",
          select: "yearLabels",
        },
      });

    const yearLabelsUtils = require("../utils/yearLabels");
    const timetableYearCache = {};
    const slotsWithYearLabel = slots.map((slot) => {
      if (!slot.timetable_id) return slot;
      const tId = slot.timetable_id._id.toString();
      let yearLabel = null;
      // Check if course_id is populated (is an object) or just ObjectId
      if (slot.timetable_id.course_id && typeof slot.timetable_id.course_id === 'object' && slot.timetable_id.course_id.yearLabels?.length) {
        if (!timetableYearCache[tId]) {
          timetableYearCache[tId] = yearLabelsUtils.getYearLabelForSemester(
            slot.timetable_id.semester,
            slot.timetable_id.course_id.yearLabels,
          );
        }
        yearLabel = timetableYearCache[tId];
      }
      const slotObj = slot.toObject();
      slotObj.yearLabel = yearLabel;
      return slotObj;
    });

    // Get current week's date range for exception lookup
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get all timetable IDs this teacher is assigned to
    const timetableIds = [
      ...new Set(
        slots
          .filter((s) => s.timetable_id)
          .map((s) => s.timetable_id._id.toString()),
      ),
    ];

    // Fetch exceptions for this week
    const TimetableExceptionModel = require("../models/timetableException.model");
    const exceptions = await TimetableExceptionModel.find({
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      exceptionDate: {
        $gte: monday,
        $lte: sunday,
      },
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    }).populate("slot_id", "day startTime endTime");

    // Group exceptions by day of week for easy lookup
    const exceptionsByDay = {};
    exceptions.forEach((exc) => {
      const excDate = new Date(exc.exceptionDate);
      const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const dayName = days[excDate.getDay()];

      if (!exceptionsByDay[dayName]) {
        exceptionsByDay[dayName] = [];
      }
      exceptionsByDay[dayName].push(exc);
    });

    const weekly = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    slotsWithYearLabel.forEach((slot) => {
      if (!slot.timetable_id) return; // draft filtered here

      // Add exception data to slot if exists
      const slotExceptions = exceptionsByDay[slot.day] || [];
      // slot is already a plain object from slotsWithYearLabel map

      // Find exceptions that apply to this specific slot or are day-wide (HOLIDAY)
      const applicableExceptions = slotExceptions.filter(
        (exc) =>
          !exc.slot_id || // Day-wide exception (e.g., HOLIDAY)
          exc.slot_id._id.toString() === slot._id.toString(), // Slot-specific exception
      );

      if (applicableExceptions.length > 0) {
        // Check if there's a HOLIDAY (overrides everything)
        const holiday = applicableExceptions.find((e) => e.type === "HOLIDAY");
        if (holiday) {
          slot.exception = {
            type: "HOLIDAY",
            reason: holiday.reason,
          };
          slot.status = "HOLIDAY";
        } else {
          // Use the first applicable exception
          const exc = applicableExceptions[0];
          slot.exception = {
            type: exc.type,
            reason: exc.reason,
            rescheduledTo: exc.rescheduledTo,
          };

          if (exc.type === "CANCELLED") {
            slot.status = "CANCELLED";
          } else if (exc.type === "EXTRA") {
            slot.status = "EXTRA";
          } else if (exc.type === "RESCHEDULED") {
            slot.status = "RESCHEDULED";
          }
        }
      }

      weekly[slot.day].push(slot);
    });

    // Check if any day is fully cancelled by HOLIDAY
    Object.keys(weekly).forEach((day) => {
      const dayExceptions = exceptionsByDay[day] || [];
      const holiday = dayExceptions.find((e) => e.type === "HOLIDAY");
      if (holiday && weekly[day].length === 0) {
        // Add a placeholder holiday entry even if no slots exist
        weekly[day].push({
          _id: null,
          day,
          exception: {
            type: "HOLIDAY",
            reason: holiday.reason,
          },
          status: "HOLIDAY",
          isHolidayOnly: true,
        });
      }
    });

    ApiResponse.success(
      res,
      {
        weekly,
        weekRange: {
          start: monday.toISOString().split("T")[0],
          end: sunday.toISOString().split("T")[0],
        },
        hasExceptions: exceptions.length > 0,
      },
      "Weekly timetable fetched successfully",
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load schedule" });
  }
};

/* =========================================================
   WEEKLY TIMETABLE — STUDENTS (OWN SCHEDULE)
========================================================= */
exports.getStudentTimetable = async (req, res) => {
  try {
    const student = req.student;

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const slots = await TimetableSlot.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate("course_id", "name code")
      .populate({
        path: "timetable_id",
        select: "semester academicYear status division",
        match: { status: "PUBLISHED" },
      })
      .sort({ day: 1, startTime: 1 });

    const filteredSlots = slots.filter((slot) => {
      if (!slot.timetable_id) return false;
      if (slot.timetable_id.division) {
        return student.division && slot.timetable_id.division === student.division;
      }
      return true;
    });

    // Fetch current week's exceptions and attach to slots
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get matching timetable IDs for exception lookup
    const timetableIds = [
      ...new Set(
        filteredSlots
          .filter((s) => s.timetable_id)
          .map((s) => s.timetable_id._id.toString()),
      ),
    ];

    // Fetch exceptions for this week
    const TimetableExceptionModel = require("../models/timetableException.model");
    const exceptions = await TimetableExceptionModel.find({
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      exceptionDate: {
        $gte: monday,
        $lte: sunday,
      },
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    }).populate("slot_id", "day startTime endTime");

    // Group exceptions by day of week for easy lookup
    const exceptionsByDay = {};
    exceptions.forEach((exc) => {
      const excDate = new Date(exc.exceptionDate);
      const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const dayName = days[excDate.getDay()];

      if (!exceptionsByDay[dayName]) {
        exceptionsByDay[dayName] = [];
      }
      exceptionsByDay[dayName].push(exc);
    });

    // Attach exception data to each slot
    const slotsWithExceptions = filteredSlots.map((slot) => {
      const slotObj = slot.toObject();
      const dayExceptions = exceptionsByDay[slot.day] || [];

      // Find exceptions that apply to this specific slot or are day-wide (HOLIDAY)
      const applicableExceptions = dayExceptions.filter(
        (exc) =>
          !exc.slot_id || exc.slot_id._id.toString() === slot._id.toString(),
      );

      if (applicableExceptions.length > 0) {
        // Check if there's a HOLIDAY (overrides everything)
        const holiday = applicableExceptions.find((e) => e.type === "HOLIDAY");
        if (holiday) {
          slotObj.exception = {
            type: "HOLIDAY",
            reason: holiday.reason,
          };
          slotObj.status = "HOLIDAY";
        } else {
          // Use the first applicable exception
          const exc = applicableExceptions[0];
          slotObj.exception = {
            type: exc.type,
            reason: exc.reason,
            rescheduledTo: exc.rescheduledTo,
          };

          if (exc.type === "CANCELLED") {
            slotObj.status = "CANCELLED";
          } else if (exc.type === "EXTRA") {
            slotObj.status = "EXTRA";
          } else if (exc.type === "RESCHEDULED") {
            slotObj.status = "RESCHEDULED";
          }
        }
      }

      return slotObj;
    });

    ApiResponse.success(
      res,
      {
        slots: slotsWithExceptions,
        count: slotsWithExceptions.length,
      },
      "Student timetable fetched successfully",
    );
  } catch (error) {
console.error("Student timetable error:", error);
     res.status(500).json({ message: "Internal server error" });
   }
};

/* =========================================================
   TODAY'S TIMETABLE — STUDENTS
========================================================= */
exports.getStudentTodayTimetable = async (req, res) => {
  try {
    const student = req.student;

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get today's day name
    const today = new Date();
    const todayDayName = getDayName(today);
    const todayStr = today.toISOString().split("T")[0];

    // Find all PUBLISHED timetables for student's course and division
    const timetableQuery = {
      college_id: req.college_id,
      course_id: student.course_id,
      status: "PUBLISHED",
    };
    if (student.division) {
      timetableQuery.$or = [
        { division: student.division },
        { division: null },
      ];
    }

    const matchingTimetables = await Timetable.find(timetableQuery)
      .select("_id semester academicYear")
      .lean();

    const timetableIds = matchingTimetables.map((t) => t._id);

    if (timetableIds.length === 0) {
      ApiResponse.success(
        res,
        { today: todayStr, dayName: todayDayName, totalSlots: 0, slots: [] },
        "Today's timetable fetched successfully",
      );
      return;
    }

    const slots = await TimetableSlot.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
      timetable_id: { $in: timetableIds },
      day: todayDayName,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate("course_id", "name code")
      .populate({
        path: "timetable_id",
        select: "semester academicYear status division",
      })
      .sort({ startTime: 1 });

    const timetableMetaMap = {};
    matchingTimetables.forEach((t) => {
      timetableMetaMap[t._id.toString()] = t;
    });

    const publishedSlots = slots.map((slot) => ({
      ...slot.toObject(),
      _timetableMeta: timetableMetaMap[slot.timetable_id.toString()] || null,
    }));

    ApiResponse.success(
      res,
      {
        today: todayStr,
        dayName: todayDayName,
        totalSlots: publishedSlots.length,
        slots: publishedSlots,
      },
      "Today's timetable fetched successfully",
    );
  } catch (error) {
    console.error("Student today timetable error:", error);
    res.status(500).json({ message: "Failed to fetch today's timetable" });
  }
};

/* =========================================================
    WEEKLY TIMETABLE — HOD (FULL VIEW)
  ========================================================= */
exports.getWeeklyTimetableById = async (req, res) => {
  try {
    // 1️⃣ Validate timetableId parameter
    if (!req.params.timetableId || req.params.timetableId === "undefined") {
      return res.status(400).json({
        message: "Invalid timetable ID. Please select a valid timetable.",
      });
    }

    const timetable = await Timetable.findOne({
      _id: req.params.timetableId,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Allow ARCHIVED timetables when explicitly requested via ?includeArchived=true
    const includeArchived = req.query.includeArchived === "true";
    if (timetable.status === "ARCHIVED" && !includeArchived) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 🔒 SECURITY: Check if user has access to this department's timetable
    if (req.user.role === "TEACHER") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );

      const { isHOD } = await teacherService.getHODStatus(teacher);
      const isSameDepartment =
        teacher.department_id.toString() === timetable.department_id.toString();

      if (!isSameDepartment && !isHOD) {
        return res.status(403).json({
          message:
            "Access denied: You can only view timetables for your department",
        });
      }
    }

    const slots = await TimetableSlot.find({
      timetable_id: timetable._id,
    })
      .populate("subject_id", "name")
      .populate("teacher_id", "name");

    const weekly = { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] };
    slots.forEach((s) => weekly[s.day].push(s));

    ApiResponse.success(
      res,
      {
        timetable,
        weekly,
      },
      "Weekly timetable fetched successfully",
    );
  } catch (error) {
    // ✅ Handle MongoDB ObjectId cast errors gracefully
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid timetable ID format. Please provide a valid ID.",
      });
    }
    console.error("Get Weekly Timetable Error:", error);
    res.status(500).json({ message: "Failed to fetch weekly timetable" });
  }
};

/* =========================================================
    DELETE TIMETABLE (HOD only, cannot delete if has attendance sessions)
    — Transaction-wrapped: TimetableException → AttendanceSession.slot_id nullify → TimetableSlot → Timetable
    — Audit log: fire-and-forget (consistent with other controllers)
    — Business rule: Block deletion if any attendance sessions exist; require archival instead
 ========================================================= */
exports.deleteTimetable = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // 1️⃣ Find timetable (scoped to college)
    const timetable = await Timetable.findOne({
      _id: id,
      college_id: req.college_id,
    }).session(session);

    if (!timetable) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Timetable not found" });
    }

    assertTimetableMutable(timetable);

    // 2️⃣ Business rule: prevent deletion of timetables with attendance sessions
    // Check for attendance sessions linked to this timetable's slots
    const slotIds = await TimetableSlot.find({
      timetable_id: id,
      college_id: req.college_id,
    })
      .session(session)
      .distinct("_id");

    const attendanceCount = await AttendanceSession.countDocuments({
      slot_id: { $in: slotIds },
      college_id: req.college_id,
    }).session(session);

    if (attendanceCount > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message:
          "This timetable contains attendance records and must be archived instead.",
      });
    }

    // 3️⃣ Verify HOD ownership (defense-in-depth; hod middleware also runs but we recheck here)
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );
    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
      await session.abortTransaction();
      return res.status(403).json({
        message: "Access denied: Only HOD can delete timetable",
      });
    }

    // Verify HOD belongs to the timetable's department
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
      college_id: req.college_id,
    }).session(session);

    if (!department) {
      await session.abortTransaction();
      return res.status(403).json({
        message:
          "You are not the HOD of the department this timetable belongs to.",
      });
    }

    // 4️⃣ Delete all exceptions tied to this timetable
    await TimetableException.deleteMany({ timetable_id: id }).session(session);

    // 5️⃣ Delete all slots
    await TimetableSlot.deleteMany({ timetable_id: id }).session(session);

    // 6️⃣ Delete timetable
    await Timetable.findOneAndDelete({
      _id: id,
      college_id: req.college_id,
    }).session(session);

    // 7️⃣ Commit — all-or-nothing
    await session.commitTransaction();

    // 8️⃣ Fire-and-forget audit log (consistent with all other controllers)
    AuditLog.create({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "TIMETABLE_DELETED",
      resourceType: "Timetable",
      resourceId: timetable._id,
      ipAddress: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: {
        timetableId: timetable._id,
        timetableName: timetable.name,
        departmentId: timetable.department_id,
        semester: timetable.semester,
        academicYear: timetable.academicYear,
        status: timetable.status,
        slotCount: slotIds.length,
        deletedBy: req.user.id,
      },
    }).catch((err) =>
      console.error("Audit log failed for timetable deletion:", err.message),
    );

    ApiResponse.success(
      res,
      null,
      `Timetable "${timetable.name}" and ${slotIds.length} slot(s) deleted successfully`,
    );
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete Timetable Error:", error);
    next(error);
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   GET DATE-WISE SCHEDULE
   GET /api/timetable/:id/schedule?startDate=&endDate=
========================================================= */
exports.getSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // 1️⃣ Validate timetable exists
    const timetable = await Timetable.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Allow ARCHIVED timetables when explicitly requested via ?includeArchived=true
    const includeArchived = req.query.includeArchived === "true";
    if (timetable.status === "ARCHIVED" && !includeArchived) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 2️⃣ Validate date range is provided
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

// 3️⃣ Validate date range limit (max 90 days)
    // Parse dates as local dates to avoid timezone issues
    const startLocal = parseLocalDateSafe(startDate);
    const endLocal = parseLocalDateSafe(endDate);
    const daysDiff = Math.ceil((endLocal - startLocal) / (1000 * 60 * 60 * 24));

    if (daysDiff > 90) {
      return res.status(400).json({
        message:
          "Date range cannot exceed 90 days. Please request a smaller range.",
      });
    }

    if (startLocal > endLocal) {
      return res.status(400).json({
        message: "startDate must be before endDate",
      });
    }

    // 4️⃣ Check access permissions
    if (req.user.role === "TEACHER") {
      const teacher = await teacherService.getTeacherWithValidation(
        req.user.id,
        req.college_id,
      );
      const { isHOD } = await teacherService.getHODStatus(teacher);

      // Teacher must be from same department or HOD
      if (
        !isHOD &&
        teacher.department_id.toString() !== timetable.department_id.toString()
      ) {
        return res.status(403).json({
          message:
            "Access denied: You can only view schedules for your department",
        });
      }
    } else if (req.user.role === "STUDENT") {
      // Students can only view schedules for their own department and course
      // Fetch student profile inline (studentMiddleware is not on this route)
      const Student = require("../models/student.model");
      const student = await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
      });

      if (!student) {
        return res.status(403).json({
          message:
            "Access denied: Student profile not found. Please ensure you have an approved student account.",
        });
      }

      // Allow timetable access for APPROVED and ENROLLED students only.
      // APPROVED: Fully enrolled student with active status
      // ENROLLED: Student who has confirmed their seat (post-offer acceptance)
      // PENDING/OFFER_MADE/REJECTED: Not yet fully enrolled - access denied
if (!["APPROVED", "ENROLLED"].includes(student.status)) {
         console.log("[TIMETABLE_ACCESS] Blocked - invalid student status");
         return res.status(403).json({
           message: "Access denied: Your student account is pending approval.",
         });
       }

       console.log("[TIMETABLE_ACCESS] Allowed - valid student status");

      if (
        student.department_id.toString() !==
          timetable.department_id.toString() ||
        student.course_id.toString() !== timetable.course_id.toString()
      ) {
        return res.status(403).json({
          message:
            "Access denied: You can only view schedules for your own course",
        });
      }
    }

    // 5️⃣ Generate schedule - pass local dates to avoid timezone issues
    const schedule = await timetableScheduleService.generateSchedule(
      id,
      startLocal,
      endLocal,
      {},
      req.college_id,
    );

    ApiResponse.success(res, schedule, "Schedule fetched successfully");
  } catch (error) {
    console.error("Get Schedule Error:", error);
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
};

/* =========================================================
     GET TODAY'S SCHEDULE
     GET /api/timetable/:id/schedule/today
  ========================================================= */
exports.getTodaySchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validate timetable exists
    const timetable = await Timetable.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Allow ARCHIVED timetables when explicitly requested via ?includeArchived=true
    const includeArchived = req.query.includeArchived === "true";
    if (timetable.status === "ARCHIVED" && !includeArchived) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 2️⃣ Student authorization check
    if (req.user.role === "STUDENT") {
      const Student = require("../models/student.model");
      const student = await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
      });

      if (!student || !["APPROVED", "ENROLLED"].includes(student.status)) {
        console.log(`[TIMETABLE_ACCESS] Blocked - Student: ${student?._id}, Status: ${student?.status}`);
        return res.status(403).json({
          message: "Access denied: Your student account is pending approval.",
        });
      }

      // Validate student belongs to this timetable's course/department
      if (
        student.department_id.toString() !== timetable.department_id.toString() ||
        student.course_id.toString() !== timetable.course_id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only view schedules for your own course",
        });
      }
      console.log(`[TIMETABLE_ACCESS] Allowed - Student: ${student._id}, Status: ${student.status}`);
    }

    // 3️⃣ Generate today's schedule
    const todaySchedule = await timetableScheduleService.getTodaySchedule(id);

    ApiResponse.success(
      res,
      todaySchedule,
      "Today's schedule fetched successfully",
    );
  } catch (error) {
    console.error("Get Today Schedule Error:", error);
    res.status(500).json({ message: "Failed to fetch today's schedule" });
  }
};

/* =========================================================
     GET WEEKLY SCHEDULE
     GET /api/timetable/:id/schedule/week
  ========================================================= */
exports.getWeeklySchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validate timetable exists
    const timetable = await Timetable.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Allow ARCHIVED timetables when explicitly requested via ?includeArchived=true
    const includeArchived = req.query.includeArchived === "true";
    if (timetable.status === "ARCHIVED" && !includeArchived) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 2️⃣ Student authorization check
    if (req.user.role === "STUDENT") {
      const Student = require("../models/student.model");
      const student = await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
      });

      if (!student || !["APPROVED", "ENROLLED"].includes(student.status)) {
        console.log(`[TIMETABLE_ACCESS] Blocked - Student: ${student?._id}, Status: ${student?.status}`);
        return res.status(403).json({
          message: "Access denied: Your student account is pending approval.",
        });
      }

      // Validate student belongs to this timetable's course/department
      if (
        student.department_id.toString() !== timetable.department_id.toString() ||
        student.course_id.toString() !== timetable.course_id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only view schedules for your own course",
        });
      }
      console.log(`[TIMETABLE_ACCESS] Allowed - Student: ${student._id}, Status: ${student.status}`);
    }

    // 3️⃣ Generate weekly schedule
    const weeklySchedule = await timetableScheduleService.getWeeklySchedule(id);

    ApiResponse.success(
      res,
      weeklySchedule,
      "Weekly schedule fetched successfully",
    );
  } catch (error) {
    console.error("Get Weekly Schedule Error:", error);
    res.status(500).json({ message: "Failed to fetch weekly schedule" });
  }
};
