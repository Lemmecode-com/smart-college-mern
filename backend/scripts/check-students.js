const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function check() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI or MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  let connected = false;
  try {
    await mongoose.connect(mongoUri);
    connected = true;

    require('../src/models/department.model');
    require('../src/models/course.model');
    require('../src/models/student.model');

    const Student = mongoose.models.Student;
    const students = await Student.find({ status: 'PENDING' })
      .populate('department_id', 'name code')
      .populate('course_id', 'name')
      .lean();

    console.log('Total pending students:', students.length);
    students.forEach((s, i) => {
      console.log('Student ' + (i+1) + ':');
      console.log('  Name: ' + s.fullName);
      console.log('  department_id: ' + JSON.stringify(s.department_id));
      console.log('  course_id: ' + JSON.stringify(s.course_id));
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (connected || (mongoose.connection && mongoose.connection.readyState !== 0)) {
      await mongoose.disconnect();
    }
  }
}

check();
