import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { recruitmentApi, departmentApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';

const EMPTY = { jobTitle: '', department: '', openings: 1, description: '', jobType: 'full_time', location: '', status: 'open' };

const RecruitmentPage = () => {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [viewJob, setViewJob] = useState(null);
  const [openCandidate, setOpenCandidate] = useState(null);
  const [candidateForm, setCandidateForm] = useState({ name: '', email: '', mobile: '' });
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try { const { data } = await recruitmentApi.getAll({ page, limit }); setJobs(data.data); setTotal(data.pagination.total); } catch {} finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { departmentApi.getDropdown().then(({ data }) => setDepartments(data.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    try {
      if (editId) { await recruitmentApi.update(editId, form); toast.success('Job updated'); }
      else { await recruitmentApi.create(form); toast.success('Job posted'); }
      setOpenForm(false);
      fetchJobs();
    } catch {}
  };

  const handleAddCandidate = async () => {
    try {
      await recruitmentApi.addCandidate(openCandidate, candidateForm);
      toast.success('Candidate added');
      setOpenCandidate(null);
      fetchJobs();
    } catch {}
  };

  const STAGE_COLORS = { applied: 'default', screening: 'warning', interview: 'info', offer: 'secondary', hired: 'success', rejected: 'error' };

  const columns = [
    { field: 'jobTitle', headerName: 'Job Title', minWidth: 180 },
    { field: 'department', headerName: 'Department', width: 150, renderCell: ({ value }) => value?.departmentName || '-' },
    { field: 'openings', headerName: 'Openings', width: 90, align: 'center' },
    { field: 'jobType', headerName: 'Type', width: 110 },
    { field: 'candidates', headerName: 'Candidates', width: 110, align: 'center', renderCell: ({ value }) => value?.length || 0 },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 130, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="View"><IconButton size="small" color="info" onClick={async () => { const { data } = await recruitmentApi.getById(row._id); setViewJob(data.data); }}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => { setForm({ jobTitle: row.jobTitle, department: row.department?._id || '', openings: row.openings, description: row.description, jobType: row.jobType, status: row.status }); setEditId(row._id); setOpenForm(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Add Candidate"><IconButton size="small" color="success" onClick={() => setOpenCandidate(row._id)}><PersonAddIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Recruitment" subtitle="Manage job postings and candidates" action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setEditId(null); setOpenForm(true); }}>Post Job</Button>} />
      <DataTable columns={columns} rows={jobs} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>{editId ? 'Edit Job' : 'Post New Job'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Job Title *" fullWidth size="small" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Department *" fullWidth size="small" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}><TextField label="Openings" type="number" fullWidth size="small" value={form.openings} onChange={(e) => setForm({ ...form, openings: parseInt(e.target.value) })} /></Grid>
            <Grid item xs={6} sm={3}>
              <TextField select label="Status" fullWidth size="small" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField label="Description *" fullWidth size="small" multiline rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* View Job Dialog */}
      {viewJob && (
        <Dialog open={!!viewJob} onClose={() => setViewJob(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={600}>{viewJob.jobTitle} — {viewJob.department?.departmentName}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>{viewJob.description}</Typography>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Candidates ({viewJob.candidates?.length || 0})</Typography>
            <List disablePadding>
              {(viewJob.candidates || []).map((c) => (
                <ListItem key={c._id} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText primary={c.name} secondary={c.email} />
                  <Chip label={c.stage} size="small" color={STAGE_COLORS[c.stage] || 'default'} />
                </ListItem>
              ))}
              {(!viewJob.candidates || viewJob.candidates.length === 0) && <Typography variant="body2" color="text.secondary">No candidates yet</Typography>}
            </List>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setViewJob(null)} variant="contained">Close</Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog open={!!openCandidate} onClose={() => setOpenCandidate(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Add Candidate</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Name *" fullWidth size="small" value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Email *" fullWidth size="small" value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField label="Mobile" fullWidth size="small" value={candidateForm.mobile} onChange={(e) => setCandidateForm({ ...candidateForm, mobile: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenCandidate(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleAddCandidate} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const STAGE_COLORS = { applied: 'default', screening: 'warning', interview: 'info', offer: 'secondary', hired: 'success', rejected: 'error' };

export default RecruitmentPage;
