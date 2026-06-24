const fs = require("fs");
const path = require("path");
const f = path.join(process.cwd(), "college.routes.js");
let c = fs.readFileSync(f, "utf8");
const marker = "module.exports = router;";
const insert = "\n// COLLEGE ADMIN / STAFF: Get onboarding setup status\nrouter.get(\n  \"/setup-status\",\n  auth,\n  collegeMiddleware,\n  getSetupStatus\n);\n\n";
if (!c.includes('"/setup-status"')) {
  c = c.replace(marker, insert + marker);
  fs.writeFileSync(f, c);
  console.log("setup-status route added");
} else {
  console.log("setup-status route already present");
}
