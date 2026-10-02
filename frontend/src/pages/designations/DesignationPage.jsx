import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { designationApi, departmentApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchBar from '../../components/common/SearchBar';
import useDebounce from '../../hooks/useDebounce';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';

const EMPTY = { designationCode: '', designationName: '', department: '', description: '', status: 'active' };

const DesignationPage = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { page, limit, handlePageChange, handleLimitChange, reset } = usePagination(10);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await designationApi.getAll({ page, limit, search: debouncedSearch, status: statusFilter, department: deptFilter });
      setRows(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, statusFilter, deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { reset(); }, [debouncedSearch, statusFilter, deptFilter]);

  useEffect(() => {
    departmentApi.getDropdown().then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  const handleOpen = (row = null) => {
    setFormData(row ? { designationCode: row.designationCode, designationName: row.designationName, department: row.department?._id || '', description: row.description || '', status: row.status } : EMPTY);
    setEditId(row?._id || null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!formData.designationCode || !formData.designationName || !formData.department) return toast.error('All required fields must be filled');
    setSaving(true);
    try {
      if (editId) { await designationApi.update(editId, formData); toast.success('Designation updated'); }
      else { await designationApi.create(formData); toast.success('Designation created'); }
      setOpenForm(false);
      fetchData();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await designationApi.delete(deleteId);
      toast.success('Designation deleted');
      setDeleteId(null);
      fetchData();
    } catch {}
  };

  const columns = [
    { field: 'designationCode', headerName: 'Code', width: 120 },
    { field: 'designationName', headerName: 'Designation', minWidth: 180 },
    { field: 'department', headerName: 'Department', minWidth: 160, renderCell: ({ value }) => value?.departmentName || '-' },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: 'createdAt', headerName: 'Created', width: 130, renderCell: ({ value }) => formatDate(value) },
    {
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpen(row)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(row._id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Designations"
        subtitle="Manage job designations by department"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Designations' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Designation</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search designations..." />
        <TextField select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} size="small" sx={{ width: 180 }} label="Department">
          <MenuItem value="">All Departments</MenuItem>
          {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
        </TextField>
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 140 }} label="Status">
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Box>

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>{editId ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Code *" fullWidth value={formData.designationCode} onChange={(e) => setFormData({ ...formData, designationCode: e.target.value.toUpperCase() })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Designation Name *" fullWidth value={formData.designationName} onChange={(e) => setFormData({ ...formData, designationName: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField select label="Department *" fullWidth value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                <MenuItem value="">Select Department</MenuItem>
                {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Status" fullWidth value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteId} title="Delete Designation" message="Are you sure you want to delete this designation?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default DesignationPage;
