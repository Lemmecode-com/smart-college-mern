const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://sandeshpatil1511:sandeshpatil1511@cluster0-shard-00-00.qgnwh.mongodb.net:27017,cluster0-shard-00-01.qgnwh.mongodb.net:27017,cluster0-shard-00-02.qgnwh.mongodb.net:27017/NOVAA?ssl=true&replicaSet=atlas-967qjq-shard-0&authSource=admin&appName=Cluster0');
    
    require('./src/models/department.model');
    require('./src/models/course.model');
    require('./src/models/student.model');
    
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
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
