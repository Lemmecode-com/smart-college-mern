# Changelog

All notable changes to the **NOVAA** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Features planned for next release

---

## [2.1.0] - 2026-03-09

### Added
- **Teacher Profile Enhancements**
  - Mobile number field for teacher contact information
  - Joining date field to track teacher employment start date
  - Teachers can now edit their own mobile number and joining date
  - Updated teacher creation form with mobile number and joining date inputs
- **Attendance Report Improvements**
  - Subject filtering by course in attendance report
  - Enhanced debugging with comprehensive API logging
  - Support for multiple API response formats
  - Fallback query for subjects without direct teacher assignment

### Changed
- **Teacher Profile Display**
  - Removed specialization field (redundant with highest qualification)
  - Fixed contact number display to use `mobileNumber` from backend model
  - Joining date now falls back to `createdAt` if not explicitly set
- **Backend Controllers**
  - `attendance.controller.js`: Enhanced subject fetching with two-tier query strategy
  - `teacher.controller.js`: Added mobileNumber/joiningDate to create and update operations
- **Frontend Forms**
  - `AddTeacher.jsx`: Added mobile number (10-digit Indian format) and joining date fields
  - `EditTeacherProfile.jsx`: Added editable mobile number and joining date fields
  - `MyProfile.jsx`: Removed specialization, fixed contact number mapping
  - `AttendanceReport.jsx`: Enhanced API response handling and error logging

### Fixed
- **Attendance Report Subject Rendering**
  - Fixed issue where subjects were not loading for selected courses
  - Added fallback query when subjects are not directly assigned to teacher
  - Improved error handling and debugging capabilities
- **Teacher Profile Data Loading**
  - Fixed API response parsing in EditTeacherProfile component
  - Corrected data extraction from nested `{ teacher: {...} }` response format

### Technical
- **Database Schema**
  - Added `joiningDate` field to Teacher model schema
  - Maintained backward compatibility with existing records
- **API Enhancements**
  - Updated `/teachers` POST endpoint to accept mobileNumber and joiningDate
  - Updated `/teachers/my-profile` PUT endpoint to allow mobileNumber and joiningDate updates
  - Enhanced `/attendance/report/subjects/:courseId` with detailed logging
- **Frontend Logging**
  - Added comprehensive console logging for debugging API calls
  - Added response format detection for flexible API handling

### Security
- Mobile number validation with Indian mobile number regex pattern
- Input sanitization for all new teacher profile fields

---

## [2.0.0] - 2026-03-07

### Added
- **MVP Phase 2 Complete** - Major milestone release
- **Landing Page** - Modern, responsive landing page with animated UI elements
  - Scroll progress indicator
  - Floating back-to-top button
  - GSAP-style fade-in animations
  - Responsive navigation with mobile menu
- **Version Management System**
  - Centralized version tracking across all packages
  - Version badge display in footer
  - Changelog documentation system
- **Enhanced UI Components**
  - Gradient-based color scheme with CSS variables
  - Glass-morphism effects on navigation
  - Animated feature cards with hover effects
  - Testimonial card carousel
- **Contact Form** - Functional contact form with validation
- **Footer Enhancements** - Multi-column footer with social links and version display

### Changed
- **Project Structure** - Improved organization with clear separation of concerns
- **Version Sync** - All packages (root, frontend, backend) now use unified versioning
- **Code Organization** - Better file structure and naming conventions

### Fixed
- UI/UX refinements across landing page
- Responsive layout issues on mobile devices
- Animation timing and performance improvements
- Cross-browser compatibility fixes

### Security
- Maintained all Phase 1 security measures
- Enhanced CORS configuration for production

### Deprecated
- None in this release

---

## [1.0.0] - 2025-12-31

### Added
- **Initial MVP Phase 1 Release** - Foundation of NOVAA platform

#### Backend Infrastructure
- **Node.js + Express Server** - RESTful API architecture
- **MongoDB + Mongoose ODM** - Database schema design and models
- **Environment Configuration** - `.env` based configuration system
- **Logging System** - Winston logger for error and access logs
- **Error Handling** - Centralized error handling middleware

#### Authentication & Authorization
- **JWT-based Authentication** - Secure token-based auth system
- **User Registration** - Email/password registration with validation
- **User Login** - Secure login with access/refresh tokens
- **Password Hashing** - bcryptjs for secure password storage
- **Role-based Access Control** - Admin, Faculty, Student roles
- **Session Management** - Token expiration and refresh mechanism

#### User Management
- **Admin Dashboard** - Basic admin panel foundation
- **Student Management Module**
  - Student registration and profiles
  - Enrollment management
  - Student data CRUD operations
- **Faculty Management Module**
  - Faculty registration and profiles
  - Department assignment
  - Faculty data CRUD operations

#### API Features
- **Rate Limiting** - express-rate-limit for API protection
- **Input Validation** - express-validator for request validation
- **File Upload** - Multer integration for image/document uploads
- **QR Code Generation** - qrcode library for student IDs/attendance
- **Payment Integration** - Stripe and Razorpay integration setup

#### Email System
- **Nodemailer Configuration** - Email service setup
- **Email Templates** - Reusable email template system
- **Automated Emails** - Welcome emails, password reset, notifications

#### Task Scheduling
- **Node-cron Integration** - Scheduled tasks and cleanup jobs
- **Automated Backups** - Periodic data backup scheduling

### Changed
- Database connection pooling for better performance
- API response structure standardization
- Error message formatting for better user experience

### Fixed
- Token expiration handling
- Database connection retry logic
- Input sanitization for user inputs
- CORS preflight request handling

### Security
- **Helmet Security Headers** - HTTP security headers middleware
- **CORS Configuration** - Cross-origin resource sharing setup
- **Rate Limiting** - API rate limiting per IP/user
- **Input Validation** - Server-side validation for all endpoints
- **XSS Protection** - Content sanitization
- **CSRF Protection** - Cross-site request forgery prevention
- **Secure Cookies** - HTTP-only, secure cookie configuration
- **Password Requirements** - Minimum length and complexity rules

### Deprecated
- None in initial release

### Removed
- None in initial release

---

## Version Numbering

This project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

| Part | When to Increment | Example |
|------|-------------------|---------|
| **MAJOR** | Breaking changes (incompatible with previous version) | `1.0.0` → `2.0.0` |
| **MINOR** | New features (backward compatible) | `2.0.0` → `2.1.0` |
| **PATCH** | Bug fixes (backward compatible) | `2.0.0` → `2.0.1` |

---

## Quick Reference

- **Current Version**: 2.1.0
- **Codename**: Teacher Profile & Attendance Enhancement
- **Release Date**: 2026-03-09
- **Total Releases**: 3

---

## Migration Notes

### Upgrading from 1.0.0 to 2.0.0

No breaking changes. Direct upgrade is safe.

**Recommended Steps:**
1. Backup your database before upgrading
2. Update all package.json files to v2.0.0
3. Clear browser cache for new landing page assets
4. No database migrations required

### Upgrading to Future Versions

Check individual release notes for any breaking changes or migration requirements.

---

*Last Updated: 2026-03-09*
