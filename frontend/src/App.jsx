import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Box, CircularProgress } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// App Pages
import Dashboard from './pages/dashboard/Dashboard';
import DepartmentPage from './pages/departments/DepartmentPage';
import DesignationPage from './pages/designations/DesignationPage';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavePage from './pages/leave/LeavePage';
import HolidayPage from './pages/holiday/HolidayPage';
import ShiftPage from './pages/shift/ShiftPage';
import PayrollPage from './pages/payroll/PayrollPage';
import ExpensePage from './pages/expense/ExpensePage';
import AssetPage from './pages/asset/AssetPage';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import PerformancePage from './pages/performance/PerformancePage';
import DocumentsPage from './pages/documents/DocumentsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';

const Loader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: 8, fontSize: 14 },
            }}
          />
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Organization */}
                <Route path="departments" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><DepartmentPage /></ProtectedRoute>} />
                <Route path="designations" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><DesignationPage /></ProtectedRoute>} />
                <Route path="shifts" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><ShiftPage /></ProtectedRoute>} />
                <Route path="holidays" element={<HolidayPage />} />

                {/* Employees */}
                <Route path="employees" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><EmployeeList /></ProtectedRoute>} />
                <Route path="employees/new" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><EmployeeForm /></ProtectedRoute>} />
                <Route path="employees/:id" element={<EmployeeProfile />} />
                <Route path="employees/:id/edit" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><EmployeeForm /></ProtectedRoute>} />
                <Route path="profile" element={<EmployeeProfile />} />

                {/* Modules */}
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leave" element={<LeavePage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="expenses" element={<ExpensePage />} />
                <Route path="assets" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><AssetPage /></ProtectedRoute>} />
                <Route path="recruitment" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><RecruitmentPage /></ProtectedRoute>} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="documents" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><DocumentsPage /></ProtectedRoute>} />
                <Route path="reports" element={<ProtectedRoute roles={['super_admin', 'hr_manager']}><ReportsPage /></ProtectedRoute>} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
