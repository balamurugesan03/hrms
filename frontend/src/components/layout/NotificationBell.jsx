import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton, Badge, Tooltip, Popover, Box, Typography, Button, List, ListItemButton,
  ListItemAvatar, Avatar, ListItemText, Divider,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import CampaignIcon from '@mui/icons-material/Campaign';
import EventNoteIcon from '@mui/icons-material/EventNote';
import StarIcon from '@mui/icons-material/Star';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../api/index';

const POLL_MS = 30000;

const TYPE_META = {
  leave: { icon: <BeachAccessIcon fontSize="small" />, color: '#f59e0b' },
  expense: { icon: <ReceiptIcon fontSize="small" />, color: '#7c3aed' },
  payroll: { icon: <PaymentsIcon fontSize="small" />, color: '#10b981' },
  announcement: { icon: <CampaignIcon fontSize="small" />, color: '#1976d2' },
  attendance: { icon: <EventNoteIcon fontSize="small" />, color: '#3b82f6' },
  performance: { icon: <StarIcon fontSize="small" />, color: '#ef4444' },
  general: { icon: <InfoIcon fontSize="small" />, color: '#64748b' },
};

const timeAgo = (date) => {
  const sec = Math.floor((Date.now() - new Date(date)) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationApi.getAll({ limit: 20 });
      setItems(data.data.items);
      setUnread(data.data.unread);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, POLL_MS);
    window.addEventListener('focus', fetchNotifications);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, [fetchNotifications]);

  const handleClick = async (n) => {
    setAnchorEl(null);
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
      notificationApi.markRead(n._id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
  };

  const handleClear = async () => {
    await notificationApi.clearAll();
    setItems([]);
    setUnread(0);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); fetchNotifications(); }}>
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1, width: 380, maxWidth: 'calc(100vw - 32px)', borderRadius: 2 } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
            Notifications {unread > 0 && <Typography component="span" variant="caption" color="error.main">({unread} new)</Typography>}
          </Typography>
          {unread > 0 && <Button size="small" onClick={handleMarkAll}>Mark all read</Button>}
        </Box>
        <Divider />

        {items.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, opacity: 0.4 }} />
            <Typography variant="body2">You're all caught up</Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 420, overflow: 'auto' }}>
            {items.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.general;
              return (
                <ListItemButton
                  key={n._id}
                  onClick={() => handleClick(n)}
                  sx={{ alignItems: 'flex-start', bgcolor: n.read ? 'transparent' : 'action.hover', borderLeft: 3, borderColor: n.read ? 'transparent' : meta.color }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: `${meta.color}22`, color: meta.color }}>{meta.icon}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={n.read ? 500 : 700}>{n.title}</Typography>}
                    secondary={
                      <>
                        {n.message && <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>{n.message}</Typography>}
                        <Typography component="span" variant="caption" color="text.disabled">{timeAgo(n.createdAt)}</Typography>
                      </>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}

        {items.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" color="inherit" onClick={handleClear}>Clear all</Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
