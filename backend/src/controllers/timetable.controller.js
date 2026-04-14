const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const {
  getValidDatesForSlot,
  getDayName,
  parseLocalDateSafe,
} = require("../utils/date.utils");
const teacherService = require("../services/teacher.service");
const timetableScheduleService = require("../services/timetableSchedule.service");
const ApiResponse = require("../utils/ApiResponse");

/* =========================================================
   CREATE TIMETABLE (HOD = Teacher who is department.hod_id)
========================================================= */
exports.createTimetable = async (req, res) => {
  try {
    if (req.user.role !== "TEACHER") {
      return res
        .status(403)
        .json({ message: "Only teachers can create timetable" });
    }

    // 🔧 Use teacher service (centralized logic)
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true, // check active status
    );

    const { department_id, course_id, semester, academicYear } = req.body;

    // 🔒 SECURITY: Ensure teacher can only create timetable for their own department
    if (teacher.department_id.toString() !== department_id) {
      return res.status(403).json({
        message:
          "Access denied: You can only create timetables for your own department",
      });
    }

    const department = await Department.findOne({
      _id: department_id,
      hod_id: teacher._id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(403).json({ message: "Only HOD can create timetable" });
    }

    const exists = await Timetable.findOne({
      department_id,
      course_id,
      semester,
      academicYear,
      college_id: req.college_id,
    });

    if (exists) {
      return res.status(400).json({ message: "Timetable already exists" });
    }

    const course = await Course.findById(course_id).select("name");
    const name = course
      ? `${course.name} - Sem ${semester} (${academicYear})`
      : `Semester ${semester} (${academicYear})`;

    const timetable = await Timetable.create({
      college_id: req.college_id,
      department_id,
      course_id,
      semester,
      academicYear,
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
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Add role check (only COLLEGE_ADMIN or TEACHER/HOD can publish)
    if (!["COLLEGE_ADMIN", "TEACHER"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Not authorized to publish timetable",
      });
    }

    timetable.status = "PUBLISHED";
    await timetable.save();

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
   GET TIMETABLE BY ID
========================================================= */
exports.getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("department_id", "name")
      .populate("course_id", "name");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
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
        timetable,
        slots: slotsWithDates,
      },
      "Timetable with valid dates retrieved successfully",
    );
  } catch (error) {
    console.error("Get Timetable Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   LIST TIMETABLES
========================================================= */
exports.getTimetables = async (req, res) => {
  try {
    const filter = { college_id: req.college_id };

    // If teacher, restrict to their department OR courses they teach
    if (req.user.role === "TEACHER") {
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
    ApiResponse.success(
      res,
      {
        timetables,
        count: timetables.length,
      },
      "Timetables fetched successfully",
    );
  } catch (error) {
    console.error("Get Timetables Error:", error);
    res.status(500).json({ message: "Failed to fetch timetables" });
  }
};

/* =========================================================
   WEEKLY TIMETABLE — TEACHER (OWN SCHEDULE)
========================================================= */
/**
 * GET /api/timetable/weekly
 * Purpose:
 *  - Show weekly schedule for logged-in teacher
 *  - ONLY slots from PUBLISHED timetables
 *  - Includes exception data for current week (holidays, cancellations, etc.)
 */
exports.getWeeklyTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );

    const slots = await TimetableSlot.find({
      teacher_id: teacher._id,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate({
        path: "timetable_id",
        select: "name semester academicYear status",
        match: { status: "PUBLISHED" }, // 🔒 ONLY PUBLISHED
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

    slots.forEach((slot) => {
      if (!slot.timetable_id) return; // draft filtered here

      // Add exception data to slot if exists
      const slotExceptions = exceptionsByDay[slot.day] || [];
      const slotObj = slot.toObject();

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

      weekly[slot.day].push(slotObj);
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
        select: "semester academicYear status",
        match: { status: "PUBLISHED" },
      })
      .sort({ day: 1, startTime: 1 });

    const filteredSlots = slots.filter((slot) => slot.timetable_id);

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

    // Get all timetable IDs for these slots
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
    res.status(500).json({ message: error.message });
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

    // Find all PUBLISHED timetables for student's course
    const slots = await TimetableSlot.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
      day: todayDayName,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate("course_id", "name code")
      .populate({
        path: "timetable_id",
        select: "semester academicYear status",
        match: { status: "PUBLISHED" },
      })
      .sort({ startTime: 1 });

    // Filter only slots from PUBLISHED timetables
    const publishedSlots = slots.filter((slot) => slot.timetable_id);

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
    // ✅ Validate timetableId parameter
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
   DELETE TIMETABLE (HOD)
========================================================= */
exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Find timetable
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 2️⃣ Find teacher profile and check HOD status
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
    );
    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
      return res.status(403).json({
        message: "Access denied: Only HOD can delete timetable",
      });
    }

    // 4️⃣ Delete slots first
    await TimetableSlot.deleteMany({ timetable_id: id });

    // 5️⃣ Delete timetable
    await Timetable.findByIdAndDelete(id);

    ApiResponse.success(res, null, "Timetable deleted successfully");
  } catch (error) {
    console.error("Delete Timetable Error:", error);
    res.status(500).json({ message: "Failed to delete timetable" });
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

      if (student.status !== "APPROVED") {
        return res.status(403).json({
          message: "Access denied: Your student account is pending approval.",
        });
      }

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

    // 2️⃣ Generate today's schedule
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

    // 2️⃣ Generate weekly schedule
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
