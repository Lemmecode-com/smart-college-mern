const fs = require("fs");
const file = "frontend/src/pages/dashboard/Student/MakePayments.jsx";
let content = fs.readFileSync(file, "utf8");

// Fix multi-line date patterns
const pattern1 = "{installmentDetails.dueDate\n                ? new Date(installmentDetails.dueDate).toLocaleDateString(\n                    \"en-IN\",\n                  )";
content = content.replace(pattern1, "{installmentDetails.dueDate ? formatDate(installmentDetails.dueDate)");

const pattern2 = "{new Date(result.installment.paidAt).toLocaleString(\n                      \"en-IN\",\n                    )}";
content = content.replace(pattern2, "{formatDateTime(result.installment.paidAt)}");

// Fix remaining currency patterns
content = content.replace(/result\.totalFee\?\.toLocaleString\(\)/g, "formatNumberIN(result.totalFee)");
content = content.replace(/result\.paidAmount\?\.toLocaleString\(\)/g, "formatNumberIN(result.paidAmount)");
content = content.replace(/result\.remainingAmount\?\.toLocaleString\(\)/g, "formatNumberIN(result.remainingAmount)");

fs.writeFileSync(file, content, "utf8");
console.log("MakePayments.jsx multi-line fixes applied");
