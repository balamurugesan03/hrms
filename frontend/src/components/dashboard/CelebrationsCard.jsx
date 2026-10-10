import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Typography, Avatar, Tabs, Tab, Chip } from '@mui/material';
import CakeIcon from '@mui/icons-material/Cake';
import CelebrationIcon from '@mui/icons-material/Celebration';
import { dashboardApi } from '../../api/index';
import { getInitials, getApiUrl } from '../../utils/helpers';

const whenLabel = (inDays, date) => {
  if (inDays === 0) return 'Today 🎉';
  if (inDays === 1) return 'Tomorrow';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const CelebrationsCard = () => {
  const [data, setData] = useState({ birthdays: [], anniversaries: [] });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    dashboardApi.getCelebrations({ days: 30 }).then(({ data: res }) => setData(res.data)).catch(() => {});
  }, []);

  const list = tab === 0 ? data.birthdays : data.anniversaries;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <CelebrationIcon sx={{ mr: 1, color: '#ec4899' }} />
          <Typography variant="h6" fontWeight={600}>Celebrations</Typography>
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, fontSize: 12 } }}>
          <Tab icon={<CakeIcon fontSize="small" />} iconPosition="start" label={`Birthdays (${data.birthdays.length})`} />
          <Tab icon={<CelebrationIcon fontSize="small" />} iconPosition="start" label={`Anniversaries (${data.anniversaries.length})`} />
        </Tabs>

        <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
          {list.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>Nothing in the next 30 days</Typography>
          ) : list.map((p) => (
            <Box
              key={p._id}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, py: 1, px: 1, borderRadius: 2,
                bgcolor: p.inDays === 0 ? 'rgba(236,72,153,0.08)' : 'transparent',
              }}
            >
              <Avatar src={p.photo ? getApiUrl(`uploads/photos/${p.photo}`) : undefined} sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'secondary.main' }}>
                {getInitials(p.name)}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {tab === 1 ? `${p.years} year${p.years > 1 ? 's' : ''} · ` : ''}{p.department || p.employeeId}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={whenLabel(p.inDays, p.date)}
                color={p.inDays === 0 ? 'secondary' : 'default'}
                variant={p.inDays === 0 ? 'filled' : 'outlined'}
                sx={{ fontSize: 11 }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default CelebrationsCard;
