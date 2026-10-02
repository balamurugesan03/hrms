# HRMS - Human Resource Management System

A production-ready full-stack HRMS application built with the MERN stack.

## Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, Multer
**Frontend:** React 18, Material UI v5, React Router v6, Recharts, React Hook Form

## Features

- Multi-role authentication (Super Admin, HR Manager, Employee)
- Department & Designation Management
- Employee Management (with photo upload, Excel import/export)
- Attendance Tracking (daily, monthly, bulk)
- Leave Management (apply, approve, reject, balance)
- Holiday Calendar
- Shift Management
- Payroll Processing & Payslip
- Expense Management
- Asset Tracking
- Recruitment & Candidate Tracking
- Performance Appraisal
- Document Management
- Reports (Excel export)
- Dashboard with charts
- Dark Mode

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Backend Setup
```bash
cd backend
npm install
# Configure .env (see .env.example)
npm run seed      # Create demo users & data
npm run dev       # Start dev server on :5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Start Vite dev server on :5173
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@hrms.com | Admin@123 |
| HR Manager | hr@hrms.com | Hr@123456 |
| Employee | john@hrms.com | Employee@123 |

## API Endpoints

| Module | Base URL |
|--------|----------|
| Auth | /api/auth |
| Departments | /api/departments |
| Designations | /api/designations |
| Employees | /api/employees |
| Attendance | /api/attendance |
| Leave | /api/leave |
| Holidays | /api/holidays |
| Shifts | /api/shifts |
| Payroll | /api/payroll |
| Expenses | /api/expenses |
| Assets | /api/assets |
| Recruitment | /api/recruitment |
| Performance | /api/performance |
| Documents | /api/documents |
| Dashboard | /api/dashboard |
| Reports | /api/reports |

## Folder Structure

```
hrms/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connection, seed
│   │   ├── models/        # Mongoose schemas
│   │   ├── controllers/   # Route handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # Express routes
│   │   ├── middleware/     # Auth, upload, validation
│   │   ├── validators/    # Joi schemas
│   │   └── utils/         # Helpers
│   └── uploads/           # File storage
└── frontend/
    └── src/
        ├── api/           # Axios API calls
        ├── contexts/      # Auth & Theme
        ├── components/    # Reusable components
        ├── pages/         # Page components
        ├── hooks/         # Custom hooks
        ├── theme/         # MUI theme
        └── utils/         # Helper functions
```
