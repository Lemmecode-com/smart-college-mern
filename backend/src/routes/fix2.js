const fs = require("fs");
const f = require("path").join(process.cwd(), "college.routes.js");
let c = fs.readFileSync(f, "utf8");
// Fix import to include getSetupStatus
c = c.replace(
  "const { updateMyCollegeProfile, getMyCollege, getAllColleges } = require(\"../controllers/college.controller\");",
  "const { updateMyCollegeProfile, getMyCollege, getAllColleges, getSetupStatus } = require(\"../controllers/college.controller\");"
);
// Remove extra blank line
c = c.replace("\n\n// COLLEGE ADMIN / STAFF: Get onboarding setup status", "\n// COLLEGE ADMIN / STAFF: Get onboarding setup status");
fs.writeFileSync(f, c);
console.log("Done");
