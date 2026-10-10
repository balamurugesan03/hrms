import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, MenuItem, Typography, IconButton, Tooltip, Avatar, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { attendanceApi } from '../../api/index';
import DataTable from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import ApprovalStatus, { myPendingSlot, canApprove } from '../../components/common/ApprovalStatus';
import usePagination from '../../hooks/usePagination';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Late check-ins with the employee's reason (and pickup location for drivers),
// reviewed by the employee's late approvers (or reporting managers).
const LateArrivalsTab = ({ month, year, employee }) => {
  const { user } = useAuth();
  const isApprover = canApprove(user);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(isApprover ? 'awaiting' : 'all');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const { page, limit, handlePageChange, handleLimitChange } = usePagination(20);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, status: statusFilter };
      if (view === 'awaiting') params.awaiting = 'me';
      else { params.month = month; params.year = year; }
      if (employee) params.employee = employee;
      const { data } = await attendanceApi.getLate(params);
      // Approval helpers expect status/approvals at the top level
      setRows(data.data.map((r) => ({ ...r, status: r.late?.status, approvals: r.late?.approvals })));
      setTotal(data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, limit, statusFilter, view, month, year, employee]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const decide = async (id, approve) => {
    try {
      const { data } = approve ? await attendanceApi.approveLate(id, {}) : await attendanceApi.rejectLate(id, { remarks });
      toast.success(data.message);
      setRejectId(null);
      setRemarks('');
      fetchRows();
    } catch {}
  };

  const columns = [
    {
      field: 'employee', headerName: 'Employee', minWidth: 190,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: row.employee?.isDriver ? 'warning.main' : 'primary.main', fontSize: 11 }}>
            {row.employee?.isDriver ? <LocalShippingIcon sx={{ fontSize: 16 }} /> : `${row.employee?.firstName?.[0] || ''}${row.employee?.lastName?.[0] || ''}`}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>{`${row.employee?.firstName} ${row.employee?.lastName}`}</Typography>
            <Typography variant="caption" color="text.secondary">{row.employee?.employeeId}{row.employee?.isDriver ? ' · Driver' : ''}</Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'date', headerName: 'Date', width: 110, renderCell: ({ value }) => formatDate(value) },
    {
      field: 'checkIn', headerName: 'Shift / In', width: 120,
      renderCell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.checkIn}</Typography>
          <Typography variant="caption" color="text.secondary">office {row.shift?.startTime || '-'}</Typography>
        </Box>
      ),
    },
    { field: 'lateBy', headerName: 'Late by', width: 90, renderCell: ({ row }) => <Chip size="small" color="warning" label={`${row.late?.minutes || 0} min`} /> },
    {
      field: 'reason', headerName: 'Reason for delay', minWidth: 240, flex: 1,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2">{row.late?.reason || '-'}</Typography>
          {row.late?.pickupLocation && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocalShippingIcon sx={{ fontSize: 13 }} /> {row.late.pickupLocation}
            </Typography>
          )}
        </Box>
      ),
    },
    { field: 'approvals', headerName: 'Review', width: 150, renderCell: ({ row }) => <ApprovalStatus approvals={row.approvals} /> },
    { field: 'status', headerName: 'Status', width: 100, renderCell: ({ value }) => <StatusChip status={value} /> },
    ...(isApprover ? [{
      field: 'actions', headerName: 'Actions', width: 100, align: 'center',
      renderCell: ({ row }) => myPendingSlot(user, row) && (
        <Box>
          <Tooltip title="Accept reason"><IconButton size="small" color="success" onClick={() => decide(row._id, true)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reject reason"><IconButton size="small" color="error" onClick={() => setRejectId(row._id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    }] : []),
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {isApprover && (
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)}>
            <ToggleButton value="awaiting">Awaiting my review</ToggleButton>
            <ToggleButton value="all">All (selected month)</ToggleButton>
          </ToggleButtonGroup>
        )}
        <TextField select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ width: 150 }} label="Status">
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Accepted</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
      </Box>

      <DataTable columns={columns} rows={rows} loading={loading} total={total} page={page} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />

      <Dialog open={!!rejectId} onClose={() => setRejectId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Reject late reason</DialogTitle>
        <DialogContent>
          <TextField label="Remarks" fullWidth multiline rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRejectId(null)} variant="outlined">Cancel</Button>
          <Button onClick={() => decide(rejectId, false)} variant="contained" color="error">Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LateArrivalsTab;
