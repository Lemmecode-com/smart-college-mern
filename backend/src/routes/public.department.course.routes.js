const express = require("express");
const router = express.Router();
const College = require("../models/college.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");

/**
 * GET Departments by College Code (Public)
 */
router.get("/departments/:collegeCode", async (req, res) => {
  try {
    const { collegeCode } = req.params;

    // Find college by code
    const college = await College.findOne({ code: collegeCode });
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    // Get departments for this college
    const departments = await Department.find({
      college_id: college._id,
      status: "ACTIVE"  // Only return active departments
    });

    res.json({
      departments: departments,
      collegeName: college.name,
      collegeCode: college.code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET Courses by Department and College Code (Public)
 */
router.get("/courses/:collegeCode/department/:departmentId", async (req, res) => {
  try {
    const { collegeCode, departmentId } = req.params;

    // Find college by code
    const college = await College.findOne({ code: collegeCode });
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    // Verify department belongs to the college and is active
    const department = await Department.findOne({
      _id: departmentId,
      college_id: college._id,
      status: "ACTIVE"
    });

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Get courses for this department
    const courses = await Course.find({
      department_id: departmentId,
      college_id: college._id,
      status: "ACTIVE"  // Only return active courses
    });

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;