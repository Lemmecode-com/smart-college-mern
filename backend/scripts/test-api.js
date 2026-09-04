const axios = require('axios');

async function test() {
  try {
    console.log('Testing Student login...');
    const studentRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'teststudent@test.com',
      password: 'Test@123',
    });
    const studentCookies = studentRes.headers['set-cookie'];
    const studentToken = studentCookies.find((c) => c.startsWith('token=')).split(';')[0].split('=')[1];
    console.log('Student login OK, token length:', studentToken.length);

    console.log('Testing Student published exams...');
    const studentExams = await axios.get('http://localhost:5000/api/exam/published', {
      headers: { Cookie: `token=${studentToken}` },
    });
    console.log('Student exams:', studentExams.data.data?.length);
    console.log('Student exam names:', JSON.stringify(studentExams.data.data?.map((e) => e.name)));

    console.log('Testing Teacher login...');
    const teacherRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testteacher@test.com',
      password: 'Test@123',
    });
    const teacherCookies = teacherRes.headers['set-cookie'];
    const teacherToken = teacherCookies.find((c) => c.startsWith('token=')).split(';')[0].split('=')[1];
    console.log('Teacher login OK');

    console.log('Testing Teacher published exams...');
    const teacherExams = await axios.get('http://localhost:5000/api/exam/published', {
      headers: { Cookie: `token=${teacherToken}` },
    });
    console.log('Teacher exams:', teacherExams.data.data?.length);
    console.log('Teacher exam names:', JSON.stringify(teacherExams.data.data?.map((e) => e.name)));

    console.log('Testing HOD login...');
    const hodRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testhod@test.com',
      password: 'Test@123',
    });
    const hodCookies = hodRes.headers['set-cookie'];
    const hodToken = hodCookies.find((c) => c.startsWith('token=')).split(';')[0].split('=')[1];
    console.log('HOD login OK');

    console.log('Testing HOD published exams...');
    const hodExams = await axios.get('http://localhost:5000/api/exam/published', {
      headers: { Cookie: `token=${hodToken}` },
    });
    console.log('HOD exams:', hodExams.data.data?.length);
    console.log('HOD exam names:', JSON.stringify(hodExams.data.data?.map((e) => e.name)));

    const examId = studentExams.data.data?.[0]?._id || teacherExams.data.data?.[0]?._id;
    if (examId) {
      console.log('Testing schedule endpoints for exam:', examId);
      const studentSchedule = await axios.get(`http://localhost:5000/api/exam-schedule/published/${examId}`, {
        headers: { Cookie: `token=${studentToken}` },
      });
      console.log('Student schedule subjects:', studentSchedule.data.data?.schedule?.subjects?.length);

      const teacherSchedule = await axios.get(`http://localhost:5000/api/exam-schedule/published/${examId}`, {
        headers: { Cookie: `token=${teacherToken}` },
      });
      console.log('Teacher schedule subjects:', teacherSchedule.data.data?.schedule?.subjects?.length);

      const hodSchedule = await axios.get(`http://localhost:5000/api/exam-schedule/published/${examId}`, {
        headers: { Cookie: `token=${hodToken}` },
      });
      console.log('HOD schedule subjects:', hodSchedule.data.data?.schedule?.subjects?.length);
    }

    console.log('\nAll API tests passed!');
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
}

test();
