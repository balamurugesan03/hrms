import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Tooltip, Typography, Avatar, Collapse, Divider, IconButton,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import EventNoteIcon from '@mui/icons-material/EventNote';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ComputerIcon from '@mui/icons-material/Computer';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import StarIcon from '@mui/icons-material/Star';
import FolderIcon from '@mui/icons-material/Folder';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['super_admin', 'hr_manager', 'employee'] },
  {
    label: 'Organization',
    icon: <BusinessIcon />,
    roles: ['super_admin', 'hr_manager'],
    children: [
      { label: 'Departments', path: '/departments', icon: <BusinessIcon fontSize="small" /> },
      { label: 'Designations', path: '/designations', icon: <WorkIcon fontSize="small" /> },
      { label: 'Shifts', path: '/shifts', icon: <AccessTimeIcon fontSize="small" /> },
      { label: 'Holidays', path: '/holidays', icon: <EventIcon fontSize="small" /> },
    ],
  },
  { label: 'Employees', icon: <PeopleIcon />, path: '/employees', roles: ['super_admin', 'hr_manager'] },
  { label: 'My Profile', icon: <PeopleIcon />, path: '/profile', roles: ['employee'] },
  { label: 'Attendance', icon: <EventNoteIcon />, path: '/attendance', roles: ['super_admin', 'hr_manager', 'employee'] },
  { label: 'Leave', icon: <BeachAccessIcon />, path: '/leave', roles: ['super_admin', 'hr_manager', 'employee'] },
  { label: 'Payroll', icon: <PaymentsIcon />, path: '/payroll', roles: ['super_admin', 'hr_manager', 'employee'] },
  { label: 'Expenses', icon: <ReceiptIcon />, path: '/expenses', roles: ['super_admin', 'hr_manager', 'employee'] },
  { label: 'Assets', icon: <ComputerIcon />, path: '/assets', roles: ['super_admin', 'hr_manager'] },
  { label: 'Recruitment', icon: <PersonSearchIcon />, path: '/recruitment', roles: ['super_admin', 'hr_manager'] },
  { label: 'Performance', icon: <StarIcon />, path: '/performance', roles: ['super_admin', 'hr_manager', 'employee'] },
  { label: 'Documents', icon: <FolderIcon />, path: '/documents', roles: ['super_admin', 'hr_manager'] },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: ['super_admin', 'hr_manager'] },
];

const SidebarContent = ({ collapsed, onToggleCollapse, onNavigate, location, user }) => {
  const [openGroups, setOpenGroups] = useState({ Organization: true });

  const toggleGroup = (label) => setOpenGroups((p) => ({ ...p, [label]: !p[label] }));

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #1976d2 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>HR</Typography>
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>HRMS</Typography>
            <Typography variant="caption" color="text.secondary">Management System</Typography>
          </Box>
        )}
        <Box sx={{ ml: 'auto' }}>
          <IconButton size="small" onClick={onToggleCollapse}>
            {collapsed ? <MenuOpenIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      <Divider />

      {/* User Info */}
      {!collapsed && (
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 600 }}>
            {getInitials(user?.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>
      )}

      {collapsed && (
        <Box sx={{ px: 1, py: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title={user?.name} placement="right">
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
              {getInitials(user?.name)}
            </Avatar>
          </Tooltip>
        </Box>
      )}

      <Divider />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, overflow: 'auto', px: 1, py: 1 }} disablePadding>
        {filteredItems.map((item) => {
          if (item.children) {
            const isGroupActive = item.children.some((c) => isActive(c.path));
            return (
              <Box key={item.label}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    sx={{
                      borderRadius: 2, mb: 0.5, minHeight: 42,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1.5 : 1.5,
                      color: isGroupActive ? 'primary.main' : 'text.secondary',
                      bgcolor: isGroupActive ? 'primary.main' + '14' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', mr: collapsed ? 0 : 1 }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
                        {openGroups[item.label] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>
                {!collapsed && (
                  <Collapse in={openGroups[item.label]}>
                    <List disablePadding>
                      {item.children.map((child) => (
                        <ListItemButton
                          key={child.path}
                          onClick={() => onNavigate(child.path)}
                          selected={isActive(child.path)}
                          sx={{
                            borderRadius: 2, ml: 2, mb: 0.5, minHeight: 36, pl: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: '#fff',
                              '& .MuiListItemIcon-root': { color: '#fff' },
                              '&:hover': { bgcolor: 'primary.dark' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>{child.icon}</ListItemIcon>
                          <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          }

          return (
            <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
              <ListItemButton
                onClick={() => onNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2, mb: 0.5, minHeight: 42,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '& .MuiListItemIcon-root': { color: '#fff' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', mr: collapsed ? 0 : 1 }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
};

const Sidebar = ({ mobileOpen, onMobileClose, collapsed, onToggleCollapse, drawerWidth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleNavigate = (path) => {
    navigate(path);
    onMobileClose();
  };

  const commonProps = { collapsed, onToggleCollapse, onNavigate: handleNavigate, location, user };

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box', border: 'none' },
        }}
      >
        <SidebarContent {...commonProps} collapsed={false} />
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          },
        }}
      >
        <SidebarContent {...commonProps} />
      </Drawer>
    </>
  );
};

export default Sidebar;
