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
<<<<<<< HEAD
  transactionId,
  paymentMode,
  paidAt,
=======
  collegeGstin,
  transactionId,
  paymentMode,
  paidAt,
  taxDetails,
>>>>>>> origin/feature/exam-module
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", (buffer) => buffers.push(buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString("en-IN")}`;

<<<<<<< HEAD
      doc.fontSize(22).font("Helvetica-Bold").text("PAYMENT RECEIPT", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica").text(collegeName || "College", { align: "center" });
=======
      const effectiveTax = taxDetails || (installment?.taxBreakdown?.isTaxApplicable ? installment.taxBreakdown : null);
      const isTaxApplicable = Boolean(effectiveTax && effectiveTax.isTaxApplicable);
      // Statutory invoice requirement: Under Section 31 CGST Act & Rule 46 CGST Rules,
      // a document cannot be issued as a Tax Invoice without a valid supplier GSTIN.
      const hasValidGstin = Boolean(collegeGstin && typeof collegeGstin === "string" && collegeGstin.trim().length === 15);
      const title = (isTaxApplicable && hasValidGstin) ? "FEE PAYMENT RECEIPT / TAX INVOICE" : "PAYMENT RECEIPT";
      doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica").text(collegeName || "College", { align: "center" });
      if (collegeGstin) {
        doc.fontSize(10).font("Helvetica").text(`GSTIN: ${collegeGstin}`, { align: "center" });
      }
>>>>>>> origin/feature/exam-module
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
<<<<<<< HEAD
      doc.text(`Amount Paid: ${formatCurrency(installment.amount)}`);
=======

      if (isTaxApplicable) {
        const sacCode = effectiveTax.sacCode || "999299";
        doc.text(`SAC Code: ${sacCode}`);
        const placeOfSupply = effectiveTax.placeOfSupply || "Maharashtra (27)";
        doc.text(`Place of Supply: ${placeOfSupply}`);

        const baseAmount = effectiveTax.baseAmount !== undefined
          ? effectiveTax.baseAmount
          : effectiveTax.taxableBase !== undefined
          ? effectiveTax.taxableBase
          : (installment.amount - effectiveTax.totalTax);

        doc.text(`Base Amount: ${formatCurrency(baseAmount)}`);

        const taxSplit = effectiveTax.taxSplit || {};
        let isUniform = taxSplit.isUniformRate;
        if (isUniform === undefined) {
          if (Array.isArray(effectiveTax.lineItems) && effectiveTax.lineItems.length > 0) {
            const taxable = effectiveTax.lineItems.filter(l => Number(l.gstRate) > 0 || Number(l.gstAmount) > 0);
            const unique = [...new Set(taxable.map(l => Number(l.gstRate)))];
            isUniform = unique.length === 1;
          } else if (taxSplit.cgstRate != null || taxSplit.igstRate != null) {
            isUniform = true;
          } else {
            isUniform = false;
          }
        }

        if (taxSplit.type === "INTER_STATE" || taxSplit.igstAmount > 0) {
          const hasUniform = Boolean(isUniform && taxSplit.igstRate);
          const igstLabel = hasUniform ? `IGST (${taxSplit.igstRate}%): ` : "IGST: ";
          doc.text(`${igstLabel}${formatCurrency(taxSplit.igstAmount || effectiveTax.totalTax)}`);
        } else {
          const hasUniform = Boolean(isUniform && taxSplit.cgstRate);
          const cgstLabel = hasUniform ? `CGST (${taxSplit.cgstRate}%): ` : "CGST: ";
          const sgstLabel = hasUniform ? `SGST (${taxSplit.sgstRate}%): ` : "SGST: ";
          doc.text(`${cgstLabel}${formatCurrency(taxSplit.cgstAmount || (effectiveTax.totalTax / 2))}`);
          doc.text(`${sgstLabel}${formatCurrency(taxSplit.sgstAmount || (effectiveTax.totalTax / 2))}`);
        }

        doc.text(`Total Tax: ${formatCurrency(effectiveTax.totalTax)}`);
        doc.text(`Gross Amount Paid: ${formatCurrency(installment.amount)}`);

        if (Array.isArray(effectiveTax.lineItems) && effectiveTax.lineItems.length > 0) {
          doc.moveDown(0.5);
          doc.font("Helvetica-Bold").text("Component Breakdown:", { underline: false });
          doc.font("Helvetica");
          effectiveTax.lineItems.forEach((item) => {
            if (taxSplit.type === "INTER_STATE" || item.igstAmount > 0) {
              const iRate = item.igstRate !== undefined ? item.igstRate : item.gstRate;
              const iAmt = item.igstAmount !== undefined ? item.igstAmount : item.gstAmount;
              doc.text(
                `  • ${item.name}: Base ${formatCurrency(item.baseAmount)} | IGST (${iRate}%) ${formatCurrency(iAmt)} | Total ${formatCurrency(item.totalAmount)}`
              );
            } else {
              const cRate = item.cgstRate !== undefined ? item.cgstRate : (item.gstRate / 2);
              const cAmt = item.cgstAmount !== undefined ? item.cgstAmount : (item.gstAmount / 2);
              const sRate = item.sgstRate !== undefined ? item.sgstRate : (item.gstRate / 2);
              const sAmt = item.sgstAmount !== undefined ? item.sgstAmount : (item.gstAmount / 2);
              doc.text(
                `  • ${item.name}: Base ${formatCurrency(item.baseAmount)} | CGST (${cRate}%) ${formatCurrency(cAmt)} + SGST (${sRate}%) ${formatCurrency(sAmt)} | Total ${formatCurrency(item.totalAmount)}`
              );
            }
          });
          doc.moveDown(0.5);
        }
      } else {
        doc.text(`Amount Paid: ${formatCurrency(installment.amount)}`);
      }

>>>>>>> origin/feature/exam-module
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
