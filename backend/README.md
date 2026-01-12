# smart-college-mern
smart-college-mern intern testing 



Smart College – Backend Assignment (MERN)
Objective
Build a functional, production-style backend for a Single College Management System using:
Node.js


Express.js


MongoDB (Mongoose)


JWT Authentication


Frontend is NOT required.
 Testing must be done using Postman / REST Client only.

General Rules (Mandatory)
Single GitHub repository


Code must run correctly in GitHub Codespaces


Follow clean folder structure (see below)


No UI work


No hardcoded values


Proper error handling & HTTP status codes


All APIs must be testable


Documentation must be present in /docs

Mandatory Repository Structure

smart-college-backend/
│
├── src/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   └── app.js
│
├── docs/
│   ├── erd.md
│   ├── api-list.md
│   └── setup.md
│
├── .env.example
├── package.json
└── README.md

Core Functional Requirements
1. Authentication & Authorization
Roles
Admin


Teacher


Student


Parent


Requirements
JWT-based authentication


Password hashing


Role-based access control using middleware


APIs
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

2. User Management
Single User collection


Role field determines access


Email must be unique



3. Department Management
Model
Name


Code


Status


APIs
POST /api/departments
GET  /api/departments

4. Course Management
Model
Name


Department ID


Duration / Semester info


Status


APIs
POST /api/courses
GET  /api/courses
GET  /api/courses?departmentId=

5. Student Management
Model
Name


Roll number


Course ID


Department ID


Parent ID


Status


APIs
POST /api/students
GET  /api/students
GET  /api/students?courseId=

6. Attendance Module
Model
Student ID


Date


Status (Present / Absent)


Marked by (Teacher ID)


APIs
POST /api/attendance
GET  /api/attendance?studentId=&date=


7. Access Control Rules
Only Admin can create departments & courses


Teachers can mark attendance


Students & Parents can only view their own data


Unauthorized access must be blocked



8. Validation & Error Handling
Request validation required


Meaningful error messages


Proper HTTP status codes:


200


201


400


401


403


404


500



9. Documentation (Mandatory)
docs/erd.md
Database schema explanation


Entity relationships


Simple ERD (ASCII / text is fine)


docs/api-list.md
List of all APIs


Request & response format


Required headers


docs/setup.md
How to run project in GitHub Codespace


Environment variables explanation



10. Git Rules (Strict)
Feature branches only


Pull Requests required


No direct push to main


Commit messages must be meaningful



Evaluation Criteria (What Will Be Checked)
Code structure & readability


API correctness


MongoDB schema design


Authentication & authorization logic


Error handling


Documentation clarity


Ability to work on shared codebase


No broken code in main branch

