import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Rating, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import { performanceApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY = { employee: '', reviewPeriod: '', reviewDate: '', overallRating: 3, strengths: '', improvements: '', comments: '' };

const PerformancePage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [viewReview, setViewReview] = useState(null);
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try { const { data } = await performanceApi.getAll({ page, limit }); setReviews(data.data); setTotal(data.pagination.total); } catch {} finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { if (isHR) employeeApi.getAll({ limit: 200 }).then(({ data }) => setEmployees(data.data)).catch(() => {}); }, [isHR]);

  const handleSave = async () => {
    try { await performanceApi.create(form); toast.success('Review created'); setOpenForm(false); fetchReviews(); } catch {}
  };

  const handleAcknowledge = async (id) => {
    try { await performanceApi.acknowledge(id, {}); toast.success('Review acknowledged'); fetchReviews(); } catch {}
  };

  const columns = [
    { field: 'employee', headerName: 'Employee', minWidth: 160, renderCell: ({ value }) => value ? `${value.firstName} ${value.lastName}` : '-' },
    { field: 'reviewPeriod', headerName: 'Period', width: 130 },
    { field: 'reviewDate', headerName: 'Review Date', width: 120, renderCell: ({ value }) => formatDate(value) },
    { field: 'overallRating', headerName: 'Rating', width: 100, align: 'center', renderCell: ({ value }) => <Rating value={value} readOnly size="small" /> },
    { field: 'status', headerName: 'Status', width: 120, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="View"><IconButton size="small" color="info" onClick={async () => { const { data } = await performanceApi.getById(row._id); setViewReview(data.data); }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          {row.status === 'submitted' && !isHR && (
            <Tooltip title="Acknowledge"><IconButton size="small" color="success" onClick={() => handleAcknowledge(row._id)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Performance Appraisal" subtitle="Employee performance reviews" action={isHR && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)}>Create Review</Button>} />
      <DataTable columns={columns} rows={reviews} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Create Performance Review</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select label="Employee *" fullWidth size="small" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                <MenuItem value="">Select</MenuItem>
                {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField label="Review Period *" fullWidth size="small" placeholder="e.g. Q1 2024" value={form.reviewPeriod} onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="Review Date *" type="date" fullWidth size="small" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>Overall Rating</Typography>
              <Rating value={form.overallRating} onChange={(_, v) => setForm({ ...form, overallRating: v })} />
            </Grid>
            <Grid item xs={12}><TextField label="Strengths" fullWidth size="small" multiline rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Areas for Improvement" fullWidth size="small" multiline rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Comments" fullWidth size="small" multiline rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformancePage;
