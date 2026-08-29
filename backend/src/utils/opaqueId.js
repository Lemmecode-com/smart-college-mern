const crypto = require("crypto");

const SECRET = process.env.OPAQUE_ID_SECRET || process.env.JWT_SECRET;

function toOpaqueId(realId) {
  if (!realId) return null;
  const str = String(realId);
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(str);
  const digest = hmac.digest("hex");
  return `usr_${digest.slice(0, 16)}`;
}

module.exports = { toOpaqueId };
