const axios = require('axios');

async function test() {
  try {
    console.log('Testing Teacher login...');
    const teacherRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testteacher@test.com',
      password: 'Test@123',
    });
    const teacherCookies = teacherRes.headers['set-cookie'];
    const teacherToken = teacherCookies.find((c) => c.startsWith('token=')).split(';')[0].split('=')[1];

    console.log('Testing Teacher published exams...');
    try {
      const teacherExams = await axios.get('http://localhost:5000/api/exam/published', {
        headers: { Cookie: `token=${teacherToken}` },
      });
      console.log('Teacher exams:', teacherExams.data.data?.length);
    } catch (e) {
      console.error('Teacher exam error status:', e.response?.status);
      console.error('Teacher exam error data:', JSON.stringify(e.response?.data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

test();
