# 📡 Timetable API Usage Guide

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Schedule Endpoints](#schedule-endpoints)
3. [Exception Endpoints](#exception-endpoints)
4. [Common Response Format](#common-response-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## 🔐 Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Role Requirements:**
- **Schedule Endpoints:** TEACHER or STUDENT
- **Exception Management:** TEACHER (HOD for write operations)

---

## 📅 Schedule Endpoints

### **1. Get Date-Wise Schedule**

**Request:**
```http
GET /api/timetable/{timetableId}/schedule?startDate=2025-09-01&endDate=2025-09-30
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date | ✅ | Start date (YYYY-MM-DD) |
| `endDate` | Date | ✅ | End date (YYYY-MM-DD), max 90 days from startDate |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "timetable": {
      "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
      "name": "BSC CS Sem 3 Timetable",
      "semester": 3,
      "academicYear": "2025-2026",
      "startDate": "2025-08-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "workingDays": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      "timezone": "Asia/Kolkata",
      "status": "PUBLISHED"
    },
    "schedule": [
      {
        "date": "2025-09-01",
        "dayName": "Monday",
        "isWorkingDay": true,
        "isHoliday": false,
        "slots": [
          {
            "_id": "slot123",
            "startTime": "09:00",
            "endTime": "10:00",
            "subject_id": {
              "_id": "sub1",
              "name": "Data Structures",
              "code": "CS301"
            },
            "teacher_id": {
              "_id": "teacher1",
              "name": "Dr. Smith",
              "email": "smith@college.edu"
            },
            "room": "Room 101",
            "slotType": "LECTURE",
            "status": "SCHEDULED",
            "exception": null
          },
          {
            "_id": "slot456",
            "startTime": "10:00",
            "endTime": "11:00",
            "subject_id": {
              "_id": "sub2",
              "name": "Database Systems",
              "code": "CS302"
            },
            "teacher_id": {
              "_id": "teacher2",
              "name": "Dr. Jones",
              "email": "jones@college.edu"
            },
            "room": "Room 102",
            "slotType": "LECTURE",
            "status": "CANCELLED",
            "exception": {
              "type": "CANCELLED",
              "reason": "Teacher attending conference",
              "rescheduledTo": "2025-09-08",
              "approvedBy": "hod123"
            }
          }
        ]
      },
      {
        "date": "2025-09-06",
        "dayName": "Saturday",
        "isWorkingDay": false,
        "isExtraDay": true,
        "slots": [
          {
            "_id": null,
            "slotType": "EXTRA",
            "startTime": "10:00",
            "endTime": "11:00",
            "subject_id": {
              "_id": "sub1",
              "name": "Data Structures"
            },
            "teacher_id": {
              "_id": "teacher1",
              "name": "Dr. Smith"
            },
            "room": "Room 101",
            "status": "EXTRA",
            "exception": {
              "type": "EXTRA",
              "reason": "Makeup class for 09-02 cancellation"
            }
          }
        ]
      }
    ],
    "summary": {
      "totalDays": 30,
      "workingDays": 25,
      "totalScheduledSlots": 150,
      "cancelledSlots": 3,
      "extraClasses": 2,
      "holidays": 2
    }
  },
  "message": "Schedule fetched successfully"
}
```

---

### **2. Get Today's Schedule**

**Request:**
```http
GET /api/timetable/{timetableId}/schedule/today
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2025-09-01",
    "dayName": "Monday",
    "isWorkingDay": true,
    "isHoliday": false,
    "slots": [
      {
        "_id": "slot123",
        "startTime": "09:00",
        "endTime": "10:00",
        "subject_id": {
          "name": "Data Structures",
          "code": "CS301"
        },
        "teacher_id": {
          "name": "Dr. Smith"
        },
        "room": "Room 101",
        "status": "SCHEDULED",
        "exception": null
      }
    ]
  },
  "message": "Today's schedule fetched successfully"
}
```

---

### **3. Get Weekly Schedule**

**Request:**
```http
GET /api/timetable/{timetableId}/schedule/week
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:** Same structure as date-wise schedule, but limited to current week (Monday-Sunday).

---

## 🚨 Exception Endpoints

### **1. Create Single Exception**

**Request:**
```http
POST /api/timetable/{timetableId}/exceptions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "slot_id": "slot123",
  "exceptionDate": "2025-09-10",
  "type": "CANCELLED",
  "reason": "Teacher on sick leave",
  "rescheduledTo": "2025-09-17"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slot_id` | ObjectId | ❌ | Specific slot (omit for holiday) |
| `exceptionDate` | Date | ✅ | Date of exception (YYYY-MM-DD) |
| `type` | String | ✅ | HOLIDAY / CANCELLED / EXTRA / RESCHEDULED / ROOM_CHANGE / TEACHER_CHANGE |
| `reason` | String | ✅ | Why this exception exists |
| `rescheduledTo` | Date | ❌ | Required for RESCHEDULED type |
| `extraSlot` | Object | ❌ | Required for EXTRA type (see below) |
| `newRoom` | String | ❌ | For ROOM_CHANGE type |
| `substituteTeacher` | ObjectId | ❌ | For TEACHER_CHANGE type |
| `notifyAffected` | Boolean | ❌ | Send notifications (default: true) |

**extraSlot Object (for EXTRA type):**
```json
{
  "extraSlot": {
    "startTime": "10:00",
    "endTime": "11:00",
    "subject_id": "sub123",
    "teacher_id": "teacher123",
    "room": "Room 105"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "exception": {
      "_id": "exc123",
      "timetable_id": "67a1b2c3d4e5f6g7h8i9j0k1",
      "slot_id": {
        "_id": "slot123",
        "day": "TUE",
        "startTime": "10:00",
        "endTime": "11:00"
      },
      "exceptionDate": "2025-09-10T00:00:00.000Z",
      "type": "CANCELLED",
      "status": "APPROVED",
      "reason": "Teacher on sick leave",
      "rescheduledTo": "2025-09-17T00:00:00.000Z",
      "createdBy": {
        "_id": "user123",
        "name": "Dr. HOD",
        "email": "hod@college.edu"
      },
      "approvedBy": "user123",
      "approvedAt": "2025-09-01T10:30:00.000Z",
      "notifyAffected": true,
      "createdAt": "2025-09-01T10:30:00.000Z",
      "updatedAt": "2025-09-01T10:30:00.000Z"
    }
  },
  "message": "Exception created successfully"
}
```

---

### **2. Create Bulk Exceptions**

**Request:**
```http
POST /api/timetable/{timetableId}/exceptions/bulk
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "exceptions": [
    {
      "exceptionDate": "2025-08-15",
      "type": "HOLIDAY",
      "reason": "Independence Day"
    },
    {
      "exceptionDate": "2025-09-05",
      "type": "HOLIDAY",
      "reason": "Teacher's Day"
    },
    {
      "exceptionDate": "2025-10-02",
      "type": "HOLIDAY",
      "reason": "Gandhi Jayanti"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successCount": 3,
    "failedCount": 0,
    "successIds": ["exc1", "exc2", "exc3"],
    "failures": []
  },
  "message": "Bulk exception creation: 3 succeeded, 0 failed"
}
```

---

### **3. Get Exceptions (List)**

**Request:**
```http
GET /api/timetable/{timetableId}/exceptions?startDate=2025-09-01&endDate=2025-09-30&type=CANCELLED&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date | ❌ | Filter by start date |
| `endDate` | Date | ❌ | Filter by end date |
| `type` | String | ❌ | Filter by type (HOLIDAY, CANCELLED, etc.) |
| `status` | String | ❌ | Filter by status (PENDING, APPROVED, etc.) |
| `slot_id` | ObjectId | ❌ | Filter by specific slot |
| `page` | Number | ❌ | Page number (default: 1) |
| `limit` | Number | ❌ | Items per page (default: 50, max: 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exceptions": [
      {
        "_id": "exc123",
        "exceptionDate": "2025-09-10T00:00:00.000Z",
        "type": "CANCELLED",
        "status": "APPROVED",
        "reason": "Teacher on sick leave",
        "slot_id": {
          "day": "TUE",
          "startTime": "10:00",
          "endTime": "11:00"
        },
        "rescheduledTo": "2025-09-17T00:00:00.000Z",
        "createdBy": {
          "name": "Dr. HOD",
          "email": "hod@college.edu"
        },
        "approvedBy": {
          "name": "Principal"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  },
  "message": "Exceptions fetched successfully"
}
```

---

### **4. Approve Exception**

**Request:**
```http
PUT /api/timetable/exceptions/{exceptionId}/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exception": {
      "_id": "exc123",
      "status": "APPROVED",
      "approvedBy": "user123",
      "approvedAt": "2025-09-01T10:30:00.000Z"
    }
  },
  "message": "Exception approved successfully"
}
```

---

### **5. Reject Exception**

**Request:**
```http
PUT /api/timetable/exceptions/{exceptionId}/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rejectionReason": "Not enough notice period for students"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exception": {
      "_id": "exc123",
      "status": "REJECTED",
      "rejectedBy": "user123",
      "rejectedAt": "2025-09-01T10:30:00.000Z",
      "rejectionReason": "Not enough notice period for students"
    }
  },
  "message": "Exception rejected successfully"
}
```

---

## 📦 Common Response Format

### **Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... } // Optional additional details
  },
  "message": "Operation failed"
}
```

---

## ❌ Error Handling

### **Common Error Codes:**

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `MISSING_FIELDS` | Required fields missing |
| 400 | `INVALID_EXTRA` | EXTRA exception missing extraSlot |
| 400 | `INVALID_RESCHEDULE` | RESCHEDULED missing rescheduledTo |
| 400 | `ALREADY_COMPLETED` | Cannot modify completed exception |
| 403 | `UNAUTHORIZED_ROLE` | Insufficient permissions |
| 403 | `HOD_ONLY` | Only HOD can perform this action |
| 403 | `TEACHER_SUBJECT_MISMATCH` | Teacher doesn't match subject |
| 404 | `TIMETABLE_NOT_FOUND` | Invalid timetable ID |
| 404 | `SLOT_NOT_FOUND` | Invalid slot ID |
| 404 | `EXCEPTION_NOT_FOUND` | Invalid exception ID |
| 404 | `EXCEPTION_NOT_PENDING` | Exception already processed |
| 409 | `TEACHER_CONFLICT` | Teacher double-booking |
| 409 | `ROOM_CONFLICT` | Room booking conflict |
| 409 | `DUPLICATE_EXCEPTION` | Exception already exists |

### **Example Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "TEACHER_CONFLICT",
    "message": "Teacher is already assigned to another class at this time"
  }
}
```

---

## ⏱️ Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `GET /:id/schedule` | 100 requests | 15 minutes |
| `GET /:id/schedule/today` | 200 requests | 15 minutes |
| `GET /:id/schedule/week` | 200 requests | 15 minutes |
| `POST /:id/exceptions` | 50 requests | 15 minutes |
| `POST /:id/exceptions/bulk` | 10 requests | 15 minutes |
| `GET /:id/exceptions` | 100 requests | 15 minutes |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## 📝 Usage Examples

### **Example 1: Student Viewing Weekly Schedule**

```javascript
// Frontend: StudentTimetable.jsx
const response = await axios.get(
  `/api/timetable/${timetableId}/schedule/week`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const schedule = response.data.data.schedule;
schedule.forEach(day => {
  console.log(`${day.date} (${day.dayName}): ${day.slots.length} classes`);
  day.slots.forEach(slot => {
    if (slot.status === 'CANCELLED') {
      console.log(`  ❌ ${slot.subject_id.name} - Cancelled: ${slot.exception.reason}`);
    } else {
      console.log(`  ✅ ${slot.subject_id.name} - ${slot.startTime}-${slot.endTime}`);
    }
  });
});
```

---

### **Example 2: HOD Creating Holiday Exception**

```javascript
// Frontend: ExceptionForm.jsx
const response = await axios.post(
  `/api/timetable/${timetableId}/exceptions`,
  {
    exceptionDate: '2025-10-02',
    type: 'HOLIDAY',
    reason: 'Gandhi Jayanti'
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log('Holiday created:', response.data.data.exception);
```

---

### **Example 3: HOD Creating Makeup Class**

```javascript
// Frontend: MakeupClassForm.jsx
const response = await axios.post(
  `/api/timetable/${timetableId}/exceptions`,
  {
    exceptionDate: '2025-09-21', // Saturday
    type: 'EXTRA',
    reason: 'Makeup class for missed lecture',
    extraSlot: {
      startTime: '10:00',
      endTime: '11:00',
      subject_id: 'sub123',
      teacher_id: 'teacher456',
      room: 'Room 105'
    }
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log('Extra class created:', response.data.data.exception);
```

---

### **Example 4: Bulk Holiday Upload**

```javascript
// Frontend: BulkHolidayUpload.jsx
const holidays = [
  { exceptionDate: '2025-08-15', type: 'HOLIDAY', reason: 'Independence Day' },
  { exceptionDate: '2025-09-05', type: 'HOLIDAY', reason: "Teacher's Day" },
  { exceptionDate: '2025-10-02', type: 'HOLIDAY', reason: 'Gandhi Jayanti' },
  { exceptionDate: '2025-12-25', type: 'HOLIDAY', reason: 'Christmas' }
];

const response = await axios.post(
  `/api/timetable/${timetableId}/exceptions/bulk`,
  { exceptions: holidays },
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log(`Created ${response.data.data.successCount} holidays`);
```

---

## 🔧 Postman Collection

Import the following collection into Postman for easy API testing:

```json
{
  "info": {
    "name": "Smart College Timetable API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Schedule",
      "item": [
        {
          "name": "Get Date-Wise Schedule",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/timetable/{{timetableId}}/schedule?startDate=2025-09-01&endDate=2025-09-30",
              "host": ["{{baseUrl}}"],
              "path": ["api", "timetable", "{{timetableId}}", "schedule"],
              "query": [
                { "key": "startDate", "value": "2025-09-01" },
                { "key": "endDate", "value": "2025-09-30" }
              ]
            }
          }
        },
        {
          "name": "Get Today's Schedule",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/timetable/{{timetableId}}/schedule/today",
              "host": ["{{baseUrl}}"],
              "path": ["api", "timetable", "{{timetableId}}", "schedule", "today"]
            }
          }
        }
      ]
    },
    {
      "name": "Exceptions",
      "item": [
        {
          "name": "Create Holiday Exception",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"exceptionDate\": \"2025-08-15\",\n  \"type\": \"HOLIDAY\",\n  \"reason\": \"Independence Day\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/timetable/{{timetableId}}/exceptions",
              "host": ["{{baseUrl}}"],
              "path": ["api", "timetable", "{{timetableId}}", "exceptions"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:5000" },
    { "key": "token", "value": "your-jwt-token-here" },
    { "key": "timetableId", "value": "your-timetable-id-here" }
  ]
}
```

---

**Last Updated:** April 8, 2026  
**API Version:** 2.1.0
