import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, Tabs, Tab, Card, CardContent,
  FormControlLabel, Switch, Alert, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import UndoIcon from '@mui/icons-material/Undo';
import { leaveApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ApprovalStatus, { myPendingSlot, canApprove } from '../../components/common/ApprovalStatus';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import PermissionTab from './PermissionTab';
import usePermissionWindow from '../../hooks/usePermissionWindow';
import toast from 'react-hot-toast';

const EMPTY_FORM = { employee: '', leaveType: '', fromDate: '', toDate: '', reason: '', halfDay: false, halfDayType: 'first_half' };

const LeaveBalanceCards = ({ balance }) => (
  <Grid container spacing={1.5} sx={{ mb: 2 }}>
    {balance.map((b) => (
      <Grid item xs={6} sm={4} md={2} key={b.leaveType._id}>
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" noWrap display="block">{b.leaveType.leaveTypeName}</Typography>
            <Typography variant="h6" fontWeight={700} color={b.isPaid ? 'text.primary' : 'error.main'}>
              {b.isPaid ? b.remaining : b.taken}
              <Typography component="span" variant="caption" color="text.secondary">
                {b.isPaid ? ` / ${b.allocated} left` : ' taken (unpaid)'}
              </Typography>
            </Typography>
            {b.pending > 0 && <Typography variant="caption" color="warning.main">{b.pending} pending</Typography>}
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const LeaveRequests = ({ openApply, setOpenApply }) => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [balance, setBalance] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('all');
  const [openReject, setOpenReject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);
  const myEmployee = user?.employee?._id || user?.employee;

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, status: statusFilter };
      if (view === 'awaiting') params.awaiting = 'me';
      const { data } = await leaveApi.getAll(params);
      setLeaves(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, statusFilter, view]);

  const fetchBalance = useCallback((empId) => {
    if (!empId) return setBalance([]);
    leaveApi.getBalance(empId).then(({ data }) => setBalance(data.data)).catch(() => setBalance([]));
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
  useEffect(() => { fetchBalance(myEmployee); }, [fetchBalance, myEmployee]);

  useEffect(() => {
    leaveApi.getTypes().then(({ data }) => setLeaveTypes(data.data)).catch(() => {});
    if (isHR) employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
  }, [isHR]);

  // Balance shown in the apply dialog is for whoever the leave is for
  const [formBalance, setFormBalance] = useState([]);
  useEffect(() => {
    if (!openApply) return;
    const empId = isHR && form.employee ? form.employee : myEmployee;
    if (!empId) return setFormBalance([]);
    leaveApi.getBalance(empId).then(({ data }) => setFormBalance(data.data)).catch(() => setFormBalance([]));
  }, [openApply, form.employee, isHR, myEmployee]);
  const selectedBalance = formBalance.find((b) => b.leaveType._id === form.leaveType);

  const handleApply = async () => {
    if (!form.leaveType || !form.fromDate || (!form.halfDay && !form.toDate) || !form.reason) return toast.error('All fields required');
    setSaving(true);
    try {
      const payload = { ...form, toDate: form.halfDay ? form.fromDate : form.toDate };
      if (!isHR || !payload.employee) delete payload.employee;
      const { data } = await leaveApi.apply(payload);
      toast.success(`${data.message}. Sent to your reporting manager(s) for approval.`);
      setOpenApply(false);
      setForm(EMPTY_FORM);
      fetchLeaves();
      fetchBalance(myEmployee);
    } catch {}
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      const { data } = await leaveApi.approve(id);
      toast.success(data.message);
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

  const handleCancel = async (id) => {
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      fetchLeaves();
      fetchBalance(myEmployee);
    } catch {}
  };

  const columns = [
    {
      field: 'employee', headerName: 'Employee', minWidth: 160,
      renderCell: ({ row }) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-',
    },
    {
      field: 'leaveType', headerName: 'Leave Type', width: 140,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.leaveType?.leaveTypeName || '-'}</Typography>
          {row.leaveType?.isPaid === false && <Typography variant="caption" color="error.main">Unpaid</Typography>}
        </Box>
      ),
    },
    { field: 'fromDate', headerName: 'From', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'toDate', headerName: 'To', width: 110, renderCell: ({ value }) => formatDate(value) },
    {
      field: 'totalDays', headerName: 'Days', width: 90, align: 'center',
      renderCell: ({ row }) => row.halfDay ? `½ (${row.halfDayType === 'second_half' ? '2nd' : '1st'})` : row.totalDays,
    },
    { field: 'reason', headerName: 'Reason', minWidth: 150, renderCell: ({ value }) => value?.slice(0, 50) + (value?.length > 50 ? '...' : '') },
    { field: 'approvals', headerName: 'Approvals', width: 150, renderCell: ({ value }) => <ApprovalStatus approvals={value} /> },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, align: 'center',
      renderCell: ({ row }) => {
        const canDecide = myPendingSlot(user, row);
        const isMine = String(row.employee?._id) === String(myEmployee);
        return (
          <Box>
            {canDecide && (
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
            {isMine && row.status === 'pending' && (
              <Tooltip title="Cancel request">
                <IconButton size="small" onClick={() => handleCancel(row._id)}><UndoIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      {balance.length > 0 && <LeaveBalanceCards balance={balance} />}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {canApprove(user) && (
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)}>
            <ToggleButton value="all">All requests</ToggleButton>
            <ToggleButton value="awaiting">Awaiting my approval</ToggleButton>
          </ToggleButtonGroup>
        )}
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
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {isHR && (
              <Grid item xs={12}>
                <TextField select label="Employee (leave blank for yourself)" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                  <MenuItem value="">Myself</MenuItem>
                  {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField select label="Leave Type *" fullWidth size="small" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                <MenuItem value="">Select</MenuItem>
                {leaveTypes.map((lt) => <MenuItem key={lt._id} value={lt._id}>{lt.leaveTypeName}{lt.isPaid === false ? ' (unpaid)' : ''}</MenuItem>)}
              </TextField>
              {selectedBalance && (
                <Typography variant="caption" color={selectedBalance.isPaid ? 'text.secondary' : 'error.main'}>
                  {selectedBalance.isPaid
                    ? `${selectedBalance.remaining} day(s) available${selectedBalance.pending ? ` (${selectedBalance.pending} pending)` : ''}`
                    : 'Unpaid leave — salary will be deducted for these days'}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.halfDay} onChange={(e) => setForm({ ...form, halfDay: e.target.checked })} />}
                label="Half day"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={form.halfDay ? 'Date *' : 'From Date *'} type="date" fullWidth size="small" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              {form.halfDay ? (
                <TextField select label="Which half" fullWidth size="small" value={form.halfDayType} onChange={(e) => setForm({ ...form, halfDayType: e.target.value })}>
                  <MenuItem value="first_half">First half (morning)</MenuItem>
                  <MenuItem value="second_half">Second half (afternoon)</MenuItem>
                </TextField>
              ) : (
                <TextField label="To Date *" type="date" fullWidth size="small" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} InputLabelProps={{ shrink: true }} />
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason *" fullWidth size="small" multiline rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ py: 0 }}>Leave is approved only after all of the employee's reporting managers approve it.</Alert>
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
          <TextField label="Rejection Reason" fullWidth multiline rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenReject(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const LeavePage = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'permissions' ? 'permissions' : 'leave';
  const [openLeave, setOpenLeave] = useState(false);
  const [openPermission, setOpenPermission] = useState(false);
  const permissionWindow = usePermissionWindow();

  return (
    <Box>
      <PageHeader
        title="Leave & Permission"
        subtitle="Leave and short permissions need approval from all of the employee's reporting managers"
        action={tab === 'leave'
          ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenLeave(true)}>Apply Leave</Button>
          : (
            <Tooltip title={permissionWindow.open ? '' : permissionWindow.closedMessage}>
              <span>
                <Button variant="contained" startIcon={<AddIcon />} disabled={!permissionWindow.open} onClick={() => setOpenPermission(true)}>Request Permission</Button>
              </span>
            </Tooltip>
          )}
      />
      <Tabs value={tab} onChange={(e, v) => setParams(v === 'leave' ? {} : { tab: v })} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="leave" label="Leave Requests" />
        <Tab value="permissions" label="Permissions" />
      </Tabs>
      {tab === 'leave'
        ? <LeaveRequests openApply={openLeave} setOpenApply={setOpenLeave} />
        : <PermissionTab openApply={openPermission} setOpenApply={setOpenPermission} />}
    </Box>
  );
};

export default LeavePage;
