// const Timetable = require("../models/timetable.model");
// const Subject = require("../models/subject.model");
// const Teacher = require("../models/teacher.model");

// /**
//  * CREATE TIMETABLE SLOT
//  * College Admin only
//  */
// exports.createTimetableSlot = async (req, res) => {
//   try {
//     const {
//       department_id,
//       course_id,
//       subject_id,
//       teacher_id,
//       dayOfWeek,
//       startTime,
//       endTime,
//       academicYear,
//       semester,
//       lectureType,
//       room
//     } = req.body;

//     const subject = await Subject.findOne({
//       _id: subject_id,
//       college_id: req.college_id
//     });
//     if (!subject) {
//       return res.status(400).json({ message: "Invalid subject" });
//     }

//     const teacher = await Teacher.findOne({
//       _id: teacher_id,
//       college_id: req.college_id
//     });
//     if (!teacher) {
//       return res.status(400).json({ message: "Invalid teacher" });
//     }

//     const slot = await Timetable.create({
//       college_id: req.college_id,
//       department_id,
//       course_id,
//       subject_id,
//       teacher_id,
//       dayOfWeek,
//       startTime,
//       endTime,
//       academicYear,
//       semester,
//       lectureType,
//       room
//     });

//     res.status(201).json({
//       message: "Timetable slot created successfully",
//       slot
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /**
//  * GET TEACHER TIMETABLE
//  */
// exports.getTeacherTimetable = async (req, res) => {
//   try {
//     const timetable = await Timetable.find({
//       teacher_id: req.user.id,
//       college_id: req.college_id,
//       status: "ACTIVE"
//     })
//       .populate("subject_id", "name code")
//       .populate("course_id", "name")
//       .sort({ dayOfWeek: 1, startTime: 1 });

//     res.json({
//       message: "Timetable fetched successfully",
//       total: timetable.length,
//       timetable
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// /**
//  * GET STUDENT TIMETABLE
//  */
// exports.getStudentTimetable = async (req, res) => {
//   try {
//     const timetable = await Timetable.find({
//       course_id: req.student.course_id,
//       college_id: req.college_id,
//       semester: req.student.currentSemester,
//       status: "ACTIVE"
//     })
//       .populate("subject_id", "name code")
//       .populate("teacher_id", "name")
//       .sort({ dayOfWeek: 1, startTime: 1 });

//     res.json({
//       message: "Timetable fetched successfully",
//       total: timetable.length,
//       timetable
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// /**
//  * GET ALL TIMETABLES (COLLEGE ADMIN)
//  */
// exports.getAdminTimetable = async (req, res) => {
//   try {
//     const {
//       course_id,
//       teacher_id,
//       semester,
//       dayOfWeek
//     } = req.query;

//     // Base filter (VERY IMPORTANT)
//     const filter = {
//       college_id: req.college_id,
//       status: "ACTIVE"
//     };

//     // Optional filters
//     if (course_id) filter.course_id = course_id;
//     if (teacher_id) filter.teacher_id = teacher_id;
//     if (semester) filter.semester = Number(semester);
//     if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

//     const timetable = await Timetable.find(filter)
//       .populate("subject_id", "name code")
//       .populate("teacher_id", "name")
//       .populate("course_id", "name")
//       .populate("department_id", "name")
//       .sort({ dayOfWeek: 1, startTime: 1 });

//     res.json({
//       message: "Timetable fetched successfully",
//       total: timetable.length,
//       timetable
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
 
// /**
//  * UPDATE TIMETABLE SLOT
//  */
// exports.updateTimetableSlot = async (req, res) => {
//   try {
//     const slot = await Timetable.findOne({
//       _id: req.params.id,
//       college_id: req.college_id,
//       status: "ACTIVE"
//     });

//     if (!slot) {
//       return res.status(404).json({ message: "Timetable slot not found" });
//     }

//     const {
//       subject_id,
//       teacher_id,
//       dayOfWeek,
//       startTime,
//       endTime,
//       lectureType,
//       room
//     } = req.body;

//     if (subject_id) {
//       const subject = await Subject.findOne({
//         _id: subject_id,
//         college_id: req.college_id
//       });
//       if (!subject) {
//         return res.status(400).json({ message: "Invalid subject" });
//       }
//       slot.subject_id = subject_id;
//     }

//     if (teacher_id) {
//       const teacher = await Teacher.findOne({
//         _id: teacher_id,
//         college_id: req.college_id
//       });
//       if (!teacher) {
//         return res.status(400).json({ message: "Invalid teacher" });
//       }
//       slot.teacher_id = teacher_id;
//     }

//     if (dayOfWeek) slot.dayOfWeek = dayOfWeek;
//     if (startTime) slot.startTime = startTime;
//     if (endTime) slot.endTime = endTime;
//     if (lectureType) slot.lectureType = lectureType;
//     if (room !== undefined) slot.room = room;

//     await slot.save();

//     res.json({
//       message: "Timetable slot updated successfully",
//       slot
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




// /**
//  * DELETE TIMETABLE SLOT (SOFT DELETE)
//  */
// exports.deleteTimetableSlot = async (req, res) => {
//   try {
//     const slot = await Timetable.findOne({
//       _id: req.params.id,
//       college_id: req.college_id,
//       status: "ACTIVE"
//     });

//     if (!slot) {
//       return res.status(404).json({ message: "Timetable slot not found" });
//     }

//     slot.status = "INACTIVE";
//     await slot.save();

//     res.json({
//       message: "Timetable slot deleted successfully"
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };  

// exports.getAdminTimetable = async (req, res) => {
//   try {
//     const {
//       course_id,
//       teacher_id,
//       semester,
//       dayOfWeek
//     } = req.query;

//     // Base filter (VERY IMPORTANT)
//     const filter = {
//       college_id: req.college_id,
//       status: "ACTIVE"
//     };

//     // Optional filters
//     if (course_id) filter.course_id = course_id;
//     if (teacher_id) filter.teacher_id = teacher_id;
//     if (semester) filter.semester = Number(semester);
//     if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

//     const timetable = await Timetable.find(filter)
//       .populate("subject_id", "name code")
//       .populate("teacher_id", "name")
//       .populate("course_id", "name")
//       .populate("department_id", "name")
//       .sort({ dayOfWeek: 1, startTime: 1 });

//     res.json({
//       message: "Timetable fetched successfully",
//       total: timetable.length,
//       timetable
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getAdminTimetable = async (req, res) => {
//   try {
//     const {
//       course_id,
//       teacher_id,
//       semester,
//       dayOfWeek
//     } = req.query;

//     // Base filter (VERY IMPORTANT)
//     const filter = {
//       college_id: req.college_id,
//       status: "ACTIVE"
//     };

//     // Optional filters
//     if (course_id) filter.course_id = course_id;
//     if (teacher_id) filter.teacher_id = teacher_id;
//     if (semester) filter.semester = Number(semester);
//     if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

//     const timetable = await Timetable.find(filter)
//       .populate("subject_id", "name code")
//       .populate("teacher_id", "name")
//       .populate("course_id", "name")
//       .populate("department_id", "name")
//       .sort({ dayOfWeek: 1, startTime: 1 });

//     res.json({
//       message: "Timetable fetched successfully",
//       total: timetable.length,
//       timetable
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");

/**
 * CREATE TIMETABLE (HOD)
 */
exports.createTimetable = async (req, res) => {
  const {
    department_id,
    course_id,
    semester,
    academicYear
  } = req.body;

  const existing = await Timetable.findOne({
    department_id,
    course_id,
    semester,
    academicYear
  });

  if (existing) {
    return res.status(400).json({
      message: "Timetable already exists for this semester"
    });
  }

  const timetable = await Timetable.create({
    college_id: req.college_id,
    department_id,
    course_id,
    semester,
    academicYear,
    createdBy: req.user.id
  });

  res.json(timetable);
};

/**
 * ADD SLOT (HOD ONLY)
 */
exports.addSlot = async (req, res) => {
  try {
    const {
      timetable_id,
      day,
      startTime,
      endTime,
      subject_id,
      teacher_id,
      room,
      slotType
    } = req.body;

    // 1️⃣ Basic validation
    if (startTime >= endTime) {
      return res.status(400).json({
        message: "Start time must be before end time"
      });
    }

    // 2️⃣ TIME CONFLICT (same timetable + same day)
    const timeConflict = await TimetableSlot.findOne({
      timetable_id,
      day,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] }
        ]
      }
    });

    if (timeConflict) {
      return res.status(409).json({
        message: "Time slot conflict detected for this day"
      });
    }

    // 3️⃣ TEACHER CONFLICT (same teacher same time)
    const teacherConflict = await TimetableSlot.findOne({
      day,
      teacher_id,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] }
        ]
      }
    });

    if (teacherConflict) {
      return res.status(409).json({
        message: "Teacher is already assigned in this time slot"
      });
    }

    // 4️⃣ ROOM CONFLICT (same room same time)
    if (room) {
      const roomConflict = await TimetableSlot.findOne({
        day,
        room,
        $expr: {
          $and: [
            { $lt: ["$startTime", endTime] },
            { $gt: ["$endTime", startTime] }
          ]
        }
      });

      if (roomConflict) {
        return res.status(409).json({
          message: "Room is already occupied in this time slot"
        });
      }
    }

    // 5️⃣ Create slot
    const slot = await TimetableSlot.create({
      timetable_id,
      day,
      startTime,
      endTime,
      subject_id,
      teacher_id,
      room,
      slotType
    });

    res.status(201).json({
      message: "Slot added successfully",
      slot
    });

  } catch (error) {
    console.error("Add slot error:", error);
    res.status(500).json({
      message: "Failed to add slot"
    });
  }
};

/**
 * GET WEEKLY TIMETABLE
 */
exports.getWeeklyTimetable = async (req, res) => {
  const timetable = await Timetable.findOne({
    department_id: req.params.departmentId,
    course_id: req.params.courseId,
    semester: req.params.semester,
    status: "PUBLISHED"
  });

  if (!timetable) {
    return res.json({ timetable: null, slots: [] });
  }

  const slots = await TimetableSlot.find({
    timetable_id: timetable._id
  })
    .populate("subject_id", "name code")
    .populate("teacher_id", "name");

  res.json({ timetable, slots });
};

/**
 * PUBLISH TIMETABLE
 */
exports.publishTimetable = async (req, res) => {
  await Timetable.findByIdAndUpdate(req.params.id, {
    status: "PUBLISHED"
  });

  res.json({ message: "Timetable published successfully" });
};
