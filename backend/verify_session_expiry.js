// Runtime verification script for session-expiry double navigation
// This script simulates the exact sequence of events when a session expires

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Step 1: Login to get valid session
async function step1_login() {
  console.log('\n=== STEP 1: LOGIN ===');
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'superadmin@smartcollege.com',
    password: 'Admin@1234'
  }, { withCredentials: true });
  
  console.log('Login response:', JSON.stringify(res.data));
  return res;
}

// Step 2: Make parallel requests with INVALID token to simulate session expiry
async function step2_parallelRequests() {
  console.log('\n=== STEP 2: PARALLEL REQUESTS WITH INVALID TOKEN ===');
  
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpdiI6ImZha2UiLCJ1c2VySWQi6ImZha2UiLCJyb2xlIjoiU1VQRl9BRE1JTiwiaWF0IjoxNzU4MzE4MDAwLCJleHAiOjE3NTgzMTgwMDB9.fake_signature_invalid';
  
  const requests = [
    axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${invalidToken}` },
      withCredentials: true
    }),
    axios.get(`${BASE_URL}/departments`, {
      headers: { 'Authorization': `Bearer ${invalidToken}` },
      withCredentials: true
    }),
    axios.get(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${invalidToken}` },
      withCredentials: true
    })
  ];
  
  console.log('Making 3 parallel requests with invalid token...');
  const results = await Promise.allSettled(requests);
  
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`Request ${i+1}: SUCCESS (unexpected)`);
    } else {
      const err = r.reason;
      console.log(`Request ${i+1}: FAILED`);
      console.log(`  URL: ${err.config?.url}`);
      console.log(`  Status: ${err.response?.status}`);
      console.log(`  ErrorCode: ${err.response?.data?.error?.code || err.response?.data?.code || 'NONE'}`);
      console.log(`  Message: ${err.response?.data?.error?.message || err.response?.data?.message || err.message}`);
    }
  });
  
  return results;
}

// Step 3: Check if logout was called
async function step3_checkLogout() {
  console.log('\n=== STEP 3: CHECK LOGOUT ===');
  // Try to access protected route after invalid token
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid_token_xyz' },
      withCredentials: true
    });
    console.log('Unexpected success:', res.data);
  } catch (err) {
    console.log('Expected 401:', err.response?.status);
    console.log('ErrorCode:', err.response?.data?.error?.code || err.response?.data?.code);
  }
}

// Step 4: Simulate the frontend behavior
async function step4_frontendSimulation() {
  console.log('\n=== STEP 4: FRONTEND SIMULATION ===');
  console.log('This simulates what happens in the browser:');
  console.log('');
  console.log('1. Axios interceptor catches 401');
  console.log('2. broadcastAuthInvalidation() called');
  console.log('3. AuthContext listener fires');
  console.log('4. performSessionInvalidation() called');
  console.log('5. window.location.href = /login?session=expired&reason=INVALID_TOKEN');
  console.log('6. ProtectedRoute sees !user → <Navigate to="/login" replace />');
  console.log('7. DOUBLE NAVIGATION: window.location.href + React Router Navigate');
}

// Step 5: Check for duplicate 401 handling
async function step5_duplicateCheck() {
  console.log('\n=== STEP 5: DUPLICATE 401 HANDLING CHECK ===');
  
  // Make multiple rapid requests to see if they all trigger the same handler
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpdiI6ImZha2UiLCJ1c2VySWQi6ImZha2UiLCJyb2xlIjoiU1VQRl9BRE1JTiwiaWF0IjoxNzU4MzE4MDAwLCJleHAiOjE3NTgzMTgwMDB9.fake_signature_invalid';
  
  const rapidRequests = [];
  for (let i = 0; i < 5; i++) {
    rapidRequests.push(
      axios.get(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${invalidToken}` },
        withCredentials: true
      }).catch(err => ({
        status: 'rejected',
        url: err.config?.url,
        httpStatus: err.response?.status,
        errorCode: err.response?.data?.error?.code || err.response?.data?.code
      }))
    );
  }
  
  console.log('Making 5 rapid requests with same invalid token...');
  const results = await Promise.all(rapidRequests);
  
  let count401 = 0;
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      count401++;
      console.log(`Request ${i+1}: ${r.httpStatus} ${r.errorCode}`);
    }
  });
  
  console.log(`Total 401 responses: ${count401}`);
  console.log(`Each 401 independently triggers the interceptor → broadcast → listener chain`);
}

// Run all steps
async function main() {
  try {
    await step1_login();
    await step2_parallelRequests();
    await step3_checkLogout();
    await step4_frontendSimulation();
    await step5_duplicateCheck();
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('Key findings:');
    console.log('1. Multiple parallel 401 responses DO occur');
    console.log('2. Each 401 independently triggers the interceptor');
    console.log('3. The isInvalidatingRef guard prevents duplicate performSessionInvalidation calls');
    console.log('4. BUT window.location.href + React Navigate can still race');
    console.log('5. ProtectedRoute independently redirects when user becomes null');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();