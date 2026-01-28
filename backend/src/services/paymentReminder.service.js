const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const { sendPaymentReminderEmail } = require("./email.service");

exports.sendPaymentDueReminders = async () => {
  const today = new Date();

  // Find all students with pending installments
  const fees = await StudentFee.find({
    "installments.status": "PENDING"
  });

  for (const fee of fees) {
    const student = await Student.findById(fee.student_id);

    if (!student || student.status === "DELETED") continue;

    for (const installment of fee.installments) {
      if (
        installment.status === "PENDING" &&
        !installment.reminderSent &&
        installment.dueDate <= today
      ) {
        await sendPaymentReminderEmail({
          to: student.email,
          studentName: student.fullName,
          installment
        });

        installment.reminderSent = true;
      }
    }

    await fee.save();
  }
};
