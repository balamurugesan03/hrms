import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip, Card, CardContent,
  List, ListItem, ListItemText, Divider, Alert, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaidIcon from '@mui/icons-material/Paid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { payrollApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, formatDate, MONTHS, downloadBlob } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const fmtMins = (mins = 0) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

// Statutory amounts — same formulas as the server (services/payrollCalculator.js)
const isDA = (name = '') => /^\s*(da\b|dearness)/i.test(name);
const ESI_ROW = /^ESI\b/i;
const statutoryFor = ({ basicSalary, allowances, fixedGross, salaryEarned, esiRule }) => {
  const basicDA = (Number(basicSalary) || 0) + allowances.filter((a) => isDA(a.name)).reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const esi = esiRule === 'new'
    ? (basicDA > 21000 ? 0 : basicDA * 0.0075)
    : (fixedGross > 21000 ? 0 : salaryEarned * 0.0075);
  return {
    basicDA, esiRule, esi: Math.round(esi),
    contributions: [
      { name: 'Bonus (8.33%)', amount: Math.round(basicDA * 0.0833) },
      { name: 'EL', amount: Math.round((basicDA / 26) * 1.3) },
      { name: 'Gratuity', amount: Math.round(((basicDA / 26) * 15) / 12) },
    ],
  };
};

// Default structure from the employee's monthly salary (editable)
const structureFor = (salary = 0) => ({
  basicSalary: Math.round(salary * 0.5),
  allowances: [
    { name: 'HRA', amount: Math.round(salary * 0.2) },
    { name: 'Special Allowance', amount: Math.round(salary * 0.25) },
    { name: 'Transport', amount: Math.round(salary * 0.05) },
  ],
  deductions: [
    { name: 'PF (12%)', amount: Math.round(salary * 0.5 * 0.12) },
    { name: 'Professional Tax', amount: salary ? 200 : 0 },
  ],
});

const newForm = () => ({
  employee: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  ...structureFor(0), overtimePay: 0, remarks: '',
});

// Attendance / leave / permission breakdown that drives Loss of Pay
const BreakdownGrid = ({ s }) => {
  const items = [
    ['Days in period', s.daysInPeriod],
    ['Working days', s.workingDays],
    ['Weekly off + Holidays', `${s.weeklyOffs ?? 0} + ${s.holidays ?? 0}`],
    ['Present', s.presentDays],
    ['Late days', s.lateDays],
    ['Half days', s.halfDays],
    ['Paid leave', s.paidLeaveDays],
    ['Unpaid leave', s.unpaidLeaveDays, 'error.main'],
    ['Absent', s.absentDays, 'error.main'],
    ['Permission used', fmtMins(s.permissionMinutes || 0)],
    ['Permission → half-day', s.permissionHalfDays, 'error.main'],
    ...(s.notEmployedDays ? [['Before joining / after exit', s.notEmployedDays, 'error.main']] : []),
    ['LOP days', s.lopDays, 'error.main'],
  ];
  return (
    <Grid container spacing={1}>
      {items.map(([label, value, color]) => (
        <Grid item xs={6} sm={3} key={label}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'action.hover', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>{label}</Typography>
            <Typography fontWeight={700} color={Number(value) > 0 && color ? color : 'text.primary'}>{value ?? 0}</Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

const AmountRows = ({ title, rows, onChange }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
      <Button size="small" onClick={() => onChange([...rows, { name: '', amount: 0 }])}>+ Add</Button>
    </Box>
    {rows.map((r, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField size="small" label="Name" value={r.name} sx={{ flex: 2 }}
          onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
        <TextField size="small" label="Amount" type="number" value={r.amount} sx={{ flex: 1 }}
          onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))} />
        <IconButton size="small" onClick={() => onChange(rows.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>
      </Box>
    ))}
  </Box>
);

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
  const [form, setForm] = useState(newForm);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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
  // Reload on every open so new employees / salary changes are picked up
  useEffect(() => {
    if (isHR && openProcess) employeeApi.getAll({ limit: 200, status: 'active' }).then(({ data }) => setEmployees(data.data)).catch(() => {});
  }, [isHR, openProcess]);

  // Load attendance / leave breakdown whenever employee or period changes
  useEffect(() => {
    setPreview(null);
    if (!openProcess || !form.employee || !form.month || !form.year) return undefined;
    let stale = false; // ignore a slower response for a previously selected employee / month
    setPreviewLoading(true);
    payrollApi.preview({ employee: form.employee, month: form.month, year: form.year })
      .then(({ data }) => { if (!stale) setPreview(data.data); })
      .catch(() => {})
      .finally(() => { if (!stale) setPreviewLoading(false); });
    return () => { stale = true; };
  }, [openProcess, form.employee, form.month, form.year]);

  // Start fresh next time so the previous employee's figures are not shown
  const closeProcess = () => {
    setOpenProcess(false);
    setForm(newForm());
  };

  const selectEmployee = (id) => {
    const emp = employees.find((e) => e._id === id);
    setForm((f) => ({ ...f, employee: id, ...structureFor(emp?.salary || 0) }));
  };

  // Live calculation (same formula as the server)
  const totalAllowances = form.allowances.reduce((n, a) => n + (Number(a.amount) || 0), 0);
  // ESI is calculated automatically, so a manual ESI row is ignored (as on the server)
  const otherDeductions = form.deductions.filter((d) => !ESI_ROW.test(d.name || '')).reduce((n, d) => n + (Number(d.amount) || 0), 0);
  const fixedGross = (Number(form.basicSalary) || 0) + totalAllowances;
  const gross = fixedGross + (Number(form.overtimePay) || 0);
  const s = preview?.summary;
  const perDay = s ? Math.round((fixedGross / s.daysInPeriod) * 100) / 100 : 0;
  const lopDeduction = s ? Math.round(perDay * s.lopDays) : 0;
  const stat = statutoryFor({
    basicSalary: form.basicSalary, allowances: form.allowances, fixedGross, salaryEarned: Math.max(0, gross - lopDeduction),
    esiRule: preview?.esiRule || 'old', // decided by the server from the joining date
  });
  const net = Math.max(0, gross - otherDeductions - stat.esi - lopDeduction);
  const locked = preview?.existingStatus && preview.existingStatus !== 'draft';

  const handleProcess = async () => {
    if (!form.employee || form.basicSalary === '') return toast.error('Select an employee and enter basic salary');
    setSaving(true);
    try {
      await payrollApi.process(form);
      toast.success('Payroll processed');
      setOpenProcess(false);
      setForm(newForm());
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

  const handleDownloadPayslip = async (row) => {
    try {
      const { data } = await payrollApi.downloadPayslip(row._id);
      downloadBlob(data, `Payslip_${row.employee?.employeeId || 'EMP'}_${MONTHS[row.month - 1]}_${row.year}.pdf`);
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
    { field: 'grossSalary', headerName: 'Gross', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    {
      field: 'lopDays', headerName: 'LOP', width: 120,
      renderCell: ({ row }) => row.lopDays
        ? <Typography variant="body2" color="error.main">{row.lopDays}d · -{formatCurrency(row.lopDeduction)}</Typography>
        : '-',
    },
    { field: 'totalDeductions', headerName: 'Deductions', width: 110, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'netSalary', headerName: 'Net Salary', width: 120, renderCell: ({ value }) => <Typography fontWeight={600} color="success.main">{formatCurrency(value)}</Typography> },
    { field: 'status', headerName: 'Status', width: 110, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 140, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="View Payslip"><IconButton size="small" color="info" onClick={() => handleViewPayslip(row._id)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Download PDF"><IconButton size="small" color="primary" onClick={() => handleDownloadPayslip(row)}><PictureAsPdfIcon fontSize="small" /></IconButton></Tooltip>
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
        subtitle="Salary is adjusted automatically for leave, absence, half-days and permission overuse"
        action={isHR && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenProcess(true)}>Process Payroll</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} size="small" sx={{ width: 130 }} label="Month">
          {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <TextField select value={year} onChange={(e) => setYear(parseInt(e.target.value))} size="small" sx={{ width: 100 }} label="Year">
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      <DataTable columns={columns} rows={records} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      {/* Process Dialog */}
      <Dialog open={openProcess} onClose={closeProcess} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Process Payroll</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Employee *" fullWidth size="small" value={form.employee} onChange={(e) => selectEmployee(e.target.value)}>
                <MenuItem value="">Select Employee</MenuItem>
                {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName} (${e.employeeId})`}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select label="Month" fullWidth size="small" value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}>
                {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField label="Year" type="number" fullWidth size="small" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} />
            </Grid>

            <Grid item xs={12}>
              {previewLoading && <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={24} /></Box>}
              {!previewLoading && s && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Attendance, leave & permission for {MONTHS[form.month - 1]} {form.year} ({formatDate(s.periodStart)} – {formatDate(s.periodEnd)})
                    </Typography>
                    <BreakdownGrid s={s} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      LOP = absent days + unpaid leave + uncovered half-days + permissions beyond the monthly limit (½ day each).
                    </Typography>
                  </CardContent>
                </Card>
              )}
              {!previewLoading && s && !s.attendanceRecords && s.absentDays > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No attendance records for this month — all {s.absentDays} past working day(s) are counted as absent (LOP). Mark attendance first if this is not correct.
                </Alert>
              )}
              {locked && <Alert severity="warning" sx={{ mt: 1 }}>Payroll for this month is already {preview.existingStatus}.</Alert>}
              {preview?.existingStatus === 'draft' && <Alert severity="info" sx={{ mt: 1 }}>A draft exists for this month — processing will replace it.</Alert>}
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField label="Basic Salary *" type="number" fullWidth size="small" sx={{ mb: 2 }} value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: parseFloat(e.target.value) || 0 })} />
              <AmountRows title="Allowances" rows={form.allowances} onChange={(allowances) => setForm({ ...form, allowances })} />
              <TextField label="Overtime Pay" type="number" fullWidth size="small" value={form.overtimePay} onChange={(e) => setForm({ ...form, overtimePay: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <AmountRows title="Deductions" rows={form.deductions} onChange={(deductions) => setForm({ ...form, deductions })} />
              <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {[
                    ['Gross', formatCurrency(gross)],
                    ['Deductions', `-${formatCurrency(otherDeductions)}`],
                    [`ESI 0.75% (${stat.esiRule === 'new' ? 'Basic + DA' : 'salary earned'})`, `-${formatCurrency(stat.esi)}`],
                    [`Loss of Pay (${s?.lopDays ?? 0} days × ${formatCurrency(Math.round(perDay))})`, `-${formatCurrency(lopDeduction)}`, 'error.main'],
                  ].map(([label, value, color]) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" color={color}>{value}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight={700}>Net Salary</Typography>
                    <Typography fontWeight={700} color="success.main">{formatCurrency(net)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Employer contributions on Basic + DA {formatCurrency(stat.basicDA)} (not part of net)
                  </Typography>
                  {stat.contributions.map((c) => (
                    <Box key={c.name} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">{c.name}</Typography>
                      <Typography variant="body2">{formatCurrency(c.amount)}</Typography>
                    </Box>
                  ))}
                  {s && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {stat.esiRule === 'new'
                        ? `Joined on/after ${formatDate(preview.esiNewRuleFrom)}: ESI = 0 if Basic + DA > ₹21,000, else (Basic + DA) × 0.75%.`
                        : `Joined before ${formatDate(preview.esiNewRuleFrom)}: ESI = 0 if gross > ₹21,000, else salary earned × 0.75%.`}
                      {' '}DA = an allowance named "DA" or "Dearness Allowance".
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Remarks" fullWidth size="small" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeProcess} variant="outlined">Cancel</Button>
          <Button onClick={handleProcess} variant="contained" disabled={saving || !form.employee || locked}>{saving ? 'Processing...' : 'Process'}</Button>
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

            {viewPayslip.payableDays != null && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Attendance & Leave</Typography>
                {viewPayslip.periodStart && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Period: {formatDate(viewPayslip.periodStart)} – {formatDate(viewPayslip.periodEnd)}
                  </Typography>
                )}
                {/* Payrolls before the 26–25 cycle were calendar months */}
                <BreakdownGrid s={{ ...viewPayslip, daysInPeriod: viewPayslip.daysInPeriod ?? new Date(viewPayslip.year, viewPayslip.month, 0).getDate() }} />
              </Box>
            )}

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
              {viewPayslip.overtimePay > 0 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText primary="Overtime Pay" />
                  <Typography>{formatCurrency(viewPayslip.overtimePay)}</Typography>
                </ListItem>
              )}
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

            {viewPayslip.contributions?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Employer Contributions (Basic + DA {formatCurrency(viewPayslip.basicDA)})</Typography>
                <List dense disablePadding>
                  {viewPayslip.contributions.map((c, i) => (
                    <ListItem key={i} sx={{ px: 0 }}>
                      <ListItemText primary={c.name} />
                      <Typography>{formatCurrency(c.amount)}</Typography>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
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
