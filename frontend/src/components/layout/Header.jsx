import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem,
  ListItemIcon, ListItemText, Divider, Tooltip, Badge, Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getInitials } from '../../utils/helpers';

const getBreadcrumb = (pathname) => {
  const map = {
    '/dashboard': 'Dashboard',
    '/departments': 'Departments',
    '/designations': 'Designations',
    '/employees': 'Employees',
    '/employees/new': 'Add Employee',
    '/attendance': 'Attendance',
    '/leave': 'Leave Management',
    '/holidays': 'Holidays',
    '/shifts': 'Shift Management',
    '/payroll': 'Payroll',
    '/expenses': 'Expenses',
    '/assets': 'Asset Management',
    '/recruitment': 'Recruitment',
    '/performance': 'Performance',
    '/documents': 'Documents',
    '/reports': 'Reports',
    '/profile': 'My Profile',
    '/settings': 'Settings',
  };
  return map[pathname] || 'HRMS';
};

const Header = ({ onMenuClick, drawerWidth }) => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { md: 'none' } }}
          size="small"
        >
          <MenuIcon />
        </IconButton>

        <Box>
          <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
            {getBreadcrumb(location.pathname)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
          <IconButton onClick={toggleTheme} size="small">
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton size="small">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Chip
          label={user?.role?.replace('_', ' ')}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ textTransform: 'capitalize', display: { xs: 'none', sm: 'flex' } }}
        />

        <Tooltip title="Account">
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 600 }}>
              {getInitials(user?.name)}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 2 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
            <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
            <ListItemText>My Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
            <ListItemIcon><LockIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Change Password</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
