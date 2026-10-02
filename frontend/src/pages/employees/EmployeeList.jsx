import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, IconButton, Tooltip, Avatar, Typography, TextField,
  MenuItem, Chip, Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { employeeApi, departmentApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchBar from '../../components/common/SearchBar';
import useDebounce from '../../hooks/useDebounce';
import usePagination from '../../hooks/usePagination';
import { formatDate, formatCurrency, downloadBlob, getApiUrl } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [menuEl, setMenuEl] = useState(null);

  const { page, limit, handlePageChange, handleLimitChange, reset } = usePagination(10);
  const debouncedSearch = useDebounce(search);

  const canEdit = ['super_admin', 'hr_manager'].includes(user?.role);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await employeeApi.getAll({ page, limit, search: debouncedSearch, status: statusFilter, department: deptFilter });
      setEmployees(data.data);
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, statusFilter, deptFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { reset(); }, [debouncedSearch, statusFilter, deptFilter]);
  useEffect(() => { departmentApi.getDropdown().then(({ data }) => setDepartments(data.data)).catch(() => {}); }, []);

  const handleDelete = async () => {
    try {
      await employeeApi.delete(deleteId);
      toast.success('Employee deleted');
      setDeleteId(null);
      fetchEmployees();
    } catch {}
  };

  const handleExport = async () => {
    try {
      const { data } = await employeeApi.export({ status: statusFilter, department: deptFilter });
      downloadBlob(data, 'employees.xlsx');
      toast.success('Export successful');
    } catch { toast.error('Export failed'); }
    setMenuEl(null);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { data } = await employeeApi.import(file);
      toast.success(data.message);
      fetchEmployees();
    } catch {}
    e.target.value = '';
    setMenuEl(null);
  };

  const columns = [
    {
      field: 'employee', headerName: 'Employee', minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
          <Avatar
            src={row.photo ? `${getApiUrl('uploads/photos/' + row.photo)}` : undefined}
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 600 }}
          >
            {`${row.firstName?.[0]}${row.lastName?.[0]}`}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{`${row.firstName} ${row.lastName}`}</Typography>
            <Typography variant="caption" color="text.secondary">{row.employeeId}</Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'email', headerName: 'Email', minWidth: 180 },
    { field: 'mobile', headerName: 'Mobile', width: 130 },
    { field: 'department', headerName: 'Department', minWidth: 150, renderCell: ({ value }) => value?.departmentName || '-' },
    { field: 'designation', headerName: 'Designation', minWidth: 150, renderCell: ({ value }) => value?.designationName || '-' },
    { field: 'employmentType', headerName: 'Type', width: 110, renderCell: ({ value }) => <Chip label={value?.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: 10, textTransform: 'capitalize' }} /> },
    { field: 'joiningDate', headerName: 'Joining', width: 110, renderCell: ({ value }) => formatDate(value) },
    { field: 'salary', headerName: 'Salary', width: 120, renderCell: ({ value }) => formatCurrency(value) },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    {
      field: 'actions', headerName: 'Actions', width: 120, align: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/employees/${row._id}`)} color="info"><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/employees/${row._id}/edit`)} color="primary"><EditIcon fontSize="small" /></IconButton></Tooltip>}
          {user?.role === 'super_admin' && <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteId(row._id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Employees"
        subtitle={`${total} total employees`}
        breadcrumbs={[{ label: 'Employees' }]}
        action={
          canEdit && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<MoreVertIcon />} onClick={(e) => setMenuEl(e.currentTarget)}>More</Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/employees/new')}>Add Employee</Button>
            </Box>
          )
        }
      />

      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <MenuItem onClick={handleExport}>
          <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Export Excel</ListItemText>
        </MenuItem>
        <MenuItem component="label">
          <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Import Excel</ListItemText>
          <input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
        </MenuItem>
      </Menu>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search employees..." width={300} />
        <TextField select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} size="small" sx={{ width: 180 }} label="Department">
          <MenuItem value="">All Departments</MenuItem>
          {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
        </TextField>
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 140 }} label="Status">
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="terminated">Terminated</MenuItem>
        </TextField>
      </Box>

      <DataTable columns={columns} rows={employees} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} emptyMessage="No employees found" />
      <ConfirmDialog open={!!deleteId} title="Delete Employee" message="This will permanently delete the employee and their user account. Are you sure?" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </Box>
  );
};

export default EmployeeList;
