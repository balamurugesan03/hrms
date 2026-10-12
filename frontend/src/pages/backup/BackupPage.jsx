import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Divider,
  Checkbox, FormControlLabel, Chip, CircularProgress, Alert,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ComputerIcon from '@mui/icons-material/Computer';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import StarIcon from '@mui/icons-material/Star';
import CampaignIcon from '@mui/icons-material/Campaign';
import BackupIcon from '@mui/icons-material/Backup';
import { backupApi } from '../../api/index';
import PageHeader from '../../components/common/PageHeader';
import { downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';

const MODULE_STYLE = {
  organization: { icon: <BusinessIcon />, color: '#0ea5e9' },
  employees: { icon: <PeopleIcon />, color: '#1976d2' },
  attendance: { icon: <EventNoteIcon />, color: '#10b981' },
  leave: { icon: <BeachAccessIcon />, color: '#f59e0b' },
  payroll: { icon: <PaymentsIcon />, color: '#7c3aed' },
  expenses: { icon: <ReceiptIcon />, color: '#ec4899' },
  assets: { icon: <ComputerIcon />, color: '#ef4444' },
  recruitment: { icon: <PersonSearchIcon />, color: '#14b8a6' },
  performance: { icon: <StarIcon />, color: '#eab308' },
  announcements: { icon: <CampaignIcon />, color: '#64748b' },
};

const filenameFrom = (headers, fallback) => {
  const match = /filename=([^;]+)/.exec(headers?.['content-disposition'] || '');
  return match ? match[1].trim() : fallback;
};

const BackupPage = () => {
  const [modules, setModules] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState([]);
  const [format, setFormat] = useState('xlsx');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState({});

  useEffect(() => {
    backupApi.modules()
      .then(({ data }) => setModules(data.data))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const runExport = async (keys, busyKey) => {
    if (from && to && from > to) return toast.error('From date must be before To date');
    setBusy((p) => ({ ...p, [busyKey]: true }));
    try {
      const params = { modules: keys.join(','), format };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await backupApi.export(params);
      downloadBlob(res.data, filenameFrom(res.headers, `hrms_backup.${format}`));
      toast.success('Backup downloaded');
    } catch {
      // axios interceptor already shows the error toast
    } finally {
      setBusy((p) => ({ ...p, [busyKey]: false }));
    }
  };

  const toggle = (key) => setSelected((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const allSelected = modules.length > 0 && selected.length === modules.length;

  return (
    <Box>
      <PageHeader
        title="Backup & Export"
        subtitle="Download module-wise backups of your HRMS data"
        breadcrumbs={[{ label: 'Backup & Export' }]}
      />

      <Card sx={{ mb: 3, p: 1 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Export Options</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select size="small" label="Format" value={format} onChange={(e) => setFormat(e.target.value)} sx={{ width: 200 }}>
              <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
              <MenuItem value="json">JSON (full backup)</MenuItem>
            </TextField>
            <TextField type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            {(from || to) && <Button size="small" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</Button>}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            The date range applies only to date-based records (attendance, leave, permissions, payroll, expenses,
            performance, holidays, announcements). Master data such as employees, departments and assets is always exported in full.
            Passwords and login tokens are never included.
          </Alert>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={allSelected}
                  indeterminate={selected.length > 0 && !allSelected}
                  onChange={() => setSelected(allSelected ? [] : modules.map((m) => m.key))}
                />
              )}
              label="Select all modules"
            />
            <Button
              variant="outlined"
              startIcon={busy.selected ? <CircularProgress size={16} /> : <FileDownloadIcon />}
              disabled={!selected.length || busy.selected}
              onClick={() => runExport(selected, 'selected')}
            >
              Export selected ({selected.length})
            </Button>
            <Button
              variant="contained"
              startIcon={busy.all ? <CircularProgress size={16} color="inherit" /> : <BackupIcon />}
              disabled={!modules.length || busy.all}
              onClick={() => runExport(modules.map((m) => m.key), 'all')}
            >
              Full backup (all modules)
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loadingList ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2.5}>
          {modules.map((m) => {
            const style = MODULE_STYLE[m.key] || { icon: <BackupIcon />, color: '#1976d2' };
            return (
              <Grid item xs={12} sm={6} md={4} key={m.key}>
                <Card sx={{ height: '100%', outline: selected.includes(m.key) ? `2px solid ${style.color}` : 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{
                        width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                        bgcolor: style.color + '20', color: style.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {style.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" fontWeight={600}>{m.label}</Typography>
                          <Checkbox size="small" checked={selected.includes(m.key)} onChange={() => toggle(m.key)} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{m.total} records</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 1.5 }}>
                          {m.collections.map((c) => (
                            <Chip key={c.name} size="small" variant="outlined" label={`${c.name}: ${c.count}`} />
                          ))}
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={busy[m.key] ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon />}
                          onClick={() => runExport([m.key], m.key)}
                          disabled={busy[m.key]}
                          sx={{ bgcolor: style.color, '&:hover': { bgcolor: style.color + 'cc' } }}
                        >
                          {busy[m.key] ? 'Exporting...' : `Export ${format === 'json' ? 'JSON' : 'Excel'}`}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default BackupPage;
