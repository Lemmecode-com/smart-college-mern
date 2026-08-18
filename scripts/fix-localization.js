const fs = require("fs");
const path = require("path");

const TARGET_DIR = path.join(__dirname, "..", "frontend", "src");
const IMPORT_LINE = 'import { formatDate, formatDateTime, formatINR, formatNumberIN } from "../../../utils/format";';
const IMPORT_ALT = 'import { formatDate, formatDateTime, formatINR, formatNumberIN } from "../../../utils/format";';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  // Skip if already fixed
  if (content.includes(IMPORT_LINE) || content.includes(IMPORT_ALT)) {
    // Check if there are still any toLocale patterns
    const hasLocale = /toLocaleDateString\(|toLocaleString\(/.test(content);
    if (!hasLocale) {
      return false; // Already fully fixed
    }
    // Partially fixed - continue fixing remaining patterns
  }

  // Add import if missing
  if (!content.includes(IMPORT_LINE) && !content.includes(IMPORT_ALT)) {
    // Try to add after api import
    if (content.includes('import api from "../../api/axios";')) {
      content = content.replace(
        'import api from "../../api/axios";',
        `import api from "../../api/axios";
${IMPORT_LINE}`
      );
    } else if (content.includes('import api from "../../../api/axios";')) {
      content = content.replace(
        'import api from "../../../api/axios";',
        `import api from "../../../api/axios";
${IMPORT_LINE}`
      );
    } else if (content.includes('import api from "../../../../api/axios";')) {
      content = content.replace(
        'import api from "../../../../api/axios";',
        `import api from "../../../../api/axios";
${IMPORT_LINE}`
      );
    } else if (content.includes('import { logger } from "../../../utils/logger";')) {
      content = content.replace(
        'import { logger } from "../../../utils/logger";',
        `import { logger } from "../../../utils/logger";
${IMPORT_LINE}`
      );
    } else if (content.includes('import { logger } from "../../utils/logger";')) {
      content = content.replace(
        'import { logger } from "../../utils/logger";',
        `import { logger } from "../../utils/logger";
${IMPORT_LINE}`
      );
    } else {
      // Last resort: add after first import block
      const firstImportEnd = content.indexOf(";", content.indexOf("import "));
      if (firstImportEnd !== -1) {
        content = content.slice(0, firstImportEnd + 1) + "\n" + IMPORT_LINE + content.slice(firstImportEnd + 1);
      }
    }
  }

  // Replace toLocaleDateString with formatDate
  content = content.replace(/\.toLocaleDateString\([^)]*\)/g, "formatDate");
  content = content.replace(/new Date\(([^)]+)\)\.toLocaleDateString\([^)]*\)/g, "formatDate($1)");

  // Replace toLocaleString with formatDateTime
  content = content.replace(/\.toLocaleString\([^)]*\)/g, "formatDateTime");
  content = content.replace(/new Date\(([^)]+)\)\.toLocaleString\([^)]*\)/g, "formatDateTime($1)");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== "node_modules" && file !== ".git") {
      walkDir(filePath);
    } else if (file.endsWith(".jsx") || file.endsWith(".js")) {
      const changed = fixFile(filePath);
      if (changed) {
        console.log("Fixed:", filePath.replace(TARGET_DIR + path.sep, ""));
      }
    }
  }
}

console.log("Scanning for localization issues...");
walkDir(TARGET_DIR);
console.log("Done.");
