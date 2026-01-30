const crypto = require("crypto");
const axios = require("axios");

exports.createPhonePePayload = ({ transactionId, amount, redirectUrl }) => {
  const payload = {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    merchantTransactionId: transactionId,
    merchantUserId: "STUDENT_USER",
    amount: amount * 100, // paise
    redirectUrl,
    redirectMode: "POST",
    callbackUrl: redirectUrl,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

  const stringToSign =
    base64Payload + "/pg/v1/pay" + process.env.PHONEPE_SALT_KEY;

  const sha256 = crypto
    .createHash("sha256")
    .update(stringToSign)
    .digest("hex");

  const checksum = sha256 + "###" + process.env.PHONEPE_SALT_INDEX;

  return { base64Payload, checksum };
};
