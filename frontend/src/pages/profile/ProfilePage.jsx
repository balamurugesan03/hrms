import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button, Avatar, Chip, Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials, formatDate } from '../../utils/helpers';
import PageHeader from '../../components/common/PageHeader';
import EmployeeProfile from '../employees/EmployeeProfile';
import CompanyDetailsCard from './CompanyDetailsCard';

const ROLE_LABEL = { super_admin: 'Super Admin', hr_manager: 'HR Manager', employee: 'Employee' };

const AccountCard = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(user?.name || ''); }, [user?.name]);

  const save = async () => {
    setSaving(true);
    try { await updateProfile({ name }); } catch {}
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>My Account</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>{getInitials(user?.name)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{user?.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
            <Chip size="small" color="primary" variant="outlined" label={ROLE_LABEL[user?.role] || user?.role} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Display Name" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Login Email" fullWidth size="small" value={user?.email || ''} disabled helperText="Contact HR / Super Admin to change your login email" />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          Last login: {user?.lastLogin ? `${formatDate(user.lastLogin)} ${new Date(user.lastLogin).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : '-'}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<LockIcon />} onClick={() => navigate('/settings')}>Change Password</Button>
          <Button variant="contained" onClick={save} disabled={saving || name.trim() === (user?.name || '') || name.trim().length < 2}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

// My Profile: account for everyone, employee record when linked, company details (editable by Super Admin)
const ProfilePage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <Box>
      <PageHeader title="My Profile" subtitle={isSuperAdmin ? 'Your account and company details' : 'Your account details'} />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={isSuperAdmin || !user?.employee ? 5 : 12} lg={isSuperAdmin || !user?.employee ? 4 : 12}>
          <AccountCard />
        </Grid>
        {(isSuperAdmin || !user?.employee) && (
          <Grid item xs={12} md={7} lg={8}>
            <CompanyDetailsCard editable={isSuperAdmin} />
          </Grid>
        )}
        {user?.employee && (
          <Grid item xs={12}>
            <EmployeeProfile embedded />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ProfilePage;
