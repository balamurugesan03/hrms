import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import toast from 'react-hot-toast';
import { expenseApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import usePagination from '../../hooks/usePagination';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const EXPENSE_TYPES = ['travel', 'food', 'accommodation', 'communication', 'training', 'medical', 'other'];
const EMPTY = { employee: '', expenseType: 'travel', amount: '', description: '', expenseDate: new Date().toISOString().split('T')[0] };

const ExpensePage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [attachment, setAttachment] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await expenseApi.getAll({ page, limit, status: statusFilter });
      setExpenses(data.data);
      setTotal(data.pagination.total);
    } catch {} finally { setLoading(false); }
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { if (isHR) employeeApi.getAll({ limit: 200 }).then(({ data }) => setEmployees(data.data)).catch(() => {}); }, [isHR]);

  const handleSubmit = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (attachment) fd.append('attachment', attachment);
    try { await expenseApi.create(fd); toast.success('Expense submitted'); setOpenForm(false); fetchExpenses(); } catch {}
  };

  const handleApprove = async (id) => {
    try { await expenseApi.approve(id); toast.success('Expense approved'); fetchExpenses(); } catch {}
  };

  const handleReject = async () => {
    try { await expenseApi.reject(rejectId, { rejectionReason }); toast.success('Expense rejected'); setRejectId(null); fetchExpenses(); } catch {}
  };

  const columns = [
    { field: 'employee', headerName: 'Employee', minWidth: 160, renderCell: ({ value }) => value ? `${value.firstName} ${value.lastName}` : '-' },
    { field: 'expenseType', headerName: 'Type', width: 120, renderCell: ({ value }) => value?.replace('_', ' ') },
    { field: 'amount', headerName: 'Amount', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'expenseDate', headerName: 'Date', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    isHR && {
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => row.status === 'pending' ? (
        <Box>
          <Tooltip title="Approve"><IconButton size="small" color="success" onClick={() => handleApprove(row._id)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reject"><IconButton size="small" color="error" onClick={() => setRejectId(row._id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ) : null,
    },
  ].filter(Boolean);

  return (
    <Box>
      <PageHeader
        title="Expense Management"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)}>Submit Expense</Button>}
      />
      <Box sx={{ mb: 2 }}>
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 150 }} label="Status">
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
      </Box>
      <DataTable columns={columns} rows={expenses} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Submit Expense</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {isHR && (
              <Grid item xs={12}>
                <TextField select label="Employee" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                  <MenuItem value="">Select</MenuItem>
                  {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField select label="Expense Type" fullWidth size="small" value={form.expenseType} onChange={(e) => setForm({ ...form, expenseType: e.target.value })}>
                {EXPENSE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField label="Amount (₹) *" type="number" fullWidth size="small" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Date" type="date" fullWidth size="small" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><TextField label="Description *" fullWidth size="small" multiline rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined" size="small">
                Upload Receipt
                <input type="file" accept="image/*,.pdf" hidden onChange={(e) => setAttachment(e.target.files[0])} />
              </Button>
              {attachment && <Typography variant="caption" sx={{ ml: 1 }}>{attachment.name}</Typography>}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!rejectId} onClose={() => setRejectId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Reject Expense</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField label="Reason" fullWidth multiline rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleReject} variant="contained" color="error">Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensePage;
