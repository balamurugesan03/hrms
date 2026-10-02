import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Grid, TextField, MenuItem, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { shiftApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY = { shiftName: '', startTime: '', endTime: '', graceTime: 15, description: '', status: 'active' };

const ShiftPage = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const canEdit = ['super_admin', 'hr_manager'].includes(user?.role);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try { const { data } = await shiftApi.getAll(); setShifts(data.data); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const handleOpen = (s = null) => {
    setForm(s ? { shiftName: s.shiftName, startTime: s.startTime, endTime: s.endTime, graceTime: s.graceTime, description: s.description || '', status: s.status } : EMPTY);
    setEditId(s?._id || null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    try {
      if (editId) { await shiftApi.update(editId, form); toast.success('Shift updated'); }
      else { await shiftApi.create(form); toast.success('Shift created'); }
      setOpenForm(false);
      fetchShifts();
    } catch {}
  };

  const handleDelete = async () => {
    try { await shiftApi.delete(deleteId); toast.success('Shift deleted'); setDeleteId(null); fetchShifts(); } catch {}
  };

  const columns = [
    { field: 'shiftName', headerName: 'Shift Name', minWidth: 150 },
    { field: 'startTime', headerName: 'Start Time', width: 110 },
    { field: 'endTime', headerName: 'End Time', width: 110 },
    { field: 'graceTime', headerName: 'Grace (min)', width: 120, renderCell: ({ value }) => `${value} min` },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    canEdit && {
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpen(row)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(row._id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ].filter(Boolean);

  return (
    <Box>
      <PageHeader
        title="Shift Management"
        subtitle="Define and manage work shifts"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Shifts' }]}
        action={canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Shift</Button>}
      />
      <DataTable columns={columns} rows={shifts} loading={loading} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>{editId ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Shift Name *" fullWidth size="small" value={form.shiftName} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="Start Time" type="time" fullWidth size="small" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField label="End Time" type="time" fullWidth size="small" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField label="Grace Time (minutes)" type="number" fullWidth size="small" value={form.graceTime} onChange={(e) => setForm({ ...form, graceTime: parseInt(e.target.value) })} /></Grid>
            <Grid item xs={6}>
              <TextField select label="Status" fullWidth size="small" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteId} title="Delete Shift" message="Are you sure?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default ShiftPage;
