import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Avatar, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { attendanceApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import StatCard from '../../components/common/StatCard';
import SearchBar from '../../components/common/SearchBar';
import useDebounce from '../../hooks/useDebounce';
import usePagination from '../../hooks/usePagination';
import { formatDate, ATTENDANCE_STATUS_OPTIONS } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AttendancePage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [empFilter, setEmpFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [openMark, setOpenMark] = useState(false);
  const [markForm, setMarkForm] = useState({ employee: '', date: new Date().toISOString().split('T')[0], checkIn: '', checkOut: '', attendanceStatus: 'present', notes: '' });

  const { page, limit, handlePageChange, handleLimitChange } = usePagination(20);
  const canMark = ['super_admin', 'hr_manager'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, month, year };
      if (empFilter) params.employee = empFilter;
      if (user?.role === 'employee' && user?.employee) params.employee = user.employee;
      const { data } = await attendanceApi.getAll(params);
      setRecords(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, month, year, empFilter, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (canMark) {
      attendanceApi.getToday().then(({ data }) => setTodayStats(data.data)).catch(() => {});
      employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
    }
  }, [canMark]);

  const handleMark = async () => {
    try {
      await attendanceApi.mark(markForm);
      toast.success('Attendance marked');
      setOpenMark(false);
      fetchData();
    } catch {}
  };

  const columns = [
    {
      field: 'employee', headerName: 'Employee', minWidth: 180,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 11 }}>
            {row.employee?.firstName?.[0]}{row.employee?.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>{`${row.employee?.firstName} ${row.employee?.lastName}`}</Typography>
            <Typography variant="caption" color="text.secondary">{row.employee?.employeeId}</Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'date', headerName: 'Date', width: 120, renderCell: ({ value }) => formatDate(value) },
    { field: 'checkIn', headerName: 'Check In', width: 100, renderCell: ({ value }) => value || '-' },
    { field: 'checkOut', headerName: 'Check Out', width: 100, renderCell: ({ value }) => value || '-' },
    { field: 'workingHours', headerName: 'Hours', width: 80, renderCell: ({ value }) => value ? `${value.toFixed(1)}h` : '-' },
    { field: 'attendanceStatus', headerName: 'Status', width: 130, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: 'notes', headerName: 'Notes', minWidth: 150, renderCell: ({ value }) => value || '-' },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance"
        subtitle="Track employee attendance records"
        action={canMark && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenMark(true)}>Mark Attendance</Button>}
      />

      {canMark && todayStats && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}><StatCard title="Total Employees" value={todayStats.totalEmployees} icon={<EventNoteIcon />} color="primary" /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="Present Today" value={todayStats.present} icon={<CheckCircleIcon />} color="success" /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="On Leave" value={todayStats.onLeave} icon={<CancelIcon />} color="warning" /></Grid>
          <Grid item xs={6} sm={3}><StatCard title="Late Arrivals" value={todayStats.late} icon={<ScheduleIcon />} color="error" /></Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {canMark && (
          <TextField select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} size="small" sx={{ width: 220 }} label="Employee">
            <MenuItem value="">All Employees</MenuItem>
            {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
          </TextField>
        )}
        <TextField select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} size="small" sx={{ width: 130 }} label="Month">
          {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField select value={year} onChange={(e) => setYear(parseInt(e.target.value))} size="small" sx={{ width: 100 }} label="Year">
          {[2022, 2023, 2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      <DataTable columns={columns} rows={records} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openMark} onClose={() => setOpenMark(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Mark Attendance</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select label="Employee *" fullWidth size="small" value={markForm.employee} onChange={(e) => setMarkForm({ ...markForm, employee: e.target.value })}>
                <MenuItem value="">Select Employee</MenuItem>
                {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName} (${e.employeeId})`}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Date" type="date" fullWidth size="small" value={markForm.date} onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Status" fullWidth size="small" value={markForm.attendanceStatus} onChange={(e) => setMarkForm({ ...markForm, attendanceStatus: e.target.value })}>
                {ATTENDANCE_STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField label="Check In (HH:mm)" fullWidth size="small" placeholder="09:00" value={markForm.checkIn} onChange={(e) => setMarkForm({ ...markForm, checkIn: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Check Out (HH:mm)" fullWidth size="small" placeholder="18:00" value={markForm.checkOut} onChange={(e) => setMarkForm({ ...markForm, checkOut: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Notes" fullWidth size="small" multiline rows={2} value={markForm.notes} onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenMark(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleMark} variant="contained">Mark Attendance</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
