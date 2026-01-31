const Timetable = require("../models/timetable.model");
const Subject = require("../models/subject.model");
const Teacher = require("../models/teacher.model");

exports.createTimetableSlot = async (req, res) => {
  try {
    const {
      department_id,
      course_id,
      subject_id,
      teacher_id,
      dayOfWeek,
      startTime,
      endTime,
      academicYear,
      semester,
      lectureType,
      room
    } = req.body;

    // Validate subject
    const subject = await Subject.findOne({
      _id: subject_id,
      college_id: req.college_id
    });
    if (!subject) {
      return res.status(400).json({ message: "Invalid subject" });
    }

    // Validate teacher
    const teacher = await Teacher.findOne({
      _id: teacher_id,
      college_id: req.college_id
    });
    if (!teacher) {
      return res.status(400).json({ message: "Invalid teacher" });
    }

    const slot = await Timetable.create({
      college_id: req.college_id,
      department_id,
      course_id,
      subject_id,
      teacher_id,
      dayOfWeek,
      startTime,
      endTime,
      academicYear,
      semester,
      lectureType,
      room
    });

    res.status(201).json({
      message: "Timetable slot created successfully",
      slot
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherTimetable = async (req, res) => {
  const timetable = await Timetable.find({
    teacher_id: req.user.id,
    college_id: req.college_id,
    status: "ACTIVE"
  })
    .populate("subject_id", "name code")
    .populate("course_id", "name")
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.json(timetable);
};

exports.getStudentTimetable = async (req, res) => {
  const timetable = await Timetable.find({
    course_id: req.student.course_id,
    college_id: req.college_id,
    semester: req.student.currentSemester,
    status: "ACTIVE"
  })
    .populate("subject_id", "name code")
    .populate("teacher_id", "name")
    .sort({ dayOfWeek: 1, startTime: 1 });

  res.json(timetable);
};

/**
 * UPDATE TIMETABLE SLOT (UPDATE)
 * College Admin only
 */
exports.updateTimetableSlot = async (req, res) => {
  try {
    const slotId = req.params.id;

    // Ensure slot belongs to same college
    const slot = await Timetable.findOne({
      _id: slotId,
      college_id: req.college_id,
      status: "ACTIVE"
    });

    if (!slot) {
      return res.status(404).json({
        message: "Timetable slot not found"
      });
    }

    const {
      subject_id,
      teacher_id,
      dayOfWeek,
      startTime,
      endTime,
      lectureType,
      room
    } = req.body;

    // Optional validation if subject is changing
    if (subject_id) {
      const subject = await Subject.findOne({
        _id: subject_id,
        college_id: req.college_id
      });
      if (!subject) {
        return res.status(400).json({ message: "Invalid subject" });
      }
      slot.subject_id = subject_id;
    }

    // Optional validation if teacher is changing
    if (teacher_id) {
      const teacher = await Teacher.findOne({
        _id: teacher_id,
        college_id: req.college_id
      });
      if (!teacher) {
        return res.status(400).json({ message: "Invalid teacher" });
      }
      slot.teacher_id = teacher_id;
    }

    // Update allowed fields
    if (dayOfWeek) slot.dayOfWeek = dayOfWeek;
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;
    if (lectureType) slot.lectureType = lectureType;
    if (room !== undefined) slot.room = room;

    await slot.save();

    res.json({
      message: "Timetable slot updated successfully",
      slot
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE TIMETABLE SLOT (SOFT DELETE)
 * College Admin only
 */
exports.deleteTimetableSlot = async (req, res) => {
  try {
    const slotId = req.params.id;

    const slot = await Timetable.findOne({
      _id: slotId,
      college_id: req.college_id,
      status: "ACTIVE"
    });

    if (!slot) {
      return res.status(404).json({
        message: "Timetable slot not found"
      });
    }

    // Soft delete
    slot.status = "INACTIVE";
    await slot.save();

    res.json({
      message: "Timetable slot deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminTimetable = async (req, res) => {
  try {
    const {
      course_id,
      teacher_id,
      semester,
      dayOfWeek
    } = req.query;

    // Base filter (VERY IMPORTANT)
    const filter = {
      college_id: req.college_id,
      status: "ACTIVE"
    };

    // Optional filters
    if (course_id) filter.course_id = course_id;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (semester) filter.semester = Number(semester);
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

    const timetable = await Timetable.find(filter)
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .populate("course_id", "name")
      .populate("department_id", "name")
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      message: "Timetable fetched successfully",
      total: timetable.length,
      timetable
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};