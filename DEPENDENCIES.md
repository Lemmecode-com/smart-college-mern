# 📦 Smart College MERN - Dependencies List

This document lists all dependencies for the Smart College MERN project (Frontend + Backend).

---

## 🎨 FRONTEND Dependencies

**Location:** `frontend/package.json`

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.3 | UI Library |
| `react-dom` | ^19.1.0 | DOM Rendering |
| `react-router-dom` | ^7.13.0 | Routing |

### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| `bootstrap` | ^5.3.8 | CSS Framework |
| `react-bootstrap` | ^2.10.10 | Bootstrap Components |
| `react-icons` | ^5.5.0 | Icon Library |
| `framer-motion` | ^12.34.0 | Animation Library |
| `motion` | ^12.34.0 | Animation Library |

### HTTP & API
| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.13.4 | HTTP Client |

### State & Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `jwt-decode` | ^4.0.0 | JWT Token Decoding |
| `moment` | ^2.30.1 | Date/Time Handling |
| `uuid` | ^13.0.0 | Unique ID Generation |
| `prop-types` | ^15.8.1 | Type Checking |

### UI Components & Notifications
| Package | Version | Purpose |
|---------|---------|---------|
| `react-toastify` | ^11.0.5 | Toast Notifications |
| `recharts` | ^3.7.0 | Charts & Graphs |

### File Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `exceljs` | ^4.4.0 | Excel File Generation |
| `file-saver` | ^2.0.5 | File Download |
| `jszip` | ^3.10.1 | ZIP File Handling |
| `jspdf` | ^4.2.0 | PDF Generation |
| `jspdf-autotable` | ^5.0.7 | PDF Tables |
| `html2canvas` | ^1.4.1 | HTML to Image |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.0.0 | Build Tool |
| `@vitejs/plugin-react` | ^4.5.2 | Vite React Plugin |
| `eslint` | ^9.39.4 | Linting |
| `@eslint/js` | ^9.29.0 | ESLint Config |
| `eslint-plugin-react-hooks` | ^5.2.0 | React Hooks Rules |
| `eslint-plugin-react-refresh` | ^0.4.20 | React Refresh |
| `globals` | ^16.2.0 | ESLint Globals |
| `@types/react` | ^19.1.8 | TypeScript Types |
| `@types/react-dom` | ^19.1.6 | TypeScript Types |

---

## ⚙️ BACKEND Dependencies

**Location:** `backend/package.json`

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | Web Framework |

### Database
| Package | Version | Purpose |
|---------|---------|---------|
| `mongoose` | ^9.1.3 | MongoDB ODM |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `bcryptjs` | ^3.0.3 | Password Hashing |
| `jsonwebtoken` | ^9.0.3 | JWT Token Generation |
| `helmet` | ^8.1.0 | Security Headers |
| `express-rate-limit` | ^8.2.1 | Rate Limiting |
| `cookie-parser` | ^1.4.7 | Cookie Parsing |

### Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `express-validator` | ^7.3.1 | Input Validation |

### File Handling
| Package | Version | Purpose |
|---------|---------|---------|
| `multer` | ^2.0.2 | File Upload |
| `pdfkit` | ^0.18.0 | PDF Generation |
| `qrcode` | ^1.5.4 | QR Code Generation |

### Payment Gateways
| Package | Version | Purpose |
|---------|---------|---------|
| `razorpay` | ^2.9.6 | Razorpay Payment |
| `stripe` | ^20.3.0 | Stripe Payment |

### Email & Notifications
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | ^7.0.13 | Email Sending |

### Logging & Monitoring
| Package | Version | Purpose |
|---------|---------|---------|
| `morgan` | ^1.10.1 | HTTP Request Logger |
| `winston` | ^3.19.0 | Application Logger |

### Scheduling & Cron
| Package | Version | Purpose |
|---------|---------|---------|
| `node-cron` | ^4.2.1 | Cron Job Scheduler |

### Configuration & CORS
| Package | Version | Purpose |
|---------|---------|---------|
| `dotenv` | ^17.2.3 | Environment Variables |
| `cors` | ^2.8.5 | CORS Handling |

---

## 📋 Installation Instructions

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Full Project Setup
```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

---

## 📝 Notes

- All dependencies use caret (^) versioning for automatic minor/patch updates
- Frontend uses Vite as the build tool
- Backend uses Node.js with Express.js
- Both frontend and backend should use Node.js version 18+ for compatibility

---

**Project Version:** 2.1.0  
**Last Updated:** 2026-04-11
