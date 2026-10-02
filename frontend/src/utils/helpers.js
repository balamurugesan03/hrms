export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...options,
  });
};

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
};

export const formatNumber = (num) => {
  if (num == null) return '-';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const getStatusColor = (status) => {
  const map = {
    active: 'success', inactive: 'error', pending: 'warning',
    approved: 'success', rejected: 'error', cancelled: 'default',
    present: 'success', absent: 'error', late: 'warning',
    half_day: 'info', on_leave: 'warning', processed: 'info',
    paid: 'success', draft: 'default', available: 'success',
    assigned: 'primary', open: 'success', closed: 'error', on_hold: 'warning',
  };
  return map[status] || 'default';
};

export const getInitials = (name = '') => {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'late', label: 'Late' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'holiday', label: 'Holiday' },
];

export const truncate = (str, length = 50) => {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}...` : str;
};

export const getApiUrl = (path) => `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${path}`;
