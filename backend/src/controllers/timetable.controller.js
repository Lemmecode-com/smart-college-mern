const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const { getValidDatesForSlot, getDayName } = require("../utils/date.utils");

/* =========================================================
   CREATE TIMETABLE (HOD = Teacher who is department.hod_id)
========================================================= */
exports.createTimetable = async (req, res) => {
  try {
    if (req.user.role !== "TEACHER") {
      return res.status(403).json({ message: "Only teachers can create timetable" });
    }

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    const { department_id, course_id, semester, academicYear } = req.body;

    // 🔒 SECURITY: Ensure teacher can only create timetable for their own department
    if (teacher.department_id.toString() !== department_id) {
      return res.status(403).json({ 
        message: "Access denied: You can only create timetables for your own department" 
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

    res.status(201).json({ message: "Timetable created successfully", timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create timetable" });
  }
};

/* =========================================================
   PUBLISH TIMETABLE (HOD)
========================================================= */
exports.publishTimetable = async (req, res) => {
  const timetable = await Timetable.findByIdAndUpdate(
    req.params.id,
    { status: "PUBLISHED" },
    { new: true }
  );

  if (!timetable) {
    return res.status(404).json({ message: "Timetable not found" });
  }

  res.json({
    message: "Timetable published successfully",
    timetable,
  });
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
      .populate("department_id", "name hod_id")
      .populate("course_id", "name");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // If teacher, check if they have access to this department's timetable
    if (req.user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ user_id: req.user.id });
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }
      
      // Check if teacher belongs to the same department OR is HOD of that department
      const isSameDepartment = teacher.department_id.toString() === timetable.department_id._id.toString();
      const isHodOfDepartment = timetable.department_id.hod_id?.toString() === teacher._id.toString();
      
      if (!isSameDepartment && !isHodOfDepartment) {
        return res.status(403).json({ 
          message: "Access denied: You can only view timetables for your department" 
        });
      }
    }

    // Get all slots for this timetable
    const slots = await TimetableSlot.find({
      timetable_id: timetable._id,
      college_id: req.college_id,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name email");

    // Add valid dates for each slot
    const slotsWithDates = slots.map(slot => {
      const validDates = getValidDatesForSlot(
        slot.day,
        timetable.academicYear,
        timetable.semester
      );

      return {
        ...slot.toObject(),
        validDates: validDates.map(d => ({
          date: d.toISOString().split('T')[0],
          dayName: getDayName(d)
        }))
      };
    });

    res.json({
      timetable,
      slots: slotsWithDates,
      message: "Timetable with valid dates retrieved successfully"
    });
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
      const teacher = await Teacher.findOne({ user_id: req.user.id });
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }
      
      // Check if teacher is HOD of their department
      const isHod = await Department.findOne({
        _id: teacher.department_id,
        hod_id: teacher._id
      });
      
      if (isHod) {
        // HOD can see all timetables in their department
        filter.department_id = teacher.department_id;
      } else {
        // Regular teacher: Get courses they teach
        const teacherCourses = teacher.courses || [];
        if (teacherCourses.length === 0) {
          return res.json([]); // No courses assigned
        }
        filter.course_id = { $in: teacherCourses };
      }
    }
    
    // Allow department filter override for HOD/Admin
    if (req.query.department_id) {
      // Only allow if user is HOD of that department or admin
      if (req.user.role === "TEACHER") {
        const teacher = await Teacher.findOne({ user_id: req.user.id });
        const department = await Department.findOne({
          _id: req.query.department_id,
          hod_id: teacher._id
        });
        
        if (!department) {
          return res.status(403).json({ 
            message: "Access denied: You can only view timetables for your department" 
          });
        }
      }
      filter.department_id = req.query.department_id;
    }

    const timetables = await Timetable.find(filter).sort({ createdAt: -1 });
    res.json(timetables);
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
 */
exports.getWeeklyTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const slots = await TimetableSlot.find({
      teacher_id: teacher._id,
    })
      .populate("subject_id", "name")
      .populate("teacher_id", "name")
      .populate({
        path: "timetable_id",
        select: "name semester academicYear status",
        match: { status: "PUBLISHED" }, // 🔒 ONLY PUBLISHED
      });

    const weekly = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    slots.forEach(slot => {
      if (!slot.timetable_id) return; // draft filtered here
      weekly[slot.day].push(slot);
    });

    res.json({ weekly });
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

    const filteredSlots = slots.filter(slot => slot.timetable_id);

    res.json(filteredSlots);

  } catch (error) {
    console.error("Student timetable error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   WEEKLY TIMETABLE — HOD (FULL VIEW)
========================================================= */
exports.getWeeklyTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({
      _id: req.params.timetableId,
      college_id: req.college_id,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // 🔒 SECURITY: Check if user has access to this department's timetable
    if (req.user.role === "TEACHER") {
      const teacher = await Teacher.findOne({ user_id: req.user.id });
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      const isSameDepartment = teacher.department_id.toString() === timetable.department_id.toString();
      const isHodOfDepartment = await Department.findOne({
        _id: timetable.department_id,
        hod_id: teacher._id
      });

      if (!isSameDepartment && !isHodOfDepartment) {
        return res.status(403).json({
          message: "Access denied: You can only view timetables for your department"
        });
      }
    }

    const slots = await TimetableSlot.find({
      timetable_id: timetable._id,
    })
      .populate("subject_id", "name")
      .populate("teacher_id", "name");

    const weekly = { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] };
    slots.forEach(s => weekly[s.day].push(s));

    res.json({ timetable, weekly });
  } catch (error) {
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

    // 2️⃣ Find teacher profile
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    // 3️⃣ Verify HOD of that department
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Access denied: Only HOD can delete timetable",
      });
    }

    // 4️⃣ Delete slots first
    await TimetableSlot.deleteMany({ timetable_id: id });

    // 5️⃣ Delete timetable
    await Timetable.findByIdAndDelete(id);

    res.json({ message: "Timetable deleted successfully" });

  } catch (error) {
    console.error("Delete Timetable Error:", error);
    res.status(500).json({ message: "Failed to delete timetable" });
  }
};
