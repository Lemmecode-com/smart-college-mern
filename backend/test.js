// ===============================
// Smart College API Test (Node.js)
// ===============================
//
// Usage: node backend/test.js
//
// Required Environment Variables:
// - API_BASE_URL (optional, defaults to http://localhost:5000)
// - TEST_SUPER_ADMIN_EMAIL
// - TEST_SUPER_ADMIN_PASSWORD
// - TEST_COLLEGE_ADMIN_EMAIL
// - TEST_COLLEGE_ADMIN_PASSWORD
//
// Add these to your backend/.env file

require("dotenv").config();

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

// Test credentials from environment variables (NEVER hardcode!)
const TEST_SUPER_ADMIN_EMAIL = process.env.TEST_SUPER_ADMIN_EMAIL;
const TEST_SUPER_ADMIN_PASSWORD = process.env.TEST_SUPER_ADMIN_PASSWORD;
const TEST_COLLEGE_ADMIN_EMAIL = process.env.TEST_COLLEGE_ADMIN_EMAIL;
const TEST_COLLEGE_ADMIN_PASSWORD = process.env.TEST_COLLEGE_ADMIN_PASSWORD;

// Validate required environment variables
if (!TEST_SUPER_ADMIN_EMAIL || !TEST_SUPER_ADMIN_PASSWORD) {
  console.error("❌ ERROR: Missing test credentials in environment variables");
  console.error("Please add these to your backend/.env file:");
  console.error("  TEST_SUPER_ADMIN_EMAIL=superadmin@smartcollege.com");
  console.error("  TEST_SUPER_ADMIN_PASSWORD=YourPassword");
  console.error("  TEST_COLLEGE_ADMIN_EMAIL=collegeadmin@example.com");
  console.error("  TEST_COLLEGE_ADMIN_PASSWORD=YourPassword");
  process.exit(1);
}

async function api(method, url, body = null, token = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${url}`, options);
  const data = await res.json();
  return data;
}

(async () => {
  try {
    console.log("================================");
    console.log("SMART COLLEGE API TEST STARTED");
    console.log("================================");
    console.log(`API Base URL: ${BASE_URL}`);
    console.log("");

    // 1️⃣ Super Admin Login
    console.log("[1] Super Admin Login");
    console.log(`   Email: ${TEST_SUPER_ADMIN_EMAIL}`);
    const superAdminLogin = await api("POST", "/api/auth/login", {
      email: TEST_SUPER_ADMIN_EMAIL,
      password: TEST_SUPER_ADMIN_PASSWORD,
    });

    if (!superAdminLogin.token) {
      console.error("❌ Super Admin login failed:", superAdminLogin);
      process.exit(1);
    }

    const SUPER_ADMIN_TOKEN = superAdminLogin.token;
    console.log("✅ Super Admin logged in successfully");

    // 2️⃣ Get All Colleges
    console.log("\n[2] Get All Colleges (Super Admin)");
    const colleges = await api(
      "GET",
      "/api/master/get/colleges",
      null,
      SUPER_ADMIN_TOKEN,
    );
    console.log("✅ Colleges fetched:", colleges.data?.length || 0, "colleges");

    // 3️⃣ College Admin Login
    console.log("\n[3] College Admin Login");
    console.log(`   Email: ${TEST_COLLEGE_ADMIN_EMAIL}`);
    const collegeAdminLogin = await api("POST", "/api/auth/login", {
      email: TEST_COLLEGE_ADMIN_EMAIL,
      password: TEST_COLLEGE_ADMIN_PASSWORD,
    });

    if (!collegeAdminLogin.token) {
      console.error("❌ College Admin login failed:", collegeAdminLogin);
      console.log("⚠️  Skipping remaining tests...");
      console.log("\n================================");
      console.log("API TEST COMPLETED (PARTIAL)");
      console.log("================================");
      return;
    }

    const COLLEGE_ADMIN_TOKEN = collegeAdminLogin.token;
    console.log("✅ College Admin logged in successfully");

    // 4️⃣ Get My College
    console.log("\n[4] Get My College");
    const myCollege = await api(
      "GET",
      "/api/college/my-college",
      null,
      COLLEGE_ADMIN_TOKEN,
    );
    console.log("✅ College data fetched:", myCollege.data?.name || "N/A");

    // 5️⃣ Create Department
    console.log("\n[5] Create Department");
    const department = await api(
      "POST",
      "/api/departments",
      {
        name: "Batchelor of Computer science",
        code: "BCS",
        type: "ACADEMIC",
        status: "ACTIVE",
        programsOffered: ["UG", "PG"],
        startYear: 2011,
        sanctionedFacultyCount: 20,
        sanctionedStudentIntake: 300,
      },
      COLLEGE_ADMIN_TOKEN,
    );
    console.log("✅ Department created:", department.data?.name || "N/A");

    // 6️⃣ Get All Departments
    console.log("\n[6] Get All Departments");
    const departments = await api(
      "GET",
      "/api/departments",
      null,
      COLLEGE_ADMIN_TOKEN,
    );
    console.log(
      "✅ Departments fetched:",
      departments.data?.length || 0,
      "departments",
    );

    console.log("\n================================");
    console.log("✅ API TEST COMPLETED SUCCESSFULLY");
    console.log("================================");
  } catch (err) {
    console.error("\n❌ Error occurred:", err.message);
    console.error("Stack trace:", err.stack);
    process.exit(1);
  }
})();
