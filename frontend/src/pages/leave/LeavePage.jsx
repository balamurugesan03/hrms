import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { leaveApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const EMPTY_FORM = { employee: '', leaveType: '', fromDate: '', toDate: '', reason: '', halfDay: false };

const LeavePage = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [openApply, setOpenApply] = useState(false);
  const [openReject, setOpenReject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await leaveApi.getAll({ page, limit, status: statusFilter });
      setLeaves(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  useEffect(() => {
    leaveApi.getTypes().then(({ data }) => setLeaveTypes(data.data)).catch(() => {});
    if (isHR) employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
  }, [isHR]);

  const handleApply = async () => {
    if (!form.leaveType || !form.fromDate || !form.toDate || !form.reason) return toast.error('All fields required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!isHR) delete payload.employee;
      await leaveApi.apply(payload);
      toast.success('Leave application submitted');
      setOpenApply(false);
      setForm(EMPTY_FORM);
      fetchLeaves();
    } catch {}
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await leaveApi.approve(id);
      toast.success('Leave approved');
      fetchLeaves();
    } catch {}
  };

  const handleReject = async () => {
    try {
      await leaveApi.reject(openReject, { rejectionReason });
      toast.success('Leave rejected');
      setOpenReject(null);
      setRejectionReason('');
      fetchLeaves();
    } catch {}
  };

  const columns = [
    {
      field: 'employee', headerName: 'Employee', minWidth: 160,
      renderCell: ({ row }) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-',
    },
    { field: 'leaveType', headerName: 'Leave Type', width: 130, renderCell: ({ value }) => value?.leaveTypeName || '-' },
    { field: 'fromDate', headerName: 'From', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'toDate', headerName: 'To', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'totalDays', headerName: 'Days', width: 70, align: 'center' },
    { field: 'reason', headerName: 'Reason', minWidth: 150, renderCell: ({ value }) => value?.slice(0, 50) + (value?.length > 50 ? '...' : '') },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          {isHR && row.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" color="success" onClick={() => handleApprove(row._id)}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" color="error" onClick={() => setOpenReject(row._id)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Leave Management"
        subtitle="Manage employee leave requests"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenApply(true)}>Apply Leave</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 150 }} label="Status">
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </TextField>
      </Box>

      <DataTable columns={columns} rows={leaves} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      {/* Apply Leave Dialog */}
      <Dialog open={openApply} onClose={() => setOpenApply(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Apply for Leave</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {isHR && (
              <Grid item xs={12}>
                <TextField select label="Employee" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                  <MenuItem value="">Select Employee</MenuItem>
                  {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField select label="Leave Type *" fullWidth size="small" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                <MenuItem value="">Select</MenuItem>
                {leaveTypes.map((lt) => <MenuItem key={lt._id} value={lt._id}>{lt.leaveTypeName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="From Date *" type="date" fullWidth size="small" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="To Date *" type="date" fullWidth size="small" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason *" fullWidth size="small" multiline rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenApply(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleApply} variant="contained" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!openReject} onClose={() => setOpenReject(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Reject Leave</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField label="Rejection Reason" fullWidth multiline rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenReject(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeavePage;
