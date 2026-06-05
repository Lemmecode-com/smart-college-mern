const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function testRegistrationWithoutDocuments() {
  console.log('Testing registration WITHOUT mandatory documents...');
  
  const form = new FormData();
  form.append('fullName', 'Test Student');
  form.append('email', 'teststudent' + Date.now() + '@example.com');
  form.append('password', 'Test@123');
  form.append('mobileNumber', '9876543210');
  form.append('gender', 'Male');
  form.append('dateOfBirth', '2000-01-01');
  form.append('addressLine', '123 Test Street');
  form.append('city', 'Test City');
  form.append('state', 'Test State');
  form.append('pincode', '123456');
  form.append('department_id', '699c10ed2df55ba336053f65');
  form.append('course_id', '699c2036bb10c01ce821bd6a');
  form.append('admissionYear', '2024');
  form.append('currentSemester', '1');
  form.append('previousQualification', '12th');
  form.append('previousInstitute', 'Test School');
  form.append('category', 'GEN');
  form.append('nationality', 'Indian');
  form.append('hscStream', 'Science');
  form.append('hscBoard', 'Test Board');
  form.append('hscSchoolName', 'Test School');
  form.append('hscPassingYear', '2022');
  form.append('hscPercentage', '85');
  form.append('hscRollNumber', '123456');
  form.append('sscSchoolName', 'Test SSC School');
  form.append('sscBoard', 'Test SSC Board');
  form.append('sscPassingYear', '2020');
  form.append('sscPercentage', '90');
  form.append('sscRollNumber', '789012');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/students/register/BVP1001',
    method: 'POST',
    headers: form.getHeaders()
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function testRegistrationWithDocuments() {
  console.log('\nTesting registration WITH mandatory documents...');
  
  // Create dummy files for testing
  const dummyFileContent = 'dummy pdf content';
  const dummy10thPath = path.join(__dirname, 'uploads', 'students', 'dummy-10th.pdf');
  const dummy12thPath = path.join(__dirname, 'uploads', 'students', 'dummy-12th.pdf');
  
  // Ensure uploads directory exists
  const uploadDir = path.dirname(dummy10thPath);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  fs.writeFileSync(dummy10thPath, dummyFileContent);
  fs.writeFileSync(dummy12thPath, dummyFileContent);

  const form = new FormData();
  form.append('fullName', 'Test Student 2');
  form.append('email', 'teststudent2' + Date.now() + '@example.com');
  form.append('password', 'Test@123');
  form.append('mobileNumber', '9876543211');
  form.append('gender', 'Male');
  form.append('dateOfBirth', '2000-01-01');
  form.append('addressLine', '123 Test Street');
  form.append('city', 'Test City');
  form.append('state', 'Test State');
  form.append('pincode', '123456');
  form.append('department_id', '699c10ed2df55ba336053f65');
  form.append('course_id', '699c2036bb10c01ce821bd6a');
  form.append('admissionYear', '2024');
  form.append('currentSemester', '1');
  form.append('previousQualification', '12th');
  form.append('previousInstitute', 'Test School');
  form.append('category', 'GEN');
  form.append('nationality', 'Indian');
  form.append('hscStream', 'Science');
  form.append('hscBoard', 'Test Board');
  form.append('hscSchoolName', 'Test School');
  form.append('hscPassingYear', '2022');
  form.append('hscPercentage', '85');
  form.append('hscRollNumber', '123456');
  form.append('sscSchoolName', 'Test SSC School');
  form.append('sscBoard', 'Test SSC Board');
  form.append('sscPassingYear', '2020');
  form.append('sscPercentage', '90');
  form.append('sscRollNumber', '789012');
  
  // Add the mandatory documents
  form.append('sscMarksheet', fs.createReadStream(dummy10thPath));
  form.append('hscMarksheet', fs.createReadStream(dummy12thPath));

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/students/register/BVP1001',
    method: 'POST',
    headers: form.getHeaders()
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        
        // Cleanup
        fs.unlinkSync(dummy10thPath);
        fs.unlinkSync(dummy12thPath);
        
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function runTests() {
  try {
    const result1 = await testRegistrationWithoutDocuments();
    console.log('\n--- Test 1 Result ---');
    if (result1.status === 400 && result1.data.includes('10th Marksheet is mandatory')) {
      console.log('✅ PASS: Registration correctly rejected without 10th marksheet');
    } else {
      console.log('❌ FAIL: Registration should have been rejected');
    }

    const result2 = await testRegistrationWithDocuments();
    console.log('\n--- Test 2 Result ---');
    if (result2.status === 201 || result2.status === 200) {
      console.log('✅ PASS: Registration succeeded with mandatory documents');
    } else {
      console.log('❌ FAIL: Registration should have succeeded with documents');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTests();