import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Box, Typography, Button, Chip, Skeleton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/index';
import StatusChip from '../common/StatusChip';

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const formatDuration = (mins) => {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const CheckInCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [lateDialog, setLateDialog] = useState(false);
  const [lateForm, setLateForm] = useState({ lateReason: '', pickupLocation: '' });

  const fetchToday = useCallback(async () => {
    try {
      const res = await attendanceApi.getMyToday();
      setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const record = data?.record;
  const shift = data?.shift;
  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);

  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const worked = checkedOut
    ? (record.workingHours || 0) * 60
    : checkedIn ? Math.max(0, nowMinutes - toMinutes(record.checkIn)) : 0;
  const targetMins = (shift?.workingHours || 8) * 60;
  const progress = Math.min(100, (worked / targetMins) * 100);

  // Minutes past shift start + grace right now. A permission applied for today that
  // covers the shift start pushes the cut-off to the permission end (no reason needed).
  const permission = data?.permission;
  const lateCutoff = (() => {
    if (!shift?.startTime) return null;
    const grace = shift.graceTime || 0;
    const cutoff = toMinutes(shift.startTime) + grace;
    if (permission && toMinutes(permission.fromTime) <= cutoff) {
      return Math.max(cutoff, toMinutes(permission.toTime) + grace);
    }
    return cutoff;
  })();
  const lateNow = lateCutoff === null ? 0 : Math.max(0, Math.floor(nowMinutes - lateCutoff));
  const isDriver = Boolean(data?.isDriver);

  const doCheckIn = async (payload = {}) => {
    setBusy(true);
    try {
      const res = await attendanceApi.checkIn(payload);
      toast.success(res.data.message);
      setLateDialog(false);
      setLateForm({ lateReason: '', pickupLocation: '' });
      fetchToday();
    } catch (err) {
      // Server says a reason is needed (e.g. clock crossed the grace time) → ask for it
      if (err.response?.data?.code === 'LATE_REASON_REQUIRED') setLateDialog(true);
    } finally { setBusy(false); }
  };

  const handleAction = async () => {
    if (!checkedIn) {
      // Late arrivals must explain the delay; drivers always log the pickup they came back from
      if (lateNow > 0 || isDriver) return setLateDialog(true);
      return doCheckIn();
    }
    setBusy(true);
    try {
      const res = await attendanceApi.checkOut();
      toast.success(res.data.message);
      fetchToday();
    } catch {}
    finally { setBusy(false); }
  };

  const submitLate = () => {
    if (lateNow > 0 && lateForm.lateReason.trim().length < 5) return toast.error('Please describe the reason for the delay');
    if (isDriver && lateNow > 0 && !lateForm.pickupLocation.trim()) return toast.error('Please enter the pickup location');
    doCheckIn(lateForm);
  };

  if (loading) return <Card><CardContent><Skeleton variant="rectangular" height={150} /></CardContent></Card>;

  return (
    <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #1976d2 0%, #7c3aed 100%)', color: '#fff' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          </Box>
          {record?.attendanceStatus && <Box sx={{ bgcolor: '#fff', borderRadius: 4 }}><StatusChip status={record.attendanceStatus} /></Box>}
        </Box>

        {shift && (
          <Chip
            size="small"
            label={`${shift.shiftName} · ${shift.startTime} – ${shift.endTime}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', mb: 1.5 }}
          />
        )}
        {permission && (
          <Chip
            size="small"
            label={`Permission ${permission.fromTime} – ${permission.toTime}${permission.status === 'pending' ? ' (pending)' : ''}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', mb: 1.5, ml: shift ? 1 : 0 }}
          />
        )}

        <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Check-in</Typography>
            <Typography fontWeight={700}>{record?.checkIn || '--:--'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Check-out</Typography>
            <Typography fontWeight={700}>{record?.checkOut || '--:--'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Worked</Typography>
            <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDuration(worked)}</Typography>
          </Box>
        </Stack>

        <Box sx={{ height: 6, bgcolor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', mb: 2 }}>
          <Box sx={{ height: '100%', width: `${progress}%`, bgcolor: '#fff', borderRadius: 3, transition: 'width 1s linear' }} />
        </Box>

        {checkedOut ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>Day complete. See you tomorrow!</Typography>
          </Box>
        ) : (
          <Button
            fullWidth
            variant="contained"
            disabled={busy}
            onClick={handleAction}
            startIcon={checkedIn ? <LogoutIcon /> : <LoginIcon />}
            sx={{
              bgcolor: '#fff', color: checkedIn ? 'error.main' : 'primary.main', fontWeight: 700,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
          >
            {checkedIn ? 'Check Out' : 'Check In'}
          </Button>
        )}

        {!checkedIn && lateNow > 0 && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
            You are {formatDuration(lateNow)} late — a reason is required to check in.
          </Typography>
        )}
        {record?.late && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
            Late {record.late.minutes} min · reason {record.late.status === 'pending' ? 'under review' : record.late.status}
          </Typography>
        )}

        <Dialog open={lateDialog} onClose={() => setLateDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDriver && <LocalShippingIcon color="primary" />}
            {lateNow > 0 ? 'Late check-in' : 'Driver check-in'}
          </DialogTitle>
          <DialogContent>
            {lateNow > 0 ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Office time is {shift?.startTime}. You are <b>{formatDuration(lateNow)}</b> late.
                Your reason will be sent to your approvers.
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>You are on time. Add the pickup you are returning from (optional).</Alert>
            )}
            {isDriver && (
              <TextField
                label={`Pickup location${lateNow > 0 ? ' *' : ''}`}
                placeholder="e.g. Chennai Airport — client pickup"
                fullWidth size="small" sx={{ mb: 2 }}
                value={lateForm.pickupLocation}
                onChange={(e) => setLateForm({ ...lateForm, pickupLocation: e.target.value })}
              />
            )}
            {lateNow > 0 && (
              <TextField
                label="Reason for delay *" fullWidth multiline rows={3} autoFocus={!isDriver}
                placeholder={isDriver ? 'e.g. Flight delayed by 40 minutes, heavy traffic on GST road' : 'e.g. Heavy traffic due to rain'}
                value={lateForm.lateReason}
                onChange={(e) => setLateForm({ ...lateForm, lateReason: e.target.value })}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setLateDialog(false)} variant="outlined">Cancel</Button>
            <Button onClick={submitLate} variant="contained" disabled={busy}>Submit & Check In</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CheckInCard;
