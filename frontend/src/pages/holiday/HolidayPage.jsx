import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Card, CardContent, Typography,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import toast from 'react-hot-toast';
import { holidayApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY = { holidayName: '', holidayDate: '', description: '', holidayType: 'national' };

const HolidayPage = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const canEdit = ['super_admin', 'hr_manager'].includes(user?.role);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await holidayApi.getAll({ year });
      setHolidays(data.data);
    } catch {} finally { setLoading(false); }
  }, [year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleOpen = (h = null) => {
    setForm(h ? { holidayName: h.holidayName, holidayDate: h.holidayDate?.split('T')[0], description: h.description || '', holidayType: h.holidayType } : EMPTY);
    setEditId(h?._id || null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) { await holidayApi.update(editId, form); toast.success('Holiday updated'); }
      else { await holidayApi.create(form); toast.success('Holiday created'); }
      setOpenForm(false);
      fetchHolidays();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await holidayApi.delete(deleteId);
      toast.success('Holiday deleted');
      setDeleteId(null);
      fetchHolidays();
    } catch {}
  };

  const typeColors = { national: 'error', regional: 'warning', optional: 'default' };

  const columns = [
    { field: 'holidayName', headerName: 'Holiday Name', minWidth: 200 },
    { field: 'holidayDate', headerName: 'Date', width: 130, renderCell: ({ value }) => formatDate(value) },
    { field: 'holidayType', headerName: 'Type', width: 120, renderCell: ({ value }) => <Chip label={value} size="small" color={typeColors[value] || 'default'} /> },
    { field: 'description', headerName: 'Description', minWidth: 200, renderCell: ({ value }) => value || '-' },
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
        title="Holiday Management"
        subtitle="Manage company holidays and calendar"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Holidays' }]}
        action={canEdit && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Holiday</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField select value={year} onChange={(e) => setYear(parseInt(e.target.value))} size="small" sx={{ width: 110 }} label="Year">
          {[2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>{holidays.length} holidays in {year}</Typography>
      </Box>

      <DataTable columns={columns} rows={holidays} loading={loading} emptyMessage="No holidays for this year" />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>{editId ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField label="Holiday Name *" fullWidth size="small" value={form.holidayName} onChange={(e) => setForm({ ...form, holidayName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Date *" type="date" fullWidth size="small" value={form.holidayDate} onChange={(e) => setForm({ ...form, holidayDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Type" fullWidth size="small" value={form.holidayType} onChange={(e) => setForm({ ...form, holidayType: e.target.value })}>
                <MenuItem value="national">National</MenuItem>
                <MenuItem value="regional">Regional</MenuItem>
                <MenuItem value="optional">Optional</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField label="Description" fullWidth size="small" multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteId} title="Delete Holiday" message="Are you sure?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default HolidayPage;
