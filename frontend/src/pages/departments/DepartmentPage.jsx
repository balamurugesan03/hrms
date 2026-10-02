import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip, Chip, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { departmentApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchBar from '../../components/common/SearchBar';
import useDebounce from '../../hooks/useDebounce';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';

const EMPTY_FORM = { departmentCode: '', departmentName: '', description: '', status: 'active' };

const DepartmentPage = () => {
  const [departments, setDepartments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { page, limit, handlePageChange, handleLimitChange, reset } = usePagination(10);
  const debouncedSearch = useDebounce(search);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await departmentApi.getAll({ page, limit, search: debouncedSearch, status: statusFilter });
      setDepartments(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { reset(); }, [debouncedSearch, statusFilter]);

  const handleOpen = (dept = null) => {
    setFormData(dept ? { departmentCode: dept.departmentCode, departmentName: dept.departmentName, description: dept.description || '', status: dept.status } : EMPTY_FORM);
    setEditId(dept?._id || null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!formData.departmentCode || !formData.departmentName) return toast.error('Code and Name are required');
    setSaving(true);
    try {
      if (editId) { await departmentApi.update(editId, formData); toast.success('Department updated'); }
      else { await departmentApi.create(formData); toast.success('Department created'); }
      setOpenForm(false);
      fetchDepartments();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await departmentApi.delete(deleteId);
      toast.success('Department deleted');
      setDeleteId(null);
      fetchDepartments();
    } catch {}
  };

  const columns = [
    { field: 'departmentCode', headerName: 'Code', width: 120 },
    { field: 'departmentName', headerName: 'Department Name', minWidth: 180 },
    { field: 'description', headerName: 'Description', minWidth: 200, renderCell: ({ value }) => value || '-' },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    { field: 'createdAt', headerName: 'Created', width: 130, renderCell: ({ value }) => formatDate(value) },
    {
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpen(row)} color="primary"><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteId(row._id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Departments"
        subtitle="Manage organizational departments"
        breadcrumbs={[{ label: 'Organization' }, { label: 'Departments' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Add Department</Button>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search departments..." />
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 150 }} label="Status">
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Box>

      <DataTable
        columns={columns} rows={departments} loading={loading} total={total}
        page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange}
        emptyMessage="No departments found"
      />

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editId ? 'Edit Department' : 'Add Department'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department Code *" fullWidth value={formData.departmentCode}
                onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value.toUpperCase() })}
                placeholder="e.g. HR001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department Name *" fullWidth value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description" fullWidth multiline rows={3} value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
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

      <ConfirmDialog open={!!deleteId} title="Delete Department" message="This action cannot be undone. Are you sure?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default DepartmentPage;
