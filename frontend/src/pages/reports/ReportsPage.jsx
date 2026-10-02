import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Divider,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import PaymentsIcon from '@mui/icons-material/Payments';
import ComputerIcon from '@mui/icons-material/Computer';
import { reportApi } from '../../api/index';
import PageHeader from '../../components/common/PageHeader';
import { downloadBlob, MONTHS } from '../../utils/helpers';
import toast from 'react-hot-toast';

const REPORTS = [
  { key: 'employees', title: 'Employee Report', icon: <PeopleIcon />, color: '#1976d2', desc: 'Complete employee directory with details' },
  { key: 'attendance', title: 'Attendance Report', icon: <EventNoteIcon />, color: '#10b981', desc: 'Monthly attendance summary and records' },
  { key: 'leave', title: 'Leave Report', icon: <BeachAccessIcon />, color: '#f59e0b', desc: 'Leave applications and approval status' },
  { key: 'payroll', title: 'Payroll Report', icon: <PaymentsIcon />, color: '#7c3aed', desc: 'Salary and payroll details' },
  { key: 'assets', title: 'Asset Report', icon: <ComputerIcon />, color: '#ef4444', desc: 'Asset inventory and assignment status' },
];

const ReportsPage = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState({});

  const handleDownload = async (key) => {
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      const params = { format: 'excel', month, year };
      const { data } = await reportApi[key](params);
      downloadBlob(data, `${key}_report_${MONTHS[month - 1]}_${year}.xlsx`);
      toast.success(`${key} report downloaded`);
    } catch {
      toast.error('Download failed');
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Generate and download HR reports"
        breadcrumbs={[{ label: 'Reports' }]}
      />

      <Card sx={{ mb: 3, p: 1 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Report Filters</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} size="small" sx={{ width: 150 }} label="Month">
              {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
            </TextField>
            <TextField select value={year} onChange={(e) => setYear(parseInt(e.target.value))} size="small" sx={{ width: 100 }} label="Year">
              {[2022, 2023, 2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {REPORTS.map((report) => (
          <Grid item xs={12} sm={6} md={4} key={report.key}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                    bgcolor: report.color + '20', color: report.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {report.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight={600}>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>{report.desc}</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleDownload(report.key)}
                      disabled={loading[report.key]}
                      sx={{ bgcolor: report.color, '&:hover': { bgcolor: report.color + 'cc' } }}
                    >
                      {loading[report.key] ? 'Downloading...' : 'Download Excel'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsPage;
