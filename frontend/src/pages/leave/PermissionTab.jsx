import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tooltip, Alert, Chip,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import UndoIcon from '@mui/icons-material/Undo';
import { permissionApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import ApprovalStatus, { myPendingSlot, canApprove } from '../../components/common/ApprovalStatus';
import usePagination from '../../hooks/usePagination';
import usePermissionWindow, { fmt12 } from '../../hooks/usePermissionWindow';
import PermissionHoursCard from '../../components/dashboard/PermissionHoursCard';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const toMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fmtMins = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};
const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => dateStr(new Date());

const EMPTY = { employee: '', date: todayStr(), fromTime: '', toTime: '', reason: '' };

const PermissionTab = ({ openApply, setOpenApply }) => {
  const { user } = useAuth();
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);
  const myEmployee = user?.employee?._id || user?.employee;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [myQuota, setMyQuota] = useState(null);
  const [formQuota, setFormQuota] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, status: statusFilter };
      if (view === 'awaiting') params.awaiting = 'me';
      const { data } = await permissionApi.getAll(params);
      setRows(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, statusFilter, view]);

  const fetchMyQuota = useCallback(() => {
    if (!myEmployee) return;
    permissionApi.getQuota().then(({ data }) => setMyQuota(data.data)).catch(() => {});
  }, [myEmployee]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchMyQuota(); }, [fetchMyQuota]);
  useEffect(() => {
    if (isHR) employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
  }, [isHR]);

  // Quota for the month / person the request is for
  useEffect(() => {
    if (!openApply || !form.date) return;
    const params = { date: form.date, ...(isHR && form.employee && { employee: form.employee }) };
    if (!params.employee && !myEmployee) return setFormQuota(null);
    permissionApi.getQuota(params).then(({ data }) => setFormQuota(data.data)).catch(() => setFormQuota(null));
  }, [openApply, form.date, form.employee, isHR, myEmployee]);

  const { open: windowOpen, cutoff, closedMessage } = usePermissionWindow();
  const minDate = todayStr();

  // Never preselect a date that can no longer be requested
  useEffect(() => {
    if (openApply && form.date < minDate) setForm((f) => ({ ...f, date: minDate }));
  }, [openApply, form.date, minDate]);

  const minutes = Math.max(0, toMinutes(form.toTime) - toMinutes(form.fromTime));
  const tooLong = formQuota && minutes > formQuota.maxPerRequest;
  const becomesHalfDay = formQuota && minutes > 0 && !tooLong && minutes > formQuota.remainingMinutes;

  const handleApply = async () => {
    if (!form.date || !form.fromTime || !form.toTime || !form.reason.trim()) return toast.error('All fields are required');
    if (minutes <= 0) return toast.error('To time must be after from time');
    if (!windowOpen) return toast.error(closedMessage);
    if (form.date < minDate) return toast.error('Permission cannot be requested for a past date');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!isHR || !payload.employee) delete payload.employee;
      const { data } = await permissionApi.apply(payload);
      toast.success(data.message);
      setOpenApply(false);
      setForm(EMPTY);
      fetchRows();
      fetchMyQuota();
    } catch {}
    finally { setSaving(false); }
  };

  const decide = async (id, approve) => {
    try {
      const { data } = approve ? await permissionApi.approve(id) : await permissionApi.reject(id, { remarks });
      toast.success(data.message);
      setRejectId(null);
      setRemarks('');
      fetchRows();
    } catch {}
  };

  const cancel = async (id) => {
    try {
      await permissionApi.cancel(id);
      toast.success('Permission cancelled');
      fetchRows();
      fetchMyQuota();
    } catch {}
  };

  const columns = [
    { field: 'employee', headerName: 'Employee', minWidth: 160, renderCell: ({ value }) => value ? `${value.firstName} ${value.lastName}` : '-' },
    { field: 'date', headerName: 'Date', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'time', headerName: 'Time', width: 120, renderCell: ({ row }) => `${row.fromTime} – ${row.toTime}` },
    { field: 'minutes', headerName: 'Duration', width: 90, renderCell: ({ value }) => fmtMins(value) },
    {
      field: 'type', headerName: 'Counted as', width: 150,
      renderCell: ({ value }) => value === 'half_day'
        ? <Tooltip title="Monthly permission limit exceeded — half-day Loss of Pay"><Chip size="small" color="error" variant="outlined" label="Half-day (LOP)" /></Tooltip>
        : <Chip size="small" color="info" variant="outlined" label="Permission" />,
    },
    { field: 'reason', headerName: 'Reason', minWidth: 160, renderCell: ({ value }) => value?.slice(0, 50) + (value?.length > 50 ? '...' : '') },
    { field: 'approvals', headerName: 'Approvals', width: 150, renderCell: ({ value }) => <ApprovalStatus approvals={value} /> },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          {myPendingSlot(user, row) && (
            <>
              <Tooltip title="Approve"><IconButton size="small" color="success" onClick={() => decide(row._id, true)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Reject"><IconButton size="small" color="error" onClick={() => setRejectId(row._id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
          {String(row.employee?._id) === String(myEmployee) && row.status === 'pending' && (
            <Tooltip title="Cancel request"><IconButton size="small" onClick={() => cancel(row._id)}><UndoIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {myQuota && <PermissionHoursCard quota={myQuota} showAction={false} sx={{ mb: 2 }} />}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openApply} onClose={() => setOpenApply(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Request Permission</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {isHR && (
              <Grid item xs={12}>
                <TextField select label="Employee (leave blank for yourself)" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                  <MenuItem value="">Myself</MenuItem>
                  {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField
                label="Date *" type="date" fullWidth size="small" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }} inputProps={{ min: minDate }}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="From *" type="time" fullWidth size="small" value={form.fromTime} onChange={(e) => setForm({ ...form, fromTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="To *" type="time" fullWidth size="small" value={form.toTime} onChange={(e) => setForm({ ...form, toTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason *" fullWidth size="small" multiline rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity={windowOpen ? 'info' : 'error'} sx={{ py: 0, mb: 1 }}>
                {windowOpen
                  ? `Permission requests can be submitted only before ${fmt12(cutoff)}.`
                  : `Permission requests close at ${fmt12(cutoff)}. Please try again tomorrow before ${fmt12(cutoff)}.`}
              </Alert>
              {formQuota && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Duration: <b>{minutes ? fmtMins(minutes) : '—'}</b> · Remaining this month: <b>{fmtMins(formQuota.remainingMinutes)}</b> of {fmtMins(formQuota.quotaMinutes)}
                </Typography>
              )}
              {tooLong && <Alert severity="error">Permission cannot be longer than {fmtMins(formQuota.maxPerRequest)}. Please apply for leave instead.</Alert>}
              {becomesHalfDay && (
                <Alert severity="warning">
                  This exceeds the remaining monthly permission ({fmtMins(formQuota.remainingMinutes)} left).
                  It will be submitted as a <b>half-day leave</b> and half a day's salary will be deducted (Loss of Pay).
                </Alert>
              )}
              {!tooLong && !becomesHalfDay && <Alert severity="info" sx={{ py: 0 }}>Needs approval from all of the employee's reporting managers.</Alert>}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenApply(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleApply} variant="contained" color={becomesHalfDay ? 'warning' : 'primary'} disabled={saving || tooLong || !windowOpen}>
            {saving ? 'Submitting...' : becomesHalfDay ? 'Submit as Half-day' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!rejectId} onClose={() => setRejectId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Reject Permission</DialogTitle>
        <DialogContent>
          <TextField label="Reason" fullWidth multiline rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectId(null)} variant="outlined">Cancel</Button>
          <Button onClick={() => decide(rejectId, false)} variant="contained" color="error">Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PermissionTab;
