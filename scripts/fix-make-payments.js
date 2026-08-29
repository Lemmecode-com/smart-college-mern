const fs = require("fs");
const file = "frontend/src/pages/dashboard/Student/MakePayments.jsx";
let content = fs.readFileSync(file, "utf8");

// Add import
content = content.replace(/\} from "react-icons\/fa";/, '} from "react-icons/fa";\nimport { formatDate, formatDateTime, formatINR, formatNumberIN } from "../../../utils/format";');

// Fix currency toLocaleString patterns (single ? for optional chaining)
content = content.replace(/installmentDetails\.amount\?\.toLocaleString\(\)/g, "formatNumberIN(installmentDetails.amount)");
content = content.replace(/result\.installment\.amount\.toLocaleString\(\)/g, "formatNumberIN(result.installment.amount)");
content = content.replace(/result\.totalFee\?\?\.toLocaleString\(\)/g, "formatNumberIN(result.totalFee)");
content = content.replace(/result\.paidAmount\?\?\.toLocaleString\(\)/g, "formatNumberIN(result.paidAmount)");
content = content.replace(/result\.remainingAmount\?\?\.toLocaleString\(\)/g, "formatNumberIN(result.remainingAmount)");

// Fix date toLocaleDateString patterns
content = content.replace(/new Date\(installmentDetails\.dueDate\)\.toLocaleDateString\(\s*"en-IN"\s*\)/g, "formatDate(installmentDetails.dueDate)");

// Fix date toLocaleString patterns
content = content.replace(/new Date\(result\.installment\.paidAt\)\.toLocaleString\(\s*"en-IN"\s*\)/g, "formatDateTime(result.installment.paidAt)");

// Fix aria-label patterns
content = content.replace(/aria-label=\{`Pay \$\{installmentDetails\.amount\?\.toLocaleString\(\)\} rupees via Stripe`\}/g, 'aria-label={`Pay ${formatNumberIN(installmentDetails.amount)} rupees via Stripe`}');
content = content.replace(/aria-label=\{`Pay \$\{installmentDetails\.amount\?\.toLocaleString\(\)\} rupees via Razorpay`\}/g, 'aria-label={`Pay ${formatNumberIN(installmentDetails.amount)} rupees via Razorpay`}');

fs.writeFileSync(file, content, "utf8");
console.log("MakePayments.jsx fixed");
