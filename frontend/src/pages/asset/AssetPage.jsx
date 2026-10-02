import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { assetApi, employeeApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';

const ASSET_TYPES = ['laptop', 'desktop', 'mobile', 'tablet', 'vehicle', 'furniture', 'equipment', 'other'];
const EMPTY = { assetCode: '', assetName: '', assetType: 'laptop', brand: '', model: '', serialNumber: '', purchaseDate: '', purchasePrice: '', condition: 'good', status: 'available', description: '' };

const AssetPage = () => {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [assignId, setAssignId] = useState(null);
  const [assignEmp, setAssignEmp] = useState('');
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(10);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try { const { data } = await assetApi.getAll({ page, limit }); setAssets(data.data); setTotal(data.pagination.total); } catch {} finally { setLoading(false); }
  }, [page, limit]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { employeeApi.getAll({ limit: 200 }).then(({ data }) => setEmployees(data.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    try {
      if (editId) { await assetApi.update(editId, form); toast.success('Asset updated'); }
      else { await assetApi.create(form); toast.success('Asset created'); }
      setOpenForm(false);
      fetchAssets();
    } catch {}
  };

  const handleAssign = async () => {
    try { await assetApi.assign(assignId, { employeeId: assignEmp }); toast.success('Asset assigned'); setAssignId(null); fetchAssets(); } catch {}
  };

  const handleReturn = async (id) => {
    try { await assetApi.return(id); toast.success('Asset returned'); fetchAssets(); } catch {}
  };

  const handleDelete = async () => {
    try { await assetApi.delete(deleteId); toast.success('Asset deleted'); setDeleteId(null); fetchAssets(); } catch {}
  };

  const columns = [
    { field: 'assetCode', headerName: 'Code', width: 110 },
    { field: 'assetName', headerName: 'Asset Name', minWidth: 160 },
    { field: 'assetType', headerName: 'Type', width: 110 },
    { field: 'brand', headerName: 'Brand', width: 100 },
    { field: 'serialNumber', headerName: 'Serial No.', width: 130 },
    { field: 'assignedEmployee', headerName: 'Assigned To', minWidth: 140, renderCell: ({ value }) => value ? `${value.firstName} ${value.lastName}` : '-' },
    { field: 'assignedDate', headerName: 'Assigned Date', width: 130, renderCell: ({ value }) => formatDate(value) },
    { field: 'status', headerName: 'Status', width: 130, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 140, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => { setForm({ assetCode: row.assetCode, assetName: row.assetName, assetType: row.assetType, brand: row.brand || '', model: row.model || '', serialNumber: row.serialNumber || '', purchasePrice: row.purchasePrice || '', condition: row.condition, status: row.status }); setEditId(row._id); setOpenForm(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
          {row.status === 'available' && <Tooltip title="Assign"><IconButton size="small" color="success" onClick={() => setAssignId(row._id)}><AssignmentTurnedInIcon fontSize="small" /></IconButton></Tooltip>}
          {row.status === 'assigned' && <Tooltip title="Return"><IconButton size="small" color="warning" onClick={() => handleReturn(row._id)}><AssignmentReturnIcon fontSize="small" /></IconButton></Tooltip>}
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteId(row._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Asset Management" subtitle="Track company assets" action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setEditId(null); setOpenForm(true); }}>Add Asset</Button>} />
      <DataTable columns={columns} rows={assets} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>{editId ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField label="Asset Code *" fullWidth size="small" value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value.toUpperCase() })} /></Grid>
            <Grid item xs={6}><TextField label="Asset Name *" fullWidth size="small" value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select label="Type" fullWidth size="small" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                {ASSET_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField label="Brand" fullWidth size="small" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="Serial Number" fullWidth size="small" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField label="Purchase Price" type="number" fullWidth size="small" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenForm(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assignId} onClose={() => setAssignId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Assign Asset</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField select label="Employee" fullWidth value={assignEmp} onChange={(e) => setAssignEmp(e.target.value)}>
            <MenuItem value="">Select Employee</MenuItem>
            {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName}`}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setAssignId(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleAssign} variant="contained">Assign</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteId} title="Delete Asset" message="Are you sure?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default AssetPage;
