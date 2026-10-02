import api from './axiosInstance';

// Department API
export const departmentApi = {
  getAll: (params) => api.get('/departments', { params }),
  getDropdown: () => api.get('/departments/dropdown'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Designation API
export const designationApi = {
  getAll: (params) => api.get('/designations', { params }),
  getDropdown: (department) => api.get('/designations/dropdown', { params: { department } }),
  getById: (id) => api.get(`/designations/${id}`),
  create: (data) => api.post('/designations', data),
  update: (id, data) => api.put(`/designations/${id}`, data),
  delete: (id) => api.delete(`/designations/${id}`),
};

// Employee API
export const employeeApi = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  getProfile: () => api.get('/employees/profile'),
  create: (formData) => api.post('/employees', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/employees/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/employees/${id}`),
  export: (params) => api.get('/employees/export', { params, responseType: 'blob' }),
  import: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/employees/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Attendance API
export const attendanceApi = {
  mark: (data) => api.post('/attendance', data),
  getAll: (params) => api.get('/attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  getMonthly: (params) => api.get('/attendance/monthly-report', { params }),
  bulk: (data) => api.post('/attendance/bulk', data),
};

// Leave API
export const leaveApi = {
  getAll: (params) => api.get('/leave', { params }),
  getById: (id) => api.get(`/leave/${id}`),
  apply: (data) => api.post('/leave', data),
  approve: (id) => api.put(`/leave/${id}/approve`),
  reject: (id, data) => api.put(`/leave/${id}/reject`, data),
  cancel: (id) => api.put(`/leave/${id}/cancel`),
  getBalance: (empId) => api.get(`/leave/balance/${empId}`),
  getTypes: () => api.get('/leave/types'),
  createType: (data) => api.post('/leave/types', data),
};

// Holiday API
export const holidayApi = {
  getAll: (params) => api.get('/holidays', { params }),
  getById: (id) => api.get(`/holidays/${id}`),
  getUpcoming: () => api.get('/holidays/upcoming'),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// Shift API
export const shiftApi = {
  getAll: () => api.get('/shifts'),
  getById: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  assign: (data) => api.post('/shifts/assign', data),
};

// Payroll API
export const payrollApi = {
  getAll: (params) => api.get('/payroll', { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  process: (data) => api.post('/payroll', data),
  markPaid: (id, data) => api.put(`/payroll/${id}/mark-paid`, data),
  getSummary: (params) => api.get('/payroll/summary', { params }),
};

// Expense API
export const expenseApi = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (formData) => api.post('/expenses', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve: (id) => api.put(`/expenses/${id}/approve`),
  reject: (id, data) => api.put(`/expenses/${id}/reject`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Asset API
export const assetApi = {
  getAll: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  assign: (id, data) => api.put(`/assets/${id}/assign`, data),
  return: (id) => api.put(`/assets/${id}/return`),
  delete: (id) => api.delete(`/assets/${id}`),
};

// Recruitment API
export const recruitmentApi = {
  getAll: (params) => api.get('/recruitment', { params }),
  getById: (id) => api.get(`/recruitment/${id}`),
  create: (data) => api.post('/recruitment', data),
  update: (id, data) => api.put(`/recruitment/${id}`, data),
  delete: (id) => api.delete(`/recruitment/${id}`),
  addCandidate: (id, formData) => api.post(`/recruitment/${id}/candidates`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStage: (id, data) => api.put(`/recruitment/${id}/candidates/stage`, data),
};

// Performance API
export const performanceApi = {
  getAll: (params) => api.get('/performance', { params }),
  getById: (id) => api.get(`/performance/${id}`),
  create: (data) => api.post('/performance', data),
  update: (id, data) => api.put(`/performance/${id}`, data),
  acknowledge: (id, data) => api.put(`/performance/${id}/acknowledge`, data),
};

// Document API
export const documentApi = {
  getAll: (empId) => api.get(`/documents/${empId}`),
  upload: (formData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (empId, docId) => api.delete(`/documents/${empId}/${docId}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getAttendanceTrend: (params) => api.get('/dashboard/attendance-trend', { params }),
  getEmployeeGrowth: () => api.get('/dashboard/employee-growth'),
  getLeaveAnalytics: () => api.get('/dashboard/leave-analytics'),
  getPayrollAnalytics: () => api.get('/dashboard/payroll-analytics'),
};

// Report API
export const reportApi = {
  employees: (params) => api.get('/reports/employees', { params, responseType: params?.format === 'excel' ? 'blob' : 'json' }),
  attendance: (params) => api.get('/reports/attendance', { params, responseType: params?.format === 'excel' ? 'blob' : 'json' }),
  leave: (params) => api.get('/reports/leave', { params, responseType: params?.format === 'excel' ? 'blob' : 'json' }),
  payroll: (params) => api.get('/reports/payroll', { params, responseType: params?.format === 'excel' ? 'blob' : 'json' }),
  assets: (params) => api.get('/reports/assets', { params, responseType: params?.format === 'excel' ? 'blob' : 'json' }),
};
