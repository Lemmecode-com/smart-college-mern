const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generatePaymentReceiptPdf = async ({
  studentName,
  enrollmentNumber,
  installment,
  totalFee,
  paidAmount,
  remainingAmount,
  collegeName,
  transactionId,
  paymentMode,
  paidAt,
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", (buffer) => buffers.push(buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString("en-IN")}`;

      doc.fontSize(22).font("Helvetica-Bold").text("PAYMENT RECEIPT", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica").text(collegeName || "College", { align: "center" });
      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica").text(`Receipt Date: ${new Date(paidAt || Date.now()).toLocaleString("en-IN")}`);
      doc.text(`Transaction ID: ${transactionId}`);
      doc.text(`Payment Mode: ${paymentMode}`);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Student Details", { underline: true });
      doc.font("Helvetica").text(`Name: ${studentName}`);
      doc.text(`Enrollment No: ${enrollmentNumber || "N/A"}`);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Payment Details", { underline: true });
      doc.font("Helvetica").text(`Installment: ${installment.name}`);
      doc.text(`Amount Paid: ${formatCurrency(installment.amount)}`);
      doc.text(`Total Fee: ${formatCurrency(totalFee)}`);
      doc.text(`Paid Amount: ${formatCurrency(paidAmount)}`);
      doc.text(`Remaining Amount: ${formatCurrency(remainingAmount)}`);
      doc.moveDown(1);

      doc.font("Helvetica-Oblique").text("This is a computer-generated receipt and does not require a signature.", {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePaymentReceiptPdf };
