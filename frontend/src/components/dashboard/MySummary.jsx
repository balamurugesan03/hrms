import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Box, Typography, LinearProgress, Button } from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/index';
import StatCard from '../common/StatCard';
import PermissionHoursCard from './PermissionHoursCard';
import { formatCurrency, MONTHS } from '../../utils/helpers';

const BAR_COLORS = ['#1976d2', '#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#3b82f6'];

const MySummary = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getMySummary()
      .then(({ data }) => setSummary(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !summary) return null;

  const att = summary?.attendance;
  const slip = summary?.lastPayslip;

  return (
    <>
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Days Present" value={att?.present ?? 0} icon={<EventNoteIcon />} color="success" subtitle={`This month · ${att?.late ?? 0} late`} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Hours Worked" value={att?.hours ?? 0} icon={<AccessTimeIcon />} color="info" subtitle="This month" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Last Salary"
            value={slip ? formatCurrency(slip.netSalary) : '-'}
            icon={<PaymentsIcon />}
            color="secondary"
            subtitle={slip ? `${MONTHS[slip.month - 1]} ${slip.year} · ${slip.status}` : 'No payslip yet'}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Pending Requests"
            value={(summary?.pendingLeaves ?? 0) + (summary?.pendingExpenses ?? 0)}
            icon={<PendingActionsIcon />}
            color="warning"
            subtitle={`${summary?.pendingLeaves ?? 0} leave · ${summary?.pendingExpenses ?? 0} expense`}
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <PermissionHoursCard sx={{ height: '100%' }} />
        </Grid>
        <Grid item xs={12} md={8}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>My Leave Balance ({new Date().getFullYear()})</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/leave')}>Apply Leave</Button>
          </Box>
          <Grid container spacing={2.5}>
            {(summary?.leaveBalance || []).map((lb, idx) => {
              const color = BAR_COLORS[idx % BAR_COLORS.length];
              const pct = lb.allocated ? (lb.taken / lb.allocated) * 100 : 0;
              return (
                <Grid item xs={12} sm={6} key={lb._id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>{lb.name}</Typography>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 700, color }}>{lb.remaining}</Box>
                      <Box component="span" sx={{ color: 'text.secondary' }}> / {lb.allocated} left</Box>
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, pct)}
                    sx={{ height: 8, borderRadius: 4, bgcolor: `${color}22`, '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
                  />
                </Grid>
              );
            })}
            {!loading && !(summary?.leaveBalance || []).length && (
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">No leave types configured</Typography></Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default MySummary;
