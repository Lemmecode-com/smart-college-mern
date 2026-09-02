const fs = require("fs");
const file = "frontend/src/pages/dashboard/Parent/ChildFees.jsx";
let content = fs.readFileSync(file, "utf8");

// Add import after api import
content = content.replace(/import api from "\.\.\/\.\.\/api\/axios";/, 'import api from "../../api/axios";\nimport { formatDate, formatDateTime, formatINR, formatNumberIN } from "../../../utils/format";');

// Fix currency toLocaleString patterns
content = content.replace(/`₹\$\{totalFee\?\.toLocaleString\(\)\}/g, "{formatINR(totalFee)}");
content = content.replace(/`₹\$\{paidAmount\?\.toLocaleString\(\)\}/g, "{formatINR(paidAmount)}");
content = content.replace(/`₹\$\{pendingAmount\?\.toLocaleString\(\)\}/g, "{formatINR(pendingAmount)}");
content = content.replace(/₹\{installment\.amount\?\.toLocaleString\(\)\}/g, "{formatINR(installment.amount)}");

// Fix date toLocaleDateString patterns
content = content.replace(/new Date\(installment\.dueDate\)\.toLocaleDateString\(\s*'en-US'\s*\)/g, "formatDate(installment.dueDate)");

// Fix date toLocaleDateString patterns (no locale)
content = content.replace(/new Date\(installment\.paidAt\)\.toLocaleDateString\(\)/g, "formatDateTime(installment.paidAt)");

fs.writeFileSync(file, content, "utf8");
console.log("ChildFees.jsx fixed");
