// ===============================
// Smart College API Test (Node.js)
// ===============================

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

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

    // 1️⃣ Super Admin Login
    console.log("\n[1] Super Admin Login");
    const superAdminLogin = await api("POST", "/api/auth/login", {
      email: "superadmin@smartcollege.com",
      password: "Admin@1234",
    });

    const SUPER_ADMIN_TOKEN = superAdminLogin.token;
    console.log("✅ Super Admin logged in");

    // 2️⃣ Get All Colleges
    console.log("\n[2] Get All Colleges (Super Admin)");
    const colleges = await api(
      "GET",
      "/api/master/get/colleges",
      null,
      SUPER_ADMIN_TOKEN
    );
    console.log(colleges);

    // 3️⃣ College Admin Login
    console.log("\n[3] College Admin Login");
    const collegeAdminLogin = await api("POST", "/api/auth/login", {
      email: "sgmadmin@gmail.com",
      password: "sgmadmin1234",
    });

    const COLLEGE_ADMIN_TOKEN = collegeAdminLogin.token;
    console.log("✅ College Admin logged in");

    // 4️⃣ Get My College
    console.log("\n[4] Get My College");
    const myCollege = await api(
      "GET",
      "/api/college/my-college",
      null,
      COLLEGE_ADMIN_TOKEN
    );
    console.log(myCollege);

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
      COLLEGE_ADMIN_TOKEN
    );
    console.log(department);

    // 6️⃣ Get All Departments
    console.log("\n[6] Get All Departments");
    const departments = await api(
      "GET",
      "/api/departments",
      null,
      COLLEGE_ADMIN_TOKEN
    );
    console.log(departments);

    console.log("\n================================");
    console.log("API TEST COMPLETED SUCCESSFULLY");
    console.log("================================");
  } catch (err) {
    console.error("❌ Error occurred:", err.message);
  }
})();
