import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, Card, CardContent,
  List, ListItem, ListItemText, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaidIcon from '@mui/icons-material/Paid';
import { payrollApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, MONTHS } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PayrollPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [openProcess, setOpenProcess] = useState(false);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [form, setForm] = useState({
    employee: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basicSalary: '', allowances: [{ name: 'HRA', amount: 0 }, { name: 'Transport', amount: 0 }],
    deductions: [{ name: 'PF', amount: 0 }, { name: 'ESI', amount: 0 }],
    overtimePay: 0, remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);

  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await payrollApi.getAll({ page, limit, month, year });
      setRecords(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, month, year]);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);
  useEffect(() => {
    if (isHR) employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
  }, [isHR]);

  const handleProcess = async () => {
    setSaving(true);
    try {
      await payrollApi.process(form);
      toast.success('Payroll processed');
      setOpenProcess(false);
      fetchPayrolls();
    } catch {}
    finally { setSaving(false); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await payrollApi.markPaid(id, { paymentMode: 'bank_transfer' });
      toast.success('Marked as paid');
      fetchPayrolls();
    } catch {}
  };

  const handleViewPayslip = async (id) => {
    const { data } = await payrollApi.getById(id);
    setViewPayslip(data.data);
  };

  const columns = [
    { field: 'employee', headerName: 'Employee', minWidth: 160, renderCell: ({ value }) => value ? `${value.firstName} ${value.lastName}` : '-' },
    { field: 'month', headerName: 'Month', width: 90, renderCell: ({ value }) => MONTHS[value - 1] },
    { field: 'year', headerName: 'Year', width: 70 },
    { field: 'basicSalary', headerName: 'Basic', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'grossSalary', headerName: 'Gross', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'totalDeductions', headerName: 'Deductions', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'netSalary', headerName: 'Net Salary', width: 120, renderCell: ({ value }) => <Typography fontWeight={600} color="success.main">{formatCurrency(value)}</Typography> },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 110, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="View Payslip"><IconButton size="small" color="info" onClick={() => handleViewPayslip(row._id)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          {isHR && row.status === 'processed' && (
            <Tooltip title="Mark Paid"><IconButton size="small" color="success" onClick={() => handleMarkPaid(row._id)}><PaidIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Payroll Management"
        subtitle="Process and manage employee salaries"
        action={isHR && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenProcess(true)}>Process Payroll</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} size="small" sx={{ width: 130 }} label="Month">
          {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField select value={year} onChange={(e) => setYear(parseInt(e.target.value))} size="small" sx={{ width: 100 }} label="Year">
          {[2022, 2023, 2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      <DataTable columns={columns} rows={records} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      {/* Process Dialog */}
      <Dialog open={openProcess} onClose={() => setOpenProcess(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Process Payroll</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select label="Employee *" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                <MenuItem value="">Select Employee</MenuItem>
                {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName} (${e.employeeId})`}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Month" fullWidth size="small" value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}>
                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Year" type="number" fullWidth size="small" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Basic Salary *" type="number" fullWidth size="small" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: parseFloat(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="HRA" type="number" fullWidth size="small" value={form.allowances[0]?.amount || 0} onChange={(e) => setForm({ ...form, allowances: [{ name: 'HRA', amount: parseFloat(e.target.value) }, form.allowances[1]] })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Transport" type="number" fullWidth size="small" value={form.allowances[1]?.amount || 0} onChange={(e) => setForm({ ...form, allowances: [form.allowances[0], { name: 'Transport', amount: parseFloat(e.target.value) }] })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="PF Deduction" type="number" fullWidth size="small" value={form.deductions[0]?.amount || 0} onChange={(e) => setForm({ ...form, deductions: [{ name: 'PF', amount: parseFloat(e.target.value) }, form.deductions[1]] })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="ESI Deduction" type="number" fullWidth size="small" value={form.deductions[1]?.amount || 0} onChange={(e) => setForm({ ...form, deductions: [form.deductions[0], { name: 'ESI', amount: parseFloat(e.target.value) }] })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Overtime Pay" type="number" fullWidth size="small" value={form.overtimePay} onChange={(e) => setForm({ ...form, overtimePay: parseFloat(e.target.value) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenProcess(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleProcess} variant="contained" disabled={saving}>{saving ? 'Processing...' : 'Process'}</Button>
        </DialogActions>
      </Dialog>

      {/* Payslip Dialog */}
      {viewPayslip && (
        <Dialog open={!!viewPayslip} onClose={() => setViewPayslip(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={600}>
            Payslip — {MONTHS[viewPayslip.month - 1]} {viewPayslip.year}
          </DialogTitle>
          <DialogContent>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>{viewPayslip.employee?.firstName} {viewPayslip.employee?.lastName}</Typography>
                <Typography variant="body2" color="text.secondary">{viewPayslip.employee?.employeeId}</Typography>
              </CardContent>
            </Card>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Earnings</Typography>
            <List dense disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary="Basic Salary" />
                <Typography fontWeight={500}>{formatCurrency(viewPayslip.basicSalary)}</Typography>
              </ListItem>
              {viewPayslip.allowances?.map((a, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemText primary={a.name} />
                  <Typography>{formatCurrency(a.amount)}</Typography>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Deductions</Typography>
            <List dense disablePadding>
              {viewPayslip.deductions?.map((d, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemText primary={d.name} />
                  <Typography color="error.main">-{formatCurrency(d.amount)}</Typography>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={700}>Net Salary</Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(viewPayslip.netSalary)}</Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setViewPayslip(null)} variant="contained">Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default PayrollPage;
