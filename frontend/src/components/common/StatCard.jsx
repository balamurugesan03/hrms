import React from 'react';
import { Card, CardContent, Box, Typography, Avatar, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend, loading = false }) => {
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton variant="rectangular" height={80} />
        </CardContent>
      </Card>
    );
  }

  const colors = {
    primary: { bg: '#e3f2fd', icon: '#1976d2' },
    success: { bg: '#e8f5e9', icon: '#10b981' },
    warning: { bg: '#fff3e0', icon: '#f59e0b' },
    error: { bg: '#fce4ec', icon: '#ef4444' },
    info: { bg: '#e3f2fd', icon: '#3b82f6' },
    secondary: { bg: '#f3e5f5', icon: '#7c3aed' },
  };

  const clr = colors[color] || colors.primary;

  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, lineHeight: 1.2 }}>
              {value ?? '-'}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: clr.bg, color: clr.icon, width: 48, height: 48, borderRadius: 2 }}>
            {icon}
          </Avatar>
        </Box>
        {trend != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trend >= 0
              ? <TrendingUpIcon fontSize="small" color="success" />
              : <TrendingDownIcon fontSize="small" color="error" />}
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'} fontWeight={600}>
              {Math.abs(trend)}% vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
