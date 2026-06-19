const fs = require("fs");
const f = "C:\\Users\\HP\\Desktop\\smtclgv2\\smart-college-mern\\backend\\src\\controllers\\staff.controller.js";
let c = fs.readFileSync(f, "utf8");

// Find and replace the createStaff function's commit-to-response block
// The pattern: after session.commitTransaction(), before the catch
const oldBlock = `      await session.commitTransaction();
      session.endSession();

      const staffName = name;`;

const newBlock = `      await session.commitTransaction();
      session.endSession();

      // Send credentials email BEFORE responding so we can report delivery status
      let emailResult = { success: false };
      try {
        emailResult = await sendStaffCredentialsEmail({
          to: email,
          name,
          temporaryPassword: tempPassword,
          collegeId: req.user.college_id,
        });
      } catch (err) {
        console.error("Failed to send staff credentials email:", err.message);
      }

      const staffName = name;`;

c = c.replace(oldBlock, newBlock);

// Replace the response section to include email status
const oldResponse = `      res.status(201).json({
        success: true,
        message: "Staff account created successfully",
        data: {
          user: {
            id: user[0]._id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            college_id: user[0].college_id,
          },
          teacher: teacher ? { id: teacher[0]._id, employeeId: teacher[0].employeeId } : null,
          temporaryPassword: tempPassword, // shown only once
        },
      });

      sendStaffCredentialsEmail({
        to: email,
        name,
        temporaryPassword: tempPassword,
        collegeId: req.user.college_id,
      }).catch((err) => console.error("Failed to send staff credentials email:", err.message));`;

const newResponse = `      const message = emailResult.success
        ? "Staff account created. Credentials sent via email."
        : "Staff account created. Email delivery failed \u2014 please share the temporary password manually.";

      res.status(201).json({
        success: true,
        message,
        emailDelivered: emailResult.success,
        emailError: emailResult.success ? null : (emailResult.error || "SMTP not configured"),
        data: {
          user: {
            id: user[0]._id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            college_id: user[0].college_id,
          },
          teacher: teacher ? { id: teacher[0]._id, employeeId: teacher[0].employeeId } : null,
          temporaryPassword: tempPassword, // shown only once
        },
      });`;

c = c.replace(oldResponse, newResponse);

fs.writeFileSync(f, c);
console.log("staff.controller.js updated");
