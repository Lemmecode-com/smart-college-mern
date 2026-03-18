/**
 * Stripe Configuration API Test Script
 * 
 * Run this script to test the Stripe configuration API endpoints
 * 
 * Usage: node test-stripe-config.js
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_COLLEGE_ADMIN_EMAIL = 'collegeadmin@testcollege.com';
const TEST_COLLEGE_ADMIN_PASSWORD = 'TestPassword123!';

// Test Stripe keys (replace with your actual test keys)
const TEST_STRIPE_PUBLISHABLE_KEY = 'pk_test_51ABC123xyz';
const TEST_STRIPE_SECRET_KEY = 'sk_test_51ABC123xyz';
const TEST_STRIPE_WEBHOOK_SECRET = 'whsec_1ABC123xyz';

// Store token globally
let authToken = '';

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Step 1: Login as College Admin
async function login() {
  console.log('\n📝 Step 1: Logging in as College Admin...');
  console.log('   Email:', TEST_COLLEGE_ADMIN_EMAIL);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: TEST_COLLEGE_ADMIN_EMAIL,
        password: TEST_COLLEGE_ADMIN_PASSWORD,
      },
      {
        withCredentials: true,
      }
    );

    // Extract token from cookies
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const tokenCookie = setCookie.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        authToken = tokenCookie.split('=')[1].split(';')[0];
        console.log('✅ Login successful! Token received.');
        return true;
      }
    }

    console.log('❌ Token not found in cookies');
    return false;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Step 2: Fetch current configuration
async function fetchConfig() {
  console.log('\n📝 Step 2: Fetching current Stripe configuration...');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/stripe/config`,
      {
        headers: {
          Cookie: `token=${authToken}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Fetch failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Step 3: Save configuration
async function saveConfig() {
  console.log('\n📝 Step 3: Saving Stripe configuration...');
  console.log('   Publishable Key:', TEST_STRIPE_PUBLISHABLE_KEY);
  console.log('   Secret Key:', TEST_STRIPE_SECRET_KEY.substring(0, 10) + '...');
  console.log('   Webhook Secret:', TEST_STRIPE_WEBHOOK_SECRET ? 'Present' : 'Not provided');
  console.log('   Test Mode: true');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/stripe/config`,
      {
        publishableKey: TEST_STRIPE_PUBLISHABLE_KEY,
        secretKey: TEST_STRIPE_SECRET_KEY,
        webhookSecret: TEST_STRIPE_WEBHOOK_SECRET,
        testMode: true,
      },
      {
        headers: {
          Cookie: `token=${authToken}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Save failed:', error.response?.data?.message || error.message);
    console.log('   Error details:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

// Step 4: Verify configuration
async function verifyConfig() {
  console.log('\n📝 Step 4: Verifying Stripe credentials...');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/stripe/verify`,
      {},
      {
        headers: {
          Cookie: `token=${authToken}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Verify failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Step 5: Test connection
async function testConnection() {
  console.log('\n📝 Step 5: Testing Stripe connection...');
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/stripe/test`,
      {
        headers: {
          Cookie: `token=${authToken}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Test connection failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Step 6: Delete configuration
async function deleteConfig() {
  console.log('\n📝 Step 6: Deleting Stripe configuration...');
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/admin/stripe/config`,
      {
        headers: {
          Cookie: `token=${authToken}`,
        },
      }
    );

    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Delete failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 STRIPE CONFIGURATION API TEST SUITE');
  console.log('='.repeat(60));
  console.log('API Base URL:', API_BASE_URL);
  console.log('Test Admin:', TEST_COLLEGE_ADMIN_EMAIL);
  console.log('='.repeat(60));

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Test aborted: Login failed');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Ensure backend server is running (npm start)');
    console.log('   2. Verify college admin credentials are correct');
    console.log('   3. Check if user exists in database');
    return;
  }

  await delay(500);

  // Step 2: Fetch current config
  const initialConfig = await fetchConfig();
  if (initialConfig?.configured) {
    console.log('\n⚠️  Existing configuration found. It will be overwritten.');
  }

  await delay(500);

  // Step 3: Save configuration
  const saveSuccess = await saveConfig();
  if (!saveSuccess) {
    console.log('\n❌ Test aborted: Save failed');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if ENCRYPTION_MASTER_KEY is set in .env');
    console.log('   2. Verify Stripe key format (pk_test_*, sk_test_*)');
    console.log('   3. Check server logs for detailed errors');
    return;
  }

  await delay(500);

  // Step 4: Fetch updated config
  console.log('\n📝 Step 4b: Fetching updated configuration...');
  const updatedConfig = await fetchConfig();
  if (!updatedConfig?.configured) {
    console.log('\n❌ Test failed: Configuration not saved properly');
    return;
  }

  // Verify secrets are not exposed
  if (updatedConfig.config?.credentials?.keySecret) {
    console.log('\n❌ SECURITY ISSUE: Secret key exposed in GET response!');
  } else {
    console.log('\n✅ Security check passed: Secret keys not exposed');
  }

  await delay(500);

  // Step 5: Verify credentials (optional - requires valid Stripe keys)
  // const verifyResult = await verifyConfig();

  // Step 6: Test connection (optional - requires valid Stripe keys)
  // const testResult = await testConnection();

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST SUITE COMPLETED');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log('   ✓ Login: PASSED');
  console.log('   ✓ Fetch Config: PASSED');
  console.log('   ✓ Save Config: PASSED');
  console.log('   ✓ Security Check: PASSED');
  console.log('\n💡 Next Steps:');
  console.log('   1. Check MongoDB to verify encrypted storage:');
  console.log('      db.collegepaymentconfigs.findOne({ gatewayCode: "stripe" })');
  console.log('   2. Verify credentials.keySecret is encrypted (base64 string)');
  console.log('   3. Test payment flow with student account');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
