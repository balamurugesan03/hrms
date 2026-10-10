import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Box, Typography, Button, Skeleton, Alert, Tooltip } from '@mui/material';
import { permissionApi } from '../../api/index';
import usePermissionWindow from '../../hooks/usePermissionWindow';

export const fmtMins = (mins = 0) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

const Legend = ({ color, label, value, striped }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Box sx={{
      width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0,
      ...(striped && { opacity: 0.55 }),
    }} />
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>{label}</Typography>
      <Typography variant="body2" fontWeight={700}>{value}</Typography>
    </Box>
  </Box>
);

/**
 * The employee's permission hours for the current month:
 * used (approved) + pending approval + left, out of the monthly limit.
 * Pass `quota` to render given data; otherwise it loads the logged-in employee's quota.
 */
const PermissionHoursCard = ({ quota: given, showAction = true, sx }) => {
  const navigate = useNavigate();
  const permissionWindow = usePermissionWindow();
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(!given);

  useEffect(() => {
    if (given) return;
    permissionApi.getQuota()
      .then(({ data }) => setLoaded(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [given]);

  const q = given || loaded;
  if (loading) return <Card sx={sx}><CardContent><Skeleton variant="rectangular" height={110} /></CardContent></Card>;
  if (!q) return null;

  const total = q.quotaMinutes || 1;
  const approvedPct = Math.min(100, (q.approvedMinutes / total) * 100);
  const pendingPct = Math.min(100 - approvedPct, (q.pendingMinutes / total) * 100);
  const exhausted = q.remainingMinutes <= 0;
  const halfDays = (q.halfDaysApproved || 0) + (q.halfDaysPending || 0);
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });

  return (
    <Card sx={sx}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>My Permission Hours</Typography>
            <Typography variant="caption" color="text.secondary">{monthName} · limit {fmtMins(q.quotaMinutes)} per month</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" fontWeight={700} color={exhausted ? 'error.main' : 'success.main'} lineHeight={1.1}>
              {fmtMins(q.remainingMinutes)}
            </Typography>
            <Typography variant="caption" color="text.secondary">left</Typography>
          </Box>
        </Box>

        {/* Approved (solid) + pending (faded) out of the monthly limit */}
        <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: 'action.hover', mb: 1.5 }}>
          <Box sx={{ width: `${approvedPct}%`, bgcolor: 'primary.main', transition: 'width .4s' }} />
          <Box sx={{ width: `${pendingPct}%`, bgcolor: 'warning.main', opacity: 0.55, transition: 'width .4s' }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: exhausted || halfDays || showAction ? 1.5 : 0 }}>
          <Legend color="primary.main" label="Used (approved)" value={fmtMins(q.approvedMinutes)} />
          <Legend color="warning.main" label="Pending approval" value={fmtMins(q.pendingMinutes)} striped />
          <Legend color="success.main" label="Left" value={fmtMins(q.remainingMinutes)} />
        </Box>

        {exhausted && (
          <Alert severity="warning" sx={{ py: 0, mb: showAction ? 1.5 : 0 }}>
            Monthly permission is used up. Any new permission will be counted as a half-day leave (salary cut).
          </Alert>
        )}
        {halfDays > 0 && (
          <Typography variant="caption" color="error.main" display="block" sx={{ mb: showAction ? 1 : 0 }}>
            {halfDays} permission(s) counted as half-day leave this month
            {q.halfDaysPending ? ` (${q.halfDaysPending} pending approval)` : ''}
          </Typography>
        )}

        {showAction && (
          <Tooltip title={permissionWindow.open ? '' : permissionWindow.closedMessage}>
            <span>
              <Button size="small" variant="outlined" disabled={!permissionWindow.open} onClick={() => navigate('/leave?tab=permissions')}>Request Permission</Button>
            </span>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionHoursCard;
